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
  const READ_LABELS = ['First Reading', 'Psalm', 'Epistle', 'Gospel'];
  const SETTINGS = ['Divine Service, Setting One', 'Divine Service, Setting Two', 'Divine Service, Setting Three',
    'Divine Service, Setting Four', 'Divine Service, Setting Five', 'Matins', 'Vespers', 'Morning Prayer',
    'Evening Prayer', 'Service of Prayer and Preaching', 'Other'];

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
    return {
      setting,
      services: isSun ? [{ label: 'Saturday 4:00 pm', musician: '' }, { label: 'Sunday 9:00 am', musician: '' }] : [{ label: 'Service', musician: '' }],
      slots: defaultSlots(setting, day), sermonTitle: '', preacher: '', sermonNotes: '', notes: '', flags: [],
    };
  }

  // ---------- Hymn index ----------
  const isHymnSlot = (s) => /hymn|distribution|prelude|postlude|candle|offering|psalm/i.test(s.label) || /"/.test(s.value || '');
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
      const date = p.custom ? p.date : k;
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
    const rows = [...yr.days, ...customs].sort((a, b) => a.date.localeCompare(b.date));
    const today = CY.iso(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
    let html = `<div class="toolbar">${yearSwitcher()}
      <div class="yrinfo">Series ${yr.series} · ${fmtLong(yr.start)} – ${fmtLong(yr.end)} · Easter ${fmtLong(yr.easter)}</div>
      <span class="grow"></span>
      <button id="jumpToday">Today</button>
      <button id="addSpecial">+ Special service</button></div>`;
    let season = null, markedToday = false;
    for (const d of rows) {
      const grp = d.kind === 'custom' ? season : d.season;
      if (grp !== season) { if (season) html += '</div>'; season = grp; html += `<h3 class="season">${esc(season)}</h3><div class="card list">`; }
      const key = d.kind === 'custom' ? d.key : d.date;
      const p = plans[key];
      const pr = progress(p);
      const isSun = CY.dow(CY.parse(d.date)) === 0;
      const when = isSun ? weekend(d.date) : fmt(d.date);
      const gospel = d.readings ? d.readings[3] : '';
      const fest = (d.festivals || []).map((f) => f.name).join(' · ');
      const isNext = !markedToday && d.date >= today;
      if (isNext) markedToday = true;
      html += `<a class="row ${d.kind !== 'sunday' ? 'feast' : ''} ${isNext ? 'next' : ''}" href="#day-${esc(key)}" ${isNext ? 'id="nextRow"' : ''}>
        <span class="swatch" style="background:${CY.COLORS[d.color] || '#ccc'}" title="${esc(d.color)}"></span>
        <span class="when">${esc(when)}</span>
        <span class="what"><b>${esc(d.name)}</b>${fest ? `<small class="fest">${esc(fest)}</small>` : ''}
          ${gospel ? `<small>${esc(gospel)}</small>` : ''}</span>
        <span class="sermon">${p && p.sermonTitle ? `“${esc(p.sermonTitle)}”` : ''}</span>
        <span class="status">${p ? `${p.flags && p.flags.length ? '<i class="flag" title="Needs a look">!</i>' : ''}<span class="meter"><span style="width:${pr.total ? (100 * pr.done / pr.total) : 0}%"></span></span>` : '<span class="muted">not started</span>'}</span>
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
    const isSun = day.kind === 'sunday';
    const ro = store.canEdit ? '' : 'disabled';
    const idx = hymnIndex();
    const obs = p.observe && (day.festivals || []).find((f) => f.key === p.observe);
    const readings = p.readingsOverride || (obs && obs.readings && obs.readings.r) || day.readings;
    const nav = neighbors(day);

    let h = `<div class="dayhead" style="--lc:${CY.COLORS[day.color] || '#999'}">
      <div class="crumbs"><a href="#calendar">← ${esc(yearData(CY.yearOf(CY.parse(day.date))).label)} calendar</a>
        <span class="grow"></span>${nav.prev ? `<a href="#day-${nav.prev}">‹ Prev</a>` : ''} ${nav.next ? `<a href="#day-${nav.next}">Next ›</a>` : ''}</div>
      <h2>${esc(obs ? obs.name : day.name)}</h2>
      <div class="meta">${esc(isSun ? weekend(day.date) : fmtLong(day.date))}${day.series ? ` · Series ${day.series}` : ''}${day.proper && day.proper < 29 ? ` · Proper ${day.proper}` : ''} · <span class="colorname">${esc(obs ? obs.color : day.color)}</span></div>
      ${!saved ? '<div class="hint">Not started — defaults filled in below. Changes save automatically.</div>' : ''}
    </div>`;

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
    if (day.notes && day.notes.length) h += `<ul class="lnotes">${day.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
    h += `</div>`;

    // Sermon & services
    h += `<div class="card pad"><b>Sermon</b>
      <label class="fld"><span>Title</span><input data-f="sermonTitle" value="${esc(p.sermonTitle)}" ${ro}></label>
      <label class="fld"><span>Preacher</span><input data-f="preacher" value="${esc(p.preacher)}" placeholder="Pastor Ben" ${ro}></label>
      <label class="fld"><span>Text & notes</span><textarea data-f="sermonNotes" rows="2" ${ro}>${esc(p.sermonNotes)}</textarea></label>
      <label class="fld"><span>Setting</span><select data-f="setting" ${ro}>${SETTINGS.map((s) => `<option ${s === p.setting ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <b class="sub">Services & musicians</b>
      ${(p.services || []).map((s, i) => `<div class="svc"><input data-f="services.${i}.label" value="${esc(s.label)}" ${ro}><input data-f="services.${i}.musician" value="${esc(s.musician)}" placeholder="Musician" ${ro}>${store.canEdit ? `<button class="icon" data-act="delSvc" data-i="${i}" title="Remove">×</button>` : ''}</div>`).join('')}
      ${store.canEdit ? '<button class="link" data-act="addSvc">+ Add service time</button>' : ''}
    </div></div>`;

    // Order of service
    h += `<div class="card pad"><div class="cardhead"><b>Order of service</b>
      ${store.canEdit ? `<span class="grow"></span><button class="link" data-act="resetSlots">Reset to ${esc(p.setting.replace('Divine Service, ', ''))} defaults</button>` : ''}</div>
      <div class="slots">`;
    (p.slots || []).forEach((s, i) => {
      const warn = hymnsIn({ slots: [s] }).flatMap((hm) => nearbyUses(key, day.date, hm.id, idx).map((u) => `${hm.id} also ${fmt(u.date)} (${u.slot})`));
      h += `<div class="slot">
        <input class="sl" data-f="slots.${i}.label" value="${esc(s.label)}" ${ro}>
        <input class="sv" data-f="slots.${i}.value" value="${esc(s.value)}" list="hymnlist" placeholder="${/Reading/.test(s.label) ? 'from readings' : ''}" ${ro}>
        <input class="sn" data-f="slots.${i}.note" value="${esc(s.note)}" placeholder="note" ${ro}>
        ${store.canEdit ? `<span class="ops"><button class="icon" data-act="up" data-i="${i}" title="Move up">↑</button><button class="icon" data-act="down" data-i="${i}" title="Move down">↓</button><button class="icon" data-act="delSlot" data-i="${i}" title="Remove">×</button></span>` : ''}
        ${warn.length ? `<div class="warn">${esc(warn.join(' · '))}</div>` : ''}
      </div>`;
    });
    h += `</div>${store.canEdit ? '<button class="link" data-act="addSlot">+ Add line</button>' : ''}
      <datalist id="hymnlist">${Object.values(idx).map((e) => `<option value="${esc(e.id + (e.title ? ` "${e.title}"` : ''))}">`).join('')}</datalist></div>`;

    h += `<div class="card pad"><label class="fld"><span>Notes for the team</span><textarea data-f="notes" rows="3" ${ro}>${esc(p.notes)}</textarea></label>
      <div class="foot"><span id="savestate" class="muted">${saved && saved.updatedAt ? `Saved ${new Date(saved.updatedAt).toLocaleString()}${saved.updatedBy && saved.updatedBy !== 'preview' ? ' by ' + esc(saved.updatedBy) : ''}` : ''}</span>
      <span class="grow"></span><button data-act="print">Print / PDF</button>
      ${store.canEdit && day.kind === 'custom' ? '<button class="danger" data-act="delCustom">Delete service</button>' : ''}</div></div>`;
    return h;
  }

  function neighbors(day) {
    const list = allDays().filter((d) => d.kind === 'sunday');
    const i = list.findIndex((d) => d.date === day.date);
    if (i < 0) { const nx = list.find((d) => d.date > day.date); return { next: nx && nx.date }; }
    return { prev: list[i - 1] && list[i - 1].date, next: list[i + 1] && list[i + 1].date };
  }

  function hymnsView() {
    const idx = Object.values(hymnIndex()).sort((a, b) => a.book.localeCompare(b.book) || a.num - b.num);
    const q = (view.q || '').toLowerCase();
    const rows = idx.filter((e) => !q || e.id.toLowerCase().includes(q) || e.title.toLowerCase().includes(q));
    return `<div class="toolbar"><input id="hq" placeholder="Search hymns by number or title" value="${esc(view.q || '')}"><span class="grow"></span><span class="muted">${idx.length} hymns planned across all years</span></div>
      <div class="card list">${rows.map((e) => `<div class="row static"><span class="when"><b>${esc(e.id)}</b></span><span class="what">${esc(e.title || '—')}</span>
      <span class="uses">${e.uses.map((u) => `<a href="#day-${esc(u.key)}" title="${esc(u.slot)}">${esc(fmtLong(u.date))}</a>`).join(' ')}</span></div>`).join('') || '<div class="pad muted">No hymns yet.</div>'}</div>`;
  }

  // ---------- Print ----------
  function printDay(key) {
    const day = findDay(key); const p = draft;
    const obs = p.observe && (day.festivals || []).find((f) => f.key === p.observe);
    const readings = p.readingsOverride || (obs && obs.readings && obs.readings.r) || day.readings;
    const w = document.createElement('div');
    w.id = 'printsheet';
    w.innerHTML = `<h1>${esc(obs ? obs.name : day.name)}</h1>
      <p>${esc(day.kind === 'sunday' ? weekend(day.date) : fmtLong(day.date))} · ${esc(p.setting)}${day.series ? ` · Series ${day.series}` : ''} · ${esc(obs ? obs.color : day.color)}</p>
      ${p.sermonTitle ? `<p><b>Sermon:</b> “${esc(p.sermonTitle)}”${p.preacher ? ` — ${esc(p.preacher)}` : ''}</p>` : ''}
      ${readings ? `<p>${READ_LABELS.map((l, i) => `<b>${l}:</b> ${esc(readings[i])}`).join('<br>')}</p>` : ''}
      <table>${(p.slots || []).map((s) => `<tr><td>${esc(s.label)}</td><td>${esc(s.value)}</td><td>${esc(s.note)}</td></tr>`).join('')}</table>
      <p>${(p.services || []).map((s) => `${esc(s.label)}${s.musician ? `: ${esc(s.musician)}` : ''}`).join(' · ')}</p>
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
      case 'observe': draft.observe = el.dataset.k || null; return queueSave(true);
      case 'dismissFlag': draft.flags.splice(i, 1); return queueSave(true);
      case 'editReadings': draft.readingsOverride = [...(day.readings || ['', '', '', ''])]; return queueSave(true);
      case 'resetReadings': draft.readingsOverride = null; return queueSave(true);
      case 'addSvc': draft.services.push({ label: 'Midweek 7:00 pm', musician: '' }); return queueSave(true);
      case 'delSvc': draft.services.splice(i, 1); return queueSave(true);
      case 'addSlot': draft.slots.push({ label: 'Hymn', value: '', note: '' }); return queueSave(true);
      case 'delSlot': draft.slots.splice(i, 1); return queueSave(true);
      case 'up': if (i > 0) [draft.slots[i - 1], draft.slots[i]] = [draft.slots[i], draft.slots[i - 1]]; return queueSave(true);
      case 'down': if (i < draft.slots.length - 1) [draft.slots[i + 1], draft.slots[i]] = [draft.slots[i], draft.slots[i + 1]]; return queueSave(true);
      case 'resetSlots': if (confirmInline(el, 'Replace the order of service?')) { draft.slots = defaultSlots(draft.setting, day); queueSave(true); } return;
      case 'print': return printDay(view.key);
      case 'delCustom': if (confirmInline(el, 'Delete this service?')) { store.remove(view.key); location.hash = '#calendar'; } return;
    }
  }
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
    else if (h === 'hymns') view = { name: 'hymns', q: view.q };
    else { view = { name: 'calendar' }; draft = null; }
    render();
    if (view.name === 'calendar' && !route.scrolled) { route.scrolled = true; const n = $('#nextRow'); n && n.scrollIntoView({ block: 'center' }); }
    else window.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'); if (a) { e.preventDefault(); onAction(a.dataset.act, a); return; }
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'signin') store.signIn();
    if (t.id === 'sendLink') linkAction('send');
    if (t.id === 'finishLink') linkAction('finish');
    if (t.id === 'signout') store.signOut();
    if (t.id === 'addSpecial') addSpecial();
    if (t.id === 'jumpToday') { curYear = CY.yearOf(new Date()); location.hash = '#calendar'; render(); const n = $('#nextRow'); n && n.scrollIntoView({ block: 'center' }); }
    if (t.dataset.view) location.hash = t.dataset.view === 'hymns' ? '#hymns' : '#calendar';
  });
  document.addEventListener('input', (e) => {
    const f = e.target.dataset.f;
    if (f && draft) { setPath(draft, f, e.target.value); queueSave(false); }
    if (e.target.id === 'hq') { view.q = e.target.value; const pos = e.target.selectionStart; render(); const q = $('#hq'); q.focus(); q.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'yearSel') { curYear = +e.target.value; render(); }
    if (e.target.dataset.f === 'setting' && draft) render();
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
