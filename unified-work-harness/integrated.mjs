// Full-package read-only contract. Preserves the v5 executor's constraints.
import { buildBoundScope, sha256 } from './bundle.mjs';
import { resolvePackageProfile } from './package.mjs';
import { verifyIntakeForOffer } from './intake.mjs';

function sameSet(left = [], right = []) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

export function verifyPackagePolicy(bindingInputs, packagePolicy) {
  if (!packagePolicy || Object.keys(packagePolicy).sort().join(',') !== 'intakeReview,profileRequest') {
    throw Error('A complete package policy is required');
  }
  const { profileRequest, intakeReview } = packagePolicy;
  const resolved = resolvePackageProfile(profileRequest);
  const bundleProfile = JSON.parse(bindingInputs.profileJson);
  const intake = JSON.parse(bindingInputs.intakeJson);
  if (resolved.status !== 'resolved_for_review'
      || !['readonly_roundtrip', 'assignment_intake'].every(name => profileRequest.requiredCapabilities?.includes(name))
      || profileRequest.primary !== bundleProfile.primary
      || JSON.stringify(profileRequest.companions ?? []) !== JSON.stringify(bundleProfile.companions ?? [])
      || !sameSet(profileRequest.effectCeiling, bundleProfile.effectCeiling)
      || !sameSet(profileRequest.requestedEffects, bundleProfile.requestedEffects)) {
    throw Error('Package profile is held or conflicts with the bound executor profile');
  }
  const review = verifyIntakeForOffer(bindingInputs.intakeJson, intakeReview, {
    recipient: intake.assignee.id, assigner: intake.accountableHuman,
    reviewer: intake.acceptance.reviewer, outcome: intake.outcome,
  });
  if (review.recipient_kind !== 'agent') throw Error('Read-only execution requires an agent');
  return {
    package_sha256: resolved.sourceSha256,
    profile_sha256: sha256(JSON.stringify(profileRequest)),
    intake_sha256: review.intake_sha256,
    intake_review_sha256: review.review_sha256,
    intake_expires_at: review.expires_at,
  };
}

export function buildPackageScope({ bindingInputs, endpoint, resultPolicy, invocationPolicy, executionWindow, packagePolicy }) {
  if (!invocationPolicy || !executionWindow) throw Error('Package scope requires a ledger and execution window');
  const baseline = JSON.parse(buildBoundScope(bindingInputs, endpoint, resultPolicy, invocationPolicy, executionWindow));
  return JSON.stringify({
    ...baseline, kind: 'unified-harness-readonly-v6', package_binding: verifyPackagePolicy(bindingInputs, packagePolicy),
  });
}
