import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewIntake, verifyIntakeForOffer } from './intake.mjs';

function fixture() {
  const now = Date.now();
  const intake = {
    outcome: 'Verify the public shelf count sample',
    exclusions: ['Live displays'],
    assignee: { kind: 'human', id: 'analyst' },
    accountableHuman: 'coordinator',
    authority: { allowed: ['read-source'], prohibited: ['write-source'] },
    dataClass: 'public',
    resources: { effortMinutes: 30, deadline: 'none', dependencies: [], reviewerAvailability: 'available' },
    acceptance: { checks: ['Reproduce all three rows'], reviewer: 'checker' },
    escalation: { stopConditions: ['Missing fixture'], contact: 'coordinator', mayPause: true },
    concerns: [],
  };
  const assessment = {
    by: 'checker', disposition: 'clear', authority: 'confirmed', scope: 'consistent', concerns: 'clear',
    availableMinutes: 30, reviewerAvailable: true, evidenceRef: 'training-review-01',
    reviewedAt: new Date(now - 10000).toISOString(), expiresAt: new Date(now + 60000).toISOString(),
  };
  const offer = { recipient: 'analyst', assigner: 'coordinator', reviewer: 'checker', outcome: intake.outcome };
  return { intake, assessment, offer };
}

test('private review binds the exact intake and reviewer evidence before an offer', () => {
  const { intake, assessment, offer } = fixture();
  for (const kind of ['human', 'agent', 'hybrid']) {
    const bytes = JSON.stringify({ ...intake, assignee: { ...intake.assignee, kind } });
    const review = reviewIntake(bytes, assessment);
    const verified = verifyIntakeForOffer(bytes, review, offer);
    assert.equal(verified.review_sha256, review.review_sha256);
    assert.equal(verified.recipient_kind, kind);
    assert.equal(verified.expires_at, assessment.expiresAt);
    assert.throws(() => verifyIntakeForOffer(bytes, review, { ...offer, assigner: 'other' }));
    assert.throws(() => verifyIntakeForOffer(bytes, review, { ...offer, outcome: 'Changed' }));
    const changed = structuredClone(review);
    changed.assessment.evidenceRef = 'unreviewed replacement';
    assert.throws(() => verifyIntakeForOffer(bytes, changed, offer));
    const drift = JSON.parse(bytes);
    drift.resources.dependencies.push('new dependency');
    assert.throws(() => verifyIntakeForOffer(JSON.stringify(drift), review, offer));
  }
});

test('request holds survive a clear assessment; reviewer can also hold an otherwise adequate request', () => {
  const mutations = [
    [f => f.intake.concerns.push('disputed authority'), 'intake-held'],
    [f => { f.intake.authority.prohibited = [' READ_source ']; }, 'overlapping-effects'],
    [f => { f.intake.authority.allowed = ['*']; }, 'overlapping-effects'],
    [f => { f.intake.dataClass = 'restricted'; }, 'intake-held'],
    [f => { f.intake.resources.reviewerAvailability = 'unavailable'; }, 'intake-held'],
    [f => { f.assessment.disposition = 'hold'; }, 'reviewer-hold'],
    [f => { f.assessment.concerns = 'open'; }, 'concerns-unresolved'],
    [f => { f.assessment.authority = 'disputed'; }, 'authority-unresolved'],
    [f => { f.assessment.scope = 'conflicting'; }, 'scope-unresolved'],
    [f => { f.assessment.reviewerAvailable = false; }, 'capacity-unavailable'],
    [f => { f.assessment.availableMinutes = 29; }, 'capacity-unavailable'],
    [f => { f.assessment.by = 'unauthorized'; }, 'wrong-reviewer'],
    [f => { f.intake.assignee.id = f.assessment.by; }, 'self-review'],
  ];
  for (const [mutate, reason] of mutations) {
    const f = fixture();
    mutate(f);
    const bytes = JSON.stringify(f.intake);
    const review = reviewIntake(bytes, f.assessment);
    assert.ok(review.holds.includes(reason), reason);
    assert.throws(() => verifyIntakeForOffer(bytes, review, f.offer));
  }
});

test('a previously clear review expires at its exclusive UTC boundary', t => {
  const { intake, assessment, offer } = fixture();
  const bytes = JSON.stringify(intake);
  const review = reviewIntake(bytes, assessment);
  assert.equal(review.disposition, 'clear');
  t.mock.method(Date, 'now', () => Date.parse(assessment.expiresAt));
  assert.throws(() => verifyIntakeForOffer(bytes, review, offer));
  assert.ok(reviewIntake(bytes, assessment).holds.includes('review-inactive'));
});

test('reject ambiguous intake bytes and malformed assessment records', () => {
  const { intake, assessment } = fixture();
  const bytes = JSON.stringify(intake);
  assert.throws(() => reviewIntake(bytes.replace('{', '{"outcome":"duplicate",'), assessment));
  assert.throws(() => reviewIntake(bytes, { ...assessment, evidenceRef: '' }));
  assert.throws(() => reviewIntake(bytes, { ...assessment, expiresAt: '2027-02-30T00:00:00.000Z' }));
});
