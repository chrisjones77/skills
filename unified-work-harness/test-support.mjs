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
