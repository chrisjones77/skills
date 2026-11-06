// Run with: node examples/attended-review.mjs
// All names, decisions and evidence references in this demonstration are fictional.
import { reviewIntake } from '../intake.mjs';
import { offerCoordination, inspectCoordination, respond } from '../coordination.mjs';

const now = Date.now();
const intake = {
  outcome: 'Compare the two shelf labels and report any lost status text.',
  exclusions: ['Changing the live display'], assignee: {kind:'human', id:'analyst'},
  accountableHuman: 'coordinator', authority:{allowed:['inspect-labels'],prohibited:['publish']},
  dataClass:'public', resources:{effortMinutes:15, deadline:'none', dependencies:[], reviewerAvailability:'available'},
  acceptance:{checks:['Record the status text at each revision'],reviewer:'checker'},
  escalation:{stopConditions:['Label meaning is disputed'],contact:'coordinator',mayPause:true},concerns:[]
};
const review = reviewIntake(JSON.stringify(intake), {
  by:'checker',disposition:'clear', authority:'confirmed',scope:'consistent',concerns:'clear',
  availableMinutes:20,reviewerAvailable:true,evidenceRef:'demo:staffed-review-slot',
  reviewedAt:new Date(now).toISOString(),expiresAt:new Date(now + 3600000).toISOString()
});
// These placeholders describe a fictional workspace for an attended work record.
const workspace = {root:'/demo/labels',identity:'/demo/labels#training',revision:'0'.repeat(40),status_digest:'0'.repeat(64)};
let record = offerCoordination({intake,review,workspace,id:'label-review',purpose:'0xB'});
function recordDecision(action, by, note, evidence) {
  record = respond(record, action, {by,note,evidence,assignmentDigest:inspectCoordination(record).assignmentDigest});
  console.log(by + ': ' + action + ' — ' + note);
}
console.log('Fictional attended review. No worker or provider is contacted.');
recordDecision('accept','analyst','I can compare these two labels during the agreed slot.');
recordDecision('resume','analyst','Starting the comparison.');
recordDecision('submit','analyst','Revision 2 lost the word Unobserved.','demo:before-and-after');
recordDecision('approve','checker','I compared the labels and confirmed the finding.','demo:review');
recordDecision('close','checker','The coordinator received the finding; publication remains outside scope.','demo:handoff');
console.log('Work status: ' + record.packet.status);
