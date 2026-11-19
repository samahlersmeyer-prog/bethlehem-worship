// Uploads Bethlehem's licensed Ed Riojas art (art/*.png) into Firestore, config/art-<id>,
// so only the signed-in team can load it (the art folder is never deployed to the public site).
// Skips images that haven't changed since the last upload.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'art');
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const manRef = db.doc('config/art-manifest');
const man = (await manRef.get()).data() || {};
let up = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png'))) {
  const id = f.slice(0, -4); const buf = fs.readFileSync(path.join(dir, f));
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  if (man[id] === hash) continue;
  await db.doc(`config/art-${id}`).set({ png: buf.toString('base64'), bytes: buf.length });
  man[id] = hash; up++;
  if (up % 50 === 0) { await manRef.set(man); console.log(`uploaded ${up}…`); }
}
await manRef.set(man);
console.log(`art: ${up} uploaded, ${Object.keys(man).length} total`);
