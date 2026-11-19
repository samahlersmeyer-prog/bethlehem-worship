/*
 * Storage: Firebase (Google sign-in + Firestore, live sync) when
 * firebase-config.js is filled in; otherwise this browser only (preview mode).
 */
(function (root) {
  const LS_KEY = 'bw.plans.v1';
  const safe = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  function seedAll() {
    const out = {};
    const S = root.SEED;
    for (const [k, v] of Object.entries(S.PLANS)) out[k] = Object.assign({ importedFrom: 'sheet' }, v);
    for (const [k, v] of Object.entries(S.CUSTOM)) out[k] = Object.assign({ importedFrom: 'sheet' }, v);
    return out;
  }

  // ---------- Local (preview) ----------
  function LocalStore() {
    let plans = safe.get(LS_KEY);
    if (!plans) { plans = seedAll(); safe.set(LS_KEY, plans); }
    const subs = new Set();
    let settings = safe.get(LS_KEY + '.settings') || {};
    return {
      mode: 'local',
      get settings() { return settings; },
      async saveSettings(next) { settings = Object.assign({}, next); safe.set(LS_KEY + '.settings', settings); subs.forEach((f) => f(plans)); },
      user: { email: 'preview', name: 'Preview' },
      canEdit: true,
      all: () => plans,
      get: (k) => plans[k],
      async save(k, plan) {
        plans[k] = Object.assign({}, plan, { updatedAt: new Date().toISOString(), updatedBy: 'preview' });
        safe.set(LS_KEY, plans); subs.forEach((f) => f(plans));
      },
      async remove(k) { delete plans[k]; safe.set(LS_KEY, plans); subs.forEach((f) => f(plans)); },
      subscribe(f) { subs.add(f); return () => subs.delete(f); },
      async importSeed() { plans = Object.assign(seedAll(), plans); safe.set(LS_KEY, plans); subs.forEach((f) => f(plans)); },
      async signIn() {}, async signOut() {},
      // Preview: images are served straight from the repo folder (not deployed)
      async getArt(id) { const r = await fetch('art/' + id + '.png'); if (!r.ok) return null; return URL.createObjectURL(await r.blob()); },
    };
  }

  // ---------- Firebase ----------
  async function FirebaseStore(cfg) {
    const v = '10.12.2';
    const [{ initializeApp }, auth, fs] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${v}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`),
    ]);
    const app = initializeApp(cfg);
    const a = auth.getAuth(app);
    const db = fs.getFirestore(app);
    const col = fs.collection(db, 'plans');
    let plans = {};
    const subs = new Set();
    let unsub = null;

    const store = {
      mode: 'firebase', user: null, canEdit: false, settings: {},
      async saveSettings(next) {
        await fs.setDoc(fs.doc(db, 'plans', '_settings'), JSON.parse(JSON.stringify(Object.assign({}, next, { updatedAt: new Date().toISOString(), updatedBy: store.user ? store.user.email : '' }))));
      },
      all: () => plans, get: (k) => plans[k],
      async save(k, plan) {
        const data = JSON.parse(JSON.stringify(Object.assign({}, plan, {
          updatedAt: new Date().toISOString(), updatedBy: store.user ? store.user.email : '',
        })));
        await fs.setDoc(fs.doc(db, 'plans', k), data);
      },
      async remove(k) { await fs.deleteDoc(fs.doc(db, 'plans', k)); },
      subscribe(f) { subs.add(f); return () => subs.delete(f); },
      async importSeed() {
        const seed = seedAll();
        for (const [k, v] of Object.entries(seed)) if (!plans[k]) await store.save(k, v);
      },
      async signIn() { await auth.signInWithPopup(a, new auth.GoogleAuthProvider()); },
      // Passwordless sign-in for people without a Google account
      async sendLink(email) {
        await auth.sendSignInLinkToEmail(a, email, { url: location.origin + location.pathname, handleCodeInApp: true });
        try { localStorage.setItem('bw.linkEmail', email); } catch {}
      },
      isLinkSignIn: () => auth.isSignInWithEmailLink(a, location.href),
      linkEmail: () => { try { return localStorage.getItem('bw.linkEmail'); } catch { return null; } },
      async finishLink(email) {
        await auth.signInWithEmailLink(a, email, location.href);
        try { localStorage.removeItem('bw.linkEmail'); } catch {}
        history.replaceState(null, '', location.pathname);
      },
      async signOut() { await auth.signOut(a); },
      // Licensed art lives in Firestore so only the signed-in team can load it
      async getArt(id) { const d = await fs.getDoc(fs.doc(db, 'config', 'art-' + id)); return d.exists() ? 'data:image/png;base64,' + d.data().png : null; },
      onAuth: null,
    };

    auth.onAuthStateChanged(a, (u) => {
      store.user = u ? { email: u.email, name: u.displayName || u.email } : null;
      if (unsub) { unsub(); unsub = null; }
      plans = {};
      if (u) {
        fs.getDoc(fs.doc(db, 'config', 'feed')).then((d) => { if (d.exists()) { store.feed = d.data().url; subs.forEach((f) => f(plans)); } }).catch(() => {});
        // The automatic mailer checks in every few minutes; if it's quiet, emails open in the person's mail app instead
        // Re-checked every 5 minutes so the warning banner appears (and clears) without a reload
        const checkMailer = () => fs.getDoc(fs.doc(db, 'config', 'mailer')).then((d) => {
          const at = d.exists() ? d.data().at : null;
          const live = !!at && Date.now() - Date.parse(at) < 30 * 60e3;
          const changed = live !== store.mailerLive || at !== store.mailerAt;
          store.mailerLive = live; store.mailerAt = at; store.mailerChecked = true;
          if (changed) subs.forEach((f) => f(plans));
        }).catch(() => {});
        checkMailer();
        clearInterval(store._mailerTimer); store._mailerTimer = setInterval(checkMailer, 5 * 60e3);
        let first = true;
        unsub = fs.onSnapshot(col, (snap) => {
          if (first && snap.empty) { first = false; store.importSeed(); return; } // first sign-in: load Ben's sheet
          first = false;
          plans = {};
          snap.forEach((d) => { if (d.id === '_settings') store.settings = d.data(); else plans[d.id] = d.data(); });
          store.canEdit = true;
          subs.forEach((f) => f(plans));
        }, (err) => {
          store.canEdit = false;
          store.error = err.code === 'permission-denied'
            ? `${u.email} isn't on the planning team yet. Ask Sam or Pastor Ben to add you.`
            : err.message;
          subs.forEach((f) => f(plans));
        });
      }
      if (store.onAuth) store.onAuth(store.user);
      subs.forEach((f) => f(plans));
    });
    return store;
  }

  async function createStore() {
    const cfg = root.FIREBASE_CONFIG;
    if (cfg && cfg.apiKey) {
      try { return await FirebaseStore(cfg); } catch (e) { console.warn('Firebase unavailable, using preview mode', e); }
    }
    return LocalStore();
  }

  root.STORE = { createStore };
})(typeof window !== 'undefined' ? window : globalThis);
