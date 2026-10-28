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
 * Menampilkan pesan status (error / success / warning)
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
 * Mengecek apakah user terdaftar di tabel adnan_User
 */
async function checkUserInSupabase(usernameInput) {
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
        'Silakan jalankan isi file <code>supabase_schema.sql</code> di SQL Editor Supabase Anda: ' +
        '<code>GRANT SELECT, INSERT ON public."adnan_User" TO anon;</code>'
      );
    }
    throw new Error(errData.message || `Gagal mengakses tabel ${USER_TABLE} (HTTP ${response.status}).`);
  }

  const users = await response.json();
  const normalized = usernameInput.toLowerCase();

  // Cari kecocokan pada kolom username, nama, atau email (fleksibel terhadap skema tabel)
  const matchedUser = (users || []).find((row) => {
    const candidateUsername = String(row.username || row.user || row.nama || row.email || '').toLowerCase();
    return candidateUsername === normalized;
  });

  return matchedUser || null;
}

/**
 * Mendaftarkan user baru ke tabel adnan_User
 */
async function registerUserToSupabase({ nama, username, no_hp, password }) {
  // 1. Cek terlebih dahulu apakah user sudah terdaftar
  const existingUser = await checkUserInSupabase(username);
  if (existingUser) {
    throw new Error(`Username <b>${username}</b> sudah terdaftar! Silakan langsung Login.`);
  }

  // 2. Insert data user baru ke tabel adnan_User
  const payload = {
    username,
    password,
    nama: nama || username,
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

    if (errData.code === '42501') {
      throw new Error(
        'Izin INSERT ke tabel <b>adnan_User</b> belum diaktifkan (Error 42501).<br>' +
        'Jalankan perintah di <code>supabase_schema.sql</code> pada Supabase SQL Editor.'
      );
    }
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

  const displayName = user.nama || user.username || 'Anggota';
  welcomeUserText.textContent = `Selamat Datang, ${displayName}!`;
  userDetailText.textContent = `Username: ${user.username || '-'} ${user.no_hp ? '| No. HP: ' + user.no_hp : ''}`;
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
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    if (!username || !password) {
      showAlert('Harap isi username dan password.', 'error');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Mengecek adnan_User...';
    hideAlert();

    try {
      const foundUser = await checkUserInSupabase(username);

      if (!foundUser) {
        showAlert(
          `User <b>${username}</b> belum terdaftar di <code>adnan_User</code>.<br>` +
          `Silakan klik tulisan <b>Register User</b> di bawah untuk mendaftar.`,
          'error'
        );
        // Beri efek highlight pada tulisan Register User di bawah
        registerFooter.classList.add('highlight-prompt');
        return;
      }

      // Validasi password jika kolom password ada di tabel
      if (foundUser.password !== undefined && foundUser.password !== null && String(foundUser.password) !== password) {
        showAlert('Password yang Anda masukkan tidak sesuai.', 'error');
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
    const nama = document.getElementById('regNama').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const no_hp = document.getElementById('regNoHp').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const regBtn = document.getElementById('regBtn');

    if (!username || !password) {
      showAlert('Username dan Password wajib diisi.', 'error');
      return;
    }

    regBtn.disabled = true;
    regBtn.textContent = 'Mendaftarkan ke adnan_User...';
    hideAlert();

    try {
      await registerUserToSupabase({ nama, username, no_hp, password });
      showAlert('Registrasi berhasil! Silakan login menggunakan akun yang baru didaftarkan.', 'success');

      document.getElementById('loginUsername').value = username;
      document.getElementById('loginPassword').value = '';
      registerForm.reset();

      setTimeout(() => {
        setAuthMode(false);
        showAlert('Akun berhasil terdaftar di adnan_User. Silakan masuk.', 'success');
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

