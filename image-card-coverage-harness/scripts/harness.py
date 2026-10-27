#!/usr/bin/env python3
"""Validate declared review coverage for image/card generation lineage."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

REQUIRED_TOP = ("schema_version", "artifact_id", "artifact_type", "brief", "generation", "review", "provenance")

def _object(value: object, path: str, findings: list[dict]) -> dict:
    if not isinstance(value, dict):
        findings.append({"code": "SHAPE_INVALID", "severity": "blocker", "message": f"{path} must be an object."})
        return {}
    return value

def _array(value: object, path: str, findings: list[dict]) -> list:
    if not isinstance(value, list):
        findings.append({"code": "SHAPE_INVALID", "severity": "blocker", "message": f"{path} must be an array."})
        return []
    return value

def _records(value: object, path: str, findings: list[dict]) -> list[dict]:
    rows = _array(value, path, findings)
    out = []
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            findings.append({"code": "SHAPE_INVALID", "severity": "blocker", "message": f"{path}[{i}] must be an object."})
        else:
            out.append(row)
    return out

def _has_status(value: object, allowed: set[str]) -> bool:
    return isinstance(value, str) and value in allowed

def validate(data: dict, asset_root: Path | None = None) -> dict:
    findings: list[dict] = []
    asset_binding = {"status": "not_checked", "asset_ref": None, "asset_sha256": None}
    def add(code: str, severity: str, message: str) -> None:
        findings.append({"code": code, "severity": severity, "message": message})
    if not isinstance(data, dict):
        add("SHAPE_INVALID", "blocker", "Manifest root must be an object.")
        return result({}, findings, asset_binding)
    for key in REQUIRED_TOP:
        if key not in data:
            add("MANIFEST_MISSING", "blocker", f"Missing required top-level field: {key}")
    if findings:
        return result(data, findings, asset_binding)

    if data.get("schema_version") != "1.5.0":
        add("SCHEMA_VERSION", "blocker", "schema_version must be 1.5.0.")
    if not isinstance(data.get("artifact_id"), str) or not data["artifact_id"].strip():
        add("ARTIFACT_ID", "blocker", "artifact_id must be a non-empty string.")

    brief = _object(data["brief"], "brief", findings)
    gen = _object(data["generation"], "generation", findings)
    review = _object(data["review"], "review", findings)
    provenance = _object(data["provenance"], "provenance", findings)
    if findings:
        return result(data, findings, asset_binding)
    for key in ("subject", "canonical_constraints", "forbidden_drift", "required_text", "technical_claims", "creative_deviations_policy"):
        if key not in brief:
            add("BRIEF_MISSING", "blocker", f"Missing brief field: {key}")
    for key in ("id", "parent_generation_id", "requested_delta", "preservation_targets", "regression_checks"):
        if key not in gen:
            add("LINEAGE_MISSING", "blocker", f"Missing generation field: {key}")
    for key in ("artifact_type_fit", "canonical_constraints", "forbidden_drift", "regression_review", "minimal_delta", "synthetic_familiarity", "reference_fidelity", "technical_evidence", "typography", "collection_consistency", "creative_deviations", "reviewer", "reviewer_kind", "decision"):
        if key not in review:
            add("REVIEW_MISSING", "blocker", f"Missing review field: {key}")

    for key in ("canonical_constraints", "required_text", "technical_claims"):
        _records(brief.get(key, []), f"brief.{key}", findings)
    for key in ("regression_checks",):
        _records(gen.get(key, []), f"generation.{key}", findings)
    targets = _array(gen.get("preservation_targets", []), "generation.preservation_targets", findings)
    if any(not isinstance(x, str) for x in targets):
        add("SHAPE_INVALID", "blocker", "generation.preservation_targets must contain only strings.")
    for key in ("requested_delta",):
        values = _array(gen.get(key, []), f"generation.{key}", findings)
        if any(not isinstance(x, str) for x in values):
            add("SHAPE_INVALID", "blocker", f"generation.{key} must contain only strings.")
    for key in ("subject", "creative_deviations_policy"):
        if not isinstance(brief.get(key), str):
            add("SHAPE_INVALID", "blocker", f"brief.{key} must be a string.")
    if not isinstance(gen.get("id"), str) or not gen["id"].strip():
        add("GENERATION_ID", "blocker", "generation.id must be a non-empty string.")
    parent_id = gen.get("parent_generation_id")
    if parent_id is not None and (not isinstance(parent_id, str) or not parent_id.strip()):
        add("PARENT_GENERATION_ID", "blocker", "generation.parent_generation_id must be a non-empty string or null.")
    if not isinstance(review.get("reviewer"), str) or not review["reviewer"].strip():
        add("REVIEWER_INVALID", "blocker", "review.reviewer must be a non-empty string.")
    if not _has_status(review.get("reviewer_kind"), {"human", "assistant", "automated"}):
        add("REVIEWER_KIND_INVALID", "blocker", "Declare reviewer_kind as human, assistant or automated.")
    if review.get("decision") == "accept":
        if review.get("reviewer_kind") != "human":
            add("HUMAN_ACCEPTANCE_REQUIRED", "blocker", "Only an explicitly recorded human decision may accept a release.")
        evidence = review.get("acceptance_evidence")
        if not isinstance(evidence, str) or not evidence.strip():
            add("ACCEPTANCE_EVIDENCE_REQUIRED", "blocker", "Acceptance needs a reference to the human decision and its scope.")
    source_kind = provenance.get("source_kind")
    if not isinstance(source_kind, str) or not source_kind.strip():
        add("PROVENANCE_SOURCE", "blocker", "provenance.source_kind must be a non-empty string.")
    if not isinstance(provenance.get("created_for_archive"), bool):
        add("PROVENANCE_ARCHIVE_FLAG", "blocker", "provenance.created_for_archive must be boolean.")
    if "asset_ref" in provenance and (not isinstance(provenance["asset_ref"], str) or not provenance["asset_ref"].strip()):
        add("ASSET_REFERENCE_INVALID", "blocker", "provenance.asset_ref must be a non-empty string when supplied.")
    if "asset_sha256" in provenance and (not isinstance(provenance["asset_sha256"], str) or re.fullmatch(r"[0-9a-fA-F]{64}", provenance["asset_sha256"]) is None):
        add("ASSET_HASH_INVALID", "blocker", "provenance.asset_sha256 must be a 64-character hexadecimal SHA-256 digest when supplied.")
    if source_kind == "synthetic_fixture":
        asset_binding["status"] = "not_applicable"
        if provenance.get("created_for_archive") is not True:
            add("FIXTURE_PROVENANCE", "blocker", "Synthetic fixtures must be explicitly marked created_for_archive.")
    else:
        asset_binding["status"] = "blocked"
        asset_binding["asset_ref"] = provenance.get("asset_ref") if isinstance(provenance.get("asset_ref"), str) else None
        asset_binding["asset_sha256"] = provenance.get("asset_sha256") if isinstance(provenance.get("asset_sha256"), str) else None
        if "asset_ref" not in provenance:
            add("ASSET_REFERENCE_MISSING", "blocker", "A non-fixture manifest must identify the reviewed asset with provenance.asset_ref.")
        if "asset_sha256" not in provenance:
            add("ASSET_HASH_INVALID", "blocker", "A non-fixture manifest must include a 64-character hexadecimal SHA-256 digest.")
        elif isinstance(provenance.get("asset_ref"), str) and provenance["asset_ref"].strip() and isinstance(provenance.get("asset_sha256"), str) and re.fullmatch(r"[0-9a-fA-F]{64}", provenance["asset_sha256"]):
            if asset_root is None:
                add("ASSET_ROOT_REQUIRED", "blocker", "Asset verification requires the directory containing the manifest.")
            else:
                root = asset_root.resolve()
                asset_ref = provenance["asset_ref"]
                candidate = Path(asset_ref)
                normalized_parts = asset_ref.split("/")
                if (candidate.is_absolute() or re.match(r"^[A-Za-z]:", asset_ref) or "\\" in asset_ref or ".." in normalized_parts):
                    add("ASSET_PATH_INVALID", "blocker", "provenance.asset_ref must be a normalized slash-separated relative path without parent-directory segments.")
                else:
                    try:
                        resolved = (root / candidate).resolve(strict=True)
                        if not resolved.is_relative_to(root) or not resolved.is_file():
                            add("ASSET_PATH_INVALID", "blocker", "Asset reference must resolve to a file inside the manifest directory.")
                        else:
                            digest = hashlib.sha256()
                            with resolved.open("rb") as asset_file:
                                for chunk in iter(lambda: asset_file.read(1024 * 1024), b""):
                                    digest.update(chunk)
                            if digest.hexdigest().casefold() != provenance["asset_sha256"].casefold():
                                add("ASSET_HASH_MISMATCH", "blocker", "SHA-256 digest does not match the referenced asset.")
                            else:
                                asset_binding["status"] = "verified"
                    except (OSError, RuntimeError):
                        add("ASSET_NOT_FOUND", "blocker", "Referenced asset could not be read.")
    canonical_review = _records(review.get("canonical_constraints", []), "review.canonical_constraints", findings)
    forbidden_review = _records(review.get("forbidden_drift", []), "review.forbidden_drift", findings)
    regression_review_checks = _records(gen.get("regression_checks", []), "generation.regression_checks", findings)
    for path, rows in (("review.canonical_constraints", canonical_review), ("review.forbidden_drift", forbidden_review), ("generation.regression_checks", regression_review_checks)):
        for i, row in enumerate(rows):
            if not isinstance(row.get("evidence_note"), str) or not row["evidence_note"].strip():
                add("EVIDENCE_NOTE_MISSING", "blocker", f"{path}[{i}] requires a non-empty evidence_note.")
    if not isinstance(review.get("technical_evidence"), dict):
        add("SHAPE_INVALID", "blocker", "review.technical_evidence must be an object.")
    for key in ("artifact_type_fit", "regression_review", "minimal_delta", "synthetic_familiarity", "reference_fidelity", "technical_evidence", "typography", "collection_consistency", "creative_deviations"):
        _object(review.get(key), f"review.{key}", findings)
    if isinstance(review.get("typography"), dict):
        _records(review["typography"].get("items", []), "review.typography.items", findings)
    if isinstance(review.get("creative_deviations"), dict):
        _records(review["creative_deviations"].get("items", []), "review.creative_deviations.items", findings)
    if findings:
        return result(data, findings, asset_binding)

    for claim in brief.get("technical_claims", []):
        if not isinstance(claim.get("claim_id"), str) or not claim["claim_id"].strip():
            add("TECHNICAL_CLAIM_ID", "blocker", "Each technical claim needs a non-empty claim_id.")
        if not isinstance(claim.get("status"), str) or claim.get("status") not in {"included", "excluded", "fictional_labelled"}:
            add("TECHNICAL_CLAIM_STATUS", "blocker", f"Technical claim has an invalid status: {claim.get('claim_id')}")
        if "evidence_ref" in claim and claim["evidence_ref"] is not None and not isinstance(claim["evidence_ref"], str):
            add("TECHNICAL_EVIDENCE_REF_INVALID", "blocker", f"Technical evidence_ref must be a string or null: {claim.get('claim_id')}")
    technical_claims = brief.get("technical_claims", [])
    claim_ids = [x.get("claim_id") for x in technical_claims if isinstance(x.get("claim_id"), str)]
    if len(claim_ids) != len(set(claim_ids)):
        add("TECHNICAL_CLAIM_DUPLICATE", "blocker", "Technical claim IDs must be unique.")
    evidence_review = review["technical_evidence"]
    technical_status_lists = {
        "included": "included_claim_ids",
        "excluded": "excluded_claim_ids",
        "fictional_labelled": "fictional_labelled_claim_ids",
    }
    for status, field in technical_status_lists.items():
        if field not in evidence_review:
            add("TECHNICAL_REVIEW_LIST_MISSING", "blocker", f"review.technical_evidence.{field} is required, including when empty.")
        actual = _array(evidence_review.get(field, []), f"review.technical_evidence.{field}", findings)
        if any(not isinstance(x, str) for x in actual):
            add("TECHNICAL_REVIEW_IDS_INVALID", "blocker", f"{field} must contain only string claim IDs.")
            continue
        expected = {c.get("claim_id") for c in technical_claims if c.get("status") == status and isinstance(c.get("claim_id"), str)}
        if len(actual) != len(set(actual)) or set(actual) != expected:
            add("TECHNICAL_REVIEW_MISMATCH", "blocker", f"{field} must list each {status} claim exactly once and no others.")
    for text_req in brief.get("required_text", []):
        if not isinstance(text_req.get("text_id"), str) or not text_req["text_id"].strip() or not isinstance(text_req.get("exact"), str):
            add("TEXT_REQUIREMENT_INVALID", "blocker", "Each required-text record needs a non-empty text_id and string exact value.")
        if "case_sensitive" in text_req and not isinstance(text_req["case_sensitive"], bool):
            add("TEXT_CASE_FLAG_INVALID", "blocker", f"case_sensitive must be boolean for text {text_req.get('text_id')}.")
    for constraint in brief.get("canonical_constraints", []):
        if not isinstance(constraint.get("constraint_id"), str) or not constraint["constraint_id"].strip() or not isinstance(constraint.get("statement"), str):
            add("CANONICAL_CONSTRAINT_INVALID", "blocker", "Each canonical constraint needs a non-empty ID and string statement.")
        if "source" in constraint and not isinstance(constraint["source"], str):
            add("CANONICAL_SOURCE_INVALID", "blocker", f"Constraint source must be a string: {constraint.get('constraint_id')}")
        if "mutability" in constraint and not _has_status(constraint["mutability"], {"immutable", "revisable"}):
            add("CANONICAL_MUTABILITY_INVALID", "blocker", f"Invalid mutability for constraint: {constraint.get('constraint_id')}")
    for check in gen.get("regression_checks", []):
        if not isinstance(check.get("check_id"), str) or not check["check_id"].strip():
            add("REGRESSION_ID_INVALID", "blocker", "Each regression check needs a non-empty check_id.")
        if not isinstance(check.get("requirement"), str) or not check["requirement"].strip():
            add("REGRESSION_REQUIREMENT_MISSING", "blocker", f"Regression check {check.get('check_id')} needs a non-empty requirement.")
        if not _has_status(check.get("status"), {"pass", "fail", "not_applicable", "unresolved"}):
            add("REGRESSION_STATUS_INVALID", "blocker", f"Invalid regression status: {check.get('check_id')}")
    for section_name in ("artifact_type_fit", "regression_review", "minimal_delta", "synthetic_familiarity", "reference_fidelity", "technical_evidence", "typography", "collection_consistency", "creative_deviations"):
        if not _has_status(review[section_name].get("status"), {"pass", "fail", "not_applicable", "unresolved"}):
            add("SECTION_STATUS_INVALID", "blocker", f"Invalid status in review section: {section_name}")

    if not _has_status(data.get("artifact_type"), {"album_cover", "infrastructure_card", "collectible_card", "illustration", "other"}):
        add("TYPE_UNKNOWN", "blocker", "Artifact type must use a documented type or 'other'.")
    if review.get("artifact_type_fit", {}).get("status") != "pass":
        add("TYPE_FIT", "blocker", "Artifact type and fitness gate has not passed.")

    constraints = _records(brief.get("canonical_constraints", []), "brief.canonical_constraints", findings)
    reviewed = _records(review.get("canonical_constraints", []), "review.canonical_constraints", findings)
    reviewed_by_id: dict[str, list[dict]] = {}
    for item in reviewed:
        cid = item.get("constraint_id")
        if isinstance(cid, str):
            reviewed_by_id.setdefault(cid, []).append(item)
    for cid, rows in reviewed_by_id.items():
        if len(rows) != 1:
            add("CANONICAL_DUPLICATE", "blocker", f"Canonical constraint review must contain exactly one result for {cid}.")
    for c in constraints:
        cid = c.get("constraint_id")
        rows = reviewed_by_id.get(cid, []) if isinstance(cid, str) else []
        if len(rows) != 1 or rows[0].get("status") != "pass":
            add("CANONICAL_UNCHECKED", "blocker", f"Canonical constraint not recorded exactly once as passing: {cid}")
    declared_constraint_ids = [c.get("constraint_id") for c in constraints if isinstance(c.get("constraint_id"), str)]
    constraint_ids = set(declared_constraint_ids)
    if len(declared_constraint_ids) != len(set(declared_constraint_ids)):
        add("CANONICAL_BRIEF_DUPLICATE", "blocker", "Canonical constraint IDs in the brief must be unique.")
    for cid in reviewed_by_id:
        if cid not in constraint_ids:
            add("CANONICAL_UNKNOWN", "blocker", f"Review refers to unknown canonical constraint: {cid}")

    forbidden = brief.get("forbidden_drift", [])
    if not isinstance(forbidden, list) or any(not isinstance(x, str) or not x.strip() for x in forbidden):
        add("SHAPE_INVALID", "blocker", "brief.forbidden_drift must be an array of non-empty strings.")
        forbidden = []
    elif len(forbidden) != len(set(forbidden)):
        add("FORBIDDEN_DRIFT_BRIEF_DUPLICATE", "blocker", "Forbidden-drift items in the brief must be unique.")
    drift_rows = _records(review.get("forbidden_drift", []), "review.forbidden_drift", findings)
    drift_by_item: dict[str, list[dict]] = {}
    for item in drift_rows:
        label = item.get("item")
        if isinstance(label, str):
            drift_by_item.setdefault(label, []).append(item)
        else:
            add("FORBIDDEN_DRIFT_ITEM_INVALID", "blocker", "Every forbidden-drift review needs a string item label.")
    for item in forbidden:
        rows = drift_by_item.get(item, [])
        if len(rows) != 1 or rows[0].get("status") != "pass":
            add("FORBIDDEN_DRIFT_UNCHECKED", "blocker", f"Forbidden-drift item not reviewed exactly once: {item}")
    for item, rows in drift_by_item.items():
        if item not in forbidden:
            add("FORBIDDEN_DRIFT_UNKNOWN", "blocker", f"Review refers to undeclared forbidden-drift item: {item}")
        if len(rows) != 1:
            add("FORBIDDEN_DRIFT_DUPLICATE", "blocker", f"Forbidden-drift item must have exactly one review: {item}")
    if review.get("regression_review", {}).get("status") != "pass":
        add("REGRESSION", "blocker", "Cross-generation regression review has not passed.")
    regression_checks = _records(gen.get("regression_checks", []), "generation.regression_checks", findings)
    if gen.get("parent_generation_id") is not None and not regression_checks:
        add("REGRESSION_CHECKS_MISSING", "blocker", "A generation with a parent must include at least one regression check.")
    check_ids = [x.get("check_id") for x in regression_checks]
    if len(check_ids) != len(set(x for x in check_ids if isinstance(x, str))):
        add("REGRESSION_DUPLICATE", "blocker", "Regression check IDs must be unique.")
    for check in regression_checks:
        if check.get("status") != "pass":
            add("REGRESSION_CHECK", "blocker", f"Regression check failed or unresolved: {check.get('check_id')}")

    delta = review.get("minimal_delta", {})
    if delta.get("status") != "pass":
        add("MINIMAL_DELTA", "blocker", "Minimal-delta and preservation review has not passed.")
    preserved_values = _array(delta.get("preserved_target_ids", []), "review.minimal_delta.preserved_target_ids", findings)
    if any(not isinstance(x, str) for x in preserved_values):
        add("SHAPE_INVALID", "blocker", "review.minimal_delta.preserved_target_ids must contain only strings.")
    preserved = {x for x in preserved_values if isinstance(x, str)}
    for target in gen.get("preservation_targets", []):
        if target not in preserved:
            add("PRESERVATION_UNCONFIRMED", "blocker", f"Preservation target not confirmed: {target}")

    for section in ("synthetic_familiarity", "reference_fidelity", "technical_evidence", "typography", "collection_consistency"):
        if not _has_status(review.get(section, {}).get("status"), {"pass", "not_applicable"}):
            add(section.upper(), "blocker", f"Review section needs resolution: {section}")
    for claim in _records(brief.get("technical_claims", []), "brief.technical_claims", findings):
        if claim.get("status") == "included" and not claim.get("evidence_ref"):
            add("TECHNICAL_UNSOURCED", "blocker", f"Included technical claim lacks evidence reference: {claim.get('claim_id')}")
    text_items = _records(review.get("typography", {}).get("items", []), "review.typography.items", findings)
    for text_req in _records(brief.get("required_text", []), "brief.required_text", findings):
        tid, exact = text_req.get("text_id"), text_req.get("exact")
        matches = [x for x in text_items if x.get("text_id") == tid]
        if len(matches) != 1 or matches[0].get("status") != "pass":
            add("TYPOGRAPHY_UNCHECKED", "blocker", f"Exact text must have exactly one passing review: {tid}")
            continue
        observed = matches[0].get("observed_text")
        case_sensitive = text_req.get("case_sensitive", True)
        equal = isinstance(observed, str) and isinstance(exact, str) and (observed == exact if case_sensitive else observed.casefold() == exact.casefold())
        if not equal:
            add("TYPOGRAPHY_MISMATCH", "blocker", f"Observed text does not match the required exact text: {tid}")
    required_text_ids = [x.get("text_id") for x in _records(brief.get("required_text", []), "brief.required_text", findings)]
    if len(required_text_ids) != len(set(x for x in required_text_ids if isinstance(x, str))):
        add("TYPOGRAPHY_DUPLICATE", "blocker", "Required text IDs must be unique.")

    deviations = _records(review.get("creative_deviations", {}).get("items", []), "review.creative_deviations.items", findings)
    deviation_ids = []
    for d in deviations:
        deviation_id = d.get("deviation_id")
        if not isinstance(deviation_id, str) or not deviation_id.strip():
            add("DEVIATION_ID_INVALID", "blocker", "Each creative deviation needs a non-empty deviation_id.")
        else:
            deviation_ids.append(deviation_id)
        rationale = d.get("rationale")
        if not isinstance(rationale, str) or not rationale.strip():
            add("DEVIATION_RATIONALE_MISSING", "blocker", f"Creative deviation needs a non-empty rationale: {deviation_id}")
        if not isinstance(d.get("intentional"), bool):
            add("DEVIATION_INTENT_INVALID", "blocker", f"Creative deviation intentional must be boolean: {deviation_id}")
        approver = d.get("approved_by")
        if not isinstance(approver, str) or not approver.strip():
            add("DEVIATION_APPROVER_MISSING", "blocker", f"Creative deviation needs a named approver: {deviation_id}")
    if len(deviation_ids) != len(set(deviation_ids)):
        add("DEVIATION_ID_DUPLICATE", "blocker", "Creative deviation IDs must be unique.")
    deviations_status = review.get("creative_deviations", {}).get("status")
    if deviations and deviations_status != "pass":
        add("DEVIATION_STATUS_CONFLICT", "blocker", "Creative deviations are listed, so the review status must be pass.")
    elif not _has_status(deviations_status, {"pass", "not_applicable"}):
        add("DEVIATION_REVIEW", "blocker", "Creative deviations have not been reconciled.")
    if not review.get("reviewer"):
        add("REVIEWER_MISSING", "blocker", "A reviewer identity or approved pseudonym is required; declare its kind separately.")
    if not _has_status(review.get("decision"), {"accept", "revise", "reject", "hold"}):
        add("DECISION_INVALID", "blocker", "Decision must be accept, revise, reject, or hold.")
    if review.get("decision") == "accept" and any(x["severity"] == "blocker" for x in findings):
        add("ACCEPT_WITH_BLOCKERS", "blocker", "Record says accept while coverage blockers remain.")
    return result(data, findings, asset_binding)

def result(data: dict, findings: list[dict], asset_binding: dict | None = None) -> dict:
    blockers = sum(x["severity"] == "blocker" for x in findings)
    reviewer_decision = data.get("review", {}).get("decision") if isinstance(data.get("review"), dict) else None
    accepted = not blockers and reviewer_decision == "accept"
    fixture_only = isinstance(data.get("provenance"), dict) and data["provenance"].get("source_kind") == "synthetic_fixture"
    outcome = "not_accepted" if blockers else ("fixture_only" if fixture_only else ("accepted" if accepted else reviewer_decision))
    return {"harness": "Image and Card Coverage Harness", "version": "1.5.0", "artifact_id": data.get("artifact_id"), "generation_id": data.get("generation", {}).get("id") if isinstance(data.get("generation"), dict) else None, "asset_binding": asset_binding or {"status": "not_checked", "asset_ref": None, "asset_sha256": None}, "validation_status": "blocked" if blockers else "clear", "reviewer_decision": reviewer_decision, "reviewer_kind": data.get("review", {}).get("reviewer_kind") if isinstance(data.get("review"), dict) else None, "release_outcome": outcome, "blocker_count": blockers, "findings": findings, "scope_note": "Validates declared coverage, lineage, local asset digest, and evidence-record completeness; does not inspect pixels or establish truth of human observations. A verified asset binding identifies bytes only; review judgments remain declarations; role and acceptance evidence are recorded, not authenticated."}

def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("manifest", type=Path)
    p.add_argument("--json", action="store_true", help="print machine-readable JSON")
    args = p.parse_args()
    try:
        data = json.loads(args.manifest.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("manifest root must be a JSON object")
        report = validate(data, asset_root=args.manifest.resolve().parent)
    except (OSError, json.JSONDecodeError, ValueError) as e:
        print(f"input error: {e}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"{report['artifact_id']} / {report['generation_id']}: validation={report['validation_status']}; reviewer={report['reviewer_decision']}; outcome={report['release_outcome']} ({report['blocker_count']} blockers)")
        for finding in report["findings"]:
            print(f"{finding['severity'].upper()} {finding['code']}: {finding['message']}")
    return 0 if report["release_outcome"] == "accepted" else 1

if __name__ == "__main__":
    raise SystemExit(main())

