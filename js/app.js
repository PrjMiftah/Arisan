// Konfigurasi Supabase REST API - Arisan Keluarga Adnan
const SUPABASE_REST_URL = 'https://zufpuadipntstcnqxxpm.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZnB1YWRpcG50c3RjbnF4eHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjM2OTMsImV4cCI6MjEwODYzOTY5M30.gjXuVjWUjIaJX4JI6_d_fpq01fnsvDPedMuKD9SCYIA';
const USER_TABLE = 'adnan_User';
const ANGGOTA_TABLE = 'adnan_DataAnggota';
const SESSION_KEY = 'adnan_logged_in_user';

const supabaseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// Elemen DOM: Login & Register
const authView = document.getElementById('authView');
const memberAppView = document.getElementById('memberAppView');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const alertBox = document.getElementById('alertBox');
const registerFooter = document.getElementById('registerFooter');
const toggleAuthLink = document.getElementById('toggleAuthLink');
const togglePromptText = document.getElementById('togglePromptText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');

// Elemen DOM: Layar Entry Biodata Anggota (adnan_DataAnggota)
const headerAvatar = document.getElementById('headerAvatar');
const welcomeUserText = document.getElementById('welcomeUserText');
const userDetailText = document.getElementById('userDetailText');
const biodataStatusPill = document.getElementById('biodataStatusPill');
const mandatoryBanner = document.getElementById('mandatoryBanner');
const biodataAlertBox = document.getElementById('biodataAlertBox');
const biodataForm = document.getElementById('biodataForm');
const saveBiodataBtn = document.getElementById('saveBiodataBtn');
const tabBtnRingkasan = document.getElementById('tabBtnRingkasan');
const biodataSummaryContainer = document.getElementById('biodataSummaryContainer');
const editBiodataBtn = document.getElementById('editBiodataBtn');
const logoutBtn = document.getElementById('logoutBtn');

let isRegisterMode = false;
let currentLoggedUser = null;
let currentBiodataRecord = null;

/**
 * Helper Alert Login/Register
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
 * Helper Alert Layar Biodata Anggota
 */
function showBiodataAlert(message, type = 'error') {
  if (!biodataAlertBox) return;
  biodataAlertBox.innerHTML = message;
  biodataAlertBox.className = `alert ${type}`;
  biodataAlertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideBiodataAlert() {
  if (!biodataAlertBox) return;
  biodataAlertBox.className = 'alert';
  biodataAlertBox.innerHTML = '';
}

/**
 * Beralih antara mode Login dan Register User
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
 * Navigasi Tab Proporsional pada Layar Entry Data Anggota
 */
function switchTab(targetTabId) {
  // Jika biodata belum terdaftar di adnan_DataAnggota, kunci tab Ringkasan
  if (targetTabId === 'tabRingkasan' && !currentBiodataRecord) {
    showBiodataAlert(
      'Biodata Anda belum terdaftar di tabel <code>adnan_DataAnggota</code>. Silakan lengkapi dan klik <b>Simpan Biodata Peserta</b> terlebih dahulu.',
      'error'
    );
    return;
  }

  const allTabButtons = document.querySelectorAll('.tab-btn');
  const allTabPanels = document.querySelectorAll('.tab-panel');

  allTabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
  });

  allTabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetTabId);
  });
}

/**
 * Validasi field wajib pada tab sebelum lanjut ke tab berikutnya
 */
function validateCurrentTabFields(tabElement) {
  if (!tabElement) return true;
  const requiredInputs = tabElement.querySelectorAll('input[required], select[required], textarea[required]');
  for (const input of requiredInputs) {
    if (!String(input.value || '').trim()) {
      input.focus();
      const labelEl = tabElement.querySelector(`label[for="${input.id}"]`);
      const labelText = labelEl ? labelEl.textContent.replace('*', '').trim() : 'Field wajib';
      showBiodataAlert(`Mohon lengkapi kolom wajib: <b>${labelText}</b> terlebih dahulu.`, 'error');
      return false;
    }
  }
  hideBiodataAlert();
  return true;
}

/**
 * Mengecek apakah user terdaftar di tabel adnan_User
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

  const matchedUser = (users || []).find((row) => {
    const uid = String(row.user_id || '').toLowerCase();
    const uname = String(row.username || '').toLowerCase();
    const namaLengkap = String(row.nama_lengkap || '').toLowerCase();
    return uid === normalized || uname === normalized || namaLengkap === normalized;
  });

  return matchedUser || null;
}

/**
 * Mendaftarkan user baru ke tabel adnan_User
 */
async function registerUserToSupabase({ nama_lengkap, user_id, deskripsi, no_hp, password }) {
  const existingUser = await checkUserInSupabase(user_id);
  if (existingUser) {
    throw new Error(`User ID / Username <b>${user_id}</b> sudah terdaftar! Silakan langsung Login.`);
  }

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
 * Mengecek apakah Biodata peserta arisan sudah terregistrasi pada tabel adnan_DataAnggota
 */
async function checkBiodataAnggotaInSupabase(user) {
  const endpoint = `${SUPABASE_REST_URL}/${ANGGOTA_TABLE}?select=*`;
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
        'Izin akses tabel <b>adnan_DataAnggota</b> belum dibuka di Supabase (Error 42501).<br>' +
        'Silakan jalankan perintah berikut di <b>Supabase SQL Editor</b>:<br>' +
        '<code>GRANT ALL PRIVILEGES ON TABLE public."adnan_DataAnggota" TO anon, authenticated;</code><br>' +
        'atau jalankan ulang isi file <code>supabase_schema.sql</code>.'
      );
    }
    throw new Error(errData.message || `Gagal mengecek tabel ${ANGGOTA_TABLE}.`);
  }

  const rows = await response.json();
  const targetUserId = String(user.user_id || user.username || '').toLowerCase();
  const targetNama = String(user.nama_lengkap || user.nama || '').toLowerCase();

  const matched = (rows || []).find((row) => {
    const rowUid = String(row.user_id || row.username || row.id_user || '').toLowerCase();
    const rowNama = String(row.nama_lengkap || row.nama || row.nama_anggota || '').toLowerCase();
    if (targetUserId && rowUid && rowUid === targetUserId) return true;
    if (targetNama && rowNama && rowNama === targetNama) return true;
    return false;
  });

  return matched || null;
}

/**
 * Menyimpan atau memperbarui Biodata Peserta ke tabel adnan_DataAnggota
 * Dilengkapi mekanisme adaptif jika ada perbedaan kolom pada tabel Supabase
 */
async function saveBiodataToSupabase(formValues, existingRecord) {
  let payload = {
    user_id: formValues.user_id,
    nama_lengkap: formValues.nama_lengkap,
    nama_panggilan: formValues.nama_panggilan || null,
    jenis_kelamin: formValues.jenis_kelamin || null,
    tempat_lahir: formValues.tempat_lahir || null,
    tanggal_lahir: formValues.tanggal_lahir || null,
    pekerjaan: formValues.pekerjaan || null,
    no_hp: formValues.no_hp || null,
    email: formValues.email || null,
    alamat: formValues.alamat || null,
    kota: formValues.kota || null,
    nama_pasangan: formValues.nama_pasangan || null,
    jumlah_anak: Number(formValues.jumlah_anak || 0),
    silsilah_keluarga: formValues.silsilah_keluarga || null,
    nama_bank: formValues.nama_bank || null,
    no_rekening: formValues.no_rekening || null,
    atas_nama_rekening: formValues.atas_nama_rekening || null,
    jumlah_ikut_arisan: Number(formValues.jumlah_ikut_arisan || 1),
    status_aktif: true
  };

  const isUpdate = Boolean(existingRecord && (existingRecord.id || existingRecord.user_id));
  let url = `${SUPABASE_REST_URL}/${ANGGOTA_TABLE}`;
  let method = 'POST';

  if (isUpdate) {
    if (existingRecord.id !== undefined) {
      url += `?id=eq.${encodeURIComponent(existingRecord.id)}`;
    } else {
      url += `?user_id=eq.${encodeURIComponent(existingRecord.user_id)}`;
    }
    method = 'PATCH';
  }

  // Maksimal 8 kali percobaan adaptif jika ada kolom di payload yang belum ditambahkan di Supabase
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const saved = await response.json();
      return Array.isArray(saved) ? saved[0] : saved;
    }

    let errData = {};
    try {
      errData = await response.json();
    } catch (_) {}

    if (errData.code === '42501') {
      throw new Error(
        'Akses simpan ke <b>adnan_DataAnggota</b> ditolak (Error 42501).<br>' +
        'Silakan jalankan isi file <code>supabase_schema.sql</code> di Supabase SQL Editor.'
      );
    }

    // Jika ada kolom pada payload yang belum ada di tabel adnan_DataAnggota (PGRST204)
    const missingColMatch = (errData.message || '').match(/Could not find the '([^']+)' column/);
    if (errData.code === 'PGRST204' && missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      delete payload[missingCol];
      continue;
    }

    // Jika ada kolom wajib (NOT NULL) dengan nama berbeda di tabel adnan_DataAnggota (23502)
    const notNullMatch = (errData.message || '').match(/null value in column "([^"]+)"/);
    if (errData.code === '23502' && notNullMatch && notNullMatch[1]) {
      const requiredCol = notNullMatch[1];
      if (requiredCol.includes('nama')) {
        payload[requiredCol] = formValues.nama_lengkap;
      } else if (requiredCol.includes('hp') || requiredCol.includes('telp') || requiredCol.includes('wa')) {
        payload[requiredCol] = formValues.no_hp;
      } else if (requiredCol.includes('alamat')) {
        payload[requiredCol] = formValues.alamat;
      } else {
        payload[requiredCol] = formValues.user_id;
      }
      continue;
    }

    throw new Error(errData.message || 'Gagal menyimpan biodata ke tabel adnan_DataAnggota.');
  }

  throw new Error('Gagal menyesuaikan skema kolom adnan_DataAnggota. Jalankan supabase_schema.sql di Supabase.');
}

/**
 * Mengisi nilai form dari record adnan_DataAnggota
 */
function populateBiodataForm(user, bioRecord) {
  const defaultUserId = (bioRecord && bioRecord.user_id) || user.user_id || user.username || '';
  const defaultNama = (bioRecord && (bioRecord.nama_lengkap || bioRecord.nama)) || user.nama_lengkap || user.nama || '';
  const defaultHp = (bioRecord && (bioRecord.no_hp || bioRecord.no_telp)) || user.no_hp || user.deskripsi || '';

  document.getElementById('bioUserId').value = defaultUserId;
  document.getElementById('bioNamaLengkap').value = defaultNama;
  document.getElementById('bioNamaPanggilan').value = (bioRecord && bioRecord.nama_panggilan) || '';
  document.getElementById('bioJenisKelamin').value = (bioRecord && bioRecord.jenis_kelamin) || '';
  document.getElementById('bioTempatLahir').value = (bioRecord && bioRecord.tempat_lahir) || '';
  document.getElementById('bioTanggalLahir').value = (bioRecord && bioRecord.tanggal_lahir) || '';
  document.getElementById('bioPekerjaan').value = (bioRecord && bioRecord.pekerjaan) || '';
  document.getElementById('bioNoHp').value = defaultHp;
  document.getElementById('bioEmail').value = (bioRecord && bioRecord.email) || '';
  document.getElementById('bioAlamat').value = (bioRecord && bioRecord.alamat) || '';
  document.getElementById('bioKota').value = (bioRecord && bioRecord.kota) || '';
  document.getElementById('bioNamaPasangan').value = (bioRecord && bioRecord.nama_pasangan) || '';
  document.getElementById('bioJumlahAnak').value =
    bioRecord && bioRecord.jumlah_anak !== undefined && bioRecord.jumlah_anak !== null ? bioRecord.jumlah_anak : 0;
  document.getElementById('bioSilsilah').value = (bioRecord && bioRecord.silsilah_keluarga) || '';
  document.getElementById('bioJumlahArisan').value =
    bioRecord && bioRecord.jumlah_ikut_arisan !== undefined && bioRecord.jumlah_ikut_arisan !== null
      ? bioRecord.jumlah_ikut_arisan
      : 1;
  document.getElementById('bioNamaBank').value = (bioRecord && bioRecord.nama_bank) || '';
  document.getElementById('bioNoRekening').value = (bioRecord && bioRecord.no_rekening) || '';
  document.getElementById('bioAtasNama').value = (bioRecord && bioRecord.atas_nama_rekening) || defaultNama;
}

/**
 * Menampilkan kartu ringkasan Biodata Terdaftar pada Tab 4
 */
function renderBiodataSummary(bio) {
  if (!biodataSummaryContainer || !bio) return;

  const items = [
    { label: 'User ID Peserta', value: bio.user_id || '-' },
    { label: 'Nama Lengkap', value: bio.nama_lengkap || bio.nama || '-' },
    { label: 'Nama Panggilan', value: bio.nama_panggilan || '-' },
    { label: 'Jenis Kelamin', value: bio.jenis_kelamin || '-' },
    {
      label: 'Tempat, Tanggal Lahir',
      value: [bio.tempat_lahir, bio.tanggal_lahir].filter(Boolean).join(', ') || '-'
    },
    { label: 'Pekerjaan', value: bio.pekerjaan || '-' },
    { label: 'No. WhatsApp / HP', value: bio.no_hp || '-' },
    { label: 'Email', value: bio.email || '-' },
    { label: 'Alamat Domisili', value: bio.alamat || '-' },
    { label: 'Kota / Kabupaten', value: bio.kota || '-' },
    { label: 'Nama Pasangan', value: bio.nama_pasangan || '-' },
    { label: 'Jumlah Anak', value: bio.jumlah_anak !== undefined && bio.jumlah_anak !== null ? String(bio.jumlah_anak) : '0' },
    { label: 'Silsilah Keluarga Adnan', value: bio.silsilah_keluarga || '-' },
    { label: 'Jumlah Slot Arisan', value: `${bio.jumlah_ikut_arisan || 1} Slot` },
    {
      label: 'Rekening Pencairan',
      value: [bio.nama_bank, bio.no_rekening, bio.atas_nama_rekening ? `a.n ${bio.atas_nama_rekening}` : '']
        .filter(Boolean)
        .join(' - ') || '-'
    },
    { label: 'Status Kepesertaan', value: bio.status_aktif !== false ? 'Aktif Terdaftar' : 'Tidak Aktif' }
  ];

  biodataSummaryContainer.innerHTML = items
    .map(
      (item) => `
      <div class="summary-item">
        <div class="label">${item.label}</div>
        <div class="value">${item.value}</div>
      </div>
    `
    )
    .join('');
}

/**
 * Mengatur tampilan setelah Login berhasil & mengecek tabel adnan_DataAnggota
 */
async function handlePostLoginFlow(user) {
  currentLoggedUser = user;
  if (!user) {
    authView.classList.remove('hidden');
    memberAppView.classList.add('hidden');
    return;
  }

  authView.classList.add('hidden');
  memberAppView.classList.remove('hidden');
  hideBiodataAlert();

  const displayName = user.nama_lengkap || user.nama || user.user_id || 'Peserta';
  const displayUserId = user.user_id || user.username || '-';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  headerAvatar.textContent = initials || 'KA';
  welcomeUserText.textContent = displayName;
  userDetailText.textContent = `User ID: ${displayUserId} • Role: ${user.role || 'peserta'}`;

  try {
    const biodata = await checkBiodataAnggotaInSupabase(user);
    currentBiodataRecord = biodata;
    populateBiodataForm(user, biodata);

    if (!biodata) {
      // BELUM TERDAFTAR DI adnan_DataAnggota -> WAJIB ISI ENTRY BIODATA
      biodataStatusPill.textContent = '⚠️ Wajib Isi Biodata';
      biodataStatusPill.className = 'status-pill incomplete';
      mandatoryBanner.classList.remove('hidden');
      tabBtnRingkasan.disabled = true;
      saveBiodataBtn.textContent = '💾 Simpan Biodata Peserta';
      switchTab('tabPribadi');
    } else {
      // SUDAH TERDAFTAR DI adnan_DataAnggota
      biodataStatusPill.textContent = '✓ Biodata Terdaftar';
      biodataStatusPill.className = 'status-pill complete';
      mandatoryBanner.classList.add('hidden');
      tabBtnRingkasan.disabled = false;
      saveBiodataBtn.textContent = '💾 Perbarui Biodata Peserta';
      renderBiodataSummary(biodata);
      switchTab('tabRingkasan');
    }
  } catch (err) {
    populateBiodataForm(user, null);
    mandatoryBanner.classList.remove('hidden');
    switchTab('tabPribadi');
    showBiodataAlert(err.message, 'error');
  }
}

// Event Listener: Klik Tab Navigasi
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    switchTab(targetTab);
  });
});

// Event Listener: Tombol "Selanjutnya" di dalam Tab
document.querySelectorAll('[data-next-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const currentPanel = btn.closest('.tab-panel');
    if (!validateCurrentTabFields(currentPanel)) return;
    const nextTabId = btn.getAttribute('data-next-tab');
    switchTab(nextTabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Event Listener: Tombol "Kembali" di dalam Tab
document.querySelectorAll('[data-prev-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    hideBiodataAlert();
    const prevTabId = btn.getAttribute('data-prev-tab');
    switchTab(prevTabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Event Listener: Tombol Edit Biodata dari Tab Ringkasan
if (editBiodataBtn) {
  editBiodataBtn.addEventListener('click', () => {
    switchTab('tabPribadi');
  });
}

// Event Listener: Submit Form Entry Biodata (adnan_DataAnggota)
if (biodataForm) {
  biodataForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validasi wajib di Tab 1 & Tab 2 sebelum submit
    const tabPribadiEl = document.getElementById('tabPribadi');
    const tabKontakEl = document.getElementById('tabKontak');
    if (!validateCurrentTabFields(tabPribadiEl)) {
      switchTab('tabPribadi');
      return;
    }
    if (!validateCurrentTabFields(tabKontakEl)) {
      switchTab('tabKontak');
      return;
    }

    const formValues = {
      user_id: document.getElementById('bioUserId').value.trim(),
      nama_lengkap: document.getElementById('bioNamaLengkap').value.trim(),
      nama_panggilan: document.getElementById('bioNamaPanggilan').value.trim(),
      jenis_kelamin: document.getElementById('bioJenisKelamin').value,
      tempat_lahir: document.getElementById('bioTempatLahir').value.trim(),
      tanggal_lahir: document.getElementById('bioTanggalLahir').value || null,
      pekerjaan: document.getElementById('bioPekerjaan').value.trim(),
      no_hp: document.getElementById('bioNoHp').value.trim(),
      email: document.getElementById('bioEmail').value.trim(),
      alamat: document.getElementById('bioAlamat').value.trim(),
      kota: document.getElementById('bioKota').value.trim(),
      nama_pasangan: document.getElementById('bioNamaPasangan').value.trim(),
      jumlah_anak: document.getElementById('bioJumlahAnak').value || 0,
      silsilah_keluarga: document.getElementById('bioSilsilah').value.trim(),
      jumlah_ikut_arisan: document.getElementById('bioJumlahArisan').value || 1,
      nama_bank: document.getElementById('bioNamaBank').value.trim(),
      no_rekening: document.getElementById('bioNoRekening').value.trim(),
      atas_nama_rekening: document.getElementById('bioAtasNama').value.trim()
    };

    saveBiodataBtn.disabled = true;
    saveBiodataBtn.textContent = 'Menyimpan ke adnan_DataAnggota...';
    hideBiodataAlert();

    try {
      const savedRecord = await saveBiodataToSupabase(formValues, currentBiodataRecord);
      currentBiodataRecord = savedRecord || formValues;

      biodataStatusPill.textContent = '✓ Biodata Terdaftar';
      biodataStatusPill.className = 'status-pill complete';
      mandatoryBanner.classList.add('hidden');
      tabBtnRingkasan.disabled = false;
      saveBiodataBtn.textContent = '💾 Perbarui Biodata Peserta';

      renderBiodataSummary(currentBiodataRecord);
      switchTab('tabRingkasan');
      showBiodataAlert('Biodata Peserta Arisan berhasil disimpan ke tabel <b>adnan_DataAnggota</b>!', 'success');
    } catch (error) {
      showBiodataAlert(error.message, 'error');
    } finally {
      saveBiodataBtn.disabled = false;
    }
  });
}

// Event Listener: Klik tulisan "Register User" di bawah Login
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
        registerFooter.classList.add('highlight-prompt');
        return;
      }

      if (foundUser.status_aktif === false) {
        showAlert('Akun Anda saat ini berstatus tidak aktif.', 'error');
        return;
      }

      if (foundUser.password !== undefined && foundUser.password !== null && String(foundUser.password) !== password) {
        showAlert('Password yang Anda masukkan salah.', 'error');
        return;
      }

      showAlert('Login berhasil! Mengecek Biodata pada adnan_DataAnggota...', 'success');
      localStorage.setItem(SESSION_KEY, JSON.stringify(foundUser));

      setTimeout(() => {
        handlePostLoginFlow(foundUser);
      }, 500);
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
    const deskripsi = no_hp;
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
      }, 900);
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
    currentLoggedUser = null;
    currentBiodataRecord = null;
    handlePostLoginFlow(null);
    setAuthMode(false);
  });
}

// Cek session saat halaman pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
  try {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      const parsedUser = JSON.parse(savedSession);
      handlePostLoginFlow(parsedUser);
    }
  } catch (_) {
    localStorage.removeItem(SESSION_KEY);
  }
});
