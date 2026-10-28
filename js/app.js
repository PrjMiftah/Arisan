// Konfigurasi Supabase REST API - Arisan Keluarga Adnan
const SUPABASE_REST_URL = 'https://zufpuadipntstcnqxxpm.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZnB1YWRpcG50c3RjbnF4eHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjM2OTMsImV4cCI6MjEwODYzOTY5M30.gjXuVjWUjIaJX4JI6_d_fpq01fnsvDPedMuKD9SCYIA';
const USER_TABLE = 'adnan_User';
const SESSION_KEY = 'adnan_logged_in_user';

const supabaseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// Elemen DOM
const authView = document.getElementById('authView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const alertBox = document.getElementById('alertBox');
const registerFooter = document.getElementById('registerFooter');
const toggleAuthLink = document.getElementById('toggleAuthLink');
const togglePromptText = document.getElementById('togglePromptText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const welcomeUserText = document.getElementById('welcomeUserText');
const userDetailText = document.getElementById('userDetailText');
const logoutBtn = document.getElementById('logoutBtn');

let isRegisterMode = false;

/**
 * Menampilkan pesan status (error / success)
 */
function showAlert(message, type = 'error') {
  if (!alertBox) return;
  alertBox.innerHTML = message;
  alertBox.className = `alert ${type}`;
}

function hideAlert() {
  if (!alertBox) return;
  alertBox.className = 'alert';
  alertBox.innerHTML = '';
}

/**
 * Beralih antara mode Login dan mode Register User
 */
function setAuthMode(registerMode) {
  isRegisterMode = registerMode;
  hideAlert();

  if (isRegisterMode) {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    formTitle.textContent = 'Register User';
    formSubtitle.textContent = 'Daftarkan akun baru ke tabel adnan_User';
    togglePromptText.textContent = 'Sudah terdaftar?';
    toggleAuthLink.textContent = 'Login di sini';
    registerFooter.classList.remove('highlight-prompt');
  } else {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    formTitle.textContent = 'Login Arisan';
    formSubtitle.textContent = 'Keluarga Adnan';
    togglePromptText.textContent = 'Belum terdaftar?';
    toggleAuthLink.textContent = 'Register User';
  }
}

/**
 * Mengecek apakah user terdaftar di tabel adnan_User (berdasarkan user_id atau username)
 */
async function checkUserInSupabase(userIdInput) {
  const endpoint = `${SUPABASE_REST_URL}/${USER_TABLE}?select=*`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: supabaseHeaders
  });

  if (!response.ok) {
    let errData = {};
    try {
      errData = await response.json();
    } catch (_) {}

    if (errData.code === '42501') {
      throw new Error(
        'Akses tabel <b>adnan_User</b> ditolak oleh Supabase (Error 42501).<br>' +
        'Silakan jalankan isi file <code>supabase_schema.sql</code> di SQL Editor Supabase Anda.'
      );
    }
    throw new Error(errData.message || `Gagal mengakses tabel ${USER_TABLE} (HTTP ${response.status}).`);
  }

  const users = await response.json();
  const normalized = userIdInput.toLowerCase();

  // Cari kecocokan pada kolom user_id, username, atau nama_lengkap
  const matchedUser = (users || []).find((row) => {
    const uid = String(row.user_id || '').toLowerCase();
    const uname = String(row.username || '').toLowerCase();
    const namaLengkap = String(row.nama_lengkap || '').toLowerCase();
    return uid === normalized || uname === normalized || namaLengkap === normalized;
  });

  return matchedUser || null;
}

/**
 * Mendaftarkan user baru ke tabel adnan_User sesuai struktur kolom:
 * user_id (NOT NULL), nama_lengkap (NOT NULL), password (NOT NULL), role, deskripsi, status_aktif
 */
async function registerUserToSupabase({ nama_lengkap, user_id, deskripsi, no_hp, password }) {
  // 1. Cek terlebih dahulu apakah user_id sudah terdaftar
  const existingUser = await checkUserInSupabase(user_id);
  if (existingUser) {
    throw new Error(`User ID / Username <b>${user_id}</b> sudah terdaftar! Silakan langsung Login.`);
  }

  // 2. Insert data user baru ke tabel adnan_User (sertakan user_id & nama_lengkap yang wajib / NOT NULL)
  const payload = {
    user_id: user_id,
    username: user_id,
    nama_lengkap: nama_lengkap || user_id,
    nama: nama_lengkap || user_id,
    password: password,
    role: 'peserta',
    status_aktif: true,
    ...(deskripsi ? { deskripsi } : {}),
    ...(no_hp ? { no_hp } : {})
  };

  const response = await fetch(`${SUPABASE_REST_URL}/${USER_TABLE}`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errData = {};
    try {
      errData = await response.json();
    } catch (_) {}

    throw new Error(errData.message || 'Gagal mendaftarkan user baru ke tabel adnan_User.');
  }

  const created = await response.json();
  return Array.isArray(created) ? created[0] : created;
}

/**
 * Menampilkan halaman utama setelah user berhasil login
 */
function renderLoggedInState(user) {
  if (!user) {
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    return;
  }

  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');

  const displayName = user.nama_lengkap || user.nama || user.user_id || user.username || 'Peserta';
  const displayUserId = user.user_id || user.username || '-';
  const displayRole = user.role || 'peserta';

  welcomeUserText.textContent = `Selamat Datang, ${displayName}!`;
  userDetailText.textContent = `User ID: ${displayUserId} | Role: ${displayRole}`;
}

// Event Listener: Klik tulisan "Register User" di bagian bawah
if (toggleAuthLink) {
  toggleAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode(!isRegisterMode);
  });
}

// Event Listener: Submit Form Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    if (!userId || !password) {
      showAlert('Harap isi User ID / Username dan Password.', 'error');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Mengecek adnan_User...';
    hideAlert();

    try {
      const foundUser = await checkUserInSupabase(userId);

      if (!foundUser) {
        showAlert(
          `User <b>${userId}</b> belum terdaftar di <code>adnan_User</code>.<br>` +
          `Silakan klik tulisan <b>Register User</b> di bawah untuk mendaftar.`,
          'error'
        );
        // Beri efek highlight pada tulisan Register User di bawah
        registerFooter.classList.add('highlight-prompt');
        return;
      }

      // Validasi status aktif jika ada
      if (foundUser.status_aktif === false) {
        showAlert('Akun Anda saat ini berstatus tidak aktif.', 'error');
        return;
      }

      // Validasi password
      if (foundUser.password !== undefined && foundUser.password !== null && String(foundUser.password) !== password) {
        showAlert('Password yang Anda masukkan salah.', 'error');
        return;
      }

      showAlert('Login berhasil! Membuka halaman Arisan Keluarga Adnan...', 'success');
      localStorage.setItem(SESSION_KEY, JSON.stringify(foundUser));

      setTimeout(() => {
        renderLoggedInState(foundUser);
      }, 700);
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Masuk';
    }
  });
}

// Event Listener: Submit Form Register User
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama_lengkap = document.getElementById('regNama').value.trim();
    const user_id = document.getElementById('regUsername').value.trim();
    const no_hp = document.getElementById('regNoHp') ? document.getElementById('regNoHp').value.trim() : '';
    const deskripsi = document.getElementById('regDeskripsi') ? document.getElementById('regDeskripsi').value.trim() : no_hp;
    const password = document.getElementById('regPassword').value.trim();
    const regBtn = document.getElementById('regBtn');

    if (!user_id || !nama_lengkap || !password) {
      showAlert('Nama Lengkap, User ID / Username, dan Password wajib diisi.', 'error');
      return;
    }

    regBtn.disabled = true;
    regBtn.textContent = 'Mendaftarkan ke adnan_User...';
    hideAlert();

    try {
      await registerUserToSupabase({ nama_lengkap, user_id, deskripsi, no_hp, password });
      showAlert('Registrasi berhasil disimpan ke adnan_User! Mengalihkan ke form Login...', 'success');

      document.getElementById('loginUsername').value = user_id;
      document.getElementById('loginPassword').value = '';
      registerForm.reset();

      setTimeout(() => {
        setAuthMode(false);
        showAlert(`User <b>${user_id}</b> berhasil terdaftar! Silakan masukkan password untuk Login.`, 'success');
      }, 1000);
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      regBtn.disabled = false;
      regBtn.textContent = 'Register User';
    }
  });
}

// Event Listener: Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    renderLoggedInState(null);
    setAuthMode(false);
  });
}

// Cek session saat halaman pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
  try {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      renderLoggedInState(JSON.parse(savedSession));
    }
  } catch (_) {
    localStorage.removeItem(SESSION_KEY);
  }
});
