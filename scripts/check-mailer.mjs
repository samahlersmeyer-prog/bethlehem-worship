// Hourly: fails (so GitHub emails Sam) when the Apps Script mailer has stopped checking in,
// or when an email has sat in a plan's outbox for more than 20 minutes.
// Local test: MAILER_AT=2026-11-19T03:05:00Z PLANS_FILE=plans.json node check-mailer.mjs
import fs from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let at = process.env.MAILER_AT || null; const plans = {};
if (process.env.PLANS_FILE) Object.assign(plans, JSON.parse(fs.readFileSync(process.env.PLANS_FILE, 'utf8')));
else {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = getFirestore();
  const m = await db.doc('config/mailer').get(); at = m.exists ? m.data().at : null;
  (await db.collection('plans').where('outboxPending', '==', true).get()).forEach((d) => { plans[d.id] = d.data(); });
}
const problems = [];
const quietMin = at ? Math.round((Date.now() - Date.parse(at)) / 60e3) : Infinity;
if (quietMin > 30) problems.push(at ? `The mailer last checked in ${quietMin} minutes ago (${at}).` : 'The mailer has never checked in.');
for (const [k, p] of Object.entries(plans)) for (const m of p.outbox || []) {
  if (m.pending && p.outboxPending && Date.now() - Date.parse(m.at) > 20 * 60e3) problems.push(`Unsent since ${m.at}: "${m.subject}" to ${m.to} (plan ${k}).`);
}
if (problems.length) {
  console.error(['Bethlehem Worship Planner: automatic email is not working.', ...problems, '',
    'Fix: script.google.com → the Bethlehem Worship Planner mailer → check Executions for errors, then run setup() once.',
    'Queued emails send on the next run.'].join('\n'));
  process.exit(1);
}
console.log(`Mailer OK: last check-in ${quietMin} min ago; nothing stuck.`);
