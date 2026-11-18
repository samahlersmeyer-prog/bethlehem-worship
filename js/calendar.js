/*
 * Church-year engine (LSB three-year lectionary, LCMS customs).
 * Builds every Sunday and principal feast from the First Sunday in Advent
 * to the day before the next Advent, with series, readings and color.
 */
(function (root) {
  const L = root.LECTIONARY;
  const DAY = 86400000;

  // ---- date helpers (all UTC to avoid DST drift) ----
  const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const add = (dt, n) => new Date(dt.getTime() + n * DAY);
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return D(y, m, d); };
  const dow = (dt) => dt.getUTCDay();
  const sundayOnOrAfter = (dt) => add(dt, (7 - dow(dt)) % 7);
  const sundayOnOrBefore = (dt) => add(dt, -dow(dt));
  const sundayAfter = (dt) => add(dt, 7 - dow(dt) || 7);

  // Gregorian Easter (Anonymous / Meeus algorithm)
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return D(y, month, day);
  }

  // First Sunday in Advent: the Sunday nearest Nov 30 (Nov 27 – Dec 3)
  const advent1 = (y) => sundayOnOrAfter(D(y, 11, 27));

  // Church year starting Advent of `y`: 2025→A, 2026→B, 2027→C
  const seriesFor = (y) => ['A', 'B', 'C'][(((y - 2025) % 3) + 3) % 3];

  const ORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
    'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth',
    'Nineteenth', 'Twentieth', 'Twenty-first', 'Twenty-second', 'Twenty-third', 'Twenty-fourth', 'Twenty-fifth',
    'Twenty-sixth', 'Twenty-seventh', 'Twenty-eighth'];

  // Proper number from the Sunday's date (LSB follows the RCL date ranges)
  function properFor(dt) {
    // Proper 4 = Sunday between May 29 and June 4
    const y = dt.getUTCFullYear();
    const start = D(y, 5, 29);
    const n = 4 + Math.floor((dt - start) / (7 * DAY));
    return n;
  }

  const COLORS = {
    blue: '#2f4f8f', violet: '#5b3a7a', white: '#e9e3d3', green: '#3f6b3a',
    red: '#a52a2a', scarlet: '#8c1c2c', black: '#222', gold: '#b8902e',
  };

  // Customary liturgical notes (LSB / LCMS practice) by season or day
  const NOTES = {
    advent: ['Hymn of Praise (Gloria in Excelsis) is customarily omitted in Advent.', 'Color: blue (violet permitted).'],
    christmas: ['Gloria in Excelsis returns.'],
    epiphanyGreen: ['Time after the Epiphany — the manifestation of Christ to the nations.'],
    transfiguration: ['Last Sunday before Lent — the Alleluia is "buried" after today until Easter.'],
    ashWednesday: ['Imposition of ashes may be offered. Color: black (violet permitted).'],
    lent: ['Gloria in Excelsis and Alleluias are omitted in Lent; use the Verse for Lent.', 'Color: violet.'],
    holyWeek: ['Holy Week — the Gloria and Alleluia remain omitted.'],
    maundy: ['Stripping of the altar may follow the Distribution. Many congregations omit the benediction (service continues Good Friday).'],
    goodFriday: ['No Sacrament; Tre Ore or Service of the Word. Altar bare or black paraments.'],
    easter: ['Alleluias restored — "This Is the Feast" is fitting as Hymn of Praise.'],
    pentecost: ['Color: red.'],
    trinity: ['The Athanasian Creed may be confessed (LSB pp. 319–20).'],
    afterPentecost: ['Time of the Church — green paraments.'],
    reformation: ['Color: red. "A Mighty Fortress" (LSB 656/657) is customary.'],
    allSaints: ['Commemoration of the faithful departed may be read.'],
  };

  function entry(dt, key, name, opts = {}) {
    return Object.assign({ date: iso(dt), key, name, kind: 'sunday', season: '', color: 'green', notes: [] }, opts);
  }

  /**
   * Build the church year that begins at Advent of `year` (e.g. 2026 → 2026–27, Series B).
   */
  function buildYear(year) {
    const series = seriesFor(year);
    const a1 = advent1(year);
    const nextA1 = advent1(year + 1);
    const E = easter(year + 1);
    const out = [];

    // Advent
    ['First', 'Second', 'Third', 'Fourth'].forEach((o, i) => {
      out.push(entry(add(a1, 7 * i), 'advent' + (i + 1), `${o} Sunday in Advent`, { season: 'Advent', color: 'blue', notes: NOTES.advent }));
    });

    // Christmas
    const xmas = D(year, 12, 25);
    out.push(entry(add(xmas, -1), 'christmasEve', 'Christmas Eve — The Nativity of Our Lord', { kind: 'feast', season: 'Christmas', color: 'white', notes: NOTES.christmas }));
    out.push(entry(xmas, 'christmasDay', 'Christmas Day — The Nativity of Our Lord', { kind: 'feast', season: 'Christmas', color: 'white', notes: NOTES.christmas,
      alts: ['christmasMidnight', 'christmasDawn'] }));
    const c1 = sundayAfter(xmas);
    if (c1 < D(year + 1, 1, 6)) out.push(entry(c1, 'christmas1', 'First Sunday after Christmas', { season: 'Christmas', color: 'white' }));
    out.push(entry(D(year, 12, 31), 'newYearsEve', "New Year's Eve — Eve of the Circumcision and Name of Jesus", { kind: 'feast', season: 'Christmas', color: 'white' }));
    out.push(entry(D(year + 1, 1, 1), 'circumcision', 'Circumcision and Name of Jesus', { kind: 'feast', season: 'Christmas', color: 'white' }));
    const c2 = add(c1, 7);
    if (c2 < D(year + 1, 1, 6)) out.push(entry(c2, 'christmas2', 'Second Sunday after Christmas', { season: 'Christmas', color: 'white' }));

    // Epiphany
    const epi = D(year + 1, 1, 6);
    out.push(entry(epi, 'epiphany', 'The Epiphany of Our Lord', { kind: dow(epi) === 0 ? 'sunday' : 'feast', season: 'Epiphany', color: 'white' }));
    const bap = sundayAfter(epi);
    out.push(entry(bap, 'baptism', 'The Baptism of Our Lord', { season: 'Epiphany', color: 'white' }));
    const ash = add(E, -46);
    const transfig = add(ash, -3);
    let n = 2;
    for (let s = add(bap, 7); s < transfig; s = add(s, 7), n++) {
      out.push(entry(s, 'epiphany' + n, `${ORD[n]} Sunday after the Epiphany`, { season: 'Epiphany', color: 'green', notes: NOTES.epiphanyGreen }));
    }
    out.push(entry(transfig, 'transfiguration', 'The Transfiguration of Our Lord', { season: 'Epiphany', color: 'white', notes: NOTES.transfiguration }));

    // Lent & Holy Week
    out.push(entry(ash, 'ashWednesday', 'Ash Wednesday', { kind: 'feast', season: 'Lent', color: 'black', notes: NOTES.ashWednesday }));
    for (let i = 1; i <= 5; i++) {
      out.push(entry(add(ash, 4 + 7 * (i - 1)), 'lent' + i, `${ORD[i]} Sunday in Lent`, { season: 'Lent', color: 'violet', notes: NOTES.lent }));
    }
    out.push(entry(add(E, -7), 'palmSunday', 'Palm Sunday — Sunday of the Passion', { season: 'Holy Week', color: 'scarlet', notes: NOTES.holyWeek }));
    out.push(entry(add(E, -3), 'maundyThursday', 'Holy (Maundy) Thursday', { kind: 'feast', season: 'Holy Week', color: 'scarlet', notes: NOTES.maundy }));
    out.push(entry(add(E, -2), 'goodFriday', 'Good Friday', { kind: 'feast', season: 'Holy Week', color: 'black', notes: NOTES.goodFriday }));

    // Easter
    out.push(entry(E, 'easter', 'The Resurrection of Our Lord — Easter Day', { season: 'Easter', color: 'gold', notes: NOTES.easter, alts: ['easterSunrise'] }));
    for (let i = 2; i <= 7; i++) {
      out.push(entry(add(E, 7 * (i - 1)), 'easter' + i, `${ORD[i]} Sunday of Easter`, { season: 'Easter', color: 'white' }));
    }
    out.push(entry(add(E, 39), 'ascension', 'The Ascension of Our Lord', { kind: 'feast', season: 'Easter', color: 'white' }));
    out.push(entry(add(E, 49), 'pentecost', 'The Day of Pentecost', { season: 'Pentecost', color: 'red', notes: NOTES.pentecost }));
    const trin = add(E, 56);
    out.push(entry(trin, 'trinity', 'The Holy Trinity', { season: 'Pentecost', color: 'white', notes: NOTES.trinity }));

    // Sundays after Pentecost
    const last = add(nextA1, -7);
    let k = 2;
    for (let s = add(trin, 7); s < last; s = add(s, 7), k++) {
      const p = properFor(s);
      out.push(entry(s, 'proper' + p, `${ORD[k]} Sunday after Pentecost`, { season: 'After Pentecost', color: 'green', proper: p, notes: NOTES.afterPentecost }));
    }
    out.push(entry(last, 'lastSunday', 'Last Sunday of the Church Year', { season: 'After Pentecost', color: 'green', proper: 29 }));

    // Thanksgiving (4th Thursday of November)
    const nov1 = D(year + 1, 11, 1);
    const thx = add(nov1, ((4 - dow(nov1) + 7) % 7) + 21);
    out.push(entry(thx, 'thanksgiving', 'Day of Thanksgiving', { kind: 'feast', season: 'After Pentecost', color: 'white' }));

    // Ascension Day, Reformation, All Saints
    const ref = D(year + 1, 10, 31);
    const refObs = sundayOnOrBefore(ref);
    const as = D(year + 1, 11, 1);
    const asObs = sundayOnOrAfter(as);
    attachOrAdd(out, ref, refObs, 'reformation', 'Reformation Day', 'red', NOTES.reformation);
    attachOrAdd(out, as, asObs, 'allSaints', "All Saints' Day", 'white', NOTES.allSaints);

    // Fixed-date feasts that fall on a Sunday become alternates on that Sunday
    const byDate = new Map(out.map((e) => [e.date, e]));
    const start = a1, end = nextA1;
    for (const [m, d, key, name, color] of L.FEASTS) {
      for (const y of [year, year + 1]) {
        const f = D(y, m, d);
        if (f < start || f >= end || dow(f) !== 0) continue;
        const host = byDate.get(iso(f));
        if (!host) continue;
        // Principal seasons (Advent–Easter Sundays, Christmas) keep precedence
        host.festivals = host.festivals || [];
        host.festivals.push({ key, name, color, readings: L.readings(key, series) });
      }
    }

    // Finalize readings
    for (const e of out) {
      e.series = series;
      const r = L.readings(e.key, series);
      e.readings = r ? r.r : null;
      e.verify = !!(r && r.verify);
      if (e.alts) e.altReadings = e.alts.map((k2) => ({ key: k2, name: altName(k2), readings: (L.readings(k2, series) || {}).r }));
    }

    out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : (x.kind === 'sunday' ? -1 : 1)));
    return { year, label: `${year}–${String(year + 1).slice(2)}`, series, start: iso(a1), end: iso(add(nextA1, -1)), easter: iso(E), days: out };
  }

  function attachOrAdd(out, actual, observed, key, name, color, notes) {
    const host = out.find((e) => e.date === iso(observed) && e.kind === 'sunday');
    if (iso(actual) === iso(observed)) {
      // Feast falls on Sunday: offered as an option on that Sunday
      if (host) (host.festivals = host.festivals || []).push({ key, name, color, readings: L.readings(key, 'A'), primary: true, notes });
      return;
    }
    out.push(entry(actual, key, name, { kind: 'feast', season: 'After Pentecost', color, notes }));
    if (host) (host.festivals = host.festivals || []).push({ key, name: `${name} (observed)`, color, readings: L.readings(key, 'A'), notes });
  }

  function altName(k) {
    return { christmasMidnight: 'Christmas Midnight', christmasDawn: 'Christmas Dawn', easterSunrise: 'Easter Sunrise' }[k] || k;
  }

  // Church year containing a date
  function yearOf(dt) {
    const y = dt.getUTCFullYear();
    return dt >= advent1(y) ? y : y - 1;
  }

  root.CHURCH_YEAR = { buildYear, easter, advent1, seriesFor, yearOf, properFor, iso, parse, add, dow, COLORS, D };
})(typeof window !== 'undefined' ? window : globalThis);
