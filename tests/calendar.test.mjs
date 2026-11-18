// Run: node tests/calendar.test.mjs
// Checks the engine against the LCMS published calendars (2024–25 C, 2025–26 A, 2026–27 B)
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/lectionary.js', 'js/calendar.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const CY = ctx.CHURCH_YEAR;

let fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(got)}${ok ? '' : ' (want ' + JSON.stringify(want) + ')'}`);
};
const find = (yr, key) => yr.days.find((d) => d.key === key);

// Official LCMS calendar dates
const checks = {
  2024: { series: 'C', advent1: '2024-12-01', baptism: '2025-01-12', transfiguration: '2025-03-02', ashWednesday: '2025-03-05', easter: '2025-04-20', pentecost: '2025-06-08', proper7: '2025-06-22', lastSunday: '2025-11-23', thanksgiving: '2025-11-27' },
  2025: { series: 'A', advent1: '2025-11-30', christmas1: '2025-12-28', christmas2: '2026-01-04', baptism: '2026-01-11', transfiguration: '2026-02-15', easter: '2026-04-05', trinity: '2026-05-31', proper5: '2026-06-07', proper25: '2026-10-25', lastSunday: '2026-11-22' },
  2026: { series: 'B', advent1: '2026-11-29', advent4: '2026-12-20', christmas1: '2026-12-27', christmas2: '2027-01-03', baptism: '2027-01-10', epiphany2: '2027-01-17', epiphany3: '2027-01-24', epiphany4: '2027-01-31', transfiguration: '2027-02-07', ashWednesday: '2027-02-10', palmSunday: '2027-03-21', easter: '2027-03-28', ascension: '2027-05-06', pentecost: '2027-05-16', trinity: '2027-05-23', proper4: '2027-05-30', proper13: '2027-08-01', proper28: '2027-11-14', lastSunday: '2027-11-21', thanksgiving: '2027-11-25' },
};
for (const [y, want] of Object.entries(checks)) {
  const yr = CY.buildYear(+y);
  eq(`${yr.label} series`, yr.series, want.series);
  for (const [k, d] of Object.entries(want)) if (k !== 'series') eq(`${yr.label} ${k}`, (find(yr, k) || {}).date, d);
}

// Spot-check readings vs. the 2026–27 Series B calendar
const b = CY.buildYear(2026);
eq('B Epiphany 3 gospel', find(b, 'epiphany3').readings[3], 'Mark 1:14–20');
eq('B Transfiguration gospel', find(b, 'transfiguration').readings[3], 'Mark 9:2–9');
eq('B Advent 3 OT', find(b, 'advent3').readings[0], 'Isaiah 61:1–4, 8–11');
eq('B St. Timothy on Epiphany 3', (find(b, 'epiphany3').festivals || []).map((f) => f.key), ['timothy']);
eq('B All Saints observed Nov 7', b.days.find((d) => d.date === '2027-11-07').festivals.map((f) => f.key), ['allSaints']);
eq('B Reformation on Sunday Oct 31', b.days.find((d) => d.date === '2027-10-31').festivals.map((f) => f.key), ['reformation']);

// Every Sunday in the next three years has readings
for (const y of [2026, 2027, 2028]) {
  const yr = CY.buildYear(y);
  const missing = yr.days.filter((d) => !d.readings).map((d) => `${d.date} ${d.key}`);
  eq(`${yr.label} (${yr.series}) days missing readings`, missing, []);
  console.log(`     ${yr.label}: ${yr.days.length} days, Advent ${yr.start}, Easter ${yr.easter}, verify-flagged: ${yr.days.filter((d) => d.verify).map((d) => d.key).join(', ') || 'none'}`);
}
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
