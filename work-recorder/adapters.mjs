// Read-only projections of caller-validated records. No harness imports or transitions.
import {makeEvent} from './recorder.mjs';
export function qvchProfileEvent(profile, context) {
  if(profile?.status!=='resolved_for_review' || !Array.isArray(profile.lenses) || !profile.lenses[0]?.code || !/^[a-f0-9]{64}$/.test(profile.sourceSha256)) throw Error('Resolved source-pinned profile required');
  return makeEvent({...context,purpose:profile.lenses[0].code,kind:'profile_resolved',state:profile.status,evidence:[{ref:'record:profile-source',sha256:profile.sourceSha256}]});
}
export function uwhCoordinationEvent(record, kind, context) {
  const p=record?.packet,a=p?.work_contract?.assignments?.at(-1),review=p?.work_contract?.review?.status;
  if(record?.schema_version!=='attended-coordination.v1' || !/^[a-f0-9]{64}$/.test(a?.digest??'') || !a?.engineering_purpose) throw Error('Unsupported coordination projection');
  const valid={offer_recorded:p.work_contract.disposition==='offered',recipient_accepted:p.work_contract.disposition==='accepted',execution_started:p.status==='active' && p.checkpoints?.at(-1)?.kind==='resumed',result_received:review==='submitted',review_recorded:['accepted','closed'].includes(review),stop_recorded:p.status==='paused'};
  if(!valid[kind]) throw Error('Observation does not match the supplied coordination state');
  return makeEvent({...context,purpose:a.engineering_purpose,kind,state:kind==='review_recorded'?review:p.status,task:{...context.task,assignment_digest:a.digest}});
}
export function uwhReceiptEvent(receipt, context) {
  if(!/^unified\.contract-executor-receipt\.v[1-6]$/.test(receipt?.schema_version??'') || !/^[a-f0-9]{64}$/.test(receipt.assignment_digest??'') || receipt.review_status!=='pending') throw Error('Unsupported receipt projection');
  return makeEvent({...context,kind:'result_received',state:'review_pending',task:{...context.task,assignment_digest:receipt.assignment_digest}});
}
export function workerFailureEvent({code,phase},context) {
  return makeEvent({...context,kind:'execution_failed',state:'failed',reason:code,phase});
}
