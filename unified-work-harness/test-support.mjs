// Synthetic destinations count every request, including redirect-induced GETs without a body.
import { createServer } from 'node:http';

export const redirectStatuses = [301, 302, 303, 307, 308];

export async function observeDestination(t) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({method:req.method, path:req.url});
    req.resume();
    res.writeHead(400).end();
  });
  await new Promise((resolve,reject) => server.once('error',reject).listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return {requests,url:`http://127.0.0.1:${server.address().port}/unoffered`};
}

// Model a persisted caller restoring active flags after the reviewer paused it.
// Keep the old checkpoint intact so the regression tests exercise rework ordering.
export function reworkFixture(h,active) {
  const offer=h.currentAssignment(active);
  const at=active.checkpoints.at(-1).at;
  const submitted=h.reviewWork(active,{at,decision:'submit',by:offer.recipient,note:'initial submission',evidence:'initial evidence'});
  const paused=h.reviewWork(submitted,{at,decision:'rework',by:offer.reviewer,note:'revise work',evidence:'review evidence'});
  const stale=structuredClone(paused);
  stale.status='active';
  stale.handoff.current_writer=offer.recipient;
  return {paused,stale};
}
