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
  const DEFAULT_SETTINGS = { choirs: 'Adult Choir, Children\'s Choir, Handbell Choir', anthems: {}, officeName: 'Akasha', officeEmail: 'bethfw@yahoo.com',
    pastorName: 'Pastor Ben', pastorEmail: 'ben.ahlersmeyer@gmail.com' };
  const APP_URL = 'https://bethlehem-worship.web.app/';
  // Where each order begins in the Lutheran Service Book pew edition
  const LSB_PAGE = { 'Divine Service, Setting One': 151, 'Divine Service, Setting Two': 167, 'Divine Service, Setting Three': 184,
    'Divine Service, Setting Four': 203, 'Divine Service, Setting Five': 213, Matins: 219, Vespers: 229, 'Morning Prayer': 235,
    'Evening Prayer': 243, 'Service of Prayer and Preaching': 260 };
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
      const one = /One|Two/.test(setting);
      slots = [S('Prelude'), S('Opening Hymn'), S('Hymn of Praise', praise), S(one ? 'Alleluia and Verse' : 'Gospel Acclamation', alleluia),
        S('Sermon Hymn'), S('Creed', creed), S('Offertory'), S('Sanctus'), S('Agnus Dei'), S('Distribution'),
        S(one ? 'Nunc Dimittis' : 'Post-Communion Canticle'), S('Closing Hymn'), S('Postlude')];
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
      <div class="card pad"><label class="fld"><span>Choirs</span><input data-cfg="choirs" value="${esc(C.choirs)}" placeholder="Adult Choir, Children's Choir" ${edit ? '' : 'disabled'}></label><span class="muted" id="cfgstate"></span></div>
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
  // Preview: add ?member to the address to see what Kasey and Janelle see
  const isAdmin = () => (store.mode === 'local' && !/member/.test(location.search)) || (store.user && ADMINS.includes((store.user.email || '').toLowerCase()));
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
    if (view.name === 'day') hydrateArt();
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
    const waiting = Object.entries(plans).filter(([, p]) => !p.locked && p.review && p.review.state === 'submitted').sort((a, b) => servedOn(a[0], a[1]).localeCompare(servedOn(b[0], b[1])));
    if (waiting.length && isAdmin()) html += `<div class="card list reviewq"><div class="pad"><b>Waiting for your review</b></div>${waiting.map(([k, p]) => { const d = findDay(k);
      return `<a class="row" href="#day-${esc(k)}"><span class="when">${esc(whenLabel(servedOn(k, p)))}</span><span class="what"><b>${esc(p.custom ? p.name : d ? d.name : k)}</b><small>Submitted by ${esc(p.review.by)} · ${esc(new Date(p.review.at).toLocaleDateString())}</small></span><span class="status"><i class="badge rev">Review</i></span></a>`; }).join('')}</div>`;
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
        <span class="status">${p && !p.locked && p.review && p.review.state === 'submitted' ? '<i class="badge rev">For review</i>' : ''}${p && !p.locked && p.review && p.review.state === 'changes' ? '<i class="badge chg">Changes</i>' : ''}${p && p.locked ? '<i class="lock" title="Final">🔒</i>' : ''}${p ? `${p.flags && p.flags.length ? '<i class="flag" title="Needs a look">!</i>' : ''}<span class="meter"><span style="width:${pr.total ? (100 * pr.done / pr.total) : 0}%"></span></span>` : '<span class="muted">not started</span>'}</span>
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
        ${isAdmin() ? '<button data-act="unlock">Unlock</button>' : '<span class="muted">Ask Pastor Ben or Sam to unlock.</span>'}
        <span class="officebar"><button class="primary" data-act="mailOffice">Email outline to ${esc(conf().officeName)}</button><button data-act="copyOutline">Copy outline</button>
        ${p.officeSent ? `<span class="muted">Emailed ${esc(new Date(p.officeSent.at).toLocaleDateString())} by ${esc(p.officeSent.by)}</span>` : ''}</span></div>`;
    }

    if (!p.locked && p.review && p.review.state) {
      const r = p.review;
      if (r.state === 'submitted') h += `<div class="card reviewbar"><span>📨 Submitted to ${esc(conf().pastorName)} by ${esc(r.by)} on ${esc(new Date(r.at).toLocaleDateString())}.${r.message ? ` “${esc(r.message)}”` : ''}</span>
        ${isAdmin() ? `<span class="officebar"><button class="primary" data-act="approve">Approve & send to ${esc(conf().officeName)}</button><input id="sendBackNote" placeholder="What needs changing?"><button data-act="sendBack">Send back</button></span>` : `<span class="muted">Waiting for ${esc(conf().pastorName)}.</span>`}</div>`;
      else if (r.state === 'changes') h += `<div class="card reviewbar chg"><span>↩︎ ${esc(r.reviewer || conf().pastorName)} asked for changes${r.note ? `: “${esc(r.note)}”` : '.'}</span>
        ${store.canEdit ? '<button data-act="submitReview">Resubmit</button>' : ''}</div>`;
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
      <b class="sub">Services & musicians</b>
      ${(p.services || []).map((s, i) => `<div class="svc"><input data-f="services.${i}.label" value="${esc(s.label)}" ${ro}><input data-f="services.${i}.musician" value="${esc(s.musician)}" placeholder="Musician" ${ro}>${store.canEdit && !p.locked ? `<button class="icon" data-act="delSvc" data-i="${i}" title="Remove">×</button>` : ''}</div>`).join('')}
      ${store.canEdit && !p.locked ? '<button class="link" data-act="addSvc">+ Add service time</button>' : ''}
    </div></div>`;

    // Order of service
    h += `<div class="card pad"><div class="cardhead"><b>Order of service</b>
      <span class="grow"></span>${store.canEdit && !p.locked ? `${copyFromSelect(key, day)}<button class="link" data-act="resetSlots">Start over</button>` : ''}</div>
      <label class="fld setting"><span>Setting</span><select id="settingSel" ${ro}>
        <optgroup label="Divine Service">${SETTINGS.slice(0, 5).map((x) => `<option value="${esc(x)}" ${x === p.setting ? 'selected' : ''}>${esc(x.replace('Divine Service, ', ''))}${LSB_PAGE[x] ? ` — LSB p. ${LSB_PAGE[x]}` : ''}</option>`).join('')}</optgroup>
        <optgroup label="Daily Office & other">${SETTINGS.slice(5).map((x) => `<option value="${esc(x)}" ${x === p.setting ? 'selected' : ''}>${esc(x)}${LSB_PAGE[x] ? ` — LSB p. ${LSB_PAGE[x]}` : ''}</option>`).join('')}</optgroup>
      </select></label>
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

    h += artCard(key, day, p);

    h += `<div class="card pad"><label class="fld"><span>Notes for the team</span><textarea data-f="notes" rows="3" ${ro}>${esc(p.notes)}</textarea></label>
      <div class="foot"><span id="savestate" class="muted">${saved && saved.updatedAt ? `Saved ${new Date(saved.updatedAt).toLocaleString()}${saved.updatedBy && saved.updatedBy !== 'preview' ? ' by ' + esc(saved.updatedBy) : ''}` : ''}</span>
      <span class="grow"></span><button data-act="print">Print / PDF</button>
      ${store.canEdit && saved && !p.locked && !isAdmin() && !(p.review && p.review.state === 'submitted') ? `<input id="submitMsg" placeholder="Note for ${esc(conf().pastorName)} (optional)"><button class="primary" data-act="submitReview">Submit to ${esc(conf().pastorName)}</button>` : ''}
      ${store.canEdit && saved && !p.locked && isAdmin() ? `<button class="primary" data-act="approve">Approve & send to ${esc(conf().officeName)} 🔒</button>` : ''}
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


  // Switch setting: lay out that setting's lines, keeping hymns and notes already filled in (and extra lines like the choir)
  function changeSetting(setting) {
    const day = findDay(view.key); const old = draft.slots || [];
    const fresh = defaultSlots(setting, day);
    // what part of the liturgy a line is, so "Gospel Alleluia" in one setting finds "Alleluia and Verse" in another
    const role = (l) => /alleluia|acclamation|^verse/i.test(l) ? 'alleluia' : /post-communion|nunc|canticle|thank the lord/i.test(l) ? 'post'
      : /sanctus|agnus|creed|offertory|kyrie|preface|confession|prayer of the church|reading|hymn of praise|gloria/i.test(l) ? 'liturgy:' + l.toLowerCase() : null;
    const isHymn = (s) => /"/.test(s.value || '') || /hymn|prelude|postlude|distribution/i.test(s.label) && !/hymn of praise/i.test(s.label);
    const used = new Set();
    for (const f of fresh) {
      const i = old.findIndex((o, n) => !used.has(n) && o.kind !== 'choir' && (o.label === f.label || (role(o.label) && role(o.label) === role(f.label))));
      if (i < 0) continue;
      used.add(i);
      if (old[i].value && isHymn(old[i])) { f.value = old[i].value; f.note = old[i].note; } // hymns move; liturgy pages belong to the setting
    }
    // Ben's own lines (choir, candle lighting, musical offering…) stay, after the line they followed
    old.forEach((o, n) => {
      if (used.has(n) || (role(o.label) && !/"/.test(o.value || ''))) return;
      let at = fresh.length;
      for (let m = n - 1; m >= 0; m--) { const j = fresh.findIndex((f) => f.label === old[m].label || (role(old[m].label) && role(f.label) === role(old[m].label))); if (j >= 0) { at = j + 1; break; } }
      fresh.splice(at, 0, JSON.parse(JSON.stringify(o)));
    });
    draft.setting = setting; draft.slots = fresh; queueSave(true);
  }
  function copyFromSelect(key, day) {
    const lc = lastCycle(day);
    const others = Object.entries(store.all()).filter(([k, x]) => k !== key && x.slots && x.slots.length)
      .map(([k, x]) => ({ k, date: servedOn(k, x), name: x.custom ? x.name : ((findDay(k) || {}).name || k) }))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
    return `<select class="copyfrom" title="Copies the setting, every line and its hymns from another weekend, so you only change what's different"><option value="">Copy another weekend's order…</option>
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
      <div class="card pad"><div class="cardhead"><b>Church office</b><span class="grow"></span><span class="muted" id="cfgstate"></span></div>
        <p class="muted">When a weekend is marked final, its outline is emailed here for the bulletin.</p>
        <div class="svc"><input data-cfg="officeName" value="${esc(conf().officeName)}" placeholder="Name" ${isAdmin() ? '' : 'disabled'}><input data-cfg="officeEmail" value="${esc(conf().officeEmail)}" placeholder="Email" ${isAdmin() ? '' : 'disabled'}></div></div>
      <div class="card pad"><b>Calendar feed</b><p class="muted">Subscribe in Google Calendar, Apple Calendar or Outlook to see every service with its hymns. Updates nightly.</p>
      ${feed ? `<div class="linkrow wide"><input readonly value="${esc(feed)}" id="feedUrl"><button id="copyFeed">Copy link</button></div>` : '<p class="muted">The feed link appears here after the first nightly update.</p>'}</div>
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
    observedDate: 'date kept', volunteers: 'volunteers', series: 'sermon series', locked: 'final/lock', flags: 'notes to check', art: 'cover art', officeSent: 'emailed office' };
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

  // ---------- Settings (shared, stored with the plans) ----------
  let confTimer = null, confDraft = null;
  function saveConf(field, value) {
    confDraft = Object.assign(conf(), confDraft || {}, { [field]: value });
    clearTimeout(confTimer);
    confTimer = setTimeout(async () => { const d = confDraft; confDraft = null; const st = $('#cfgstate');
      try { await store.saveSettings(d); st && (st.textContent = 'Saved'); } catch (e) { st && (st.textContent = 'Not saved: ' + e.message); } }, 600);
  }
  function slotText(s, p) {
    if (s.kind === 'choir') return [s.value ? `“${s.value}”` : '', s.composer, s.group, choirAtLabel(s, p)].filter(Boolean).join(' · ');
    const hy = hymnsIn({ slots: [s] });
    if (hy.length) return hy.map((h) => `${h.title || HY.titleFor(String(h.num), h.book) || ''} — ${h.id}`).join('; ');
    return s.value || '';
  }

  // ---------- Cover art (Ed Riojas, Ecclesiastical Art) ----------
  const ART = window.ART;
  function artDay(day, p) {
    const obs = p && p.observe && (day.festivals || []).find((f) => f.key === p.observe);
    if (obs) return { key: obs.key, name: obs.name, kind: 'feast', series: day.series, readings: obs.readings && obs.readings.r };
    return day;
  }
  function artChoice(day, p) {
    if (p && p.art) { const a = ART.byId(p.art); if (a) return Object.assign(a, { chosen: true }); }
    return ART.artFor(artDay(day, p), day.series);
  }
  const artCache = {};
  async function loadArt(id) {
    if (!artCache[id]) artCache[id] = store.getArt(id).catch(() => null);
    return artCache[id];
  }
  function artCard(key, day, p) {
    const a = artChoice(day, p);
    const edit = store.canEdit && !p.locked;
    return `<div class="card pad artcard"><div class="cardhead"><b>Bulletin cover art</b><span class="grow"></span>
        ${edit ? `<button class="link" data-act="artPick">Change</button>${p.art ? ' <button class="link" data-act="artReset">Use suggested</button>' : ''}` : ''}</div>
      ${a ? `<div class="artbox" data-artid="${esc(a.id)}"><span class="muted">Loading…</span></div>
        <div class="arttitle"><b>${esc(a.title)}</b> <span class="muted">Ed Riojas · ${esc(a.id)}${a.ref ? ` · ${esc(a.ref[0])} ${a.ref[1]}:${a.ref[2]}–${a.ref[3]}` : ''}${a.chosen ? ' · chosen' : ''}</span></div>
        <div class="foot"><button data-act="artCopy" data-id="${esc(a.id)}">Copy image</button><button data-act="artSave" data-id="${esc(a.id)}">Save image</button>
        <span class="muted">Paste or upload into Canva</span></div>`
        : '<p class="muted">No matching piece in the collection — choose one with “Change”.</p>'}</div>`;
  }
  async function hydrateArt() {
    for (const box of document.querySelectorAll('.artbox[data-artid]')) {
      const id = box.dataset.artid; const url = await loadArt(id);
      if (!box.isConnected || box.dataset.artid !== id) continue;
      box.innerHTML = url ? `<img src="${url}" alt="">` : '<span class="muted">Image not available yet (it loads once the art upload finishes).</span>';
    }
  }
  async function artBlob(id) { const url = await loadArt(id); if (!url) throw new Error('not loaded'); return (await fetch(url)).blob(); }
  function artPicker(key, day) {
    const box = document.createElement('div'); box.className = 'modal';
    const sets = [[day.series, `Series ${day.series}`], ['F', 'Festivals & occasions'], ['H', 'One-year series'], ['M', 'Miscellaneous'],
      ...['A', 'B', 'C'].filter((x) => x !== day.series).map((x) => [x, `Series ${x}`])];
    box.innerHTML = `<div class="card pad artpick"><b>Choose cover art</b>
      <div class="toolbar"><select id="apSet">${sets.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select><input id="apQ" placeholder="Search title or Scripture"></div>
      <div class="aplist"></div><div class="foot"><span class="grow"></span><button id="apCancel">Cancel</button></div></div>`;
    document.body.appendChild(box);
    const list = () => {
      const set = $('#apSet', box).value, q = $('#apQ', box).value.toLowerCase();
      $('.aplist', box).innerHTML = ART.list.filter(([id, t, r]) => id[0] === set && (!q || (id + ' ' + t + ' ' + (r ? r.join(' ') : '')).toLowerCase().includes(q)))
        .sort((x, y) => parseInt(x[0].slice(2)) - parseInt(y[0].slice(2)))
        .map(([id, t, r, tags]) => `<button class="row" data-pick="${esc(id)}"><span class="when">${esc(id)}</span><span class="what">${esc(t)}${tags.includes('RCL') ? ' <small>RCL</small>' : ''}</span><span class="uses">${r ? esc(`${r[0]} ${r[1]}:${r[2]}–${r[3]}`) : ''}</span></button>`).join('') || '<div class="pad muted">Nothing matches.</div>';
    };
    $('#apQ', box).addEventListener('input', list); $('#apSet', box).addEventListener('change', list); list();
    $('#apCancel', box).onclick = () => box.remove();
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; draft.art = b.dataset.pick; box.remove(); queueSave(true); });
  }

  // ---------- Final outline for the church office ----------
  // Liturgy with LSB page numbers, in bulletin order (Divine Service, Setting One — from Bethlehem's bulletin)
  const DS1 = [['Opening Hymn', /opening|entrance/i], ['Confession and Absolution', /confession/i, 'p. 151'],
    ['Hymn of Praise', /hymn of praise|this is the feast|gloria/i, 'p. 155'], ['Salutation and Collect', /collect/i, 'p. 156'],
    ['Old Testament', /first reading|old testament/i, null, 0], ['Psalm', /^psalm/i, null, 1], ['Epistle', /epistle/i, null, 2],
    ['Alleluia and Verse', /alleluia|verse|acclamation/i, 'p. 156'], ['Holy Gospel', /gospel reading|holy gospel/i, null, 3],
    ['Hymn of the Day', /sermon hymn|hymn of the day/i], ['Sermon', /^sermon$/i], ['Creed', /creed/i],
    ['Prayer of the Church', /prayer of the church/i], ['Offering and Offertory', /offering|offertory/i, 'p. 159'],
    ['Preface', /preface/i, 'p. 160'], ['Sanctus', /sanctus/i, 'p. 161'], ['Prayer of Thanksgiving', /thanksgiving/i, 'p. 161'],
    ["Lord's Prayer", /lord.s prayer/i, 'p. 162'], ['Words of Our Lord', /words of/i, 'p. 162'], ['Pax Domini', /pax/i, 'p. 163'],
    ['Agnus Dei', /agnus/i, 'p. 163'], ['Distribution', /distribution/i], ['Nunc Dimittis', /nunc|post-communion canticle/i, 'p. 165'],
    ['Post-Communion Collect', /post-communion collect/i, 'p. 166'], ['Benediction', /benediction/i, 'p. 166'], ['Closing Hymn', /closing|recessional|sending/i]];
  const ORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth',
    'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth'];
  const ordinal = (n) => n <= 20 ? ORD[n] : 'Twenty-' + ORD[n - 20];
  // "Twenty-Sixth Sunday after Pentecost" — how Bethlehem's bulletin names the Sundays after Pentecost
  function pentecostName(day) {
    if (!day || day.kind !== 'sunday') return '';
    const pent = yearData(CY.yearOf(CY.parse(day.date))).days.find((d) => d.key === 'pentecost');
    if (!pent || day.date <= pent.date || !/^proper|^lastSunday|^trinity/.test(day.key)) return '';
    const n = Math.round((CY.parse(day.date) - CY.parse(pent.date)) / (7 * 864e5));
    return n >= 1 && n <= 29 ? `${ordinal(n)} Sunday after Pentecost` : '';
  }
  function servingLines(p) {
    const svcs = p.services || []; const out = [];
    svcs.forEach((s) => s.musician && out.push(`Musician (${s.label}): ${s.musician}`));
    for (const s of p.slots || []) if (s.kind === 'choir' && s.value) out.push(`${s.group || 'Choir'}: ${[s.director && s.director + ', director', choirAtLabel(s, p)].filter(Boolean).join(' · ') || '—'}`);
    for (const r of ROLES) { const v = ((p.volunteers || {})[r] || []).map((n, i) => n ? `${n}${svcs.length > 1 ? ` (${(svcs[i] || {}).label})` : ''}` : '').filter(Boolean); if (v.length) out.push(`${r}: ${v.join(', ')}`); }
    if (p.preacher) out.unshift(`Preacher: ${p.preacher}`);
    return out;
  }
  // Final outline for the church office, in the same order as the bulletin template (cover → order of service → serving → next Sunday)
  function outlineText(key) {
    const day = findDay(key); const p = draft;
    const obs = p.observe && (day.festivals || []).find((f) => f.key === p.observe);
    const readings = p.readingsOverride || (obs && obs.readings && obs.readings.r) || day.readings;
    const name = obs ? obs.name : (p.custom ? p.name : day.name);
    const pname = obs ? '' : pentecostName(day);
    const when = whenLabel(servedOn(key, p));
    const page = LSB_PAGE[p.setting];
    const svcs = p.services || [];
    const art = artChoice(day, p);
    const L = [];
    L.push('— PAGE 1 · COVER —', pname ? pname : name, pname ? `(${name})` : null, when, svcs.map((s) => s.label).join(' · ') || null,
      art ? `Cover art: Ed Riojas ${art.id} — ${art.title}` : null, `Color: ${obs ? obs.color : day.color}`, '');
    L.push('— PAGE 2 · ORDER OF SERVICE —', `${p.setting}${page ? ` · Lutheran Service Book p. ${page}` : ''}`);
    const fmtSlot = (s) => slotText(s, p);
    if (/Setting One/.test(p.setting)) {
      const used = new Set(); let next = 0; const lines = [];
      const emit = (k, s) => {
        const [label, , pg, r] = k; let v = s ? fmtSlot(s) : '';
        if (r != null && readings) v = v || readings[r];
        if (label === 'Sermon') v = p.sermonTitle ? `“${p.sermonTitle}”${p.preacher ? ' — ' + p.preacher : ''}` : v;
        if (label === 'Creed' && s && /apostles/i.test(s.value || '')) v = `Apostles' Creed · p. 159`;
        lines.push(`${label}${v ? ': ' + v : ''}${pg && !(label === 'Creed') ? ' · ' + pg : ''}${s && s.note ? `  (${s.note})` : ''}`);
      };
      for (const s of p.slots || []) {
        const j = s.kind === 'choir' ? -1 : DS1.findIndex((k, n) => n >= next && k[1].test(s.label));
        if (j < 0) { lines.push(`${s.label}: ${fmtSlot(s) || '—'}${s.note ? `  (${s.note})` : ''}`); continue; }
        while (next < j) emit(DS1[next++]);
        emit(DS1[next++], s);
      }
      while (next < DS1.length) emit(DS1[next++]);
      L.push(...lines);
    } else {
      if (readings) L.push(...READ_LABELS.map((l, i) => `${l}: ${readings[i]}`));
      if (p.sermonTitle) L.push(`Sermon: “${p.sermonTitle}”${p.preacher ? ' — ' + p.preacher : ''}`);
      for (const s of p.slots || []) {
        let v = fmtSlot(s);
        if (!v && /First Reading|Old Testament|Epist|Gospel Reading/.test(s.label)) continue;
        L.push(`${s.label}: ${v || '—'}${s.note ? `  (${s.note})` : ''}`);
      }
    }
    L.push('');
    const nb = neighbors(day); const nx = nb.next && findDay(nb.next); const np = nx && store.get(nx.date);
    L.push('— PAGE 3 · SERVING —', 'This weekend:', ...(servingLines(p).length ? servingLines(p) : ['(not filled in yet)']));
    if (np) { const sv = servingLines(np); if (sv.length) L.push('', `Next weekend (${whenLabel(servedOn(nx.date, np))}):`, ...sv); }
    if (nx && nx.readings) L.push('', `READINGS FOR NEXT SUNDAY — ${nx.name}`, nx.readings[0], nx.readings[2], nx.readings[3]);
    if (p.notes) L.push('', 'NOTES FROM THE TEAM', p.notes);
    L.push('', `Marked final in the Bethlehem worship planner${p.locked ? ' by ' + p.locked.by : ''}.`);
    return { subject: `Final service outline: ${pname || name} — ${when}`, body: L.filter((x) => x !== null).join('\n') };
  }
  const who = () => store.user ? (store.user.name || store.user.email) : 'Preview';
  // Emails go out automatically when the mailer is running (it checks in every few minutes);
  // otherwise the person's own email app opens with the message ready to send.
  function sendMail(kind, key) {
    const C = conf(); const o = outlineText(key); const link = APP_URL + '#day-' + key; const r = draft.review || {};
    let to, subject, body, art = null, replyTo = store.user ? store.user.email : '';
    if (kind === 'office') {
      to = C.officeEmail; subject = o.subject;
      body = `Hi ${C.officeName},\n\nHere is the final outline for the bulletin${store.mailerLive ? ' (cover art attached)' : ''}.\n\n${o.body}`;
      art = (artChoice(findDay(key), draft) || {}).id || null; replyTo = C.pastorEmail;
    } else if (kind === 'pastor') {
      to = C.pastorEmail; subject = `Ready for review: ${o.subject.replace(/^Final service outline: /, '')}`;
      body = `${C.pastorName},\n\n${r.by} submitted this service for your review.${r.message ? `\n\n“${r.message}”` : ''}\n\nReview and approve: ${link}\n\n${o.body.replace(/\nMarked final.*$/, '')}`;
    } else {
      to = r.byEmail || ''; subject = `Changes requested: ${o.subject.replace(/^Final service outline: /, '')}`;
      body = `${C.pastorName} asked for changes${r.note ? `:\n\n“${r.note}”` : '.'}\n\nOpen the service: ${link}\n`;
    }
    if (!to) return;
    if (store.mailerLive) {
      draft.outbox = (draft.outbox || []).filter((m) => m.pending).concat({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, to, subject, body, art, replyTo, pending: true, at: new Date().toISOString() });
      draft.outboxPending = true;
    } else {
      location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
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
      case 'artPick': return artPicker(view.key, day);
      case 'artReset': draft.art = null; return queueSave(true);
      case 'artCopy': { const t = el.textContent; el.textContent = 'Copying…';
        // Safari wants the ClipboardItem built synchronously with a promise inside
        navigator.clipboard.write([new ClipboardItem({ 'image/png': artBlob(el.dataset.id) })]).then(() => { el.textContent = 'Copied ✓ — paste in Canva'; }).catch(() => { el.textContent = 'Copy not allowed here — use Save image'; });
        setTimeout(() => { if (el.isConnected) el.textContent = t; }, 4000); return; }
      case 'artSave': artBlob(el.dataset.id).then((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b);
        a.download = `${servedOn(view.key, draft)} ${(findDay(view.key).name || '').replace(/[^A-Za-z0-9 ]+/g, '')} - Riojas ${el.dataset.id}.png`; document.body.appendChild(a); a.click(); a.remove(); }).catch(() => { el.textContent = 'Not loaded yet'; }); return;
      case 'delSlot': draft.slots.splice(i, 1); return queueSave(true);
      case 'up': if (i > 0) [draft.slots[i - 1], draft.slots[i]] = [draft.slots[i], draft.slots[i - 1]]; return queueSave(true);
      case 'down': if (i < draft.slots.length - 1) [draft.slots[i + 1], draft.slots[i]] = [draft.slots[i], draft.slots[i + 1]]; return queueSave(true);
      case 'resetSlots': if (confirmInline(el, 'Clear all lines back to the setting?')) { draft.slots = defaultSlots(draft.setting, day); queueSave(true); } return;
      case 'print': return printDay(view.key);
      case 'lock': case 'approve': if (confirmInline(el, `Lock as final and send to ${conf().officeName}?`)) {
        draft.locked = { by: who(), at: new Date().toISOString() };
        draft.review = Object.assign({}, draft.review, { state: 'approved', reviewer: who(), reviewedAt: new Date().toISOString() });
        sendMail('office', view.key); draft.officeSent = { by: who(), at: new Date().toISOString() }; queueSave(true); } return;
      case 'mailOffice': sendMail('office', view.key); if (isAdmin()) { draft.officeSent = { by: who(), at: new Date().toISOString() }; queueSave(true); } return;
      case 'submitReview': { const m = ($('#submitMsg') || {}).value || '';
        draft.review = { state: 'submitted', by: who(), byEmail: store.user ? store.user.email : '', at: new Date().toISOString(), message: m.trim() };
        sendMail('pastor', view.key); queueSave(true); return; }
      case 'sendBack': { const note = ($('#sendBackNote') || {}).value || '';
        draft.review = Object.assign({}, draft.review, { state: 'changes', note: note.trim(), reviewer: who(), reviewedAt: new Date().toISOString() });
        sendMail('changes', view.key); queueSave(true); return; }
      case 'copyOutline': navigator.clipboard.writeText(outlineText(view.key).body).then(() => { el.textContent = 'Copied ✓'; }).catch(() => { el.textContent = 'Copy failed'; }); return;
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
    if (e.target.id === 'settingSel' && draft) { changeSetting(e.target.value); }
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
