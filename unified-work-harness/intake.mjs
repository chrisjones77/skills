// Human review of a private intake. Persist and protect the review with its source.
import { inspectWorkIntake, sha256 } from './bundle.mjs';

const assessmentFields = [
  'by', 'disposition', 'authority', 'scope', 'concerns', 'availableMinutes',
  'reviewerAvailable', 'evidenceRef', 'reviewedAt', 'expiresAt',
];

function fieldsMatch(value, names) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
}

function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return NaN;
  const result = Date.parse(value);
  return Number.isFinite(result) && new Date(result).toISOString() === value ? result : NaN;
}

function readIntake(intakeJson) {
  if (typeof intakeJson !== 'string' || Buffer.byteLength(intakeJson) > 262144) throw Error('Invalid intake bytes');
  let intake;
  try { intake = JSON.parse(intakeJson); } catch { throw Error('Invalid intake bytes'); }
  if (JSON.stringify(intake) !== intakeJson) throw Error('Use the exact compact intake JSON');
  return intake;
}

function readAssessment(input) {
  if (!fieldsMatch(input, assessmentFields)) throw Error('Invalid review fields');
  const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 2048;
  if (!text(input.by) || !text(input.evidenceRef)
      || !['clear', 'hold'].includes(input.disposition)
      || !['confirmed', 'disputed', 'unknown'].includes(input.authority)
      || !['consistent', 'conflicting', 'unknown'].includes(input.scope)
      || !['clear', 'open', 'unknown'].includes(input.concerns)
      || !Number.isInteger(input.availableMinutes) || input.availableMinutes < 0 || input.availableMinutes > 10080
      || typeof input.reviewerAvailable !== 'boolean'
      || !Number.isFinite(instant(input.reviewedAt)) || !Number.isFinite(instant(input.expiresAt))
      || instant(input.reviewedAt) >= instant(input.expiresAt)) throw Error('Invalid intake assessment');
  return Object.fromEntries(assessmentFields.map(name => [name, input[name]]));
}

function overlaps(authority) {
  // Recognize spelling variations of the same effect. Humans must review meaning and broader conflicts.
  const normalized = labels => labels.map(s => s.trim().toLowerCase().replace(/[\s_]+/g, '-'));
  const allowed = normalized(authority.allowed);
  const prohibited = new Set(normalized(authority.prohibited));
  return allowed.some(label => prohibited.has(label) || label === '*' || label === 'all') || prohibited.has('*') || prohibited.has('all');
}

export function reviewIntake(intakeJson, assessment) {
  const intake = readIntake(intakeJson);
  const inspection = inspectWorkIntake(intake);
  const a = readAssessment(assessment);
  const now = Date.now();
  const holds = [];
  if (inspection.intake_status === 'hold') holds.push('intake-held');
  if (inspection.intake_status !== 'hold' && overlaps(intake.authority)) holds.push('overlapping-effects');
  if (a.disposition !== 'clear') holds.push('reviewer-hold');
  if (a.by !== intake.acceptance?.reviewer) holds.push('wrong-reviewer');
  if (a.by === intake.assignee?.id) holds.push('self-review');
  if (a.authority !== 'confirmed') holds.push('authority-unresolved');
  if (a.scope !== 'consistent') holds.push('scope-unresolved');
  if (a.concerns !== 'clear') holds.push('concerns-unresolved');
  if (!a.reviewerAvailable || a.availableMinutes < intake.resources?.effortMinutes) holds.push('capacity-unavailable');
  if (now < instant(a.reviewedAt) || now >= instant(a.expiresAt)) holds.push('review-inactive');
  const body = {
    schema_version: 'unified.intake-review.v1',
    intake_sha256: sha256(intakeJson),
    assessment: a,
    disposition: holds.length ? 'hold' : 'clear',
    holds,
  };
  return { ...body, review_sha256: sha256(JSON.stringify(body)) };
}

export function verifyIntakeForOffer(intakeJson, review, { recipient, assigner, reviewer, outcome }) {
  if (!fieldsMatch(review, ['schema_version', 'intake_sha256', 'assessment', 'disposition', 'holds', 'review_sha256'])) {
    throw Error('Invalid intake review');
  }
  const expected = reviewIntake(intakeJson, review.assessment);
  if (expected.disposition !== 'clear' || review.disposition !== 'clear' || !Array.isArray(review.holds) || review.holds.length
      || review.schema_version !== expected.schema_version || review.intake_sha256 !== expected.intake_sha256
      || review.review_sha256 !== expected.review_sha256) throw Error('Intake review held, expired or changed');
  const intake = readIntake(intakeJson);
  if (intake.assignee.id !== recipient || intake.accountableHuman !== assigner || intake.acceptance.reviewer !== reviewer
      || intake.outcome !== outcome) throw Error('Proposed offer differs from reviewed intake');
  return {
    intake_sha256: expected.intake_sha256,
    review_sha256: expected.review_sha256,
    expires_at: expected.assessment.expiresAt,
    recipient_kind: intake.assignee.kind,
  };
}
