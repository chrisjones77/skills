// Deliberately preserve both exercise revisions so a reviewer can reproduce the regression.
import { readFileSync } from 'node:fs';
const revision = process.argv[2];
if (!['r1', 'r2'].includes(revision)) throw new Error('Choose r1 or r2');
const rows = readFileSync(new URL('./samples.csv', import.meta.url), 'utf8').trimEnd().split('\n').slice(1);
for (const row of rows) {
  const [bin, observation] = row.split(',');
  const label = revision === 'r1' && observation === '' ? 'Unobserved'
    : Number(observation) === 0 ? 'Empty' : 'Available';
  console.log(bin, label);
}
