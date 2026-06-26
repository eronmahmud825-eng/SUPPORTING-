// ──────────────────────────────────────────────
//  app.js  —  LeanLog application logic
// ──────────────────────────────────────────────

import {
  db, auth,
  doc, getDoc, setDoc,
  collection, getDocs,
  orderBy, query,
  signInAnonymously,
  onAuthStateChanged
} from "./firebase-config.js";

// ── STATE ─────────────────────────────────────
let state = {
  uid:        null,
  profile:    null,   // { name, startWeight, height, goalWeight, createdAt }
  todayKey:   null,   // "YYYY-MM-DD"
  dayNumber:  1,
  history:    [],     // sorted array of day entries
};

// ── HELPERS ───────────────────────────────────
const $  = id => document.getElementById(id);
const q  = sel => document.querySelector(sel);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDate(key) {
  const [y,m,d] = key.split('-');
  return new Date(y,m-1,d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function showTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`tab-${tab}`).classList.add('active');
  q(`.nav-item[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'history') renderHistory();
  if (tab === 'profile') renderProfile();
}

function toast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 2800);
}

// ── FIREBASE HELPERS ──────────────────────────
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

async function saveProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

async function loadDayEntry(uid, key) {
  const snap = await getDoc(doc(db, 'users', uid, 'days', key));
  return snap.exists() ? snap.data() : null;
}

async function saveDayEntry(uid, key, data) {
  await setDoc(doc(db, 'users', uid, 'days', key), data);
}

async function loadHistory(uid) {
  const q2 = query(collection(db, 'users', uid, 'days'), orderBy('__name__'));
  const snaps = await getDocs(q2);
  const entries = [];
  snaps.forEach(s => entries.push({ key: s.id, ...s.data() }));
  return entries;
}

// ── SPLASH → AUTH FLOW ────────────────────────
setTimeout(() => {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      // Sign in anonymously — persists across page reloads via IndexedDB
      await signInAnonymously(auth);
      return;
    }

    state.uid = user.uid;
    state.profile = await loadProfile(user.uid);
    state.history = await loadHistory(user.uid);

    if (!state.profile) {
      showScreen('onboarding');
    } else {
      await initDashboard();
    }
  });
}, 3200); // wait for splash animation

// ── ONBOARDING ────────────────────────────────
$('btn-start').addEventListener('click', async () => {
  const name   = $('ob-name').value.trim();
  const weight = parseFloat($('ob-weight').value);
  const height = parseInt($('ob-height').value);
  const goal   = parseFloat($('ob-goal').value);

  if (!name || isNaN(weight) || isNaN(height) || isNaN(goal)) {
    $('auth-error').textContent = 'Please fill in all fields.';
    return;
  }

  $('auth-error').textContent = '';
  const profile = {
    name,
    startWeight: weight,
    height,
    goalWeight:  goal,
    createdAt:   todayKey(),
  };

  try {
    await saveProfile(state.uid, profile);
    state.profile = profile;

    // Create the first day entry with starting weight
    const key = todayKey();
    const firstEntry = { weight, calories: 0, notes: '', savedAt: Date.now() };
    await saveDayEntry(state.uid, key, firstEntry);
    state.history = [{ key, ...firstEntry }];

    await initDashboard();
  } catch(e) {
    $('auth-error').textContent = 'Error saving — check your Firebase setup.';
    console.error(e);
  }
});

// ── DASHBOARD INIT ────────────────────────────
async function initDashboard() {
  showScreen('dashboard');
  setupNav();
  setupMidnightCheck();
  await loadToday();
  renderMiniSummary();
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      showTab(item.dataset.tab);
    });
  });

  $('btn-logout').addEventListener('click', () => {
    if (confirm('Sign out? Your data is saved in Firebase.')) {
      auth.signOut().then(() => {
        state = { uid: null, profile: null, todayKey: null, dayNumber: 1, history: [] };
        showScreen('onboarding');
      });
    }
  });
}

// ── TODAY ─────────────────────────────────────
async function loadToday() {
  const key = todayKey();
  state.todayKey = key;

  // Compute day number
  state.history = await loadHistory(state.uid);
  const keys = state.history.map(h => h.key).sort();
  const idx   = keys.indexOf(key);
  state.dayNumber = idx === -1 ? keys.length + 1 : idx + 1;

  $('today-date-label').textContent = fmtDate(key);
  $('day-badge').textContent = `Day ${state.dayNumber}`;

  const entry = await loadDayEntry(state.uid, key);
  if (entry) {
    $('today-weight').value   = entry.weight   || '';
    $('today-calories').value = entry.calories || '';
    $('today-notes').value    = entry.notes    || '';
    setHints(entry);
  }

  $('btn-save-today').addEventListener('click', saveToday);
}

function setHints(entry) {
  const prev = getPrevEntry();
  if (prev && entry.weight) {
    const delta = (entry.weight - prev.weight).toFixed(1);
    const sign  = delta > 0 ? '+' : '';
    $('weight-hint').textContent = `${sign}${delta} kg vs yesterday`;
    $('weight-hint').style.color = delta > 0 ? 'var(--red)' : 'var(--sage)';
  }
}

function getPrevEntry() {
  const sorted = [...state.history].sort((a,b) => a.key.localeCompare(b.key));
  const today  = state.todayKey;
  const past   = sorted.filter(h => h.key < today);
  return past.length ? past[past.length - 1] : null;
}

async function saveToday() {
  const weight   = parseFloat($('today-weight').value);
  const calories = parseInt($('today-calories').value) || 0;
  const notes    = $('today-notes').value.trim();

  if (isNaN(weight)) {
    toast('Enter a valid weight first.', 'error'); return;
  }

  try {
    const entry = { weight, calories, notes, savedAt: Date.now() };
    await saveDayEntry(state.uid, state.todayKey, entry);

    // Refresh history
    state.history = await loadHistory(state.uid);

    setHints(entry);
    renderMiniSummary();

    $('save-status').textContent = '✓ Saved';
    setTimeout(() => $('save-status').textContent = '', 2500);
    toast('Log saved!');
  } catch(e) {
    toast('Save failed — check console.', 'error');
    console.error(e);
  }
}

// ── MINI SUMMARY ─────────────────────────────
function renderMiniSummary() {
  if (!state.profile || !state.history.length) return;

  const sorted  = [...state.history].sort((a,b) => a.key.localeCompare(b.key));
  const start   = state.profile.startWeight;
  const latest  = sorted[sorted.length - 1];
  const current = latest ? latest.weight : start;
  const delta   = (current - start).toFixed(1);
  const sign    = delta > 0 ? '+' : '';
  const isGain  = delta > 0;

  $('summary-start').textContent   = `${start} kg`;
  $('summary-current').textContent = `${current} kg`;
  $('summary-change').textContent  = `${sign}${delta} kg`;
  $('summary-change').className    = `summary-val badge-change${isGain ? ' gain' : ''}`;

  $('mini-summary').style.display = 'flex';
}

// ── MIDNIGHT CHECK ────────────────────────────
function setupMidnightCheck() {
  setInterval(() => {
    const key = todayKey();
    if (key !== state.todayKey) {
      state.todayKey = key;
      // Clear inputs for fresh day
      $('today-weight').value   = '';
      $('today-calories').value = '';
      $('today-notes').value    = '';
      $('weight-hint').textContent   = '';
      $('calorie-hint').textContent  = '';
      loadToday();
      toast('New day! Yesterday\'s log is locked. 🌱');
    }
  }, 30000); // check every 30s
}

// ── HISTORY ───────────────────────────────────
function renderHistory() {
  const list   = $('history-list');
  const sorted = [...state.history].sort((a,b) => b.key.localeCompare(a.key));

  if (!sorted.length) {
    list.innerHTML = '<p class="empty-state">No history yet. Start logging to see your journey.</p>';
    return;
  }

  const allSorted = [...state.history].sort((a,b) => a.key.localeCompare(b.key));

  list.innerHTML = sorted.map((entry, revIdx) => {
    const dayNum = allSorted.findIndex(e => e.key === entry.key) + 1;
    const prevIdx = allSorted.findIndex(e => e.key === entry.key) - 1;
    const prev    = prevIdx >= 0 ? allSorted[prevIdx] : null;

    let deltaHtml = '';
    if (prev && entry.weight && prev.weight) {
      const d    = (entry.weight - prev.weight).toFixed(1);
      const sign = d > 0 ? '+' : '';
      const cls  = d > 0 ? 'entry-delta gain' : 'entry-delta';
      deltaHtml  = `<span class="${cls}">${sign}${d} kg</span>`;
    }

    return `
      <div class="history-entry">
        <div class="entry-day">${dayNum}</div>
        <div>
          <div class="entry-date">${fmtDate(entry.key)}</div>
          <div class="entry-weight">${entry.weight ? entry.weight + ' kg' : '—'}</div>
          ${entry.notes ? `<div class="entry-notes">${entry.notes}</div>` : ''}
        </div>
        ${deltaHtml}
        <div class="entry-cal">
          <div class="entry-cal-val">${entry.calories ? entry.calories.toLocaleString() : '—'}</div>
          <div class="entry-cal-label">kcal</div>
        </div>
      </div>`;
  }).join('');
}

// ── PROFILE ───────────────────────────────────
function renderProfile() {
  if (!state.profile) return;

  const { name, startWeight, height, goalWeight } = state.profile;
  const sorted  = [...state.history].sort((a,b) => a.key.localeCompare(b.key));
  const latest  = sorted[sorted.length - 1];
  const current = (latest && latest.weight) ? latest.weight : startWeight;
  const delta   = +(current - startWeight).toFixed(1);
  const sign    = delta > 0 ? '+' : '';
  const bmi     = height ? (current / Math.pow(height / 100, 2)).toFixed(1) : '—';
  const remaining = goalWeight ? +(current - goalWeight).toFixed(1) : null;

  // Avatar
  $('profile-avatar').textContent = name ? name[0].toUpperCase() : '?';
  $('profile-name').textContent   = name;

  // Badge
  const isGain = delta > 0;
  $('badge-icon').textContent = isGain ? '📈' : '📉';
  $('badge-text').textContent = `${sign}${delta} kg`;
  $('progress-badge').style.color = isGain ? '#ffaa7f' : '#7fffaa';

  // Stats
  $('stat-bmi').textContent  = bmi;
  $('stat-days').textContent = state.history.length;
  $('stat-goal').textContent = goalWeight ? `${goalWeight} kg` : '—';
  $('stat-remaining').textContent = remaining !== null
    ? (remaining > 0 ? `${remaining} kg to go` : `${Math.abs(remaining)} kg past goal! 🎉`)
    : '—';

  // Pre-fill edit field
  $('edit-goal').value = goalWeight || '';
}

$('btn-save-profile').addEventListener('click', async () => {
  const goal = parseFloat($('edit-goal').value);
  if (isNaN(goal)) { toast('Enter a valid goal weight.', 'error'); return; }

  try {
    await saveProfile(state.uid, { goalWeight: goal });
    state.profile.goalWeight = goal;
    renderProfile();
    toast('Goal updated!');
  } catch(e) {
    toast('Update failed.', 'error');
    console.error(e);
  }
});
