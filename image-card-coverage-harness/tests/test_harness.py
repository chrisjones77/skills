import json
import hashlib
import re
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from harness import validate

class HarnessTests(unittest.TestCase):
    def load(self, name):
        return json.loads((ROOT / "fixtures" / name).read_text(encoding="utf-8"))

    def test_complete_fixture_has_no_blockers(self):
        report = validate(self.load("bridge-review.json"))
        self.assertEqual(report["validation_status"], "clear")
        self.assertEqual(report["release_outcome"], "fixture_only")
        self.assertEqual(report["blocker_count"], 0)

    def test_bound_non_fixture_can_be_accepted(self):
        data = self.load("bridge-review.json")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            asset = root / "candidate.png"
            asset.write_bytes(b"test image bytes")
            data["provenance"] = {
                "source_kind": "candidate_image",
                "created_for_archive": False,
                "asset_ref": "candidate.png",
                "asset_sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
            }
            report = validate(data, asset_root=root)
            self.assertEqual(report["validation_status"], "clear")
            self.assertEqual(report["release_outcome"], "accepted")
            self.assertEqual(report["asset_binding"], {
                "status": "verified",
                "asset_ref": "candidate.png",
                "asset_sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
            })

    def test_mismatched_asset_hash_blocks_acceptance(self):
        data = self.load("bridge-review.json")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "candidate.png").write_bytes(b"actual image bytes")
            data["provenance"] = {
                "source_kind": "candidate_image",
                "created_for_archive": False,
                "asset_ref": "candidate.png",
                "asset_sha256": "0" * 64,
            }
            codes = {x["code"] for x in validate(data, asset_root=root)["findings"]}
            self.assertIn("ASSET_HASH_MISMATCH", codes)

    def test_asset_path_escape_blocks_acceptance(self):
        data = self.load("bridge-review.json")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "manifest"
            root.mkdir()
            outside = Path(temp_dir) / "outside.png"
            outside.write_bytes(b"outside")
            data["provenance"] = {
                "source_kind": "candidate_image",
                "created_for_archive": False,
                "asset_ref": "../outside.png",
                "asset_sha256": hashlib.sha256(outside.read_bytes()).hexdigest(),
            }
            codes = {x["code"] for x in validate(data, asset_root=root)["findings"]}
            self.assertIn("ASSET_PATH_INVALID", codes)

    def test_asset_path_parent_segment_is_rejected_even_when_it_resolves_inside(self):
        data = self.load("bridge-review.json")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            asset = root / "candidate.png"
            asset.write_bytes(b"asset")
            data["provenance"] = {
                "source_kind": "candidate_image",
                "created_for_archive": False,
                "asset_ref": "nested/../candidate.png",
                "asset_sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
            }
            codes = {x["code"] for x in validate(data, asset_root=root)["findings"]}
            self.assertIn("ASSET_PATH_INVALID", codes)

    def test_schema_asset_path_pattern_matches_absolute_path_rule(self):
        schema = json.loads((ROOT / "schema" / "manifest.schema.json").read_text(encoding="utf-8"))
        pattern = schema["properties"]["provenance"]["properties"]["asset_ref"]["pattern"]
        for path in (
            "/tmp/candidate.png",
            "\\\\server\\share\\candidate.png",
            "C:\\candidate.png",
            "../candidate.png",
            "nested/../candidate.png",
            "nested\\candidate.png",
        ):
            with self.subTest(path=path):
                self.assertIsNone(re.search(pattern, path))
        for path in ("candidate.png", "images/candidate.png"):
            with self.subTest(path=path):
                self.assertIsNotNone(re.search(pattern, path))

    def test_non_fixture_requires_asset_reference_and_sha256(self):
        data = self.load("bridge-review.json")
        data["provenance"] = {"source_kind": "candidate_image", "created_for_archive": False}
        codes = {x["code"] for x in validate(data)["findings"]}
        self.assertTrue({"ASSET_REFERENCE_MISSING", "ASSET_HASH_INVALID"} <= codes)

    def test_empty_forbidden_drift_still_requires_review_field(self):
        data = self.load("bridge-review.json")
        data["brief"]["forbidden_drift"] = []
        data["review"].pop("forbidden_drift")
        self.assertIn("REVIEW_MISSING", {x["code"] for x in validate(data)["findings"]})

    def test_invalid_schema_fields_block_acceptance(self):
        cases = [
            (lambda d: d["generation"].__setitem__("id", 17), "GENERATION_ID"),
            (lambda d: d["review"].__setitem__("reviewer", ["reviewer"]), "REVIEWER_INVALID"),
            (lambda d: d["brief"]["technical_claims"][0].__setitem__("status", "mystery"), "TECHNICAL_CLAIM_STATUS"),
        ]
        for mutate, expected_code in cases:
            with self.subTest(expected_code=expected_code):
                data = self.load("bridge-review.json")
                mutate(data)
                self.assertIn(expected_code, {x["code"] for x in validate(data)["findings"]})

    def test_regression_fixture_blocks_acceptance(self):
        report = validate(self.load("regression-blocked.json"))
        codes = {item["code"] for item in report["findings"]}
        self.assertEqual(report["validation_status"], "blocked")
        self.assertEqual(report["release_outcome"], "not_accepted")
        self.assertTrue({"REGRESSION", "REGRESSION_CHECK", "CANONICAL_UNCHECKED", "PRESERVATION_UNCONFIRMED"} <= codes)

    def test_unsupported_technical_claim_blocks(self):
        data = self.load("bridge-review.json")
        data["brief"]["technical_claims"].append({"claim_id": "RATE", "status": "included", "evidence_ref": None})
        self.assertIn("TECHNICAL_UNSOURCED", {x["code"] for x in validate(data)["findings"]})

    def test_typography_mismatch_blocks(self):
        data = self.load("bridge-review.json")
        data["review"]["typography"]["items"][0]["observed_text"] = "THE BR1DGE"
        self.assertIn("TYPOGRAPHY_MISMATCH", {x["code"] for x in validate(data)["findings"]})

    def test_empty_regression_list_with_parent_blocks(self):
        data = self.load("bridge-review.json")
        data["generation"]["regression_checks"] = []
        self.assertIn("REGRESSION_CHECKS_MISSING", {x["code"] for x in validate(data)["findings"]})

    def test_conflicting_duplicate_constraint_blocks(self):
        data = self.load("bridge-review.json")
        data["review"]["canonical_constraints"].append({"constraint_id": "C-STRUCTURE", "status": "fail", "evidence_note": "Conflicting fixture assertion."})
        codes = {x["code"] for x in validate(data)["findings"]}
        self.assertTrue({"CANONICAL_DUPLICATE", "CANONICAL_UNCHECKED"} <= codes)

    def test_forbidden_drift_requires_disposition(self):
        data = self.load("bridge-review.json")
        data["review"]["forbidden_drift"].pop()
        self.assertIn("FORBIDDEN_DRIFT_UNCHECKED", {x["code"] for x in validate(data)["findings"]})

    def test_visual_review_evidence_notes_are_required(self):
        mutations = [
            lambda d: d["review"]["canonical_constraints"][0].pop("evidence_note"),
            lambda d: d["review"]["forbidden_drift"][0].pop("evidence_note"),
            lambda d: d["generation"]["regression_checks"][0].pop("evidence_note"),
        ]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                data = self.load("bridge-review.json")
                mutate(data)
                self.assertIn("EVIDENCE_NOTE_MISSING", {x["code"] for x in validate(data)["findings"]})

    def test_regression_requirement_is_required(self):
        data = self.load("bridge-review.json")
        data["generation"]["regression_checks"][0].pop("requirement")
        self.assertIn("REGRESSION_REQUIREMENT_MISSING", {x["code"] for x in validate(data)["findings"]})

    def test_technical_review_lists_required_even_when_empty(self):
        data = self.load("bridge-review.json")
        data["review"]["technical_evidence"].pop("excluded_claim_ids")
        self.assertIn("TECHNICAL_REVIEW_LIST_MISSING", {x["code"] for x in validate(data)["findings"]})

    def test_technical_review_ids_must_match_brief(self):
        data = self.load("bridge-review.json")
        data["brief"]["technical_claims"].append({"claim_id": "RATE", "status": "included", "evidence_ref": "source:rate"})
        self.assertIn("TECHNICAL_REVIEW_MISMATCH", {x["code"] for x in validate(data)["findings"]})

    def test_listed_deviation_cannot_be_marked_not_applicable(self):
        data = self.load("bridge-review.json")
        data["review"]["creative_deviations"] = {"status": "not_applicable", "items": [{"deviation_id": "D1", "intentional": True, "approved_by": "owner"}]}
        self.assertIn("DEVIATION_STATUS_CONFLICT", {x["code"] for x in validate(data)["findings"]})

    def test_reject_decision_is_not_accepted(self):
        data = self.load("bridge-review.json")
        data["review"]["decision"] = "reject"
        report = validate(data)
        self.assertEqual(report["validation_status"], "clear")
        self.assertEqual(report["reviewer_decision"], "reject")
        self.assertEqual(report["release_outcome"], "fixture_only")

    def test_malformed_nested_review_is_controlled_blocker(self):
        data = self.load("bridge-review.json")
        data["review"] = []
        report = validate(data)
        self.assertEqual(report["validation_status"], "blocked")
        self.assertIn("SHAPE_INVALID", {x["code"] for x in report["findings"]})

    def test_malformed_nested_section_is_controlled_blocker(self):
        data = self.load("bridge-review.json")
        data["review"]["typography"] = []
        report = validate(data)
        self.assertEqual(report["validation_status"], "blocked")
        self.assertIn("SHAPE_INVALID", {x["code"] for x in report["findings"]})

    def test_unapproved_deviation_blocks(self):
        data = self.load("bridge-review.json")
        deviation = {"deviation_id": "D1", "rationale": "Intentional composition change", "intentional": True, "approved_by": "owner"}
        data["review"]["creative_deviations"] = {"status": "pass", "items": [deviation]}
        del deviation["approved_by"]
        self.assertIn("DEVIATION_APPROVER_MISSING", {x["code"] for x in validate(data)["findings"]})

    def test_deviation_requires_unique_id_rationale_boolean_intent_and_approver(self):
        data = self.load("bridge-review.json")
        deviation = {"deviation_id": "D1", "rationale": "Intentional composition change", "intentional": True, "approved_by": "owner"}
        data["review"]["creative_deviations"] = {"status": "pass", "items": [deviation.copy(), deviation.copy()]}
        codes = {x["code"] for x in validate(data)["findings"]}
        self.assertIn("DEVIATION_ID_DUPLICATE", codes)
        for field, expected in (("deviation_id", "DEVIATION_ID_INVALID"), ("rationale", "DEVIATION_RATIONALE_MISSING"), ("intentional", "DEVIATION_INTENT_INVALID"), ("approved_by", "DEVIATION_APPROVER_MISSING")):
            with self.subTest(field=field):
                invalid = deviation.copy()
                invalid[field] = " " if field != "intentional" else "yes"
                data["review"]["creative_deviations"] = {"status": "pass", "items": [invalid]}
                self.assertIn(expected, {x["code"] for x in validate(data)["findings"]})

if __name__ == "__main__":
    unittest.main()
