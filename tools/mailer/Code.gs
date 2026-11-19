/**
 * Bethlehem Worship Planner — automatic emails.
 * Every 5 minutes: sends the emails the app has queued (Submit to Pastor, Send back,
 * Approve & send to the office — with the cover art attached), then checks in so the
 * app knows email is automatic. Runs as Sam's Google account; replies go to the sender
 * named in each message.
 * First time: run setup() once.
 */
const BASE = 'https://firestore.googleapis.com/v1/projects/bethlehem-worship/databases/(default)/documents';

function setup() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('run').timeBased().everyMinutes(5).create();
  run();
}

function api_(method, path, body) {
  const res = UrlFetchApp.fetch(path.startsWith('http') ? path : BASE + path, {
    method, contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: body ? JSON.stringify(body) : undefined,
  });
  const code = res.getResponseCode();
  if (code >= 300) throw new Error(method + ' ' + path + ' → ' + code + ' ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText() || '{}');
}

// Firestore typed values <-> plain values
function from_(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(from_);
  if ('mapValue' in v) { const o = {}; const f = v.mapValue.fields || {}; Object.keys(f).forEach((k) => { o[k] = from_(f[k]); }); return o; }
  return null;
}
function to_(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(to_) } };
  const f = {}; Object.keys(x).forEach((k) => { f[k] = to_(x[k]); }); return { mapValue: { fields: f } };
}

function run() {
  const props = PropertiesService.getScriptProperties();
  const sent = JSON.parse(props.getProperty('sent') || '[]');
  const rows = api_('post', ':runQuery', { structuredQuery: {
    from: [{ collectionId: 'plans' }],
    where: { fieldFilter: { field: { fieldPath: 'outboxPending' }, op: 'EQUAL', value: { booleanValue: true } } },
  } });
  rows.filter((r) => r.document).forEach((r) => {
    const doc = r.document;
    const outbox = from_(doc.fields.outbox) || [];
    outbox.forEach((m) => {
      if (!m.pending) return;
      if (sent.indexOf(m.id) < 0 && m.to) {
        const opts = { name: 'Bethlehem Worship Planner' };
        if (m.replyTo) opts.replyTo = m.replyTo;
        if (m.art) {
          try {
            const a = api_('get', '/config/art-' + m.art);
            opts.attachments = [Utilities.newBlob(Utilities.base64Decode(a.fields.png.stringValue), 'image/png', 'Cover art - Riojas ' + m.art + '.png')];
          } catch (e) { console.warn('art ' + m.art + ': ' + e); }
        }
        MailApp.sendEmail(m.to, m.subject, m.body, opts);
        sent.push(m.id);
      }
      m.pending = false;
    });
    try {
      api_('patch', doc.name.replace(/^.*\/documents/, '') + '?updateMask.fieldPaths=outbox&updateMask.fieldPaths=outboxPending&currentDocument.updateTime=' + encodeURIComponent(doc.updateTime),
        { fields: { outbox: to_(outbox), outboxPending: { booleanValue: false } } });
    } catch (e) { console.warn('plan changed while sending; will tidy next run'); }
  });
  props.setProperty('sent', JSON.stringify(sent.slice(-300)));
  api_('patch', '/config/mailer?updateMask.fieldPaths=at', { fields: { at: { stringValue: new Date().toISOString() } } });
}
