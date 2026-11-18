/* Bethlehem Worship Planner — UI */
(function () {
  const CY = window.CHURCH_YEAR;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmt = (isoDate) => { const d = CY.parse(isoDate); return `${WD[CY.dow(d)]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  const fmtLong = (isoDate) => { const d = CY.parse(isoDate); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
  const weekend = (isoDate) => {
    const d = CY.parse(isoDate); const sat = CY.add(d, -1);
    return `Sat ${MON[sat.getUTCMonth()]} ${sat.getUTCDate()} / Sun ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
  };
  // When a service is kept on a different day than the calendar date (e.g. Epiphany on Sunday)
  const whenLabel = (isoDate) => CY.dow(CY.parse(isoDate)) === 0 ? weekend(isoDate) : fmt(isoDate);
  const servedOn = (key, p) => (p && p.custom ? p.date : (p && p.observedDate) || key);
  const READ_LABELS = ['First Reading', 'Psalm', 'Epistle', 'Gospel'];
  const SETTINGS = ['Divine Service, Setting One', 'Divine Service, Setting Two', 'Divine Service, Setting Three',
    'Divine Service, Setting Four', 'Divine Service, Setting Five', 'Matins', 'Vespers', 'Morning Prayer',
    'Evening Prayer', 'Service of Prayer and Preaching', 'Other'];

  const ADMINS = ['ben.ahlersmeyer@gmail.com', 'sam.ahlersmeyer@gmail.com'];
  // Where each order begins in the Lutheran Service Book pew edition
  const LSB_PAGE = { 'Divine Service, Setting One': 151, 'Divine Service, Setting Two': 167, 'Divine Service, Setting Three': 184,
    'Divine Service, Setting Four': 203, 'Divine Service, Setting Five': 213, Matins: 219, Vespers: 229, 'Morning Prayer': 235,
    'Evening Prayer': 243, 'Service of Prayer and Preaching': 260 };
  // Hymns the LSB Hymn License does not cover (CPH)
  const NOT_IN_HYMN_LICENSE = { 'LSB 462': 'tune', 'LSB 712': 'text and tune' };
  const DEFAULT_SETTINGS = {
    churchName: 'Bethlehem Lutheran Church',
    churchLine: 'Lutheran Church—Missouri Synod · Fort Wayne, Indiana',
    welcome: 'Welcome in the name of our Lord Jesus Christ! We are glad you are here. The service is in the Lutheran Service Book in the pew; page and hymn numbers are listed below. Please sign the friendship register, and let an usher know if you need anything.',
    communion: 'At Bethlehem we practice closed communion, as do all congregations of the Lutheran Church—Missouri Synod. The Lord\'s Supper is a confession of the faith we share (1 Corinthians 10:17; 11:27–29). Communicant members of LCMS congregations who are prepared to receive the Sacrament are welcome to commune. If you are visiting, or have not yet been instructed in the Lutheran faith, we ask that you speak with Pastor before the service; you are welcome to come forward for a blessing with your arms crossed.',
    choirs: 'Adult Choir, Children\'s Choir, Handbell Choir',
    lsbLiturgy: '', lsbHymn: '', oneLicense: '', ccli: '',
    ackExtra: '',
    anthems: {},
  };
  const conf = () => Object.assign({}, DEFAULT_SETTINGS, store.settings || {});
  const ROLES = ['Lector', 'Acolyte', 'Communion Assistant', 'Elder on Duty', 'Usher', 'Altar Guild'];
  const HY = window.HYMNS;
  let store, years = {}, curYear, view = { name: 'calendar' }, saveTimer = null, draft = null, pending = false;

  // ---------- Church year data ----------
  const yearData = (y) => (years[y] = years[y] || CY.buildYear(y));
  function allDays() {
    const out = [];
    for (const y of [curYear - 1, curYear, curYear + 1]) out.push(...yearData(y).days);
    return out;
  }
  function findDay(key) {
    if (key.startsWith('custom-')) {
      const p = store.get(key);
      return p ? { date: p.date, key, name: p.name, kind: 'custom', color: p.color || 'white', season: 'Special', readings: null, notes: [] } : null;
    }
    const y = CY.yearOf(CY.parse(key));
    return yearData(y).days.find((d) => d.date === key && d.kind !== 'feast-alt') || null;
  }

  // ---------- Default order of service ----------
  function defaultSlots(setting, day) {
    const S = (label, value = '') => ({ label, value, note: '' });
    const season = day.season;
    const praise = season === 'Advent' ? 'None (omitted in Advent)' : (season === 'Lent' || season === 'Holy Week') ? 'None (omitted in Lent)' : '';
    const alleluia = (season === 'Lent' || season === 'Holy Week') ? 'Verse for Lent' : '';
    const creed = day.key === 'trinity' ? 'Athanasian Creed (LSB 319)' : 'Nicene';
    let slots;
    if (/Three/.test(setting)) {
      slots = [S('Opening Hymn'), S('Hymn of Praise', praise), S('Gospel Alleluia', alleluia || '190 Alleluia & Verse'),
        S('Sermon Hymn'), S('Creed', creed), S('Offertory', '192–193'), S('Sanctus / Agnus Dei', 'Sanctus 195, Agnus Dei 198'),
        S('Distribution', 'Prayerful Meditation'), S('Nunc Dimittis', '199'), S('Closing Hymn')];
    } else if (/Four/.test(setting)) {
      slots = [S('Prelude'), S('Opening Hymn'), S('Hymn of Praise', praise), S('Gospel Alleluia', alleluia), S('Sermon Hymn'),
        S('Creed', creed === 'Nicene' ? 'Nicene — LSB 206' : creed), S('Prayer of the Church'), S('Offertory', 'LSB 159–160'),
        S('Sanctus / Agnus Dei', 'LSB 208 Sanctus, 210 Agnus Dei'), S('Distribution', 'Prayerful Meditation'),
        S('Post-Communion', 'LSB 211'), S('Closing Hymn'), S('Postlude')];
    } else if (/Divine Service/.test(setting)) {
      slots = [S('Prelude'), S('Opening Hymn'), S('Hymn of Praise', praise), S('Gospel Acclamation', alleluia),
        S('Sermon Hymn'), S('Creed', creed), S('Offertory'), S('Sanctus'), S('Agnus Dei'), S('Distribution'),
        S('Post-Communion Canticle'), S('Closing Hymn'), S('Postlude')];
    } else {
      slots = [S('Prelude'), S('Opening Hymn'), S('Psalmody'), S('Office Hymn'), S('Sermon Hymn'), S('Canticle'), S('Closing Hymn'), S('Postlude')];
    }
    if (season === 'Advent' && !/Three/.test(setting)) slots.splice(3, 0, S('Candle Lighting Ceremony', 'TFBF 37 "He Came Down"'));
    return slots;
  }
  function newPlan(day) {
    const setting = (day.season === 'Advent') ? 'Divine Service, Setting Four' : 'Divine Service, Setting Three';
    const isSun = CY.dow(CY.parse(day.date)) === 0;
    const slots = defaultSlots(setting, day);
    const hd = HY.hotd(day.key, day.series || 'A')[0];
    const sh = slots.find((x) => x.label === 'Sermon Hymn');
    if (hd && sh && !sh.value) { sh.value = `LSB ${hd.n} "${hd.title}"`; sh.note = 'Hymn of the Day'; }
    return {
      setting,
      services: isSun ? [{ label: 'Saturday 4:00 pm', musician: '' }, { label: 'Sunday 9:00 am', musician: '' }] : [{ label: 'Service', musician: '' }],
      slots, sermonTitle: '', preacher: '', sermonNotes: '', notes: '', flags: [],
    };
  }

  // ---------- Hymn index ----------
  const isHymnSlot = (s) => s.kind !== 'choir' && /hymn|distribution|prelude|postlude|candle|offering|psalm/i.test(s.label) || /"/.test(s.value || '');
  // ---------- Choir ----------
  const anthemKey = (t, c) => (String(t || '').trim() + '|' + String(c || '').trim()).toLowerCase();
  function anthemIndex() {
    const idx = {};
    for (const [k, p] of Object.entries(store.all())) {
      const date = servedOn(k, p);
      for (const s of p.slots || []) {
        if (s.kind !== 'choir' || !s.value) continue;
        const ak = anthemKey(s.value, s.composer);
        const e = (idx[ak] = idx[ak] || { key: ak, title: s.value, composer: s.composer || '', uses: [] });
        e.uses.push({ key: k, date, group: s.group || '' });
      }
    }
    Object.values(idx).forEach((e) => e.uses.sort((a, b) => a.date.localeCompare(b.date)));
    return idx;
  }
  function choirAtLabel(s, p) {
    const svcs = p.services || [];
    if (!s.at || !s.at.length || s.at.length >= svcs.length) return svcs.length > 1 ? 'all services' : '';
    return s.at.map((i) => (svcs[i] || {}).label).filter(Boolean).join(', ') + ' only';
  }
  function choirSlot(s, i, p, key, day, ro, idx) {
    const e = s.value && idx[anthemKey(s.value, s.composer)];
    const t = CY.parse(day.date).getTime();
    const recent = e ? e.uses.filter((u) => u.key !== key && Math.abs(CY.parse(u.date).getTime() - t) <= 365 * 864e5) : [];
    const svcs = p.services || [];
    const edit = store.canEdit && !p.locked;
    return `<div class="slot choir">
      <input class="sl" data-f="slots.${i}.label" value="${esc(s.label)}" ${ro}>
      <div class="choirf">
        <input data-f="slots.${i}.value" value="${esc(s.value)}" placeholder="Anthem title" list="anthemlist" ${ro}>
        <input data-f="slots.${i}.composer" value="${esc(s.composer || '')}" placeholder="Composer / arranger" ${ro}>
        <input data-f="slots.${i}.group" value="${esc(s.group || '')}" placeholder="Choir" list="choirlist" ${ro}>
        <input data-f="slots.${i}.director" value="${esc(s.director || '')}" placeholder="Director" ${ro}>
        ${svcs.length > 1 ? `<span class="chips">${svcs.map((x, j) => `<button class="chip ${!s.at || !s.at.length || s.at.includes(j) ? 'on' : ''}" data-act="choirAt" data-i="${i}" data-j="${j}" ${edit ? '' : 'disabled'}>${esc(x.label)}</button>`).join('')}</span>` : ''}
        <input data-f="slots.${i}.rehearsal" value="${esc(s.rehearsal || '')}" placeholder="Rehearsal (e.g. Wed 7 pm)" ${ro}>
        <input class="sn" data-f="slots.${i}.note" value="${esc(s.note)}" placeholder="note" ${ro}>
      </div>
      ${edit ? `<span class="ops"><button class="icon" data-act="up" data-i="${i}" title="Move up">↑</button><button class="icon" data-act="down" data-i="${i}" title="Move down">↓</button><button class="icon" data-act="delSlot" data-i="${i}" title="Remove">×</button></span>` : ''}
      ${recent.length ? `<div class="warn">Also sung ${esc(recent.map((u) => fmtLong(u.date)).join(', '))}</div>` : ''}
    </div>`;
  }
  function choirView() {
    const today = CY.iso(new Date());
    const idx = anthemIndex();
    const C = conf();
    const rows = [];
    for (const [k, p] of Object.entries(store.all())) {
      const date = servedOn(k, p); if (date < today) continue;
      const day = findDay(k); if (!day) continue;
      for (const s of p.slots || []) if (s.kind === 'choir') rows.push({ k, date, name: p.custom ? p.name : day.name, s, p });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const lib = Object.values(idx).sort((a, b) => a.title.localeCompare(b.title));
    const edit = store.canEdit;
    return `<div class="toolbar"><b>Choir</b><span class="grow"></span><span class="muted">Add an anthem from any weekend's order of service with “+ Choir / anthem”.</span></div>
      <div class="card list"><div class="pad"><b>Coming up</b></div>${rows.map((r) => `<a class="row" href="#day-${esc(r.k)}"><span class="when">${esc(whenLabel(r.date))}</span>
        <span class="what"><b>${esc(r.s.value || 'Anthem TBD')}</b>${r.s.composer ? ` <span class="muted">${esc(r.s.composer)}</span>` : ''}<small>${esc(r.name)}</small></span>
        <span class="uses">${esc([r.s.group, choirAtLabel(r.s, r.p), r.s.rehearsal && 'Rehearsal: ' + r.s.rehearsal].filter(Boolean).join(' · '))}</span></a>`).join('') || '<div class="pad muted">No choir anthems planned yet.</div>'}</div>
      <div class="card list"><div class="pad"><b>Anthem library</b> <span class="muted">— copies owned matter: CCLI and OneLicense do not cover photocopying choral music.</span></div>
      ${lib.map((a) => { const last = a.uses[a.uses.length - 1]; const info = (C.anthems || {})[a.key] || {};
        return `<div class="row static"><span class="what"><b>${esc(a.title)}</b>${a.composer ? ` <span class="muted">${esc(a.composer)}</span>` : ''}</span>
        <span class="uses">${a.uses.length}× · last <a href="#day-${esc(last.key)}">${esc(fmtLong(last.date))}</a></span>
        <span class="ops"><label class="muted">Copies <input class="copies" type="number" min="0" data-anthem="${esc(a.key)}" value="${esc(info.copies ?? '')}" ${edit ? '' : 'disabled'}></label></span></div>`; }).join('') || '<div class="pad muted">Anthems appear here once they are planned.</div>'}</div>`;
  }

  function hymnsIn(plan) {
    const out = [];
    for (const s of plan.slots || []) {
      if (!s.value || !isHymnSlot(s)) continue;
      for (const part of String(s.value).split(/[;,]\s*(?=(?:LSB|TFBF)?\s*\d)/i)) {
        const m = part.match(/^\s*(LSB|TFBF)?\s*(\d{1,4})\b\s*(.*)$/i);
        if (!m) continue;
        const book = (m[1] || 'LSB').toUpperCase();
        out.push({ id: `${book} ${m[2]}`, book, num: +m[2], title: m[3].replace(/["“”]/g, '').trim(), slot: s.label });
      }
    }
    return out;
  }
  function hymnIndex() {
    const idx = {};
    for (const [k, p] of Object.entries(store.all())) {
      const date = servedOn(k, p);
      for (const h of hymnsIn(p)) {
        const e = (idx[h.id] = idx[h.id] || { id: h.id, book: h.book, num: h.num, title: '', uses: [] });
        if (h.title && h.title.length > e.title.length) e.title = h.title;
        e.uses.push({ key: k, date, slot: h.slot });
      }
    }
    Object.values(idx).forEach((e) => e.uses.sort((a, b) => a.date.localeCompare(b.date)));
    return idx;
  }
  function nearbyUses(key, date, hymnId, idx) {
    const e = idx[hymnId]; if (!e) return [];
    const t = CY.parse(date).getTime();
    return e.uses.filter((u) => u.key !== key && Math.abs(CY.parse(u.date).getTime() - t) <= 42 * 864e5);
  }

  // Titles the team has already typed win over the index's guess
  function usedTitles() { const m = {}; for (const e of Object.values(hymnIndex())) if (e.title) m[e.id] = e.title; return m; }
  function expandHymn(v) {
    const m = String(v || '').match(/^\s*(LSB|TFBF)?\s*#?\s*(\d{1,4})\s*$/i);
    if (!m) return v;
    const book = (m[1] || 'LSB').toUpperCase(), n = m[2], id = `${book} ${n}`;
    const t = usedTitles()[id] || HY.titleFor(n, book);
    return t ? `${id} "${t}"` : id;
  }
  let _dl = null;
  function hymnDatalist(idx) {
    if (_dl && _dl.n === Object.keys(idx).length) return _dl.html;
    const seen = new Set(); const opts = [];
    for (const e of Object.values(idx)) { const v = `${e.id}${e.title ? ` "${e.title}"` : ''}`; if (!seen.has(v)) { seen.add(v); opts.push(v); } }
    for (const [n, x] of Object.entries(HY.LSB)) for (const t of [x[0], ...(x[2] || [])]) { const v = `LSB ${n} "${t}"`; if (t && !seen.has(v)) { seen.add(v); opts.push(v); } }
    for (const [n, x] of Object.entries(HY.TFBF)) { const v = `TFBF ${n} "${x[0]}"`; if (!seen.has(v)) { seen.add(v); opts.push(v); } }
    _dl = { n: Object.keys(idx).length, html: `<datalist id="hymnlist">${opts.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>` };
    return _dl.html;
  }
  const isAdmin = () => store.mode === 'local' || (store.user && ADMINS.includes((store.user.email || '').toLowerCase()));
  // Same occasion in the last cycle (3 years earlier)
  function lastCycle(day) {
    if (!day || day.kind === 'custom') return null;
    const y = CY.yearOf(CY.parse(day.date)) - 3;
    const prev = yearData(y).days.find((d) => d.key === day.key);
    const p = prev && store.get(prev.date);
    return p ? { date: prev.date, plan: p, label: yearData(y).label } : null;
  }

  // ---------- Rendering ----------
  function render() {
    const app = $('#app');
    $('#mode').innerHTML = store.mode === 'local'
      ? '<span class="badge">Preview — saved on this device only</span>'
      : store.user ? `<span class="who">${esc(store.user.name)}</span> <button class="link" id="signout">Sign out</button>` : '';
    if (store.mode === 'firebase' && !store.user) return void (app.innerHTML = signInView());
    if (store.error && !store.canEdit) return void (app.innerHTML = `<div class="card pad"><p>${esc(store.error)}</p></div>`);
    document.querySelectorAll('nav.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === view.name || (view.name === 'day' && b.dataset.view === 'calendar')));
    if (view.name === 'day') app.innerHTML = dayView(view.key);
    else if (view.name === 'hymns') app.innerHTML = hymnsView();
    else if (view.name === 'series') app.innerHTML = seriesView();
    else if (view.name === 'reports') app.innerHTML = reportsView();
    else if (view.name === 'choir') app.innerHTML = choirView();
    else app.innerHTML = calendarView();
  }

  function signInView() {
    if (store.isLinkSignIn && store.isLinkSignIn()) {
      return `<div class="card pad center"><h2>Almost there</h2><p>Confirm the email address this sign-in link was sent to.</p>
        <div class="linkrow"><input id="linkEmail" type="email" value="${esc(store.linkEmail() || '')}" placeholder="you@example.com"><button class="primary" id="finishLink">Sign in</button></div>
        <p class="muted" id="linkMsg"></p></div>`;
    }
    return `<div class="card pad center"><h2>Bethlehem Lutheran Church</h2><p>Sign in with the account Pastor Ben added to the planning team.</p>
      <button class="primary" id="signin">Sign in with Google</button>
      <p class="or">or, without a Google account</p>
      <div class="linkrow"><input id="linkEmail" type="email" placeholder="your email address"><button id="sendLink">Email me a sign-in link</button></div>
      <p class="muted" id="linkMsg"></p></div>`;
  }
  async function linkAction(kind) {
    const email = ($('#linkEmail').value || '').trim();
    const msg = $('#linkMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Enter your email address.'; return; }
    try {
      if (kind === 'send') { msg.textContent = 'Sending…'; await store.sendLink(email); msg.textContent = `Check ${email} for a sign-in link (look in spam if it isn't there in a minute).`; }
      else { msg.textContent = 'Signing in…'; await store.finishLink(email); }
    } catch (e) { msg.textContent = 'That didn\'t work: ' + (e.code || e.message) + '. Try requesting a new link.'; }
  }

  function yearSwitcher() {
    const opts = [];
    for (let y = 2025; y <= 2030; y++) {
      const d = yearData(y);
      opts.push(`<option value="${y}" ${y === curYear ? 'selected' : ''}>${d.label} · Series ${d.series}</option>`);
    }
    return `<select id="yearSel" aria-label="Church year">${opts.join('')}</select>`;
  }

  function progress(plan) {
    if (!plan) return { done: 0, total: 0 };
    const slots = (plan.slots || []).filter((s) => !/Reading$|^Prayer/i.test(s.label));
    return { done: slots.filter((s) => s.value).length, total: slots.length };
  }

  function calendarView() {
    const yr = yearData(curYear);
    const plans = store.all();
    const customs = Object.entries(plans).filter(([, p]) => p.custom && p.date >= yr.start && p.date <= yr.end)
      .map(([k, p]) => ({ date: p.date, key: k, name: p.name, kind: 'custom', color: p.color || 'white', season: 'Special' }));
    const rows = [...yr.days, ...customs].map((d) => {
      const key = d.kind === 'custom' ? d.key : d.date;
      return Object.assign({}, d, { key, shown: servedOn(key, plans[key]) });
    }).sort((a, b) => a.shown.localeCompare(b.shown) || (a.kind === 'sunday' ? -1 : 1));
    const today = CY.iso(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
    let html = `<div class="toolbar">${yearSwitcher()}
      <div class="yrinfo">Series ${yr.series} · ${fmtLong(yr.start)} – ${fmtLong(yr.end)} · Easter ${fmtLong(yr.easter)}</div>
      <span class="grow"></span>
      <button id="jumpToday">Today</button>
      <button id="addMidweek">+ Midweek series</button>
      <button id="addSpecial">+ Special service</button></div>`;
    let season = null, markedToday = false;
    for (const d of rows) {
      const grp = d.kind === 'custom' ? season : d.season;
      if (grp !== season) { if (season) html += '</div>'; season = grp; html += `<h3 class="season">${esc(season)}</h3><div class="card list">`; }
      const key = d.key;
      const p = plans[key];
      const pr = progress(p);
      const moved = d.kind !== 'custom' && d.shown !== d.date;
      const when = whenLabel(d.shown);
      const gospel = d.readings ? d.readings[3] : '';
      const fest = (d.festivals || []).map((f) => f.name).join(' · ');
      const isNext = !markedToday && d.shown >= today;
      if (isNext) markedToday = true;
      html += `<a class="row ${d.kind !== 'sunday' ? 'feast' : ''} ${isNext ? 'next' : ''}" href="#day-${esc(key)}" ${isNext ? 'id="nextRow"' : ''}>
        <span class="swatch" style="background:${CY.COLORS[d.color] || '#ccc'}" title="${esc(d.color)}"></span>
        <span class="when">${esc(when)}</span>
        <span class="what"><b>${esc(d.name)}</b>${moved ? `<small class="moved">Observed · actual date ${esc(fmt(d.date))}</small>` : ''}${fest ? `<small class="fest">${esc(fest)}</small>` : ''}
          ${gospel ? `<small>${esc(gospel)}</small>` : ''}</span>
        <span class="sermon">${p && p.sermonTitle ? `“${esc(p.sermonTitle)}”` : ''}</span>
        <span class="status">${p && p.locked ? '<i class="lock" title="Final">🔒</i>' : ''}${p ? `${p.flags && p.flags.length ? '<i class="flag" title="Needs a look">!</i>' : ''}<span class="meter"><span style="width:${pr.total ? (100 * pr.done / pr.total) : 0}%"></span></span>` : '<span class="muted">not started</span>'}</span>
      </a>`;
    }
    return html + '</div>';
  }

  function dayView(key) {
    const day = findDay(key);
    if (!day) return `<p>Not found. <a href="#calendar">Back</a></p>`;
    const saved = store.get(key);
    if (!draft || draft.__key !== key) draft = Object.assign({ __key: key }, JSON.parse(JSON.stringify(saved || newPlan(day))));
    const p = draft;
    p.volunteers = p.volunteers || {};
    const isSun = day.kind === 'sunday';
    const ro = store.canEdit && !p.locked ? '' : 'disabled';
    const idx = hymnIndex();
    const obs = p.observe && (day.festivals || []).find((f) => f.key === p.observe);
    const readings = p.readingsOverride || (obs && obs.readings && obs.readings.r) || day.readings;
    const nav = neighbors(day);

    let h = `<div class="dayhead" style="--lc:${CY.COLORS[day.color] || '#999'}">
      <div class="crumbs"><a href="#calendar">← ${esc(yearData(CY.yearOf(CY.parse(day.date))).label)} calendar</a>
        <span class="grow"></span>${nav.prev ? `<a href="#day-${nav.prev}">‹ Prev</a>` : ''} ${nav.next ? `<a href="#day-${nav.next}">Next ›</a>` : ''}</div>
      <h2>${esc(obs ? obs.name : day.name)}</h2>
      <div class="meta">${esc(whenLabel(servedOn(key, p)))}${p.observedDate && p.observedDate !== day.date ? ` <span class="moved">(observed · actual ${esc(fmt(day.date))})</span>` : ''}${day.series ? ` · Series ${day.series}` : ''}${day.proper && day.proper < 29 ? ` · Proper ${day.proper}` : ''} · <span class="colorname">${esc(obs ? obs.color : day.color)}</span></div>
      ${!saved ? '<div class="hint">Not started — defaults filled in below. Changes save automatically.</div>' : ''}
    </div>`;
    if (p.locked) {
      h += `<div class="card lockbar"><span>🔒 Final — locked by ${esc(p.locked.by || '')} on ${esc(new Date(p.locked.at).toLocaleDateString())}. No changes after the bulletin is printed.</span>
        ${isAdmin() ? '<button data-act="unlock">Unlock</button>' : '<span class="muted">Ask Pastor Ben or Sam to unlock.</span>'}</div>`;
    }

    if (day.kind !== 'custom') {
      const d0 = CY.parse(day.date), dw = CY.dow(d0);
      const before = CY.iso(CY.add(d0, dw === 0 ? -7 : -dw)), after = CY.iso(CY.add(d0, dw === 0 ? 7 : 7 - dw));
      const cur = p.observedDate || day.date;
      h += `<div class="card pad obsrow"><label class="lbl">Kept on</label><div class="chips">
        <button class="chip ${cur === day.date ? 'on' : ''}" data-act="obsDate" data-d="${day.date}" ${ro}>Actual date · ${esc(fmt(day.date))}</button>
        <button class="chip ${cur === before ? 'on' : ''}" data-act="obsDate" data-d="${before}" ${ro}>Sunday before · ${esc(fmt(before))}</button>
        <button class="chip ${cur === after ? 'on' : ''}" data-act="obsDate" data-d="${after}" ${ro}>Sunday after · ${esc(fmt(after))}</button>
        <input type="date" class="obsdate" data-act-change="obsDate" value="${esc(cur)}" ${ro} title="Pick another date">
      </div></div>`;
    }

    if (p.flags && p.flags.length) {
      h += `<div class="card flags"><b>Needs a look</b>${p.flags.map((f, i) => `<div class="flagrow"><span>${esc(f)}</span>${store.canEdit ? `<button class="link" data-act="dismissFlag" data-i="${i}">Resolved</button>` : ''}</div>`).join('')}</div>`;
    }

    if (day.festivals && day.festivals.length) {
      h += `<div class="card pad"><label class="lbl">Observe</label><div class="chips">
        <button class="chip ${!p.observe ? 'on' : ''}" data-act="observe" data-k="" ${ro}>${esc(day.name)}</button>
        ${day.festivals.map((f) => `<button class="chip ${p.observe === f.key ? 'on' : ''}" data-act="observe" data-k="${esc(f.key)}" ${ro}>${esc(f.name)}</button>`).join('')}
      </div></div>`;
    }

    // Readings
    h += `<div class="grid2"><div class="card pad"><div class="cardhead"><b>Readings</b>${day.verify && !obs && !p.readingsOverride ? '<span class="badge warn" title="Not printed in the LCMS calendars used; check LSB">verify in LSB</span>' : ''}
      ${store.canEdit ? `<button class="link" data-act="${p.readingsOverride ? 'resetReadings' : 'editReadings'}">${p.readingsOverride ? 'Use lectionary' : 'Edit'}</button>` : ''}</div>`;
    if (readings) {
      h += READ_LABELS.map((l, i) => p.readingsOverride
        ? `<label class="rd"><span>${l}</span><input data-f="readingsOverride.${i}" value="${esc(readings[i])}" ${ro}></label>`
        : `<div class="rd"><span>${l}</span><b>${esc(readings[i])}</b></div>`).join('');
      if (day.altReadings) h += day.altReadings.filter((a) => a.readings).map((a) => `<details><summary>${esc(a.name)} readings</summary>${a.readings.map((r, i) => `<div class="rd"><span>${READ_LABELS[i]}</span>${esc(r)}</div>`).join('')}</details>`).join('');
    } else h += `<p class="muted">Choose readings for this service.</p>`;
    const hds = HY.hotd(obs ? obs.key : day.key, day.series || 'A');
    if (hds.length) {
      h += `<div class="hotd"><span class="lbl">Hymn of the Day (LSB)</span>${hds.map((x, i) => `<div><b>${esc(x.n)}</b> ${esc(x.title)}${i ? ' <span class="muted">(also listed)</span>' : ''}
        ${store.canEdit && !p.locked ? `<button class="link" data-act="useHotd" data-n="${esc(x.n)}">Use as Sermon Hymn</button>` : ''}</div>`).join('')}</div>`;
    }
    const ss = seasonSection(obs ? null : day);
    if (ss) h += `<div class="hotd"><a href="#hymns" data-hsec="${esc(ss)}">Browse ${esc(ss)} hymns →</a></div>`;
    if (day.notes && day.notes.length) h += `<ul class="lnotes">${day.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
    const lc = lastCycle(day);
    if (lc) {
      const hy = hymnsIn(lc.plan).map((x) => x.id + (x.title ? ' ' + x.title : '')).join('; ');
      h += `<details class="lastcycle"><summary>Last time (Series ${esc(day.series)}, ${esc(fmtLong(lc.date))})</summary>
        ${lc.plan.sermonTitle ? `<div>Sermon: “${esc(lc.plan.sermonTitle)}”${lc.plan.preacher ? ' — ' + esc(lc.plan.preacher) : ''}</div>` : ''}
        <div class="muted">${esc(hy || 'No hymns recorded')}</div></details>`;
    }
    h += `</div>`;

    // Sermon & services
    h += `<div class="card pad"><b>Sermon</b>
      <label class="fld"><span>Title</span><input data-f="sermonTitle" value="${esc(p.sermonTitle)}" ${ro}></label>
      <label class="fld"><span>Sermon series</span><input data-f="series" value="${esc(p.series || '')}" placeholder="e.g. The Light of Christ" list="serieslist" ${ro}></label>
      <label class="fld"><span>Preacher</span><input data-f="preacher" value="${esc(p.preacher)}" placeholder="Pastor Ben" ${ro}></label>
      <label class="fld"><span>Text & notes</span><textarea data-f="sermonNotes" rows="2" ${ro}>${esc(p.sermonNotes)}</textarea></label>
      <label class="fld"><span>Setting</span><select data-f="setting" ${ro}>${SETTINGS.map((s) => `<option ${s === p.setting ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <b class="sub">Services & musicians</b>
      ${(p.services || []).map((s, i) => `<div class="svc"><input data-f="services.${i}.label" value="${esc(s.label)}" ${ro}><input data-f="services.${i}.musician" value="${esc(s.musician)}" placeholder="Musician" ${ro}>${store.canEdit && !p.locked ? `<button class="icon" data-act="delSvc" data-i="${i}" title="Remove">×</button>` : ''}</div>`).join('')}
      ${store.canEdit && !p.locked ? '<button class="link" data-act="addSvc">+ Add service time</button>' : ''}
    </div></div>`;

    // Order of service
    h += `<div class="card pad"><div class="cardhead"><b>Order of service</b>
      ${store.canEdit && !p.locked ? `<span class="grow"></span>${copyFromSelect(key, day)}<button class="link" data-act="resetSlots">Reset to ${esc(p.setting.replace('Divine Service, ', ''))} defaults</button>` : ''}</div>
      <div class="slots">`;
    const anthemIdx = anthemIndex();
    (p.slots || []).forEach((s, i) => {
      if (s.kind === 'choir') { h += choirSlot(s, i, p, key, day, ro, anthemIdx); return; }
      const warn = hymnsIn({ slots: [s] }).flatMap((hm) => nearbyUses(key, day.date, hm.id, idx).filter((u) => /hymn/i.test(s.label) || u.slot !== s.label).map((u) => `${hm.id} also ${fmt(u.date)} (${u.slot})`));
      h += `<div class="slot">
        <input class="sl" data-f="slots.${i}.label" value="${esc(s.label)}" ${ro}>
        <input class="sv" data-f="slots.${i}.value" value="${esc(s.value)}" list="hymnlist" placeholder="${/Reading/.test(s.label) ? 'from readings' : ''}" ${ro}>
        <input class="sn" data-f="slots.${i}.note" value="${esc(s.note)}" placeholder="note" ${ro}>
        ${store.canEdit && !p.locked ? `<span class="ops"><button class="icon" data-act="up" data-i="${i}" title="Move up">↑</button><button class="icon" data-act="down" data-i="${i}" title="Move down">↓</button><button class="icon" data-act="delSlot" data-i="${i}" title="Remove">×</button></span>` : ''}
        ${warn.length ? `<div class="warn">${esc(warn.join(' · '))}</div>` : ''}
      </div>`;
    });
    const cg = conf().choirs.split(',').map((x) => x.trim()).filter(Boolean);
    h += `</div>${store.canEdit && !p.locked ? '<button class="link" data-act="addSlot">+ Add line</button> <button class="link" data-act="addChoir">+ Choir / anthem</button>' : ''}
      <datalist id="choirlist">${cg.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
      <datalist id="anthemlist">${Object.values(anthemIdx).map((a) => `<option value="${esc(a.title)}">${esc(a.composer)}</option>`).join('')}</datalist>
      ${hymnDatalist(idx)}<datalist id="serieslist">${[...new Set(Object.values(store.all()).map((x) => x.series).filter(Boolean))].map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div>`;

    // Volunteers
    const svcs = (p.services || []).length ? p.services : [{ label: 'Service' }];
    h += `<div class="card pad"><b>Volunteers</b><table class="vol"><tr><th></th>${svcs.map((x) => `<th>${esc(x.label)}</th>`).join('')}</tr>
      ${ROLES.map((r) => `<tr><td>${esc(r)}</td>${svcs.map((x, i) => `<td><input data-vol="${esc(r)}" data-i="${i}" value="${esc((p.volunteers[r] || [])[i] || '')}" ${ro}></td>`).join('')}</tr>`).join('')}</table></div>`;

    // Bulletin
    const checks = licenseChecks(p);
    h += `<div class="card pad"><div class="cardhead"><b>Bulletin</b><span class="grow"></span>
      <button data-act="sbCopy" title="Copies the plan in Service Builder order, to enter in Lutheran Service Builder">Copy for Service Builder</button>
      <button data-act="bulletin">Bulletin (.docx)</button></div>
      <label class="fld"><span>Announcements</span><textarea data-f="announcements" rows="3" placeholder="One per line — printed under “This Week”" ${ro}>${esc(p.announcements || '')}</textarea></label>
      ${checks.length ? `<div class="checks">${checks.map((c) => `<div class="${c.level}">${esc(c.text)}</div>`).join('')}</div>` : ''}</div>`;

    h += `<div class="card pad"><label class="fld"><span>Notes for the team</span><textarea data-f="notes" rows="3" ${ro}>${esc(p.notes)}</textarea></label>
      <div class="foot"><span id="savestate" class="muted">${saved && saved.updatedAt ? `Saved ${new Date(saved.updatedAt).toLocaleString()}${saved.updatedBy && saved.updatedBy !== 'preview' ? ' by ' + esc(saved.updatedBy) : ''}` : ''}</span>
      <span class="grow"></span><button data-act="print">Print / PDF</button>
      ${store.canEdit && saved && !p.locked ? '<button class="primary" data-act="lock">Mark final 🔒</button>' : ''}
      ${store.canEdit && !p.locked && day.kind === 'custom' ? '<button class="danger" data-act="delCustom">Delete service</button>' : ''}</div>
      ${p.history && p.history.length ? `<details class="history"><summary>Change history (${p.history.length})</summary>${p.history.slice().reverse().map((x) => `<div><span class="muted">${esc(new Date(x.at).toLocaleString())}</span> · ${esc(x.by || '')} · ${esc(x.what)}</div>`).join('')}</details>` : ''}</div>`;
    return h;
  }

  function neighbors(day) {
    const list = allDays().filter((d) => d.kind === 'sunday');
    const i = list.findIndex((d) => d.date === day.date);
    if (i < 0) { const nx = list.find((d) => d.date > day.date); return { next: nx && nx.date }; }
    return { prev: list[i - 1] && list[i - 1].date, next: list[i + 1] && list[i + 1].date };
  }

  // Season of the church year → LSB / TFBF section names
  function seasonSection(day) {
    if (!day) return '';
    if (day.key === 'transfiguration') return 'Transfiguration';
    if (day.key === 'ascension') return 'Ascension';
    if (day.key === 'trinity') return 'Holy Trinity';
    if (/^proper2[789]$|^lastSunday$/.test(day.key)) return 'End Times';
    if (day.key === 'allSaints' || day.kind === 'feast' && /St\.|Saint|Presentation|Annunciation|Visitation/.test(day.name)) return 'Feasts and Festivals';
    return { Advent: 'Advent', Christmas: 'Christmas', Epiphany: 'Epiphany', Lent: 'Lent', 'Holy Week': 'Holy Week', Easter: 'Easter', Pentecost: 'Pentecost' }[day.season] || '';
  }
  let _all = null;
  function hymnsView() {
    const used = hymnIndex();
    const mode = view.mode || 'browse';
    const tabs = `<div class="chips"><button class="chip ${mode === 'browse' ? 'on' : ''}" data-hmode="browse">Hymnals</button><button class="chip ${mode === 'used' ? 'on' : ''}" data-hmode="used">What we've sung</button></div>`;
    if (mode === 'used') {
      const idx = Object.values(used).sort((a, b) => a.book.localeCompare(b.book) || a.num - b.num);
      const q = (view.q || '').toLowerCase();
      const rows = idx.filter((e) => !q || e.id.toLowerCase().includes(q) || e.title.toLowerCase().includes(q));
      return `<div class="toolbar">${tabs}<input id="hq" placeholder="Search by number or title" value="${esc(view.q || '')}"><span class="grow"></span><span class="muted">${idx.length} hymns planned across all years</span></div>
        <div class="card list">${rows.map((e) => `<div class="row static"><span class="when"><b>${esc(e.id)}</b></span><span class="what">${esc(e.title || HY.titleFor(String(e.num), e.book) || '—')}</span>
        <span class="uses">${e.uses.map((u) => `<a href="#day-${esc(u.key)}" title="${esc(u.slot)}">${esc(fmtLong(u.date))}</a>`).join(' ')}</span></div>`).join('') || '<div class="pad muted">No hymns yet.</div>'}</div>`;
    }
    _all = _all || HY.all();
    const book = view.book || 'all', sec = view.sec || '', q = (view.q || '').toLowerCase().trim();
    const secs = [...new Set(HY.LSB_SECTIONS.flatMap(([g, l]) => l.map((x) => x[0])).concat(_all.filter((h) => h.book === 'TFBF').flatMap((h) => h.sections)))];
    const groups = HY.LSB_SECTIONS.map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(([x]) => `<option ${x === sec ? 'selected' : ''}>${esc(x)}</option>`).join('')}</optgroup>`).join('')
      + `<optgroup label="This Far By Faith topics">${secs.filter((x) => !HY.LSB_SECTIONS.some(([, l]) => l.some((y) => y[0] === x))).sort().map((x) => `<option ${x === sec ? 'selected' : ''}>${esc(x)}</option>`).join('')}</optgroup>`;
    const hotdOf = {};
    for (const [k, v] of Object.entries(HY.HOTD)) for (const [ser, nums] of Object.entries(v)) for (const n of nums) (hotdOf[n] = hotdOf[n] || []).push(k + (ser === 'all' ? '' : ' (' + ser + ')'));
    let rows = _all.filter((h) => (book === 'all' || h.book === book) && (!sec || h.sections.includes(sec)));
    if (q) rows = rows.filter((h) => String(h.n) === q.replace(/^(lsb|tfbf)\s*/, '') || [h.id, h.title, h.first, h.tune, h.scripture, ...(h.alts || [])].join(' ').toLowerCase().includes(q));
    rows.sort((a, b) => a.book.localeCompare(b.book) || a.n - b.n);
    const shown = rows.slice(0, 400);
    return `<div class="toolbar">${tabs}
      <select id="hBook"><option value="all">Both hymnals</option><option value="LSB" ${book === 'LSB' ? 'selected' : ''}>Lutheran Service Book</option><option value="TFBF" ${book === 'TFBF' ? 'selected' : ''}>This Far By Faith</option></select>
      <select id="hSec"><option value="">All seasons & topics</option>${groups}</select>
      <input id="hq" placeholder="Number, title, first line, tune or Scripture" value="${esc(view.q || '')}">
      <span class="grow"></span><span class="muted">${rows.length} hymns</span></div>
      <div class="card list hymnal">${shown.map((h) => { const u = used[h.id]; const last = u && u.uses[u.uses.length - 1];
        const hd = h.book === 'LSB' ? hotdOf[String(h.n)] : null;
        return `<div class="row static hrow"><span class="when"><b>${esc(h.id)}</b></span>
          <span class="what"><b>${esc(h.title)}</b>${h.first && h.first !== h.title ? `<small>${esc(h.first)}</small>` : ''}
            <small>${esc([h.sections.join(', '), h.scripture, h.tune].filter(Boolean).join(' · '))}</small>
            ${hd ? `<small class="fest">Hymn of the Day: ${esc(hd.slice(0, 4).join(', '))}${hd.length > 4 ? '…' : ''}</small>` : ''}</span>
          <span class="uses">${u ? `<a href="#day-${esc(last.key)}">${u.uses.length}× · last ${esc(fmtLong(last.date))}</a>` : '<span class="muted">not used yet</span>'}</span>
          <span class="ops">${store.canEdit ? `<button data-addhymn="${esc(h.id)}" data-title="${esc(h.title)}">Add to a service</button>` : ''}</span></div>`; }).join('') || '<div class="pad muted">No hymns match.</div>'}
        ${rows.length > shown.length ? `<div class="pad muted">Showing the first ${shown.length} — narrow the search to see more.</div>` : ''}</div>`;
  }

  // Put a hymn into a slot of an upcoming service
  function addHymnTo(id, title) {
    const today = CY.iso(new Date());
    const plans = store.all();
    const opts = [];
    for (const y of [curYear, curYear + 1]) for (const d of yearData(y).days) if (d.date >= today) opts.push({ key: d.date, date: servedOn(d.date, plans[d.date]), name: d.name });
    for (const [k, p] of Object.entries(plans)) if (p.custom && p.date >= today) opts.push({ key: k, date: p.date, name: p.name });
    opts.sort((a, b) => a.date.localeCompare(b.date));
    const box = document.createElement('div'); box.className = 'modal';
    box.innerHTML = `<div class="card pad"><b>Add ${esc(id)} “${esc(title)}”</b>
      <label class="fld"><span>Service</span><select id="ahDay">${opts.slice(0, 80).map((o) => `<option value="${esc(o.key)}">${esc(whenLabel(o.date))} — ${esc(o.name)}</option>`).join('')}</select></label>
      <label class="fld"><span>Where in the service</span><select id="ahSlot"></select></label>
      <p class="muted" id="ahMsg"></p>
      <div class="foot"><span class="grow"></span><button id="ahCancel">Cancel</button><button class="primary" id="ahOk">Add</button></div></div>`;
    document.body.appendChild(box);
    const planFor = (k) => store.get(k) || newPlan(findDay(k));
    const fill = () => { const p = planFor($('#ahDay', box).value);
      $('#ahSlot', box).innerHTML = (p.slots || []).map((x, i) => `<option value="${i}">${esc(x.label)}${x.value ? ' — ' + esc(x.value).slice(0, 40) : ''}</option>`).join('') + '<option value="new">+ New line “Hymn”</option>';
      const firstEmpty = (p.slots || []).findIndex((x) => /hymn/i.test(x.label) && !x.value); if (firstEmpty >= 0) $('#ahSlot', box).value = String(firstEmpty);
      $('#ahMsg', box).textContent = p.locked ? 'This service is marked final.' : ''; };
    $('#ahDay', box).onchange = fill; fill();
    $('#ahCancel', box).onclick = () => box.remove();
    $('#ahOk', box).onclick = async () => {
      const k = $('#ahDay', box).value; const base = planFor(k); if (base.locked) return;
      const plan = JSON.parse(JSON.stringify(base)); const v = `${id} "${title}"`; const i = $('#ahSlot', box).value;
      if (i === 'new') plan.slots.push({ label: 'Hymn', value: v, note: '' }); else plan.slots[+i].value = v;
      plan.history = addHistory(store.get(k), plan); await store.save(k, plan); box.remove(); location.hash = '#day-' + k;
    };
  }


  function copyFromSelect(key, day) {
    const lc = lastCycle(day);
    const others = Object.entries(store.all()).filter(([k, x]) => k !== key && x.slots && x.slots.length)
      .map(([k, x]) => ({ k, date: servedOn(k, x), name: x.custom ? x.name : ((findDay(k) || {}).name || k) }))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
    return `<select class="copyfrom" title="Copy the order of service from another service"><option value="">Copy order from…</option>
      ${lc ? `<option value="${esc(lc.date)}">Last cycle: ${esc(fmtLong(lc.date))}</option>` : ''}
      ${others.map((o) => `<option value="${esc(o.k)}">${esc(fmt(o.date))} — ${esc(o.name)}</option>`).join('')}</select>`;
  }

  // Sermon-series planner: a season side by side
  function seriesView() {
    const yr = yearData(curYear); const plans = store.all();
    const seasons = [...new Set(yr.days.map((d) => d.season))];
    const season = seasons.includes(view.season) ? view.season : (yr.days.find((d) => d.date >= CY.iso(new Date())) || yr.days[0]).season;
    const days = yr.days.filter((d) => d.season === season && (d.kind === 'sunday' || plans[d.date]));
    return `<div class="toolbar">${yearSwitcher()}<select id="seasonSel">${seasons.map((x) => `<option ${x === season ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
      <span class="grow"></span><span class="muted">Plan a sermon series across the season. Edits save as you type.</span></div>
      <div class="card"><table class="series"><tr><th>Weekend</th><th>Texts</th><th>Series</th><th>Sermon title</th><th>Notes</th></tr>
      ${days.map((d) => { const p = plans[d.date] || {}; const r = d.readings || []; const lk = p.locked ? 'disabled' : '';
        return `<tr><td><a href="#day-${d.date}"><b>${esc(d.name)}</b></a><br><span class="muted">${esc(whenLabel(servedOn(d.date, p)))}</span></td>
        <td class="tx">${esc(r[0] || '')}<br>${esc(r[2] || '')}<br><b>${esc(r[3] || '')}</b></td>
        <td><input data-sk="${d.date}" data-sf="series" value="${esc(p.series || '')}" list="serieslist" ${lk}></td>
        <td><input data-sk="${d.date}" data-sf="sermonTitle" value="${esc(p.sermonTitle || '')}" ${lk}></td>
        <td><textarea data-sk="${d.date}" data-sf="sermonNotes" rows="2" ${lk}>${esc(p.sermonNotes || '')}</textarea></td></tr>`; }).join('')}
      </table></div><datalist id="serieslist">${[...new Set(Object.values(plans).map((x) => x.series).filter(Boolean))].map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;
  }
  const seriesTimers = {};
  function saveSeriesField(k, f, v) {
    clearTimeout(seriesTimers[k + f]);
    seriesTimers[k + f] = setTimeout(async () => {
      const day = findDay(k); const base = store.get(k) || newPlan(day);
      const plan = Object.assign({}, JSON.parse(JSON.stringify(base)), { [f]: v });
      plan.history = addHistory(base, plan);
      await store.save(k, plan);
    }, 700);
  }

  // Song usage report (OneLicense / CCLI) and calendar feed
  function reportsView() {
    const yr = yearData(curYear);
    const from = view.from || yr.start, to = view.to || yr.end;
    const rows = [];
    for (const [k, p] of Object.entries(store.all())) {
      const date = servedOn(k, p); if (date < from || date > to) continue;
      const nSvc = (p.services || []).length || 1;
      for (const s of p.slots || []) if (s.kind === 'choir' && s.value) rows.push({ date, id: 'Anthem', book: 'Choir', num: '', title: s.value + (s.composer ? ` (${s.composer})` : ''), slot: s.group || s.label, services: s.at && s.at.length ? s.at.length : nSvc });
      for (const h of hymnsIn(p)) rows.push({ date, id: h.id, book: h.book, num: h.num, title: h.title || (h.book === 'LSB' ? HY.titleFor(String(h.num)) : ''), slot: h.slot, services: nSvc });
      for (const s of p.slots || []) if (s.value && /©|copyright/i.test(s.note || '')) rows.push({ date, id: '—', book: '', num: '', title: s.value, slot: s.label, services: nSvc, note: s.note });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    view.reportRows = rows;
    const totals = {}; rows.forEach((r) => { const t = (totals[r.id + r.title] = totals[r.id + r.title] || { id: r.id, title: r.title, uses: 0, services: 0 }); t.uses++; t.services += r.services; });
    const feed = store.feed;
    return `<div class="toolbar"><label>From <input type="date" id="repFrom" value="${esc(from)}"></label><label>To <input type="date" id="repTo" value="${esc(to)}"></label>
      <span class="grow"></span><button id="csv">Download CSV</button></div>
      <div class="card pad"><b>Calendar feed</b><p class="muted">Subscribe in Google Calendar, Apple Calendar or Outlook to see every service with its hymns. Updates nightly.</p>
      ${feed ? `<div class="linkrow wide"><input readonly value="${esc(feed)}" id="feedUrl"><button id="copyFeed">Copy link</button></div>` : '<p class="muted">The feed link appears here after the first nightly update.</p>'}</div>
      ${settingsCard()}
      <div class="card pad"><b>Song usage — ${rows.length} uses, ${Object.keys(totals).length} songs</b>
      <p class="muted">For OneLicense / CCLI reporting. Each use counts once per service time that weekend.</p>
      <table class="report"><tr><th>Song</th><th>Uses</th><th>Services</th></tr>${Object.values(totals).sort((a, b) => b.services - a.services).map((t) => `<tr><td>${esc(t.id)} ${esc(t.title)}</td><td>${t.uses}</td><td>${t.services}</td></tr>`).join('')}</table>
      <details><summary>Every use</summary><table class="report"><tr><th>Date</th><th>Song</th><th>Where</th><th>Services</th></tr>
      ${rows.map((r) => `<tr><td>${esc(fmtLong(r.date))}</td><td>${esc(r.id)} ${esc(r.title)}</td><td>${esc(r.slot)}</td><td>${r.services}</td></tr>`).join('')}</table></details></div>`;
  }
  function downloadCSV() {
    const q = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const csv = ['Date,Hymnal,Number,Title,Where,Services', ...(view.reportRows || []).map((r) => [r.date, r.book, r.num, r.title, r.slot, r.services].map(q).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bethlehem-song-usage-${view.from || ''}-${view.to || ''}.csv`; document.body.appendChild(a); a.click(); a.remove();
  }

  // Midweek series (Advent / Lent)
  function addMidweek() {
    const yr = yearData(curYear);
    const box = document.createElement('div'); box.className = 'modal';
    box.innerHTML = `<div class="card pad"><b>Add a midweek series — ${esc(yr.label)}</b>
      <label class="fld"><span>Season</span><select id="mwSeason"><option>Advent</option><option selected>Lent</option></select></label>
      <label class="fld"><span>Day</span><select id="mwDay">${WD.map((d, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="fld"><span>Time</span><input id="mwTime" value="7:00 pm"></label>
      <label class="fld"><span>Order</span><select id="mwSetting">${SETTINGS.map((x) => `<option ${x === 'Evening Prayer' ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <p class="muted" id="mwPreview"></p>
      <div class="foot"><span class="grow"></span><button id="mwCancel">Cancel</button><button class="primary" id="mwOk">Add services</button></div></div>`;
    document.body.appendChild(box);
    const dates = () => {
      const season = $('#mwSeason', box).value, wd = +$('#mwDay', box).value, out = [];
      const k = (key) => yr.days.find((d) => d.key === key).date;
      let start, end;
      if (season === 'Advent') { start = CY.parse(k('advent1')); end = CY.parse(k('advent4')); }
      else { start = CY.parse(k('ashWednesday')); end = CY.parse(k('palmSunday')); }
      for (let d = CY.add(start, 1); d < end; d = CY.add(d, 1)) if (CY.dow(d) === wd) out.push(CY.iso(d));
      return { season, list: out };
    };
    const prev = () => { const { list } = dates(); $('#mwPreview', box).textContent = `${list.length} services: ${list.map(fmt).join(', ')}`; };
    box.addEventListener('change', prev); prev();
    $('#mwCancel', box).onclick = () => box.remove();
    $('#mwOk', box).onclick = async () => {
      const { season, list } = dates(); const setting = $('#mwSetting', box).value, time = $('#mwTime', box).value.trim();
      const prefix = season === 'Advent' ? 'Advent Midweek' : 'Lenten Midweek';
      for (const [i, date] of list.entries()) {
        const key = `custom-${date}-${prefix.toLowerCase().replace(/\s+/g, '-')}`;
        if (store.get(key)) continue;
        await store.save(key, { custom: true, date, name: `${prefix} ${i + 1}`, color: season === 'Advent' ? 'blue' : 'violet', setting,
          services: [{ label: `${WD[CY.dow(CY.parse(date))]} ${time}`, musician: '' }], slots: defaultSlots(setting, { season }), flags: [] });
      }
      box.remove(); render();
    };
  }

  // Change history: who changed what, coalescing quick edits by the same person
  const FIELD_NAMES = { slots: 'order of service', services: 'services & musicians', sermonTitle: 'sermon title', preacher: 'preacher',
    sermonNotes: 'sermon notes', notes: 'team notes', setting: 'setting', readingsOverride: 'readings', observe: 'observance',
    observedDate: 'date kept', volunteers: 'volunteers', series: 'sermon series', locked: 'final/lock', flags: 'notes to check', announcements: 'bulletin announcements' };
  function addHistory(prev, next) {
    const hist = (prev && prev.history ? prev.history.slice() : []);
    const changed = Object.keys(FIELD_NAMES).filter((f) => JSON.stringify((prev || {})[f] ?? null) !== JSON.stringify(next[f] ?? null));
    if (!changed.length) return hist;
    const by = store.user ? (store.user.email || store.user.name) : '';
    const now = new Date().toISOString(); const last = hist[hist.length - 1];
    if (last && last.by === by && Date.now() - Date.parse(last.at) < 10 * 60e3) {
      last.what = [...new Set([...last.what.split(', '), ...changed.map((f) => FIELD_NAMES[f])])].join(', '); last.at = now;
    } else hist.push({ at: now, by, what: changed.map((f) => FIELD_NAMES[f]).join(', ') });
    return hist.slice(-40);
  }

  // Bulletin draft as a Word document
  // ---------- Settings (shared, stored with the plans) ----------
  let confTimer = null, confDraft = null;
  function saveConf(field, value) {
    confDraft = Object.assign(conf(), confDraft || {}, { [field]: value });
    clearTimeout(confTimer);
    confTimer = setTimeout(async () => { const d = confDraft; confDraft = null; const st = $('#cfgstate');
      try { await store.saveSettings(d); st && (st.textContent = 'Saved'); } catch (e) { st && (st.textContent = 'Not saved: ' + e.message); } }, 600);
  }
  function settingsCard() {
    const C = conf(); const dis = isAdmin() ? '' : 'disabled';
    const f = (k, label, ph = '', rows = 0) => `<label class="fld"><span>${esc(label)}</span>${rows
      ? `<textarea data-cfg="${k}" rows="${rows}" ${dis}>${esc(C[k])}</textarea>` : `<input data-cfg="${k}" value="${esc(C[k])}" placeholder="${esc(ph)}" ${dis}>`}</label>`;
    return `<div class="card pad"><div class="cardhead"><b>Bulletin settings</b><span class="grow"></span><span class="muted" id="cfgstate">${isAdmin() ? '' : 'Pastor Ben or Sam can change these'}</span></div>
      ${f('churchName', 'Church name')}${f('churchLine', 'Second line')}
      ${f('welcome', 'Welcome', '', 3)}${f('communion', 'Communion statement', '', 4)}
      ${f('choirs', 'Choirs (comma separated)')}
      <b class="sub">Licenses — numbers print in the acknowledgments</b>
      <p class="muted">Service Builder's liturgy license covers the service texts; hymn texts need the separate LSB Hymn License (LSB 462 and 712 are excluded). This Far By Faith and other books need OneLicense or CCLI. Leave blank if you don't have one.</p>
      ${f('lsbLiturgy', 'Service Builder / liturgy license #')}${f('lsbHymn', 'LSB Hymn License #')}${f('oneLicense', 'OneLicense #')}${f('ccli', 'CCLI license #')}
      ${f('ackExtra', 'Other acknowledgments', '', 2)}</div>`;
  }
  function licenseChecks(p) {
    const C = conf(); const out = [];
    const hy = hymnsIn(p);
    for (const h of hy) if (NOT_IN_HYMN_LICENSE[h.id]) out.push({ level: 'warn', text: `${h.id} — the LSB Hymn License doesn't cover its ${NOT_IN_HYMN_LICENSE[h.id]}. Print the number only, or get permission from the copyright holder.` });
    const tf = hy.filter((h) => h.book === 'TFBF');
    if (tf.length && !C.oneLicense && !C.ccli) out.push({ level: 'warn', text: `${tf.map((h) => h.id).join(', ')} — not covered by CPH licenses. Print the number only unless Bethlehem has OneLicense or CCLI.` });
    if (hy.some((h) => h.book === 'LSB') && !C.lsbHymn) out.push({ level: 'info', text: 'No LSB Hymn License number saved — fine if the bulletin lists hymn numbers; needed to print hymn texts from Service Builder.' });
    const ch = (p.slots || []).filter((s) => s.kind === 'choir' && s.value);
    if (ch.length) out.push({ level: 'info', text: `Choir: ${ch.map((s) => s.value).join(', ')} — use purchased copies; licenses don't cover photocopying choral music.` });
    return out;
  }

  // The Divine Service in order, so the bulletin and the Service Builder checklist follow the liturgy
  function skeleton(setting) {
    const K = (t, m, extra = {}) => Object.assign({ t, m }, extra);
    const word = [K('Prelude', /prelude/i), K('Opening Hymn', /opening|entrance|processional/i), K('Invocation'), K('Confession and Absolution', /confession/i),
      K('Introit', /introit/i), K('Kyrie', /kyrie/i), K('Hymn of Praise', /hymn of praise|gloria|this is the feast/i), K('Salutation and Collect of the Day', /collect of/i),
      K('Old Testament Reading', /first reading|old testament/i, { r: 0 }), K('Psalm', /^psalm|gradual/i, { r: 1 }), K('Epistle', /epistle|second reading/i, { r: 2 }),
      K('Alleluia and Verse', /alleluia|acclamation|^verse/i), K('Holy Gospel', /gospel reading|holy gospel/i, { r: 3 }), K('Hymn of the Day', /sermon hymn|hymn of the day/i),
      K('Sermon', /^sermon$/i, { sermon: true }), K('Creed', /creed/i), K('Prayer of the Church', /prayer of the church/i), K('Offering', /offering|offertory/i)];
    const end = [K('Agnus Dei', /agnus/i), K('Distribution', /distribution/i), K('Post-Communion Canticle', /nunc|post-communion|canticle|thank the lord/i),
      K('Post-Communion Collect'), K('Benediction', /benediction/i), K('Closing Hymn', /closing|recessional|sending|depart/i), K('Postlude', /postlude/i)];
    let mid;
    if (/Three/.test(setting)) mid = [K('Preface'), K('Sanctus', /sanctus/i), K("Lord's Prayer", /lord.s prayer/i), K('Words of Our Lord', /words of/i), K('Pax Domini', /pax/i)];
    else if (/Four/.test(setting)) mid = [K('Preface'), K('Sanctus', /sanctus/i), K('Prayer of Thanksgiving'), K('Words of Our Lord', /words of/i), K("Lord's Prayer", /lord.s prayer/i), K('Pax Domini', /pax/i)];
    else if (/One|Two/.test(setting)) mid = [K('Preface'), K('Sanctus', /sanctus/i), K('Prayer of Thanksgiving'), K('Words of Our Lord', /words of/i), K('Proclamation of Christ'), K("Lord's Prayer", /lord.s prayer/i), K('Pax Domini', /pax/i)];
    else return null; // Setting Five and the offices follow the order of service as planned
    return word.concat([K('SERVICE OF THE SACRAMENT', null, { head: true })], mid, end);
  }
  function slotText(s, p) {
    if (s.kind === 'choir') return [s.value ? `“${s.value}”` : '', s.composer, s.group, choirAtLabel(s, p)].filter(Boolean).join(' · ');
    const hy = hymnsIn({ slots: [s] });
    if (hy.length) return hy.map((h) => `${h.title || HY.titleFor(String(h.num), h.book) || ''} — ${h.id}`).join('; ');
    return s.value || '';
  }
  // Ordered lines: liturgy items with the planned values slotted in; extra lines (choir, candle lighting) stay where Ben put them
  function serviceLines(key, p, day, readings) {
    const sk = skeleton(p.setting);
    const out = [];
    const fill = (k) => {
      if (k.done) return null;
      if (k.head) return { head: k.t };
      let v = '';
      if (k.r != null && readings) v = readings[k.r];
      if (k.sermon) v = p.sermonTitle ? `“${p.sermonTitle}”${p.preacher ? ' — ' + p.preacher : ''}` : '';
      if (k.t === 'Introit' || k.t === 'Salutation and Collect of the Day') v = v || 'Proper for the day';
      return { label: k.t, value: v };
    };
    if (!sk) {
      for (const s of p.slots || []) out.push({ label: s.label, value: slotText(s, p), note: s.note });
      if (p.sermonTitle) out.splice(Math.min(3, out.length), 0, { label: 'Sermon', value: `“${p.sermonTitle}”${p.preacher ? ' — ' + p.preacher : ''}` });
      return out;
    }
    let si = 0;
    for (const s of p.slots || []) {
      const j = s.kind === 'choir' ? -1 : sk.findIndex((k, n) => n >= si && k.m && k.m.test(s.label));
      if (j >= 0) {
        while (si < j) out.push(fill(sk[si++]));
        const base = fill(sk[si++]);
        sk.forEach((k, n) => { if (n >= si && k.m && k.m.test(s.label)) k.done = true; }); // e.g. one "Sanctus / Agnus Dei" line
        out.push({ label: /hymn/i.test(base.label) || s.label.length > 22 ? base.label : s.label, value: slotText(s, p) || base.value, note: s.note });
      } else out.push({ label: s.label, value: slotText(s, p), note: s.note, extra: true });
    }
    while (si < sk.length) out.push(fill(sk[si++]));
    return out.filter(Boolean);
  }
  function bulletinData(key) {
    const day = findDay(key); const p = draft;
    const obs = p.observe && (day.festivals || []).find((f) => f.key === p.observe);
    const readings = p.readingsOverride || (obs && obs.readings && obs.readings.r) || day.readings;
    const name = obs ? obs.name : (p.custom ? p.name : day.name);
    const color = obs ? obs.color : day.color;
    const nb = neighbors(day); const nextDay = nb.next && findDay(nb.next);
    return { day, p, readings, name, color, lines: serviceLines(key, p, day, readings), next: nextDay, page: LSB_PAGE[p.setting] };
  }
  function serviceBuilderText(key) {
    const b = bulletinData(key);
    const L = [`${b.name} — ${whenLabel(servedOn(key, b.p))}`, `${b.p.setting}${b.page ? ` (LSB p. ${b.page})` : ''}${b.day.series ? ` · Series ${b.day.series}` : ''} · ${b.color}`, ''];
    for (const l of b.lines) L.push(l.head ? `\n${l.head}` : `${l.label}: ${l.value || '—'}${l.note ? `  [${l.note}]` : ''}`);
    return L.join('\n');
  }
  async function bulletin(key) {
    if (!window.docx) await new Promise((ok, bad) => { const sc = document.createElement('script'); sc.src = 'js/vendor/docx.umd.js'; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
    const D = window.docx; const C = conf(); const b = bulletinData(key); const p = b.p;
    const FONT = 'Georgia', TAB = 9360;
    const R = (text, o = {}) => new D.TextRun({ text, bold: o.bold, italics: o.italics, size: o.size || 22, font: FONT, allCaps: o.caps, color: o.color });
    const P = (runs, o = {}) => new D.Paragraph({ children: (Array.isArray(runs) ? runs : [R(runs, o)]), alignment: o.center ? D.AlignmentType.CENTER : undefined,
      spacing: { before: o.before || 0, after: o.after ?? 100 }, tabStops: o.tab ? [{ type: D.TabStopType.RIGHT, position: TAB, leader: 'dot' }] : undefined, keepNext: o.keepNext });
    const H = (t) => P(t, { bold: true, size: 24, caps: true, before: 240, after: 120, keepNext: true });
    const svcs = p.services || [];
    const times = svcs.map((s) => s.label).join(' · ');
    const kids = [
      P(C.churchName, { bold: true, size: 34, center: true, after: 20 }),
      P(C.churchLine, { italics: true, size: 20, center: true, after: 280 }),
      P(b.name, { bold: true, size: 32, center: true, after: 60 }),
      P(whenLabel(servedOn(key, p)) + (times ? ' · ' + times : ''), { center: true, after: 60 }),
      P(`${p.setting}${b.page ? ` — Lutheran Service Book, page ${b.page}` : ''}`, { italics: true, center: true, after: 40 }),
      P(`Liturgical color: ${b.color[0].toUpperCase() + b.color.slice(1)}${b.day.series ? ` · Three-Year Lectionary, Series ${b.day.series}` : ''}`, { italics: true, size: 20, center: true, after: 240 }),
      P(C.welcome, { size: 21, after: 120 }),
    ];
    if (/Divine Service/.test(p.setting) && C.communion) kids.push(P([R('Holy Communion. ', { bold: true, size: 20 }), R(C.communion, { size: 20, italics: true })], { after: 120 }));
    kids.push(H('Order of Service'));
    for (const l of b.lines) {
      if (l.head) { kids.push(P(l.head, { bold: true, size: 20, caps: true, before: 200, after: 80, center: true })); continue; }
      const runs = [R(l.label, { bold: !!l.value || l.extra })];
      if (l.value) runs.push(new D.TextRun({ text: '\t' + l.value, size: 22, font: FONT }));
      kids.push(P(runs, { tab: true, after: 60 }));
    }
    // Serving
    const serving = [];
    svcs.forEach((s) => s.musician && serving.push([`Musician (${s.label})`, s.musician]));
    for (const s of p.slots || []) if (s.kind === 'choir' && (s.group || s.director)) serving.push([s.group || 'Choir', [s.director && `${s.director}, director`, choirAtLabel(s, p)].filter(Boolean).join(' · ') || '—']);
    for (const r of ROLES) { const v = ((p.volunteers || {})[r] || []).map((n, i) => n ? `${n}${svcs.length > 1 ? ` (${(svcs[i] || {}).label})` : ''}` : '').filter(Boolean); if (v.length) serving.push([r, v.join(', ')]); }
    if (p.preacher) serving.unshift(['Preacher', p.preacher]);
    if (serving.length) { kids.push(H('Serving Today')); serving.forEach(([a, v]) => kids.push(P([R(a, { bold: true }), new D.TextRun({ text: '\t' + v, size: 22, font: FONT })], { tab: true, after: 40 }))); }
    const ann = String(p.announcements || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (ann.length) { kids.push(H('This Week')); ann.forEach((a) => kids.push(new D.Paragraph({ children: [R(a)], bullet: { level: 0 }, spacing: { after: 60 } }))); }
    if (b.next) {
      kids.push(H('Next Sunday'));
      kids.push(P(`${b.next.name} — ${fmtLong(b.next.date)}`, { bold: true, after: 60 }));
      if (b.next.readings) kids.push(P(READ_LABELS.map((l, i) => `${l}: ${b.next.readings[i]}`).join('  ·  '), { size: 20 }));
    }
    // Acknowledgments in the form CPH asks for
    const ack = ['Lutheran Service Book © 2006 Concordia Publishing House. Lutheran Service Book: Propers of the Day © 2007 Concordia Publishing House.'];
    if (C.lsbLiturgy) ack.push(`Created by Lutheran Service Builder © 2006 Concordia Publishing House. License ${C.lsbLiturgy}.`);
    if (C.lsbHymn) ack.push(`Hymns reprinted under LSB Hymn License, license ${C.lsbHymn}.`);
    if (hymnsIn(p).some((h) => h.book === 'TFBF')) ack.push('This Far By Faith © 1999 Augsburg Fortress.');
    if (C.oneLicense) ack.push(`Reprinted under OneLicense #${C.oneLicense}. All rights reserved.`);
    if (C.ccli) ack.push(`CCLI License #${C.ccli}.`);
    if (C.ackExtra) ack.push(C.ackExtra);
    kids.push(H('Acknowledgments'));
    ack.forEach((a) => kids.push(P(a, { size: 16, italics: true, after: 40 })));
    const doc = new D.Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } }, children: kids }] });
    const blob = await D.Packer.toBlob(doc);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Bulletin ${servedOn(key, p)} ${b.name.replace(/[^A-Za-z0-9 ]+/g, '')}.docx`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- Print ----------
  function printDay(key) {
    const day = findDay(key); const p = draft;
    const obs = p.observe && (day.festivals || []).find((f) => f.key === p.observe);
    const readings = p.readingsOverride || (obs && obs.readings && obs.readings.r) || day.readings;
    const w = document.createElement('div');
    w.id = 'printsheet';
    w.innerHTML = `<h1>${esc(obs ? obs.name : day.name)}</h1>
      <p>${esc(whenLabel(servedOn(key, p)))}${p.observedDate && p.observedDate !== day.date ? ` (observed; actual ${esc(fmt(day.date))})` : ''} · ${esc(p.setting)}${day.series ? ` · Series ${day.series}` : ''} · ${esc(obs ? obs.color : day.color)}</p>
      ${p.sermonTitle ? `<p><b>Sermon:</b> “${esc(p.sermonTitle)}”${p.preacher ? ` — ${esc(p.preacher)}` : ''}</p>` : ''}
      ${readings ? `<p>${READ_LABELS.map((l, i) => `<b>${l}:</b> ${esc(readings[i])}`).join('<br>')}</p>` : ''}
      <table>${(p.slots || []).map((s) => `<tr><td>${esc(s.label)}</td><td>${esc(s.kind === 'choir' ? slotText(s, p) + (s.director ? ' · dir. ' + s.director : '') + (s.rehearsal ? ' · rehearsal ' + s.rehearsal : '') : s.value)}</td><td>${esc(s.note)}</td></tr>`).join('')}</table>
      <p>${(p.services || []).map((s) => `${esc(s.label)}${s.musician ? `: ${esc(s.musician)}` : ''}`).join(' · ')}</p>
      ${ROLES.filter((r) => ((p.volunteers || {})[r] || []).some(Boolean)).map((r) => `<div><b>${esc(r)}:</b> ${esc(p.volunteers[r].filter(Boolean).join(', '))}</div>`).join('')}
      ${p.notes ? `<p><b>Notes:</b> ${esc(p.notes)}</p>` : ''}`;
    document.body.appendChild(w);
    window.print();
    setTimeout(() => w.remove(), 500);
  }

  // ---------- Editing ----------
  function setPath(obj, path, val) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = val;
  }
  function queueSave(rerender) {
    const key = draft.__key;
    const plan = Object.assign({}, draft); delete plan.__key;
    plan.history = addHistory(store.get(key), plan); draft.history = plan.history;
    $('#savestate') && ($('#savestate').textContent = 'Saving…');
    clearTimeout(saveTimer);
    pending = true;
    saveTimer = setTimeout(async () => {
      try { await store.save(key, plan); $('#savestate') && ($('#savestate').textContent = 'Saved'); }
      catch (e) { $('#savestate') && ($('#savestate').textContent = 'Not saved: ' + e.message); }
      pending = false;
    }, 600);
    if (rerender) render();
  }

  function onAction(act, el) {
    const i = +el.dataset.i;
    const day = view.name === 'day' ? findDay(view.key) : null;
    switch (act) {
      case 'obsDate': draft.observedDate = el.dataset.d === day.date ? null : el.dataset.d; return queueSave(true);
      case 'observe': draft.observe = el.dataset.k || null; return queueSave(true);
      case 'dismissFlag': draft.flags.splice(i, 1); return queueSave(true);
      case 'editReadings': draft.readingsOverride = [...(day.readings || ['', '', '', ''])]; return queueSave(true);
      case 'resetReadings': draft.readingsOverride = null; return queueSave(true);
      case 'addSvc': draft.services.push({ label: 'Midweek 7:00 pm', musician: '' }); return queueSave(true);
      case 'delSvc': draft.services.splice(i, 1); return queueSave(true);
      case 'addSlot': draft.slots.push({ label: 'Hymn', value: '', note: '' }); return queueSave(true);
      case 'addChoir': { const g = conf().choirs.split(',')[0] || ''; const at = draft.slots.findIndex((x) => /sermon hymn|hymn of the day|offertory|offering/i.test(x.label));
        const line = { kind: 'choir', label: 'Choir Anthem', value: '', composer: '', group: g.trim(), director: '', at: [], rehearsal: '', note: '' };
        if (at >= 0) draft.slots.splice(at + 1, 0, line); else draft.slots.push(line); return queueSave(true); }
      case 'choirAt': { const sl = draft.slots[i]; const n = (draft.services || []).length; const j = +el.dataset.j;
        let cur = sl.at && sl.at.length ? sl.at.slice() : [...Array(n).keys()];
        cur = cur.includes(j) ? cur.filter((x) => x !== j) : cur.concat(j).sort();
        sl.at = cur.length >= n || !cur.length ? [] : cur; return queueSave(true); }
      case 'sbCopy': { const txt = serviceBuilderText(view.key); navigator.clipboard.writeText(txt).then(() => { el.textContent = 'Copied ✓'; }).catch(() => { el.textContent = 'Copy failed'; }); return; }
      case 'delSlot': draft.slots.splice(i, 1); return queueSave(true);
      case 'up': if (i > 0) [draft.slots[i - 1], draft.slots[i]] = [draft.slots[i], draft.slots[i - 1]]; return queueSave(true);
      case 'down': if (i < draft.slots.length - 1) [draft.slots[i + 1], draft.slots[i]] = [draft.slots[i], draft.slots[i + 1]]; return queueSave(true);
      case 'resetSlots': if (confirmInline(el, 'Replace the order of service?')) { draft.slots = defaultSlots(draft.setting, day); queueSave(true); } return;
      case 'print': return printDay(view.key);
      case 'bulletin': el.textContent = 'Building…'; return bulletin(view.key).catch((e) => alertInline(el, 'Failed: ' + e.message)).finally(() => { if (el.isConnected) el.textContent = 'Bulletin (.docx)'; });
      case 'lock': if (confirmInline(el, 'Lock this weekend as final?')) { draft.locked = { by: store.user ? (store.user.name || store.user.email) : 'Preview', at: new Date().toISOString() }; queueSave(true); } return;
      case 'unlock': draft.locked = null; return queueSave(true);
      case 'useHotd': { const n = el.dataset.n; const sh = draft.slots.find((x) => x.label === 'Sermon Hymn') || (draft.slots.push({ label: 'Sermon Hymn', value: '', note: '' }), draft.slots[draft.slots.length - 1]);
        sh.value = `LSB ${n} "${HY.titleFor(n)}"`; sh.note = 'Hymn of the Day'; return queueSave(true); }
      case 'delCustom': if (confirmInline(el, 'Delete this service?')) { store.remove(view.key); location.hash = '#calendar'; } return;
    }
  }
  function alertInline(el, msg) { el.textContent = msg; }
  // two-tap confirm without browser dialogs
  function confirmInline(el, msg) {
    if (el.dataset.armed) return true;
    el.dataset.armed = '1'; const t = el.textContent; el.textContent = msg + ' Tap again';
    setTimeout(() => { if (el.isConnected) { el.textContent = t; delete el.dataset.armed; } }, 3000);
    return false;
  }

  function addSpecial() {
    const box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML = `<div class="card pad"><b>Add a special service</b>
      <label class="fld"><span>Name</span><input id="spName" placeholder="Advent Midweek Vespers"></label>
      <label class="fld"><span>Date</span><input id="spDate" type="date"></label>
      <div class="foot"><span class="grow"></span><button id="spCancel">Cancel</button><button class="primary" id="spOk">Add</button></div></div>`;
    document.body.appendChild(box);
    $('#spCancel', box).onclick = () => box.remove();
    $('#spOk', box).onclick = async () => {
      const name = $('#spName', box).value.trim(); const date = $('#spDate', box).value;
      if (!name || !date) return;
      const key = `custom-${date}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;
      const y = CY.yearOf(CY.parse(date));
      const host = yearData(y).days.filter((d) => d.date <= date && d.kind === 'sunday').pop();
      await store.save(key, { custom: true, date, name, color: host ? host.color : 'white', setting: 'Vespers',
        services: [{ label: 'Service', musician: '' }], slots: defaultSlots('Vespers', { season: host ? host.season : '' }), flags: [] });
      box.remove(); location.hash = `#day-${key}`;
    };
  }

  // ---------- Routing & events ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    if (h.startsWith('day-') || h.startsWith('day/')) { view = { name: 'day', key: decodeURIComponent(h.slice(4)) }; const d = findDay(view.key); if (d) curYear = CY.yearOf(CY.parse(d.date)); }
    else if (h === 'hymns') view = { name: 'hymns', q: view.q, mode: view.mode, book: view.book, sec: view.sec };
    else if (h === 'series') view = { name: 'series', season: view.season };
    else if (h === 'reports') view = { name: 'reports', from: view.from, to: view.to };
    else if (h === 'choir') view = { name: 'choir' };
    else { view = { name: 'calendar' }; draft = null; }
    render();
    if (view.name === 'calendar' && !route.scrolled) { route.scrolled = true; const n = $('#nextRow'); n && n.scrollIntoView({ block: 'center' }); }
    else window.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); onAction(a.dataset.act, a); return; }
    const hs = e.target.closest('[data-hsec]'); if (hs) { view.sec = hs.dataset.hsec; view.mode = 'browse'; view.q = ''; }
    const hm = e.target.closest('[data-hmode]'); if (hm) { view.mode = hm.dataset.hmode; view.q = ''; render(); return; }
    const ah = e.target.closest('[data-addhymn]'); if (ah) { addHymnTo(ah.dataset.addhymn, ah.dataset.title); return; }
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'signin') store.signIn();
    if (t.id === 'sendLink') linkAction('send');
    if (t.id === 'finishLink') linkAction('finish');
    if (t.id === 'signout') store.signOut();
    if (t.id === 'addSpecial') addSpecial();
    if (t.id === 'addMidweek') addMidweek();
    if (t.id === 'csv') downloadCSV();
    if (t.id === 'copyFeed') { const i = $('#feedUrl'); i.select(); navigator.clipboard && navigator.clipboard.writeText(i.value).then(() => { t.textContent = 'Copied'; }).catch(() => {}); }
    if (t.id === 'jumpToday') { curYear = CY.yearOf(new Date()); location.hash = '#calendar'; render(); const n = $('#nextRow'); n && n.scrollIntoView({ block: 'center' }); }
    if (t.dataset.view) location.hash = '#' + t.dataset.view;
  });
  document.addEventListener('input', (e) => {
    const f = e.target.dataset.f;
    if (f && draft) { setPath(draft, f, e.target.value); queueSave(false); }
    if (e.target.dataset.vol && draft) { const r = e.target.dataset.vol; const arr = (draft.volunteers[r] = draft.volunteers[r] || []); arr[+e.target.dataset.i] = e.target.value; queueSave(false); }
    if (e.target.dataset.cfg) saveConf(e.target.dataset.cfg, e.target.value);
    if (e.target.dataset.anthem) { const C = conf(); const a = Object.assign({}, C.anthems || {}); a[e.target.dataset.anthem] = Object.assign({}, a[e.target.dataset.anthem], { copies: e.target.value === '' ? null : +e.target.value }); saveConf('anthems', a); }
    if (e.target.dataset.sk) saveSeriesField(e.target.dataset.sk, e.target.dataset.sf, e.target.value);
    if (e.target.id === 'hq') { view.q = e.target.value; const pos = e.target.selectionStart; render(); const q = $('#hq'); q.focus(); q.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'yearSel') { curYear = +e.target.value; render(); }
    if (e.target.dataset.f === 'setting' && draft) render();
    if (/^slots\.\d+\.value$/.test(e.target.dataset.f || '') && draft) {
      const v = expandHymn(e.target.value);
      if (v !== e.target.value) { e.target.value = v; setPath(draft, e.target.dataset.f, v); queueSave(true); }
    }
    if (e.target.classList.contains('copyfrom') && draft && e.target.value) {
      const src = store.get(e.target.value);
      if (src) { draft.setting = src.setting; draft.slots = JSON.parse(JSON.stringify(src.slots || []));
        draft.services = (src.services || []).map((x) => ({ label: x.label, musician: '' })); queueSave(true); }
    }
    if (e.target.id === 'seasonSel') { view.season = e.target.value; render(); }
    if (e.target.id === 'hBook') { view.book = e.target.value; render(); }
    if (e.target.id === 'hSec') { view.sec = e.target.value; render(); }
    if (e.target.id === 'repFrom' || e.target.id === 'repTo') { view.from = $('#repFrom').value; view.to = $('#repTo').value; render(); }
    if (e.target.classList.contains('obsdate') && draft && e.target.value) {
      const day = findDay(view.key);
      draft.observedDate = e.target.value === day.date ? null : e.target.value; queueSave(true);
    }
  });

  // ---------- Boot ----------
  (async function boot() {
    curYear = CY.yearOf(new Date());
    if (curYear < 2026) curYear = 2026;
    store = await window.STORE.createStore();
    store.subscribe(() => {
      const typing = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.f;
      if (view.name === 'day' && (pending || typing)) return; // don't clobber local edits
      if (view.name === 'day') draft = null; // pick up teammates' changes
      render();
    });
    store.onAuth = () => render();
    // Same device that requested the link: finish sign-in automatically
    if (store.isLinkSignIn && store.isLinkSignIn() && store.linkEmail()) store.finishLink(store.linkEmail()).catch(() => render());
    window.addEventListener('hashchange', route);
    route();
  })();
})();
