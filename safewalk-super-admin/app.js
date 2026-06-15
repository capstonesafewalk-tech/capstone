import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAUbtoBgI9k3s7GpNBKtN0YGD-OqWJfOVs",
  authDomain: "safewalk-e4af1.firebaseapp.com",
  projectId: "safewalk-e4af1",
  storageBucket: "safewalk-e4af1.firebasestorage.app",
  messagingSenderId: "1003443990353",
  appId: "1:1003443990353:web:c9653ce6140954fa062d70"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const BACKEND = 'http://localhost:5000';

// ── UI helpers ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function toast(msg, ok = true) {
  const t = $('toast');
  t.textContent = (ok ? '✅ ' : '❌ ') + msg;
  t.className = `toast ${ok ? 'toast-ok' : 'toast-err'}`;
  show('toast');
  setTimeout(() => hide('toast'), 3500);
}

let pendingDelete = null;
function confirmDelete(fn) {
  pendingDelete = fn;
  show('modal');
}
$('modalCancel').onclick = () => { hide('modal'); pendingDelete = null; };
$('modalConfirm').onclick = async () => {
  hide('modal');
  if (pendingDelete) { await pendingDelete(); pendingDelete = null; }
};

// ── Auth ──────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user) { show('loginScreen'); hide('dashScreen'); return; }
  // Verify superadmin role
  const snap = await getDocs(query(collection(db, 'admins'), where('uid', '==', user.uid)));
  const role = snap.empty ? null : snap.docs[0].data().role;
  if (role !== 'superadmin') {
    await signOut(auth);
    $('loginError').textContent = 'Access denied. Super Admin accounts only.';
    $('loginError').classList.remove('hidden');
    show('loginScreen'); hide('dashScreen'); return;
  }
  hide('loginScreen'); show('dashScreen');
  loadAll();
});

$('loginForm').onsubmit = async e => {
  e.preventDefault();
  const btn = $('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in...';
  hide('loginError');
  try {
    await signInWithEmailAndPassword(auth, $('loginEmail').value, $('loginPassword').value);
  } catch (err) {
    $('loginError').textContent = err.message;
    show('loginError');
  } finally { btn.disabled = false; btn.textContent = 'Sign In'; }
};

$('logoutBtn').onclick = () => signOut(auth);

// ── Theme toggle ──────────────────────────────────────────────────────────────
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sa-theme', theme);
  const btn = $('themeBtn');
  if (btn) btn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
};
// Init from localStorage (default dark)
applyTheme(localStorage.getItem('sa-theme') || 'dark');
$('themeBtn') && ($('themeBtn').onclick = () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(link => {
  link.onclick = e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    link.classList.add('active');
    show('tab-' + link.dataset.tab);
  };
});

// ── Create form toggle ────────────────────────────────────────────────────────
$('showCreateForm').onclick = () => $('createForm').classList.toggle('hidden');
$('cancelCreate').onclick = () => hide('createForm');

// ── Create Brgy User ──────────────────────────────────────────────────────────
$('createUserBtn').onclick = async () => {
  const email = $('newEmail').value.trim();
  const password = $('newPassword').value;
  const brgyName = $('newBrgyName').value.trim();
  if (!email || !password) { toast('Email and password required', false); return; }
  $('createUserBtn').disabled = true;
  $('createUserBtn').textContent = 'Creating...';
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch(`${BACKEND}/super-admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ email, password, brgyName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    toast('Brgy user created!');
    $('newEmail').value = ''; $('newPassword').value = ''; $('newBrgyName').value = '';
    hide('createForm');
    loadUsers();
  } catch (err) { toast(err.message, false); }
  finally { $('createUserBtn').disabled = false; $('createUserBtn').textContent = 'Create Account'; }
};

// ── Load all data ─────────────────────────────────────────────────────────────
function loadAll() { loadUsers(); loadIncidents(); loadReports(); }

async function loadUsers() {
  $('usersTable').innerHTML = '<div class="loading">Loading...</div>';
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch(`${BACKEND}/super-admin/users`, { headers: { Authorization: `Bearer ${idToken}` } });
    const users = await res.json();
    if ($('usersCount')) $('usersCount').textContent = `(${users.length})`;
    if (!users.length) { $('usersTable').innerHTML = '<div class="empty">No Brgy user accounts found.</div>'; return; }
    $('usersTable').innerHTML = `<table>
      <thead><tr><th>Barangay</th><th>Email</th><th>Created</th><th>Action</th></tr></thead>
      <tbody>${users.map(u => `
        <tr>
          <td><strong>${u.brgyName || '—'}</strong></td>
          <td>${u.email}</td>
          <td>${u.createdAt?._seconds ? new Date(u.createdAt._seconds*1000).toLocaleDateString() : '—'}</td>
          <td><button class="btn-del" data-uid="${u.uid}">🗑 Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
    $('usersTable').querySelectorAll('.btn-del').forEach(btn => {
      btn.onclick = () => confirmDelete(async () => {
        try {
          const tok = await auth.currentUser.getIdToken();
          const r = await fetch(`${BACKEND}/super-admin/users/${btn.dataset.uid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok}` } });
          if (!r.ok) throw new Error((await r.json()).error);
          toast('User deleted.'); loadUsers();
        } catch (e) { toast(e.message, false); }
      });
    });
  } catch (e) { $('usersTable').innerHTML = `<div class="empty">Error: ${e.message}</div>`; }
}

async function loadIncidents() {
  $('incidentsTable').innerHTML = '<div class="loading">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db, 'crimes'), orderBy('timestamp', 'desc')));
    const crimes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if ($('incidentsCount')) $('incidentsCount').textContent = `(${crimes.length})`;
    if (!crimes.length) { $('incidentsTable').innerHTML = '<div class="empty">No incidents found.</div>'; return; }
    $('incidentsTable').innerHTML = `<table>
      <thead><tr><th>ID</th><th>Type</th><th>Location</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${crimes.map(c => `
        <tr>
          <td style="font-family:monospace;font-size:12px">${c.id.substring(0,8)}</td>
          <td>${c.crime_type || '—'}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.location || `${c.latitude||''}, ${c.longitude||''}` || '—'}</td>
          <td><span class="badge ${c.status==='archived'?'badge-archived':'badge-active'}">${c.status||'active'}</span></td>
          <td>${c.timestamp ? new Date(c.timestamp).toLocaleDateString() : '—'}</td>
          <td><button class="btn-del" data-id="${c.id}">🗑 Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
    $('incidentsTable').querySelectorAll('.btn-del').forEach(btn => {
      btn.onclick = () => confirmDelete(async () => {
        try { await deleteDoc(doc(db, 'crimes', btn.dataset.id)); toast('Incident deleted.'); loadIncidents(); }
        catch (e) { toast(e.message, false); }
      });
    });
  } catch (e) { $('incidentsTable').innerHTML = `<div class="empty">Error: ${e.message}</div>`; }
}

async function loadReports() {
  $('reportsTable').innerHTML = '<div class="loading">Loading...</div>';
  try {
    const snap = await getDocs(query(collection(db, 'incidents'), orderBy('timestamp', 'desc')));
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if ($('reportsCount')) $('reportsCount').textContent = `(${reports.length})`;
    if (!reports.length) { $('reportsTable').innerHTML = '<div class="empty">No user reports found.</div>'; return; }
    $('reportsTable').innerHTML = `<table>
      <thead><tr><th>ID</th><th>Type</th><th>Description</th><th>Location</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${reports.map(r => `
        <tr>
          <td style="font-family:monospace;font-size:12px">${r.id.substring(0,8)}</td>
          <td>${r.type || '—'}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description || '—'}</td>
          <td>${r.location || '—'}</td>
          <td>${r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '—'}</td>
          <td><button class="btn-del" data-id="${r.id}">🗑 Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
    $('reportsTable').querySelectorAll('.btn-del').forEach(btn => {
      btn.onclick = () => confirmDelete(async () => {
        try { await deleteDoc(doc(db, 'incidents', btn.dataset.id)); toast('Report deleted.'); loadReports(); }
        catch (e) { toast(e.message, false); }
      });
    });
  } catch (e) { $('reportsTable').innerHTML = `<div class="empty">Error: ${e.message}</div>`; }
}
