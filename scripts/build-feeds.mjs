// Nightly: reads plans from Firestore and writes
//   feeds/<token>.ics        — private calendar feed for the team (unguessable URL)
//   public/this-sunday.json  — public data for the "This Sunday" box on bethlehemlcms.org
// Also stores the feed URL in Firestore (config/feed) so the app can show it.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['js/lectionary.js', 'js/calendar.js', 'js/hymns.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const CY = ctx.CHURCH_YEAR, HY = ctx.HYMNS;

// Local test: PLANS_FILE=plans.json node build-feeds.mjs (no Firestore)
const LOCAL = process.env.PLANS_FILE;
const sa = LOCAL ? { private_key_id: 'local-test' } : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
let db = null; const plans = {};
if (LOCAL) Object.assign(plans, JSON.parse(fs.readFileSync(LOCAL, 'utf8')));
else { initializeApp({ credential: cert(sa) }); db = getFirestore(); (await db.collection('plans').get()).forEach((d) => { plans[d.id] = d.data(); }); }

const TZ = 'America/Indiana/Indianapolis';
const todayET = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
const thisYear = CY.yearOf(CY.parse(todayET));
const days = [thisYear - 1, thisYear, thisYear + 1].flatMap((y) => CY.buildYear(y).days);
const servedOn = (k, p) => (p && p.custom ? p.date : (p && p.observedDate) || k);

// Every service entry: church-year days plus custom services
const entries = days.map((d) => ({ key: d.date, day: d, plan: plans[d.date] }))
  .concat(Object.entries(plans).filter(([, p]) => p.custom).map(([k, p]) => ({ key: k, day: { date: p.date, name: p.name, kind: 'custom', color: p.color }, plan: p })));
const info = (e) => {
  const p = e.plan || {}, d = e.day;
  const obs = p.observe && (d.festivals || []).find((f) => f.key === p.observe);
  return { date: servedOn(e.key, p), name: obs ? obs.name : d.name, color: obs ? obs.color : d.color,
    readings: p.readingsOverride || (obs && obs.readings && obs.readings.r) || d.readings || null };
};
const isHymn = (s) => /hymn|distribution|prelude|postlude|candle|offering|psalm/i.test(s.label) || /"/.test(s.value || '');
const LBL = ['First Reading', 'Psalm', 'Epistle', 'Gospel'];

// ---------- ICS ----------
const icsEsc = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fold = (line) => line.match(/.{1,73}/g).join('\r\n ');
const ymd = (iso) => iso.replace(/-/g, '');
function serviceTimes(date, svc) {
  const out = [];
  for (const s of svc) {
    const m = String(s.label).match(/(\d{1,2})(?::(\d\d))?\s*(am|pm)/i);
    let d = date;
    if (/\bsat/i.test(s.label) && CY.dow(CY.parse(date)) === 0) d = CY.iso(CY.add(CY.parse(date), -1));
    const md = String(s.label).match(/\b(\w{3}) (\d{1,2})\b/); // e.g. "Saturday Dec 19"
    if (md && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(md[1])) {
      const mi = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(md[1].toLowerCase());
      const y = +date.slice(0, 4) - (mi === 11 && date.slice(5, 7) === '01' ? 1 : 0);
      d = CY.iso(CY.D(y, mi + 1, +md[2]));
    }
    if (!m) { out.push({ allDay: true, d, label: s.label, musician: s.musician }); continue; }
    let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12;
    out.push({ d, h, min: +(m[2] || 0), label: s.label, musician: s.musician });
  }
  return out;
}
const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bethlehem Lutheran//Worship Planner//EN', 'CALSCALE:GREGORIAN',
  'X-WR-CALNAME:Bethlehem Worship', `X-WR-TIMEZONE:${TZ}`];
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
for (const e of entries) {
  const p = e.plan; const i = info(e);
  if (!p && e.day.kind !== 'sunday') continue;
  const desc = [i.name, p && p.setting, i.readings && i.readings.map((r, k) => `${LBL[k]}: ${r}`).join('\n'),
    p && p.sermonTitle && `Sermon: "${p.sermonTitle}"${p.preacher ? ' — ' + p.preacher : ''}`,
    p && (p.slots || []).filter((s) => s.value && isHymn(s)).map((s) => `${s.label}: ${s.value}`).join('\n'),
    p && p.locked && 'FINAL'].filter(Boolean).join('\n\n');
  const svcs = p && p.services && p.services.length ? serviceTimes(i.date, p.services) : [{ allDay: true, d: i.date, label: '' }];
  svcs.forEach((s, n) => {
    lines.push('BEGIN:VEVENT', `UID:${e.key}-${n}@bethlehem-worship`, `DTSTAMP:${stamp}`);
    if (s.allDay) lines.push(`DTSTART;VALUE=DATE:${ymd(s.d)}`);
    else { const t = `${ymd(s.d)}T${String(s.h).padStart(2, '0')}${String(s.min).padStart(2, '0')}00`;
      lines.push(`DTSTART;TZID=${TZ}:${t}`, 'DURATION:PT1H15M'); }
    lines.push(fold(`SUMMARY:${icsEsc(i.name + (s.musician ? ` (${s.musician})` : ''))}`), fold(`DESCRIPTION:${icsEsc(desc)}`), 'END:VEVENT');
  });
}
lines.push('END:VCALENDAR');
const token = crypto.createHash('sha256').update(sa.private_key_id + ':bethlehem-feed').digest('hex').slice(0, 24);
fs.mkdirSync(path.join(root, 'feeds'), { recursive: true });
fs.writeFileSync(path.join(root, 'feeds', `${token}.ics`), lines.join('\r\n') + '\r\n');

// ---------- This Sunday (public) ----------
const pub = entries.map((e) => ({ e, i: info(e) })).filter(({ e, i }) => i.date >= todayET && (e.day.kind === 'sunday' || (e.plan && e.plan.observedDate)))
  .sort((a, b) => a.i.date.localeCompare(b.i.date));
const toPublic = ({ e, i }) => { const p = e.plan || {};
  return { date: i.date, name: i.name, color: i.color, readings: i.readings ? Object.fromEntries(i.readings.map((r, k) => [LBL[k], r])) : null,
    sermonTitle: p.sermonTitle || null, preacher: p.preacher || null,
    hymns: (p.slots || []).filter((s) => s.value && isHymn(s) && /hymn/i.test(s.label)).map((s) => ({ label: s.label, hymn: s.value.replace(/^LSB /, 'LSB ') })),
    services: (p.services || []).map((s) => s.label) }; };
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'this-sunday.json'), JSON.stringify({
  updated: new Date().toISOString(), church: 'Bethlehem Lutheran Church', thisSunday: pub[0] ? toPublic(pub[0]) : null,
  upcoming: pub.slice(1, 5).map(toPublic).map(({ date, name, sermonTitle, readings }) => ({ date, name, sermonTitle, gospel: readings && readings.Gospel })),
}, null, 1));

const url = `https://bethlehem-worship.web.app/feeds/${token}.ics`;
if (db) await db.collection('config').doc('feed').set({ url, updated: new Date().toISOString() });
console.log('feed', lines.filter((l) => l === 'BEGIN:VEVENT').length, 'events; this Sunday:', pub[0] && pub[0].i.name);
