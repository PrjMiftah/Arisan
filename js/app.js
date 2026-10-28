// ============================================================================
// KONFIGURASI SUPABASE REST API - ARISAN KELUARGA ADNAN
// ============================================================================
const SUPABASE_REST_URL = 'https://zufpuadipntstcnqxxpm.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZnB1YWRpcG50c3RjbnF4eHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjM2OTMsImV4cCI6MjEwODYzOTY5M30.gjXuVjWUjIaJX4JI6_d_fpq01fnsvDPedMuKD9SCYIA';

const TABLES = {
  USER: 'adnan_User',
  ANGGOTA: 'adnan_DataAnggota',
  PEMBAYARAN: 'adnan_Pembayaran',
  PENGELUARAN: 'adnan_Pengeluaran',
  PENGUMUMAN: 'adnan_Pengumuman',
  GALERI: 'adnan_Galeri',
  ARISAN: 'adnan_Arisan',
  PERIODE: 'adnan_PeriodeArisan',
  PEMENANG: 'adnan_PemenangArisan'
};

const SESSION_KEY = 'adnan_logged_in_user';

const supabaseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// ============================================================================
// DATA DROPDOWN BANK LENGKAP SE-INDONESIA
// ============================================================================
const DAFTAR_BANK_INDONESIA = [
  {
    group: 'Bank BUMN / Himbara',
    banks: [
      'Bank Mandiri',
      'Bank Rakyat Indonesia (BRI)',
      'Bank Negara Indonesia (BNI)',
      'Bank Tabungan Negara (BTN)'
    ]
  },
  {
    group: 'Bank Syariah',
    banks: [
      'Bank Syariah Indonesia (BSI)',
      'Bank Muamalat Indonesia',
      'BCA Syariah',
      'CIMB Niaga Syariah',
      'Bank Mega Syariah',
      'Bank Panin Dubai Syariah',
      'Bank Aladin Syariah',
      'BTPN Syariah'
    ]
  },
  {
    group: 'Bank Swasta Nasional',
    banks: [
      'Bank Central Asia (BCA)',
      'Bank CIMB Niaga',
      'Bank Permata',
      'Bank Danamon',
      'Bank Panin',
      'Bank OCBC NISP',
      'Bank Maybank Indonesia',
      'Bank Mega',
      'Bank Sinarmas',
      'Bank BTPN / Jenius',
      'KB Bukopin',
      'Bank Commonwealth',
      'HSBC Indonesia',
      'UOB Indonesia',
      'Citibank Indonesia',
      'Bank Mayapada',
      'Bank MNC Internasional',
      'Bank Nobu',
      'Bank Artha Graha',
      'Bank Victoria',
      'Bank Sahabat Sampoerna'
    ]
  },
  {
    group: 'Bank Digital & E-Wallet',
    banks: [
      'Bank Jago',
      'SeaBank Indonesia',
      'Blu by BCA Digital',
      'Allo Bank',
      'Superbank',
      'Krom Bank',
      'DANA (E-Wallet)',
      'OVO (E-Wallet)',
      'GoPay (E-Wallet)',
      'ShopeePay (E-Wallet)',
      'LinkAja (E-Wallet)'
    ]
  },
  {
    group: 'Bank Pembangunan Daerah (BPD)',
    banks: [
      'Bank DKI',
      'Bank BJB (Jabar Banten)',
      'Bank BJB Syariah',
      'Bank Jateng',
      'Bank Jatim',
      'Bank BPD DIY',
      'Bank Sumut',
      'Bank Aceh Syariah',
      'Bank Nagari (Sumbar)',
      'Bank Riau Kepri Syariah',
      'Bank Sumsel Babel',
      'Bank Jambi',
      'Bank Bengkulu',
      'Bank Lampung',
      'Bank Kalbar',
      'Bank Kalteng',
      'Bank Kalsel',
      'Bank Kaltimtara',
      'Bank Sulselbar',
      'Bank SulutGo',
      'Bank Sulteng',
      'Bank Sultra',
      'Bank BPD Bali',
      'Bank NTB Syariah',
      'Bank NTT',
      'Bank Maluku Malut',
      'Bank Papua'
    ]
  }
];

// ============================================================================
// STATE APLIKASI
// ============================================================================
let isRegisterMode = false;
let currentLoggedUser = null;
let currentBiodataRecord = null;
let cachedAnggotaList = [];
let cachedPeriodeList = [];
let cachedPemenangList = [];
let cachedPembayaranList = [];

// File DataURL sementara untuk upload bukti/foto/PDF
let uploadedBioFotoDataUrl = null;
let uploadedPayBuktiDataUrl = null;
let uploadedExpBuktiDataUrl = null;
let uploadedAnnPdfDataUrl = null;
let uploadedAnnPdfName = null;
let uploadedGalFotoDataUrl = null;

// Kamera Live Stream State
let activeCameraStream = null;
let currentCameraFacingMode = 'user';

// ============================================================================
// INISIALISASI DROPDOWN BANK LENGKAP
// ============================================================================
function populateAllBankDropdowns() {
  const selects = document.querySelectorAll('.bank-dropdown-select');
  const htmlOptions = [
    '<option value="">-- Pilih Bank Tujuan / Pengirim --</option>',
    ...DAFTAR_BANK_INDONESIA.map(
      (grp) =>
        `<optgroup label="${grp.group}">` +
        grp.banks.map((b) => `<option value="${b}">${b}</option>`).join('') +
        `</optgroup>`
    )
  ].join('');

  selects.forEach((sel) => {
    sel.innerHTML = htmlOptions;
  });
}

// ============================================================================
// HELPER FORMAT RUPIAH, TANGGAL & FILE READER
// ============================================================================
function formatRupiah(num) {
  const n = Number(num || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function readFileAsDataURL(file, maxWidth = 900) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
}

// ============================================================================
// HELPER ALERT & MODAL PREVIEW
// ============================================================================
const alertBox = document.getElementById('alertBox');
const globalAppAlert = document.getElementById('globalAppAlert');
const biodataAlertBox = document.getElementById('biodataAlertBox');

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

function showGlobalAlert(message, type = 'success') {
  if (!globalAppAlert) return;
  globalAppAlert.innerHTML = message;
  globalAppAlert.className = `alert ${type}`;
  globalAppAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => {
    if (type === 'success') {
      globalAppAlert.className = 'alert';
    }
  }, 6000);
}

function showBiodataAlert(message, type = 'error') {
  if (!biodataAlertBox) return;
  biodataAlertBox.innerHTML = message;
  biodataAlertBox.className = `alert ${type}`;
}

function hideBiodataAlert() {
  if (!biodataAlertBox) return;
  biodataAlertBox.className = 'alert';
  biodataAlertBox.innerHTML = '';
}

const mediaPreviewRegistry = {};
let activeModalBlobUrl = null;

function registerMediaPreview(key, title, dataUrl) {
  if (!dataUrl) return null;
  mediaPreviewRegistry[key] = { title: title || 'Pratinjau Bukti / Dokumen', dataUrl };
  return key;
}

function convertDataUrlToBlobUrl(dataUrl) {
  try {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return { url: dataUrl, mime: '' };
    }
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return { url: dataUrl, mime: '' };

    const header = dataUrl.slice(0, commaIdx);
    const base64Clean = dataUrl.slice(commaIdx + 1).replace(/\s+/g, '');
    const mimeMatch = header.match(/data:([^;]+)/i);
    const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'application/octet-stream';

    const binaryString = atob(base64Clean);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    if (activeModalBlobUrl) {
      try {
        URL.revokeObjectURL(activeModalBlobUrl);
      } catch (_) {}
    }
    activeModalBlobUrl = URL.createObjectURL(blob);
    return { url: activeModalBlobUrl, mime: mimeType };
  } catch (err) {
    console.error('Konversi DataURL ke Blob gagal:', err);
    return { url: dataUrl, mime: '' };
  }
}

function openMediaByKey(key) {
  const item = mediaPreviewRegistry[key];
  if (!item || !item.dataUrl) {
    showGlobalAlert('Data bukti/dokumen tidak ditemukan.', 'error');
    return;
  }
  openMediaModal(item.title, item.dataUrl);
}

function openMediaModal(title, dataUrl) {
  const modal = document.getElementById('mediaModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBodyContent');
  if (!modal || !dataUrl) return;

  const safeTitle = title || 'Pratinjau Dokumen / Bukti Pembayaran';
  modalTitle.textContent = safeTitle;

  const { url: resolvedUrl, mime } = convertDataUrlToBlobUrl(dataUrl);
  const isPdf =
    mime === 'application/pdf' ||
    String(dataUrl).startsWith('data:application/pdf') ||
    String(dataUrl).toLowerCase().endsWith('.pdf');

  const safeFileName = safeTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (isPdf) {
    modalBody.innerHTML = `
      <div style="margin-bottom:12px; display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
        <a href="${resolvedUrl}" target="_blank" rel="noopener" class="btn-secondary btn-sm">🔎 Buka Bukti di Tab Baru</a>
        <a href="${resolvedUrl}" download="${safeFileName}.pdf" class="btn-primary btn-sm">⬇️ Unduh Bukti PDF</a>
      </div>
      <embed src="${resolvedUrl}#toolbar=1&navpanes=0" type="application/pdf" style="width:100%; height:70vh; border-radius:10px; border:1px solid #cbd5e1; background:#f8fafc;" />
    `;
  } else {
    modalBody.innerHTML = `
      <div style="margin-bottom:12px; display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
        <a href="${resolvedUrl}" target="_blank" rel="noopener" class="btn-secondary btn-sm">🔎 Perbesar di Tab Baru</a>
        <a href="${resolvedUrl}" download="${safeFileName}.jpg" class="btn-primary btn-sm">⬇️ Unduh Gambar Bukti</a>
      </div>
      <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0; display:flex; justify-content:center;">
        <img src="${resolvedUrl}" alt="${safeTitle}" style="max-width:100%; max-height:68vh; border-radius:8px; object-fit:contain; box-shadow:0 4px 16px rgba(0,0,0,0.1);" />
      </div>
    `;
  }
  modal.classList.remove('hidden');
}

window.openMediaModal = openMediaModal;
window.openMediaByKey = openMediaByKey;

const closeModalBtn = document.getElementById('closeModalBtn');
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    document.getElementById('mediaModal').classList.add('hidden');
  });
}

// ============================================================================
// GENERIC ADAPTIVE SUPABASE POST / PATCH HELPER
// ============================================================================
async function adaptiveSupabaseWrite(tableName, payloadObj, queryFilter = '') {
  let payload = { ...payloadObj };
  const method = queryFilter ? 'PATCH' : 'POST';
  const url = `${SUPABASE_REST_URL}/${tableName}${queryFilter}`;

  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data[0] : data;
    }

    let errData = {};
    try {
      errData = await response.json();
    } catch (_) { }

    if (errData.code === '42501') {
      throw new Error(
        `Izin akses tabel <b>${tableName}</b> ditolak (Error 42501). Jalankan isi file <code>supabase_schema.sql</code> di Supabase SQL Editor.`
      );
    }

    // Jika ada kolom pada payload yang tidak ditemukan di schema cache Supabase (PGRST204)
    const missingColMatch = (errData.message || '').match(/Could not find the '([^']+)' column/);
    if (errData.code === 'PGRST204' && missingColMatch && missingColMatch[1]) {
      delete payload[missingColMatch[1]];
      continue;
    }

    // Jika ada check constraint pada kolom status (23514) misal 'Pending' -> 'pending' atau 'menunggu'
    if (errData.code === '23514' && payload.status) {
      if (payload.status === 'Pending') {
        payload.status = 'pending';
        continue;
      } else if (payload.status === 'pending') {
        payload.status = 'menunggu';
        continue;
      }
    }

    // Jika ada kolom NOT NULL yang belum terisi (23502)
    const notNullMatch = (errData.message || '').match(/null value in column "([^"]+)"/);
    if (errData.code === '23502' && notNullMatch && notNullMatch[1]) {
      const col = notNullMatch[1];
      if (col.includes('nama') || col.includes('judul')) {
        payload[col] = payload.nama_lengkap || payload.nama_pembayar || payload.judul || '-';
      } else if (col.includes('ayah')) {
        payload[col] = 'H. Adnan';
      } else if (col.includes('nominal') || col.includes('iuran') || col.includes('jumlah')) {
        payload[col] = 0;
      } else {
        payload[col] = '-';
      }
      continue;
    }

    throw new Error(errData.message || `Gagal menyimpan data ke tabel ${tableName}.`);
  }

  throw new Error(`Gagal menyesuaikan kolom tabel ${tableName}.`);
}

// ============================================================================
// NAVIGASI ANTAR LAYAR UTAMA & SUB-TAB
// ============================================================================
function isUserAdmin() {
  if (!currentLoggedUser) return false;
  const role = String(currentLoggedUser.role || '').toLowerCase();
  const uid = String(currentLoggedUser.user_id || currentLoggedUser.username || '').toLowerCase();
  return role === 'admin' || uid === 'admin';
}

function switchMainView(targetViewId) {
  stopCameraStream();

  // Proteksi Tab Pengeluaran: Hanya bisa dibuka oleh User Admin
  if (targetViewId === 'viewPengeluaran' && !isUserAdmin()) {
    showGlobalAlert('Menu Pengeluaran / Akuntansi hanya dapat diakses oleh User Admin.', 'error');
    return;
  }

  // Jika biodata peserta belum terdaftar di adnan_DataAnggota, wajibkan mengisi Biodata terlebih dahulu
  if (!currentBiodataRecord && targetViewId !== 'viewBiodata') {
    showBiodataAlert(
      '⚠️ Anda wajib melengkapi dan menyimpan <b>Biodata Peserta Arisan</b> pada tabel <code>adnan_DataAnggota</code> terlebih dahulu sebelum membuka Menu Utama Gallery.',
      'error'
    );
    targetViewId = 'viewBiodata';
  }

  document.querySelectorAll('.main-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-main-view') === targetViewId);
  });

  document.querySelectorAll('.main-section-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetViewId);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchBioSubTab(targetTabId) {
  if (targetTabId !== 'tabPribadi') {
    stopCameraStream();
  }

  if (targetTabId === 'tabRingkasan' && !currentBiodataRecord) {
    showBiodataAlert('Silakan simpan Biodata Peserta terlebih dahulu.', 'error');
    return;
  }

  document.querySelectorAll('[data-bio-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-bio-tab') === targetTabId);
  });

  document.querySelectorAll('#viewBiodata .sub-tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetTabId);
  });
}

function switchPeriodeSubTab(targetSubTabId) {
  document.querySelectorAll('[data-periode-subtab]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-periode-subtab') === targetSubTabId);
  });

  document.querySelectorAll('#viewPeriode .sub-tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetSubTabId);
  });
}

// ============================================================================
// FITUR KAMERA LIVE & UPLOAD FOTO PESERTA (adnan_DataAnggota)
// ============================================================================
function updateBioPhotoPreviewUI(photoDataUrl, fallbackInitials = '👤') {
  const previewBox = document.getElementById('bioFotoPreviewBox');
  if (!previewBox) return;

  if (photoDataUrl) {
    previewBox.innerHTML = `<img src="${photoDataUrl}" alt="Foto Peserta" />`;
  } else {
    previewBox.textContent = fallbackInitials;
  }
}

function updateHeaderAvatarPhoto(user, bio) {
  const headerAvatar = document.getElementById('headerAvatar');
  if (!headerAvatar) return;

  const displayName = (bio && bio.nama_lengkap) || (user && (user.nama_lengkap || user.nama || user.user_id)) || 'Peserta';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const photoUrl =
    (bio && (bio.foto_url || bio.foto)) ||
    (user && (user.foto_url || user.foto)) ||
    uploadedBioFotoDataUrl ||
    null;

  if (photoUrl) {
    headerAvatar.innerHTML = `<img src="${photoUrl}" alt="${displayName}" />`;
    headerAvatar.onclick = () => openMediaModal(`Foto Peserta - ${displayName}`, photoUrl);
  } else {
    headerAvatar.innerHTML = initials || 'KA';
    headerAvatar.onclick = () => {
      switchMainView('viewBiodata');
      switchBioSubTab('tabPribadi');
    };
  }
}

async function startCameraStream() {
  const cameraBox = document.getElementById('cameraLiveBox');
  const videoEl = document.getElementById('cameraVideoEl');
  if (!cameraBox || !videoEl) return;

  stopCameraStream();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showBiodataAlert('Browser Anda tidak mendukung akses kamera langsung. Silakan gunakan tombol Upload dari Folder Lokal.', 'error');
    return;
  }

  try {
    activeCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentCameraFacingMode, width: { ideal: 640 }, height: { ideal: 640 } },
      audio: false
    });
    videoEl.srcObject = activeCameraStream;
    cameraBox.classList.remove('hidden');
  } catch (err) {
    showBiodataAlert('Gagal membuka kamera: Pastikan izin kamera (Allow Camera) diaktifkan pada browser Anda.', 'error');
  }
}

function stopCameraStream() {
  const cameraBox = document.getElementById('cameraLiveBox');
  const videoEl = document.getElementById('cameraVideoEl');
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }
  if (videoEl) {
    videoEl.srcObject = null;
  }
  if (cameraBox) {
    cameraBox.classList.add('hidden');
  }
}

const btnOpenCamera = document.getElementById('btnOpenCamera');
if (btnOpenCamera) {
  btnOpenCamera.addEventListener('click', () => startCameraStream());
}

const btnSwitchCamera = document.getElementById('btnSwitchCamera');
if (btnSwitchCamera) {
  btnSwitchCamera.addEventListener('click', () => {
    currentCameraFacingMode = currentCameraFacingMode === 'user' ? 'environment' : 'user';
    startCameraStream();
  });
}

const btnCloseCamera = document.getElementById('btnCloseCamera');
if (btnCloseCamera) {
  btnCloseCamera.addEventListener('click', () => stopCameraStream());
}

const btnCapturePhoto = document.getElementById('btnCapturePhoto');
if (btnCapturePhoto) {
  btnCapturePhoto.addEventListener('click', () => {
    const videoEl = document.getElementById('cameraVideoEl');
    if (!videoEl || !activeCameraStream) return;

    const canvas = document.createElement('canvas');
    const size = Math.min(videoEl.videoWidth || 480, videoEl.videoHeight || 480);
    const sx = ((videoEl.videoWidth || size) - size) / 2;
    const sy = ((videoEl.videoHeight || size) - size) / 2;

    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, sx, sy, size, size, 0, 0, 480, 480);

    uploadedBioFotoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    updateBioPhotoPreviewUI(uploadedBioFotoDataUrl);
    updateHeaderAvatarPhoto(currentLoggedUser, currentBiodataRecord);
    stopCameraStream();
    showBiodataAlert('📸 Foto berhasil diambil dari kamera! Jangan lupa klik "Simpan Biodata" pada langkah ke-3.', 'success');
  });
}

const btnTriggerLocalUpload = document.getElementById('btnTriggerLocalUpload');
const bioFotoFileInput = document.getElementById('bioFotoFileInput');
if (btnTriggerLocalUpload && bioFotoFileInput) {
  btnTriggerLocalUpload.addEventListener('click', () => bioFotoFileInput.click());
  bioFotoFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadedBioFotoDataUrl = await readFileAsDataURL(file, 520);
    updateBioPhotoPreviewUI(uploadedBioFotoDataUrl);
    updateHeaderAvatarPhoto(currentLoggedUser, currentBiodataRecord);
    showBiodataAlert('📁 Foto dari folder lokal berhasil dimuat! Jangan lupa klik "Simpan Biodata" pada langkah ke-3.', 'success');
  });
}

// ============================================================================
// AUTH: LOGIN & REGISTER USER (adnan_User)
// ============================================================================
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toggleAuthLink = document.getElementById('toggleAuthLink');
const togglePromptText = document.getElementById('togglePromptText');
const registerFooter = document.getElementById('registerFooter');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');

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
    formSubtitle.textContent = 'Keluarga Besar Adnan';
    togglePromptText.textContent = 'Belum terdaftar?';
    toggleAuthLink.textContent = 'Register User';
  }
}

async function checkUserInSupabase(userIdInput) {
  const response = await fetch(`${SUPABASE_REST_URL}/${TABLES.USER}?select=*`, {
    method: 'GET',
    headers: supabaseHeaders
  });

  if (!response.ok) {
    throw new Error('Gagal mengakses tabel adnan_User di Supabase.');
  }

  const users = await response.json();
  const normalized = userIdInput.toLowerCase();

  return (
    (users || []).find((row) => {
      const uid = String(row.user_id || '').toLowerCase();
      const uname = String(row.username || '').toLowerCase();
      const nama = String(row.nama_lengkap || '').toLowerCase();
      return uid === normalized || uname === normalized || nama === normalized;
    }) || null
  );
}

async function registerUserToSupabase({ nama_lengkap, user_id, no_hp, password }) {
  const existing = await checkUserInSupabase(user_id);
  if (existing) {
    throw new Error(`User ID <b>${user_id}</b> sudah terdaftar! Silakan langsung Login.`);
  }

  return adaptiveSupabaseWrite(TABLES.USER, {
    user_id,
    username: user_id,
    nama_lengkap,
    nama: nama_lengkap,
    password,
    role: 'peserta',
    deskripsi: no_hp || null,
    no_hp: no_hp || null,
    status_aktif: true
  });
}

// ============================================================================
// BIODATA PESERTA (adnan_DataAnggota)
// ============================================================================
async function fetchAllAnggota() {
  const res = await fetch(`${SUPABASE_REST_URL}/${TABLES.ANGGOTA}?select=*&order=nama_lengkap.asc`, {
    method: 'GET',
    headers: supabaseHeaders
  });
  if (!res.ok) return [];
  cachedAnggotaList = await res.json();
  return cachedAnggotaList;
}

async function checkBiodataAnggotaInSupabase(user) {
  const rows = await fetchAllAnggota();
  const targetUid = String(user.user_id || user.username || '').toLowerCase();
  const targetNama = String(user.nama_lengkap || user.nama || '').toLowerCase();

  return (
    (rows || []).find((row) => {
      const rUid = String(row.user_id || '').toLowerCase();
      const rNama = String(row.nama_lengkap || '').toLowerCase();
      if (targetUid && rUid && rUid === targetUid) return true;
      if (targetNama && rNama && rNama === targetNama) return true;
      return false;
    }) || null
  );
}

function populateBiodataForm(user, bio) {
  const defaultUid = (bio && bio.user_id) || user.user_id || user.username || '';
  const defaultNama = (bio && bio.nama_lengkap) || user.nama_lengkap || user.nama || '';
  const defaultHp = (bio && bio.no_hp) || user.no_hp || user.deskripsi || '';
  const existingPhoto = (bio && (bio.foto_url || bio.foto)) || user.foto_url || user.foto || null;

  uploadedBioFotoDataUrl = existingPhoto;
  updateBioPhotoPreviewUI(existingPhoto);

  document.getElementById('bioUserId').value = defaultUid;
  document.getElementById('bioNamaLengkap').value = defaultNama;
  document.getElementById('bioNamaPanggilan').value = (bio && (bio.nama_panggilan || bio.panggilan)) || '';
  document.getElementById('bioJenisKelamin').value = (bio && bio.jenis_kelamin) || '';
  document.getElementById('bioTempatLahir').value = (bio && bio.tempat_lahir) || '';
  document.getElementById('bioTanggalLahir').value = (bio && bio.tanggal_lahir) || '';
  document.getElementById('bioPekerjaan').value = (bio && bio.pekerjaan) || '';
  document.getElementById('bioNoHp').value = defaultHp;
  document.getElementById('bioEmail').value = (bio && bio.email) || '';
  document.getElementById('bioAlamat').value = (bio && bio.alamat) || '';
  document.getElementById('bioKota').value = (bio && bio.kota) || '';
  document.getElementById('bioNamaAyah').value = (bio && bio.nama_ayah) || 'H. Adnan';
  document.getElementById('bioSilsilah').value = (bio && (bio.silsilah_keluarga || bio.garis_sanad)) || '';
  document.getElementById('bioNamaPasangan').value = (bio && bio.nama_pasangan) || '';
  document.getElementById('bioJumlahAnak').value = bio && bio.jumlah_anak != null ? bio.jumlah_anak : 0;
  document.getElementById('bioJumlahArisan').value =
    bio && (bio.jumlah_ikut_arisan || bio.jumlah_slot) ? bio.jumlah_ikut_arisan || bio.jumlah_slot : 1;
  document.getElementById('bioNamaBank').value = (bio && bio.nama_bank) || '';
  document.getElementById('bioNoRekening').value = (bio && bio.no_rekening) || '';
  document.getElementById('bioAtasNama').value = (bio && bio.atas_nama_rekening) || defaultNama;
}

function renderBiodataSummary(bio) {
  const container = document.getElementById('biodataSummaryContainer');
  const photoTop = document.getElementById('bioSummaryPhotoTop');
  if (!container || !bio) return;

  const photoUrl = bio.foto_url || bio.foto || uploadedBioFotoDataUrl || null;
  if (photoTop) {
    photoTop.innerHTML = `
      <div class="bio-photo-frame" style="width:86px; height:86px;">
        ${photoUrl ? `<img src="${photoUrl}" alt="${bio.nama_lengkap}" />` : '👤'}
      </div>
      <div>
        <strong style="font-size:1.1rem;">${bio.nama_lengkap || '-'}</strong>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:3px;">
          User ID: ${bio.user_id || '-'} • ${bio.jumlah_ikut_arisan || bio.jumlah_slot || 1} Slot Arisan
        </p>
      </div>
    `;
  }

  const items = [
    { label: 'User ID Peserta', value: bio.user_id || '-' },
    { label: 'Nama Lengkap', value: bio.nama_lengkap || '-' },
    { label: 'Nama Panggilan', value: bio.nama_panggilan || bio.panggilan || '-' },
    { label: 'Jenis Kelamin', value: bio.jenis_kelamin || '-' },
    { label: 'Tempat, Tgl Lahir', value: [bio.tempat_lahir, bio.tanggal_lahir].filter(Boolean).join(', ') || '-' },
    { label: 'Pekerjaan', value: bio.pekerjaan || '-' },
    { label: 'No. WhatsApp / HP', value: bio.no_hp || '-' },
    { label: 'Email', value: bio.email || '-' },
    { label: 'Alamat Domisili', value: bio.alamat || '-' },
    { label: 'Kota / Kabupaten', value: bio.kota || '-' },
    { label: 'Nama Ayah / Orang Tua', value: bio.nama_ayah || '-' },
    { label: 'Garis Sanad / Silsilah', value: bio.silsilah_keluarga || bio.garis_sanad || '-' },
    { label: 'Nama Pasangan', value: bio.nama_pasangan || '-' },
    { label: 'Jumlah Slot Arisan', value: `${bio.jumlah_ikut_arisan || bio.jumlah_slot || 1} Slot` },
    {
      label: 'Rekening Pencairan',
      value: [bio.nama_bank, bio.no_rekening, bio.atas_nama_rekening ? `a.n ${bio.atas_nama_rekening}` : '']
        .filter(Boolean)
        .join(' - ') || '-'
    },
    { label: 'Status Kepesertaan', value: bio.status_aktif !== false ? 'Aktif Terdaftar' : 'Nonaktif' }
  ];

  container.innerHTML = items
    .map(
      (it) => `
      <div class="summary-item">
        <div class="label">${it.label}</div>
        <div class="value">${it.value}</div>
      </div>`
    )
    .join('');
}

// ============================================================================
// LOAD DATA SEMUA MODUL & STATISTIK TRANSPARANSI (LAMPIRAN 2)
// ============================================================================
let totalPemasukanArisan = 0;
let totalPemasukanLain = 0;
let totalPengeluaranKas = 0;

async function loadAllDashboardModules() {
  await Promise.all([
    fetchAllAnggota(),
    loadPeriodeAndPemenangData(),
    loadPembayaranData(),
    loadPengeluaranData(),
    loadPengumumanData(),
    loadGaleriData()
  ]);
  populateAdminPesertaDropdowns();
  renderPembayaranTableRows();
  renderMemberGallery();
  updateQuickStatsBar();
}

function isJenisArisan(jenisBayar) {
  return String(jenisBayar || '').toLowerCase().includes('arisan');
}

function updateQuickStatsBar() {
  const elMasukArisan = document.getElementById('statTotalMasukArisan');
  const elMasukLain = document.getElementById('statTotalMasukLain');
  const elKeluar = document.getElementById('statTotalKeluar');
  const elSaldo = document.getElementById('statSaldoKas');
  const elPeriode = document.getElementById('statPeriodeAktif');
  const elTglPeriode = document.getElementById('statTanggalPeriode');
  const elPemenang = document.getElementById('statPemenangTerakhir');

  if (elMasukArisan) elMasukArisan.textContent = formatRupiah(totalPemasukanArisan);
  if (elMasukLain) elMasukLain.textContent = formatRupiah(totalPemasukanLain);
  if (elKeluar) elKeluar.textContent = formatRupiah(totalPengeluaranKas);
  if (elSaldo) elSaldo.textContent = formatRupiah(totalPemasukanArisan + totalPemasukanLain - totalPengeluaranKas);

  const activePeriode =
    cachedPeriodeList.find((p) => p.status === 'aktif') || cachedPeriodeList[0] || null;
  if (activePeriode) {
    elPeriode.textContent = `Periode #${activePeriode.periode_ke} (${activePeriode.bulan_tahun})`;
    elTglPeriode.textContent = `${activePeriode.tanggal_arisan || '-'} • ${activePeriode.tempat_arisan || ''}`;
  } else {
    elPeriode.textContent = 'Belum Disetting';
    elTglPeriode.textContent = 'Klik Menu 4 untuk setting';
  }

  const lastWinner =
    cachedPemenangList[0] ||
    cachedPeriodeList.find((p) => p.pemenang_nama) ||
    null;
  if (lastWinner) {
    elPemenang.textContent = `Pemenang: ${lastWinner.nama_pemenang || lastWinner.pemenang_nama}`;
  } else {
    elPemenang.textContent = 'Pemenang: Belum diundi';
  }
}

// ============================================================================
// MODAL TRANSPARANSI PEMASUKAN PER JENIS PEMBAYARAN (LAMPIRAN 2)
// ============================================================================
function openTransparencyModal(initialFilter = 'ALL') {
  const modal = document.getElementById('transparencyModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderTransparencyBreakdown(initialFilter);
}

function renderTransparencyBreakdown(activeFilter = 'ALL') {
  const gridEl = document.getElementById('transparencyBreakdownGrid');
  const tbodyEl = document.getElementById('transparencyTableBody');
  const titleEl = document.getElementById('transparencyModalTitle');
  if (!gridEl || !tbodyEl) return;

  // Hitung rekap per jenis_bayar dari cachedPembayaranList
  const summaryMap = {};
  let sumArisan = 0;
  let countArisan = 0;
  let sumNonArisan = 0;
  let countNonArisan = 0;

  (cachedPembayaranList || []).forEach((row) => {
    const jenis = row.jenis_bayar || 'Lainnya';
    const nom = Number(row.nominal || 0);
    if (!summaryMap[jenis]) {
      summaryMap[jenis] = { total: 0, count: 0 };
    }
    summaryMap[jenis].total += nom;
    summaryMap[jenis].count += 1;

    if (isJenisArisan(jenis)) {
      sumArisan += nom;
      countArisan += 1;
    } else {
      sumNonArisan += nom;
      countNonArisan += 1;
    }
  });

  const filterCards = [
    {
      key: 'Uang Arisan',
      title: '💰 Pemasukan Uang Arisan',
      amount: sumArisan,
      count: countArisan
    },
    {
      key: 'NON_ARISAN',
      title: '🤝 Semua Pemasukan Lainnya',
      amount: sumNonArisan,
      count: countNonArisan
    },
    ...Object.keys(summaryMap)
      .filter((k) => k !== 'Uang Arisan')
      .map((k) => ({
        key: k,
        title: `📌 ${k}`,
        amount: summaryMap[k].total,
        count: summaryMap[k].count
      })),
    {
      key: 'ALL',
      title: '📊 Total Seluruh Pemasukan',
      amount: sumArisan + sumNonArisan,
      count: (cachedPembayaranList || []).length
    }
  ];

  gridEl.innerHTML = filterCards
    .map(
      (c) => `
      <div class="jenis-filter-card ${activeFilter === c.key ? 'active' : ''}" onclick="renderTransparencyBreakdown('${c.key}')">
        <div class="jf-title">${c.title}</div>
        <div class="jf-amount">${formatRupiah(c.amount)}</div>
        <div class="jf-count">${c.count} Transaksi</div>
      </div>
    `
    )
    .join('');

  // Filter baris transaksi sesuai pilihan
  const filteredRows = (cachedPembayaranList || []).filter((r) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'NON_ARISAN') return !isJenisArisan(r.jenis_bayar);
    if (activeFilter === 'Uang Arisan') return isJenisArisan(r.jenis_bayar);
    return String(r.jenis_bayar || '') === activeFilter;
  });

  if (titleEl) {
    const labelFilter =
      activeFilter === 'ALL'
        ? 'Seluruh Pemasukan'
        : activeFilter === 'NON_ARISAN'
        ? 'Pemasukan Lainnya (Zakat, Sumbangan, Infaq, dll)'
        : activeFilter;
    titleEl.textContent = `📊 Transparansi Pemasukan: ${labelFilter}`;
  }

  if (filteredRows.length === 0) {
    tbodyEl.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Belum ada data pembayaran pada kategori ini.</td></tr>`;
    return;
  }

  tbodyEl.innerHTML = filteredRows
    .map((r, idx) => {
      const statusLower = String(r.status || 'Pending').toLowerCase();
      const isPending = statusLower === 'pending' || statusLower === 'menunggu';
      const metodeText =
        r.metode_bayar === 'Transfer Bank' || r.metode_bayar === 'Transfer'
          ? `Transfer ${r.nama_bank ? '(' + r.nama_bank + ')' : ''}`
          : 'Tunai';

      const mediaKey = `trans_${r.id || idx}`;
      if (r.bukti_bayar_url) {
        registerMediaPreview(mediaKey, `Bukti Pembayaran - ${r.nama_pembayar || 'Peserta'}`, r.bukti_bayar_url);
      }

      const buktiBtn = r.bukti_bayar_url
        ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('${mediaKey}')">🖼️ Lihat Bukti</button>`
        : `<span style="color:#94a3b8; font-size:0.8rem;">-</span>`;

      return `
        <tr>
          <td>${r.tanggal_bayar || '-'}</td>
          <td><strong>${r.nama_pembayar || '-'}</strong></td>
          <td><strong>${r.jenis_bayar || '-'}</strong></td>
          <td>${metodeText}</td>
          <td>${r.keterangan || '-'}</td>
          <td><strong>${formatRupiah(r.nominal)}</strong></td>
          <td>${buktiBtn}</td>
          <td><span class="status-pill ${isPending ? 'incomplete' : 'complete'}">${r.status || 'Pending'}</span></td>
        </tr>
      `;
    })
    .join('');
}

window.renderTransparencyBreakdown = renderTransparencyBreakdown;

const statCardPemasukanArisan = document.getElementById('statCardPemasukanArisan');
if (statCardPemasukanArisan) {
  statCardPemasukanArisan.addEventListener('click', () => openTransparencyModal('Uang Arisan'));
}

const statCardPemasukanLain = document.getElementById('statCardPemasukanLain');
if (statCardPemasukanLain) {
  statCardPemasukanLain.addEventListener('click', () => openTransparencyModal('NON_ARISAN'));
}

const closeTransparencyModalBtn = document.getElementById('closeTransparencyModalBtn');
if (closeTransparencyModalBtn) {
  closeTransparencyModalBtn.addEventListener('click', () => {
    document.getElementById('transparencyModal').classList.add('hidden');
  });
}

// ============================================================================
// MODUL 1: PEMBAYARAN (FILTER PER USER VS ROLE ADMIN & PREVIEW BUKTI)
// ============================================================================
let activeAdminFilterPeserta = 'ALL';

function isPaymentOwnedByCurrentUser(row) {
  if (!currentLoggedUser || !row) return false;
  const myUid = String(currentLoggedUser.user_id || currentLoggedUser.username || '').trim().toLowerCase();
  const myNamaUser = String(currentLoggedUser.nama_lengkap || currentLoggedUser.nama || '').trim().toLowerCase();
  const myNamaBio = String((currentBiodataRecord && currentBiodataRecord.nama_lengkap) || '').trim().toLowerCase();
  const myAnggotaId = String((currentBiodataRecord && currentBiodataRecord.id) || '').trim().toLowerCase();

  const rowUid = String(row.user_id || '').trim().toLowerCase();
  const rowNama = String(row.nama_pembayar || '').trim().toLowerCase();
  const rowAnggotaId = String(row.anggota_id || '').trim().toLowerCase();

  if (myUid && rowUid && rowUid === myUid) return true;
  if (myAnggotaId && rowAnggotaId && rowAnggotaId === myAnggotaId) return true;
  if (myNamaBio && rowNama && rowNama === myNamaBio) return true;
  if (myNamaUser && rowNama && rowNama === myNamaUser) return true;
  if (myUid && rowNama && rowNama === myUid) return true;
  return false;
}

function syncPayPeriodeByJenis() {
  const payJenis = document.getElementById('payJenis');
  const payPeriode = document.getElementById('payPeriode');
  const payPeriodeHint = document.getElementById('payPeriodeHint');
  if (!payJenis || !payPeriode) return;

  const isUangArisan = payJenis.value === 'Uang Arisan';
  payPeriode.disabled = !isUangArisan;
  if (!isUangArisan) {
    payPeriode.value = '';
    if (payPeriodeHint) {
      payPeriodeHint.textContent = '(Nonaktif - Hanya untuk Uang Arisan)';
      payPeriodeHint.style.color = '#64748b';
    }
  } else {
    if (payPeriodeHint) {
      payPeriodeHint.textContent = '(Aktif untuk Uang Arisan)';
      payPeriodeHint.style.color = 'var(--primary)';
    }
  }
}

const payJenisSelect = document.getElementById('payJenis');
if (payJenisSelect) {
  payJenisSelect.addEventListener('change', syncPayPeriodeByJenis);
}

async function updatePaymentStatusByAdmin(paymentId, newStatus) {
  if (!isUserAdmin()) return;
  try {
    await adaptiveSupabaseWrite(
      TABLES.PEMBAYARAN,
      {
        status: newStatus,
        diverifikasi_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin'
      },
      `?id=eq.${encodeURIComponent(paymentId)}`
    );
    await loadPembayaranData();
    updateQuickStatsBar();
    showGlobalAlert(`✅ Status pembayaran berhasil diperbarui menjadi <b>${newStatus}</b>!`, 'success');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

window.approvePaymentStatus = (paymentId) => updatePaymentStatusByAdmin(paymentId, 'disetujui');
window.updatePaymentStatusByAdmin = updatePaymentStatusByAdmin;

function populateAdminPesertaDropdowns() {
  const adminFlag = isUserAdmin();
  const filterSelect = document.getElementById('filterPembayaranPeserta');
  const adminFilterBox = document.getElementById('adminFilterPesertaBox');
  const payAdminWrap = document.getElementById('payAdminSelectWrap');
  const paySelectAdmin = document.getElementById('paySelectPesertaAdmin');
  const payNamaInput = document.getElementById('payNama');
  const payNamaRoleHint = document.getElementById('payNamaRoleHint');
  const titleRiwayat = document.getElementById('titleRiwayatPembayaran');
  const subtitleRiwayat = document.getElementById('subtitleRiwayatPembayaran');
  const adminBioBox = document.getElementById('adminBiodataFilterBox');
  const adminSelectBio = document.getElementById('adminSelectBioPeserta');

  const myDisplayName =
    (currentBiodataRecord && currentBiodataRecord.nama_lengkap) ||
    (currentLoggedUser && (currentLoggedUser.nama_lengkap || currentLoggedUser.nama || currentLoggedUser.user_id)) ||
    '';

  if (!adminFlag) {
    // Mode User Peserta: Hanya menampilkan data milik User yang login
    if (adminFilterBox) adminFilterBox.classList.add('hidden');
    if (payAdminWrap) payAdminWrap.classList.add('hidden');
    if (adminBioBox) adminBioBox.classList.add('hidden');
    if (payNamaInput) {
      payNamaInput.value = myDisplayName;
      payNamaInput.readOnly = true;
    }
    if (payNamaRoleHint) {
      payNamaRoleHint.textContent = '(Terkunci sesuai Akun Peserta Login)';
    }
    if (titleRiwayat) {
      titleRiwayat.textContent = `Daftar Riwayat Pembayaran Saya (${myDisplayName || 'Peserta'})`;
    }
    if (subtitleRiwayat) {
      subtitleRiwayat.textContent = 'Menampilkan khusus riwayat pembayaran milik akun Anda.';
    }
    return;
  }

  // Mode Role Admin: Bisa pilih & filter berdasarkan Peserta
  if (adminFilterBox) adminFilterBox.classList.remove('hidden');
  if (payAdminWrap) payAdminWrap.classList.remove('hidden');
  if (adminBioBox) adminBioBox.classList.remove('hidden');
  if (payNamaInput) {
    payNamaInput.readOnly = false;
  }
  if (payNamaRoleHint) {
    payNamaRoleHint.textContent = '(Mode Admin: Pilih Peserta dari daftar atau ketik nama)';
  }
  if (titleRiwayat) {
    titleRiwayat.textContent = 'Daftar Riwayat Pembayaran Peserta (Mode Admin)';
  }
  if (subtitleRiwayat) {
    subtitleRiwayat.textContent = 'Admin dapat memfilter riwayat pembayaran berdasarkan Peserta serta menyetujui bukti bayar.';
  }

  // Kumpulkan daftar unik nama peserta dari adnan_DataAnggota & adnan_Pembayaran
  const pesertaMap = new Map();
  (cachedAnggotaList || []).forEach((a) => {
    const nama = String(a.nama_lengkap || '').trim();
    if (nama) {
      pesertaMap.set(nama.toLowerCase(), {
        nama,
        user_id: a.user_id || '',
        anggota_id: a.id || ''
      });
    }
  });
  (cachedPembayaranList || []).forEach((p) => {
    const nama = String(p.nama_pembayar || '').trim();
    if (nama && !pesertaMap.has(nama.toLowerCase())) {
      pesertaMap.set(nama.toLowerCase(), {
        nama,
        user_id: p.user_id || '',
        anggota_id: p.anggota_id || ''
      });
    }
  });

  const sortedPeserta = Array.from(pesertaMap.values()).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  if (filterSelect) {
    const prevVal = filterSelect.value || activeAdminFilterPeserta || 'ALL';
    filterSelect.innerHTML = [
      `<option value="ALL">-- Semua Peserta Arisan (${(cachedPembayaranList || []).length} Transaksi) --</option>`,
      ...sortedPeserta.map((p) => {
        const count = (cachedPembayaranList || []).filter(
          (r) => String(r.nama_pembayar || '').trim().toLowerCase() === p.nama.toLowerCase()
        ).length;
        return `<option value="${p.nama}">${p.nama} (${count} Transaksi)</option>`;
      })
    ].join('');
    filterSelect.value = Array.from(filterSelect.options).some((o) => o.value === prevVal) ? prevVal : 'ALL';
    activeAdminFilterPeserta = filterSelect.value;
  }

  if (paySelectAdmin) {
    paySelectAdmin.innerHTML = [
      '<option value="">-- Pilih Berdasarkan Peserta (Mode Admin) --</option>',
      ...sortedPeserta.map(
        (p) =>
          `<option value="${p.nama}" data-uid="${p.user_id || ''}" data-anggota-id="${p.anggota_id || ''}">${p.nama}${p.user_id ? ' (ID: ' + p.user_id + ')' : ''}</option>`
      )
    ].join('');
  }

  if (adminSelectBio) {
    const currentBioId = currentBiodataRecord && currentBiodataRecord.id ? String(currentBiodataRecord.id) : '';
    adminSelectBio.innerHTML = [
      '<option value="">-- Pilih Peserta (adnan_DataAnggota) --</option>',
      ...(cachedAnggotaList || []).map(
        (a) =>
          `<option value="${a.id}" ${String(a.id) === currentBioId ? 'selected' : ''}>${a.nama_lengkap} (${a.user_id || 'Tanpa ID'})</option>`
      )
    ].join('');
  }
}

const filterPembayaranPesertaEl = document.getElementById('filterPembayaranPeserta');
if (filterPembayaranPesertaEl) {
  filterPembayaranPesertaEl.addEventListener('change', () => {
    activeAdminFilterPeserta = filterPembayaranPesertaEl.value || 'ALL';
    renderPembayaranTableRows();
  });
}

const paySelectPesertaAdminEl = document.getElementById('paySelectPesertaAdmin');
if (paySelectPesertaAdminEl) {
  paySelectPesertaAdminEl.addEventListener('change', () => {
    const chosenName = paySelectPesertaAdminEl.value;
    if (chosenName) {
      const payNamaInput = document.getElementById('payNama');
      if (payNamaInput) payNamaInput.value = chosenName;
    }
  });
}

const adminSelectBioPesertaEl = document.getElementById('adminSelectBioPeserta');
if (adminSelectBioPesertaEl) {
  adminSelectBioPesertaEl.addEventListener('change', () => {
    if (!isUserAdmin()) return;
    const selectedId = adminSelectBioPesertaEl.value;
    if (!selectedId) return;
    const foundBio = (cachedAnggotaList || []).find((a) => String(a.id) === String(selectedId));
    if (foundBio) {
      currentBiodataRecord = foundBio;
      populateBiodataForm(currentLoggedUser, foundBio);
      renderBiodataSummary(foundBio);
      showBiodataAlert(`👑 Mode Admin: Menampilkan Biodata Peserta <b>${foundBio.nama_lengkap}</b>.`, 'success');
    }
  });
}

function renderPembayaranTableRows() {
  const tbody = document.getElementById('tableBodyPembayaran');
  const summaryBadge = document.getElementById('filterPembayaranSummary');
  if (!tbody) return;

  const adminFlag = isUserAdmin();

  // Jika Login User Peserta -> HANYA tampilkan data milik User tersebut
  // Jika Login Role Admin -> tampilkan semua atau sesuai pilihan dropdown Peserta
  const rowsToDisplay = (cachedPembayaranList || []).filter((r) => {
    if (!adminFlag) {
      return isPaymentOwnedByCurrentUser(r);
    }
    if (!activeAdminFilterPeserta || activeAdminFilterPeserta === 'ALL') {
      return true;
    }
    return String(r.nama_pembayar || '').trim().toLowerCase() === activeAdminFilterPeserta.trim().toLowerCase();
  });

  if (summaryBadge && adminFlag) {
    const sumFiltered = rowsToDisplay.reduce((acc, r) => acc + Number(r.nominal || 0), 0);
    summaryBadge.textContent = `${rowsToDisplay.length} Data • Total: ${formatRupiah(sumFiltered)}`;
  }

  if (rowsToDisplay.length === 0) {
    const emptyMsg = adminFlag
      ? 'Belum ada transaksi pembayaran untuk filter peserta yang dipilih.'
      : 'Belum ada riwayat pembayaran atas nama akun Anda.';
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">${emptyMsg}</td></tr>`;
    return;
  }

  tbody.innerHTML = rowsToDisplay
    .map((r, idx) => {
      const metodeText =
        r.metode_bayar === 'Transfer Bank' || r.metode_bayar === 'Transfer'
          ? `Transfer ${r.nama_bank ? '(' + r.nama_bank + ')' : ''}`
          : 'Tunai (Cash)';

      const mediaKey = `pay_${r.id || idx}`;
      if (r.bukti_bayar_url) {
        registerMediaPreview(mediaKey, `Bukti Pembayaran - ${r.nama_pembayar || 'Peserta'} (${r.kode_transaksi || ''})`, r.bukti_bayar_url);
      }

      const buktiBtn = r.bukti_bayar_url
        ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('${mediaKey}')">🖼️ Lihat Bukti</button>`
        : `<span style="color:#94a3b8; font-size:0.8rem;">Tidak ada</span>`;

      const statusRaw = r.status || 'Pending';
      const statusLower = String(statusRaw).toLowerCase();
      const isPending = statusLower === 'pending' || statusLower === 'menunggu';

      const statusCell = `
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span class="status-pill ${isPending ? 'incomplete' : 'complete'}">
            ${isPending ? '⏳ Pending' : '✓ ' + statusRaw}
          </span>
          ${
            adminFlag && isPending
              ? `<button type="button" class="btn-primary btn-sm" onclick="approvePaymentStatus('${r.id}')">✓ Setujui</button>`
              : ''
          }
          ${
            adminFlag && !isPending
              ? `<button type="button" class="btn-secondary btn-sm" style="padding:4px 8px; font-size:0.74rem;" onclick="updatePaymentStatusByAdmin('${r.id}', 'Pending')" title="Kembalikan status ke Pending">↺ Pending</button>`
              : ''
          }
        </div>
      `;

      return `
        <tr>
          <td>${r.tanggal_bayar || '-'}</td>
          <td><code>${r.kode_transaksi || 'TX-' + (idx + 1)}</code></td>
          <td><strong>${r.nama_pembayar || '-'}</strong><br><small style="color:#64748b;">${r.keterangan || ''}</small></td>
          <td>${r.jenis_bayar || 'Uang Arisan'}</td>
          <td>${metodeText}</td>
          <td><strong>${formatRupiah(r.nominal)}</strong></td>
          <td>${buktiBtn}</td>
          <td>${statusCell}</td>
        </tr>
      `;
    })
    .join('');
}

async function loadPembayaranData() {
  const tbody = document.getElementById('tableBodyPembayaran');
  if (!tbody) return;

  try {
    const res = await fetch(`${SUPABASE_REST_URL}/${TABLES.PEMBAYARAN}?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (!res.ok) throw new Error('Gagal memuat data pembayaran.');
    const rows = await res.json();
    cachedPembayaranList = rows || [];

    // Hitung terpisah untuk Transparansi Kas Keluarga: Pemasukan Uang Arisan vs Pemasukan Lainnya
    totalPemasukanArisan = 0;
    totalPemasukanLain = 0;
    cachedPembayaranList.forEach((r) => {
      const nom = Number(r.nominal || 0);
      if (isJenisArisan(r.jenis_bayar)) {
        totalPemasukanArisan += nom;
      } else {
        totalPemasukanLain += nom;
      }
    });

    populateAdminPesertaDropdowns();
    renderPembayaranTableRows();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
  }
}

// Toggle Bank Dropdown saat Metode Pembayaran berubah
const payMetodeSelect = document.getElementById('payMetode');
if (payMetodeSelect) {
  payMetodeSelect.addEventListener('change', () => {
    const isTransfer = payMetodeSelect.value === 'Transfer Bank';
    document.getElementById('payBankGroup').classList.toggle('hidden', !isTransfer);
    document.getElementById('payRekeningGroup').classList.toggle('hidden', !isTransfer);
  });
}

// Preview Upload Bukti Pembayaran (Gambar maupun PDF langsung bisa dipratinjau)
const payBuktiFileInput = document.getElementById('payBuktiFile');
if (payBuktiFileInput) {
  payBuktiFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const previewBox = document.getElementById('payBuktiPreview');
    if (!file) {
      uploadedPayBuktiDataUrl = null;
      previewBox.innerHTML = '';
      return;
    }
    uploadedPayBuktiDataUrl = await readFileAsDataURL(file);
    registerMediaPreview('draft_pay_bukti', `Pratinjau Bukti: ${file.name}`, uploadedPayBuktiDataUrl);
    if (file.type.startsWith('image/')) {
      previewBox.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
          <img src="${uploadedPayBuktiDataUrl}" alt="Preview Bukti Bayar" style="cursor:pointer;" onclick="openMediaByKey('draft_pay_bukti')" />
          <button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('draft_pay_bukti')">🖼️ Lihat Bukti Ukuran Penuh</button>
        </div>
      `;
    } else {
      previewBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:center;">
          <span style="color:var(--primary); font-weight:600;">📄 File PDF Bukti Siap Diunggah: ${file.name}</span>
          <button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('draft_pay_bukti')">🖼️ Lihat / Pratinjau Bukti PDF</button>
        </div>
      `;
    }
  });
}

// Submit Form Pembayaran (Default Status: Pending)
const formPembayaran = document.getElementById('formPembayaran');
if (formPembayaran) {
  formPembayaran.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitPembayaran');
    const jenisBayar = document.getElementById('payJenis').value;
    const metode = document.getElementById('payMetode').value;
    const namaBank = document.getElementById('payNamaBank').value;

    if (metode === 'Transfer Bank' && !namaBank) {
      showGlobalAlert('Silakan pilih Bank Tujuan / Pengirim pada dropdown Bank.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Menyimpan Pembayaran...';

    try {
      const kode = 'TX-ARS-' + Math.floor(1000 + Math.random() * 9000);
      const selectedPeriodeId =
        jenisBayar === 'Uang Arisan' ? document.getElementById('payPeriode').value || null : null;
      const noRek = document.getElementById('payNoRekening').value.trim();
      const ketInput = document.getElementById('payKeterangan').value.trim();
      const fullKeterangan = [
        ketInput,
        metode === 'Transfer Bank' && namaBank ? `Bank: ${namaBank}` : '',
        noRek ? `Rek: ${noRek}` : ''
      ]
        .filter(Boolean)
        .join(' | ');

      const inputNamaPembayar = document.getElementById('payNama').value.trim();
      // Cari apakah nama pembayar cocok dengan anggota di adnan_DataAnggota
      const matchedAnggota = (cachedAnggotaList || []).find(
        (a) => String(a.nama_lengkap || '').trim().toLowerCase() === inputNamaPembayar.toLowerCase()
      );
      const targetUserId = isUserAdmin()
        ? (matchedAnggota && matchedAnggota.user_id) || (currentLoggedUser ? currentLoggedUser.user_id : null)
        : currentLoggedUser
        ? currentLoggedUser.user_id
        : null;
      const targetAnggotaId = isUserAdmin()
        ? (matchedAnggota && matchedAnggota.id) || null
        : currentBiodataRecord && currentBiodataRecord.id
        ? currentBiodataRecord.id
        : null;

      await adaptiveSupabaseWrite(TABLES.PEMBAYARAN, {
        kode_transaksi: kode,
        anggota_id: targetAnggotaId,
        arisan_id: selectedPeriodeId,
        user_id: targetUserId,
        nama_pembayar: inputNamaPembayar,
        tanggal_bayar: document.getElementById('payTanggal').value || todayISO(),
        jenis_bayar: jenisBayar,
        nominal: Number(document.getElementById('payNominal').value || 0),
        metode_bayar: metode === 'Transfer Bank' ? 'Transfer' : 'Tunai',
        nama_bank: metode === 'Transfer Bank' ? namaBank : null,
        no_rekening_pengirim: metode === 'Transfer Bank' ? noRek : null,
        bukti_bayar_url: uploadedPayBuktiDataUrl,
        keterangan: fullKeterangan,
        status: 'Pending'
      });

      formPembayaran.reset();
      document.getElementById('payTanggal').value = todayISO();
      document.getElementById('payStatus').value = 'Pending';
      if (!isUserAdmin() && currentBiodataRecord) {
        document.getElementById('payNama').value = currentBiodataRecord.nama_lengkap || '';
      }
      syncPayPeriodeByJenis();
      uploadedPayBuktiDataUrl = null;
      document.getElementById('payBuktiPreview').innerHTML = '';

      await loadPembayaranData();
      updateQuickStatsBar();
      showGlobalAlert('✅ Data pembayaran berhasil disimpan dengan status <b>Pending</b>!', 'success');
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Pembayaran (Status: Pending)';
    }
  });
}

// ============================================================================
// MODUL PENGELUARAN / AKUNTANSI (HANYA MUNCUL UNTUK USER ADMIN)
// ============================================================================
async function loadPengeluaranData() {
  const tbody = document.getElementById('tableBodyPengeluaran');
  if (!tbody) return;

  try {
    const res = await fetch(`${SUPABASE_REST_URL}/${TABLES.PENGELUARAN}?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (!res.ok) throw new Error('Gagal memuat data pengeluaran.');
    const rows = await res.json();

    totalPengeluaranKas = (rows || []).reduce((acc, r) => acc + Number(r.nominal || 0), 0);

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Belum ada pencatatan pengeluaran kas.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((r, idx) => {
        const notaUrl = r.bukti_url || r.nota_url || null;
        const mediaKey = `exp_${r.id || idx}`;
        if (notaUrl) {
          registerMediaPreview(mediaKey, `Nota Pengeluaran - ${r.kategori || ''}`, notaUrl);
        }
        const notaBtn = notaUrl
          ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('${mediaKey}')">🧾 Lihat Nota</button>`
          : `<span style="color:#94a3b8; font-size:0.8rem;">-</span>`;

        return `
          <tr>
            <td>${r.tanggal_pengeluaran || r.tanggal || '-'}</td>
            <td><code>${r.kode_pengeluaran || 'EXP-' + (idx + 1)}</code></td>
            <td><strong>${r.kategori || 'Pengeluaran'}</strong></td>
            <td>${r.deskripsi || r.nama_pengeluaran || '-'} ${r.penerima ? '<br><small>Penerima: ' + r.penerima + '</small>' : ''}</td>
            <td>${r.metode_bayar || 'Tunai'} ${r.nama_bank ? '(' + r.nama_bank + ')' : ''}</td>
            <td><strong style="color:#dc2626;">${formatRupiah(r.nominal)}</strong></td>
            <td>${notaBtn}</td>
            <td>${r.dicatat_oleh || 'Admin'}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
  }
}

const expMetodeSelect = document.getElementById('expMetode');
if (expMetodeSelect) {
  expMetodeSelect.addEventListener('change', () => {
    const isTransfer = expMetodeSelect.value === 'Transfer Bank';
    document.getElementById('expBankGroup').classList.toggle('hidden', !isTransfer);
  });
}

const expBuktiFileInput = document.getElementById('expBuktiFile');
if (expBuktiFileInput) {
  expBuktiFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const previewBox = document.getElementById('expBuktiPreview');
    if (!file) {
      uploadedExpBuktiDataUrl = null;
      previewBox.innerHTML = '';
      return;
    }
    uploadedExpBuktiDataUrl = await readFileAsDataURL(file);
    if (file.type.startsWith('image/')) {
      previewBox.innerHTML = `<img src="${uploadedExpBuktiDataUrl}" alt="Preview Nota" />`;
    } else {
      previewBox.innerHTML = `<span style="color:var(--primary); font-weight:600;">📄 Nota Siap Diunggah: ${file.name}</span>`;
    }
  });
}

const formPengeluaran = document.getElementById('formPengeluaran');
if (formPengeluaran) {
  formPengeluaran.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isUserAdmin()) {
      showGlobalAlert('Hanya Admin yang dapat menginput Pengeluaran / Akuntansi.', 'error');
      return;
    }

    const btn = document.getElementById('btnSubmitPengeluaran');
    btn.disabled = true;
    btn.textContent = 'Menyimpan Pengeluaran...';

    try {
      const kode = 'EXP-' + Math.floor(1000 + Math.random() * 9000);
      const kategori = document.getElementById('expKategori').value;
      const deskripsi = document.getElementById('expDeskripsi').value.trim();

      await adaptiveSupabaseWrite(TABLES.PENGELUARAN, {
        kode_pengeluaran: kode,
        tanggal_pengeluaran: document.getElementById('expTanggal').value || todayISO(),
        kategori: kategori,
        nama_pengeluaran: kategori,
        deskripsi: deskripsi,
        nominal: Number(document.getElementById('expNominal').value || 0),
        penerima: document.getElementById('expPenerima').value.trim() || null,
        metode_bayar: document.getElementById('expMetode').value,
        nama_bank: document.getElementById('expMetode').value === 'Transfer Bank' ? document.getElementById('expNamaBank').value : null,
        bukti_url: uploadedExpBuktiDataUrl,
        dicatat_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin'
      });

      formPengeluaran.reset();
      document.getElementById('expTanggal').value = todayISO();
      uploadedExpBuktiDataUrl = null;
      document.getElementById('expBuktiPreview').innerHTML = '';

      await loadPengeluaranData();
      updateQuickStatsBar();
      showGlobalAlert('✅ Pengeluaran akuntansi berhasil dicatat ke tabel <b>adnan_Pengeluaran</b>!', 'success');
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Catat Pengeluaran (Admin)';
    }
  });
}

// ============================================================================
// MODUL PENGUMUMAN & DOKUMEN PDF (adnan_Pengumuman)
// ============================================================================
async function loadPengumumanData() {
  const container = document.getElementById('announcementListContainer');
  if (!container) return;

  try {
    const res = await fetch(`${SUPABASE_REST_URL}/${TABLES.PENGUMUMAN}?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (!res.ok) throw new Error('Gagal memuat pengumuman.');
    const rows = await res.json();

    if (!rows || rows.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Belum ada pengumuman yang diterbitkan.</p>`;
      return;
    }

    container.innerHTML = rows
      .map((r, idx) => {
        const pdfUrl = r.file_pdf_url || r.lampiran_url || null;
        const pdfName = r.file_pdf_nama || 'Dokumen-Pengumuman.pdf';
        const mediaKey = `ann_${r.id || idx}`;
        if (pdfUrl) {
          registerMediaPreview(mediaKey, r.judul || 'Dokumen Pengumuman', pdfUrl);
        }
        const pdfActions = pdfUrl
          ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
               <button type="button" class="btn-primary btn-sm" onclick="openMediaByKey('${mediaKey}')">📄 Buka / Pratinjau PDF</button>
               <a href="${pdfUrl}" download="${pdfName}" class="btn-secondary btn-sm">⬇️ Unduh PDF (${pdfName})</a>
             </div>`
          : '';

        return `
          <div class="announcement-card">
            <div class="ann-head">
              <h5>📢 ${r.judul || 'Pengumuman Keluarga Adnan'}</h5>
              <span class="gallery-badge">${r.kategori || 'Pengumuman'} • ${r.tanggal_pengumuman || (r.created_at || '').slice(0, 10)}</span>
            </div>
            <p>${r.isi_pengumuman || r.isi || ''}</p>
            ${pdfActions}
          </div>
        `;
      })
      .join('');
  } catch (err) {
    container.innerHTML = `<p style="color:#dc2626;">${err.message}</p>`;
  }
}

const annPdfFileInput = document.getElementById('annPdfFile');
if (annPdfFileInput) {
  annPdfFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const infoEl = document.getElementById('annPdfInfo');
    if (!file) {
      uploadedAnnPdfDataUrl = null;
      uploadedAnnPdfName = null;
      infoEl.textContent = '';
      return;
    }
    uploadedAnnPdfName = file.name;
    uploadedAnnPdfDataUrl = await readFileAsDataURL(file);
    infoEl.textContent = `📄 Dokumen PDF siap dilampirkan: ${file.name} (${Math.round(file.size / 1024)} KB)`;
  });
}

const formPengumuman = document.getElementById('formPengumuman');
if (formPengumuman) {
  formPengumuman.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isUserAdmin()) {
      showGlobalAlert('Hanya Role Admin yang dapat membuat pengumuman baru atau mengunggah dokumen PDF.', 'error');
      return;
    }
    const btn = document.getElementById('btnSubmitPengumuman');
    btn.disabled = true;
    btn.textContent = 'Menerbitkan...';

    try {
      const judul = document.getElementById('annJudul').value.trim();
      const isi = document.getElementById('annIsi').value.trim();

      await adaptiveSupabaseWrite(TABLES.PENGUMUMAN, {
        judul: judul,
        kategori: document.getElementById('annKategori').value,
        isi: isi,
        isi_pengumuman: isi,
        tanggal_pengumuman: todayISO(),
        file_pdf_url: uploadedAnnPdfDataUrl,
        file_pdf_nama: uploadedAnnPdfName,
        dibuat_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin',
        status_aktif: true
      });

      formPengumuman.reset();
      uploadedAnnPdfDataUrl = null;
      uploadedAnnPdfName = null;
      document.getElementById('annPdfInfo').textContent = '';

      await loadPengumumanData();
      showGlobalAlert('✅ Pengumuman berhasil diterbitkan!', 'success');
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📢 Terbitkan Pengumuman';
    }
  });
}

// ============================================================================
// MODUL GALERI FOTO KEGIATAN (adnan_Galeri)
// ============================================================================
async function loadGaleriData() {
  const container = document.getElementById('photoGalleryContainer');
  if (!container) return;

  try {
    const res = await fetch(`${SUPABASE_REST_URL}/${TABLES.GALERI}?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (!res.ok) throw new Error('Gagal memuat galeri foto kegiatan.');
    const rows = await res.json();

    if (!rows || rows.length === 0) {
      container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">Belum ada foto kegiatan yang diunggah.</p>`;
      return;
    }

    container.innerHTML = rows
      .map((r, idx) => {
        const title = r.judul_kegiatan || r.judul || 'Kegiatan Keluarga Adnan';
        const imgUrl = r.foto_url || '';
        const mediaKey = `gal_${r.id || idx}`;
        if (imgUrl) {
          registerMediaPreview(mediaKey, title, imgUrl);
        }
        return `
          <div class="photo-card">
            <img src="${imgUrl}" alt="${title}" onclick="openMediaByKey('${mediaKey}')" />
            <div class="photo-card-body">
              <h5>${title}</h5>
              <div class="meta">📅 ${r.tanggal_kegiatan || (r.created_at || '').slice(0, 10)} ${r.lokasi ? '• 📍 ' + r.lokasi : ''}</div>
              <p>${r.deskripsi || ''}</p>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    container.innerHTML = `<p style="color:#dc2626;">${err.message}</p>`;
  }
}

const galFotoFileInput = document.getElementById('galFotoFile');
if (galFotoFileInput) {
  galFotoFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const previewBox = document.getElementById('galFotoPreview');
    if (!file) {
      uploadedGalFotoDataUrl = null;
      previewBox.innerHTML = '';
      return;
    }
    uploadedGalFotoDataUrl = await readFileAsDataURL(file);
    previewBox.innerHTML = `<img src="${uploadedGalFotoDataUrl}" alt="Preview Foto Kegiatan" />`;
  });
}

const formGaleri = document.getElementById('formGaleri');
if (formGaleri) {
  formGaleri.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isUserAdmin()) {
      showGlobalAlert('Hanya Role Admin yang dapat mengunggah foto kegiatan baru.', 'error');
      return;
    }
    if (!uploadedGalFotoDataUrl) {
      showGlobalAlert('Silakan pilih foto kegiatan terlebih dahulu.', 'error');
      return;
    }

    const btn = document.getElementById('btnSubmitGaleri');
    btn.disabled = true;
    btn.textContent = 'Mengunggah Foto...';

    try {
      const judul = document.getElementById('galJudul').value.trim();
      await adaptiveSupabaseWrite(TABLES.GALERI, {
        judul: judul,
        judul_kegiatan: judul,
        tanggal_kegiatan: document.getElementById('galTanggal').value || todayISO(),
        lokasi: document.getElementById('galLokasi').value.trim() || null,
        deskripsi: document.getElementById('galDeskripsi').value.trim() || null,
        foto_url: uploadedGalFotoDataUrl,
        diunggah_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin'
      });

      formGaleri.reset();
      uploadedGalFotoDataUrl = null;
      document.getElementById('galFotoPreview').innerHTML = '';

      await loadGaleriData();
      showGlobalAlert('✅ Foto kegiatan berhasil ditambahkan ke Galeri!', 'success');
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📸 Unggah ke Galeri Kegiatan';
    }
  });
}

// ============================================================================
// MODUL SETTING PERIODE ARISAN & PEMENANG ARISAN (FORM KHUSUS ADMIN)
// ============================================================================
async function loadPeriodeAndPemenangData() {
  const tbodyPeriode = document.getElementById('tableBodyPeriode');
  const tbodyPemenang = document.getElementById('tableBodyPemenang');
  const payPeriodeSelect = document.getElementById('payPeriode');
  const winPeriodeSelect = document.getElementById('winPeriode');
  const winAnggotaSelect = document.getElementById('winAnggota');

  try {
    const resPeriode = await fetch(`${SUPABASE_REST_URL}/${TABLES.ARISAN}?select=*&order=periode_ke.asc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    cachedPeriodeList = resPeriode.ok ? await resPeriode.json() : [];

    const periodeOptions = [
      '<option value="">-- Pilih Periode Arisan --</option>',
      ...cachedPeriodeList.map(
        (p) => `<option value="${p.id}">Periode Ke-${p.periode_ke} (${p.bulan_tahun})</option>`
      )
    ].join('');

    if (payPeriodeSelect) payPeriodeSelect.innerHTML = periodeOptions;
    if (winPeriodeSelect) winPeriodeSelect.innerHTML = periodeOptions;
    syncPayPeriodeByJenis();

    const nextPeriodeNum =
      cachedPeriodeList.length > 0
        ? Math.max(...cachedPeriodeList.map((p) => Number(p.periode_ke || 0))) + 1
        : 1;
    const perNomorEl = document.getElementById('perNomor');
    if (perNomorEl) perNomorEl.value = nextPeriodeNum;

    if (tbodyPeriode) {
      if (cachedPeriodeList.length === 0) {
        tbodyPeriode.innerHTML = `<tr><td colspan="7" style="text-align:center;">Belum ada jadwal periode arisan.</td></tr>`;
      } else {
        tbodyPeriode.innerHTML = cachedPeriodeList
          .map(
            (p) => `
            <tr>
              <td><strong>Periode Ke-${p.periode_ke}</strong></td>
              <td>${p.bulan_tahun || '-'}</td>
              <td>${p.tanggal_arisan || '-'}</td>
              <td>${p.tempat_arisan || '-'}</td>
              <td>${formatRupiah(p.iuran_per_slot)}</td>
              <td>${p.pemenang_nama ? '🏆 <strong>' + p.pemenang_nama + '</strong>' : '<span style="color:#64748b;">Belum diundi</span>'}</td>
              <td><span class="status-pill ${p.status === 'aktif' ? 'complete' : 'incomplete'}">${p.status || 'aktif'}</span></td>
            </tr>`
          )
          .join('');
      }
    }

    if (winAnggotaSelect) {
      winAnggotaSelect.innerHTML = [
        '<option value="">-- Pilih Anggota Pemenang --</option>',
        ...cachedAnggotaList.map(
          (a) =>
            `<option value="${a.id}" data-nama="${a.nama_lengkap}">${a.nama_lengkap} (${a.jumlah_slot || a.jumlah_ikut_arisan || 1} Slot ${a.sudah_menang ? '• Sudah Pernah Menang' : ''})</option>`
        )
      ].join('');
    }

    let winnerRows = [];
    const resWin = await fetch(`${SUPABASE_REST_URL}/${TABLES.PEMENANG}?select=*&order=periode_ke.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (resWin.ok) {
      winnerRows = await resWin.json();
    }

    cachedPeriodeList.forEach((p) => {
      if (p.pemenang_nama && !winnerRows.some((w) => Number(w.periode_ke) === Number(p.periode_ke))) {
        winnerRows.push({
          periode_ke: p.periode_ke,
          bulan_tahun: p.bulan_tahun,
          nama_pemenang: p.pemenang_nama,
          tanggal_undi: p.tanggal_arisan,
          nominal_diterima: p.total_diterima || 0,
          metode_pencairan: 'Transfer / Tunai',
          keterangan: p.keterangan || 'Tercatat di Periode Arisan'
        });
      }
    });

    cachedPemenangList = winnerRows;

    if (tbodyPemenang) {
      if (winnerRows.length === 0) {
        tbodyPemenang.innerHTML = `<tr><td colspan="7" style="text-align:center;">Belum ada pemenang arisan yang ditetapkan.</td></tr>`;
      } else {
        tbodyPemenang.innerHTML = winnerRows
          .map(
            (w) => `
            <tr>
              <td><strong>Periode Ke-${w.periode_ke || '-'}</strong></td>
              <td>${w.bulan_tahun || '-'}</td>
              <td>🏆 <strong>${w.nama_pemenang || '-'}</strong></td>
              <td>${w.tanggal_undi || '-'}</td>
              <td><strong>${formatRupiah(w.nominal_diterima)}</strong></td>
              <td>${w.metode_pencairan || '-'} ${w.nama_bank ? '(' + w.nama_bank + ')' : ''}</td>
              <td>${w.keterangan || '-'}</td>
            </tr>`
          )
          .join('');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

const formPeriodeArisan = document.getElementById('formPeriodeArisan');
if (formPeriodeArisan) {
  formPeriodeArisan.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isUserAdmin()) {
      showGlobalAlert('Hanya Role Admin yang dapat menambah atau mengatur Periode Arisan Baru.', 'error');
      return;
    }
    const btn = document.getElementById('btnSubmitPeriode');
    btn.disabled = true;
    btn.textContent = 'Menyimpan Periode...';

    try {
      const periodeKe = Number(document.getElementById('perNomor').value || 1);
      const bulanTahun = document.getElementById('perBulanTahun').value.trim();
      const tanggalArisan = document.getElementById('perTanggal').value;
      const iuran = Number(document.getElementById('perIuran').value || 100000);
      const tempat = document.getElementById('perTempat').value.trim();
      const status = document.getElementById('perStatus').value;
      const keterangan = document.getElementById('perKeterangan').value.trim();

      await adaptiveSupabaseWrite(TABLES.ARISAN, {
        periode_ke: periodeKe,
        bulan_tahun: bulanTahun,
        tanggal_arisan: tanggalArisan,
        tempat_arisan: tempat,
        iuran_per_slot: iuran,
        status: status,
        keterangan: keterangan
      });

      try {
        await adaptiveSupabaseWrite(TABLES.PERIODE, {
          nama_periode: `Periode Ke-${periodeKe} (${bulanTahun})`,
          periode_ke: periodeKe,
          bulan_tahun: bulanTahun,
          tanggal_arisan: tanggalArisan,
          tempat_arisan: tempat,
          iuran_per_slot: iuran,
          status: status,
          keterangan: keterangan
        });
      } catch (_) { }

      formPeriodeArisan.reset();
      await loadPeriodeAndPemenangData();
      updateQuickStatsBar();
      showGlobalAlert(`✅ Setting Periode Ke-${periodeKe} (${bulanTahun}) berhasil disimpan!`, 'success');
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Setting Periode';
    }
  });
}

const btnKocokUndian = document.getElementById('btnKocokUndian');
if (btnKocokUndian) {
  btnKocokUndian.addEventListener('click', () => {
    if (!isUserAdmin()) {
      showGlobalAlert('Hanya Role Admin yang dapat melakukan kocok undian pemenang arisan.', 'error');
      return;
    }
    const kandidat = cachedAnggotaList.filter((a) => !a.sudah_menang && a.status_aktif !== false);
    const pool = kandidat.length > 0 ? kandidat : cachedAnggotaList;
    if (pool.length === 0) {
      showGlobalAlert('Belum ada data anggota di adnan_DataAnggota untuk diundi.', 'error');
      return;
    }
    const randomWinner = pool[Math.floor(Math.random() * pool.length)];
    document.getElementById('winAnggota').value = randomWinner.id;
    showGlobalAlert(`🎉 Hasil Kocok Undian memilih: <b>${randomWinner.nama_lengkap}</b>! Silakan klik "Tetapkan Pemenang Arisan" untuk menyimpan.`, 'success');
  });
}

const formPemenangArisan = document.getElementById('formPemenangArisan');
if (formPemenangArisan) {
  formPemenangArisan.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isUserAdmin()) {
      showGlobalAlert('Hanya Role Admin yang dapat menetapkan Pemenang Arisan.', 'error');
      return;
    }
    const btn = document.getElementById('btnSubmitPemenang');
    const periodeId = document.getElementById('winPeriode').value;
    const anggotaId = document.getElementById('winAnggota').value;

    const selectedPeriode = cachedPeriodeList.find((p) => String(p.id) === String(periodeId));
    const selectedAnggota = cachedAnggotaList.find((a) => String(a.id) === String(anggotaId));

    if (!selectedPeriode || !selectedAnggota) {
      showGlobalAlert('Silakan pilih Periode Arisan dan Anggota Pemenang.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Menyimpan Pemenang...';

    try {
      const nominalDiterima = Number(document.getElementById('winNominal').value || 0);
      const tanggalUndi = document.getElementById('winTanggal').value || todayISO();
      const metode = document.getElementById('winMetode').value;
      const bank = document.getElementById('winBank').value;
      const keterangan = document.getElementById('winKeterangan').value.trim();

      await adaptiveSupabaseWrite(
        TABLES.ARISAN,
        {
          pemenang_id: selectedAnggota.id,
          pemenang_nama: selectedAnggota.nama_lengkap,
          total_diterima: nominalDiterima,
          status: 'selesai'
        },
        `?id=eq.${encodeURIComponent(selectedPeriode.id)}`
      );

      await adaptiveSupabaseWrite(
        TABLES.ANGGOTA,
        {
          sudah_menang: true,
          periode_menang_ke: selectedPeriode.periode_ke
        },
        `?id=eq.${encodeURIComponent(selectedAnggota.id)}`
      );

      try {
        await adaptiveSupabaseWrite(TABLES.PEMENANG, {
          periode_id: selectedPeriode.id,
          periode_ke: selectedPeriode.periode_ke,
          bulan_tahun: selectedPeriode.bulan_tahun,
          anggota_id: selectedAnggota.id,
          user_id: selectedAnggota.user_id || null,
          nama_pemenang: selectedAnggota.nama_lengkap,
          tanggal_undi: tanggalUndi,
          nominal_diterima: nominalDiterima,
          metode_pencairan: metode,
          nama_bank: bank || null,
          keterangan: keterangan,
          ditetapkan_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin'
        });
      } catch (_) { }

      formPemenangArisan.reset();
      document.getElementById('winTanggal').value = todayISO();
      await loadPeriodeAndPemenangData();
      updateQuickStatsBar();
      showGlobalAlert(`🏆 Selamat! <b>${selectedAnggota.nama_lengkap}</b> berhasil ditetapkan sebagai Pemenang Periode Ke-${selectedPeriode.periode_ke}!`, 'success');
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🏆 Tetapkan Pemenang Arisan';
    }
  });
}

// ============================================================================
// MODUL 5: DAFTAR SELURUH ANGGOTA ARISAN (GALLERY NAMA & FOTO SAJA + CARI BY NAMA)
// ============================================================================
function renderMemberGallery() {
  const container = document.getElementById('memberGalleryContainer');
  const searchInput = document.getElementById('searchAnggotaInput');
  const countBadge = document.getElementById('countAnggotaGalleryBadge');
  if (!container) return;

  const query = searchInput ? String(searchInput.value || '').trim().toLowerCase() : '';

  // Ambil seluruh peserta arisan dari adnan_DataAnggota (kecuali akun sistem murni jika bernama Admin Arisan)
  const allMembers = (cachedAnggotaList || []).filter((a) => {
    const uid = String(a.user_id || '').trim().toLowerCase();
    const nama = String(a.nama_lengkap || '').trim().toLowerCase();
    if (uid === 'admin' && nama.includes('admin arisan')) return false;
    return Boolean(nama);
  });

  const filteredMembers = allMembers.filter((a) => {
    if (!query) return true;
    const namaLengkap = String(a.nama_lengkap || '').toLowerCase();
    const panggilan = String(a.nama_panggilan || a.panggilan || '').toLowerCase();
    return namaLengkap.includes(query) || panggilan.includes(query);
  });

  if (countBadge) {
    countBadge.textContent = query
      ? `Menampilkan ${filteredMembers.length} dari ${allMembers.length} Anggota`
      : `${allMembers.length} Anggota Terdaftar`;
  }

  if (filteredMembers.length === 0) {
    container.innerHTML = `
      <p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:24px 0;">
        ${query ? `Tidak ditemukan anggota dengan nama "<b>${searchInput.value}</b>".` : 'Belum ada data anggota yang terdaftar.'}
      </p>
    `;
    return;
  }

  container.innerHTML = filteredMembers
    .map((a, idx) => {
      const nama = a.nama_lengkap || 'Anggota Arisan';
      const photoUrl = a.foto_url || a.foto || null;
      const initials = nama
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('') || 'KA';

      const mediaKey = `member_photo_${a.id || idx}`;
      if (photoUrl) {
        registerMediaPreview(mediaKey, `Foto Anggota - ${nama}`, photoUrl);
      }

      const photoContent = photoUrl
        ? `<img src="${photoUrl}" alt="${nama}" onclick="openMediaByKey('${mediaKey}')" title="Klik untuk memperbesar foto ${nama}" />`
        : `<span>${initials}</span>`;

      return `
        <div class="member-gallery-card">
          <div class="member-photo-box">
            ${photoContent}
          </div>
          <div class="member-name-label">${nama}</div>
        </div>
      `;
    })
    .join('');
}

const searchAnggotaInputEl = document.getElementById('searchAnggotaInput');
if (searchAnggotaInputEl) {
  searchAnggotaInputEl.addEventListener('input', () => {
    renderMemberGallery();
  });
}

const btnResetSearchAnggota = document.getElementById('btnResetSearchAnggota');
if (btnResetSearchAnggota) {
  btnResetSearchAnggota.addEventListener('click', () => {
    if (searchAnggotaInputEl) {
      searchAnggotaInputEl.value = '';
      renderMemberGallery();
      searchAnggotaInputEl.focus();
    }
  });
}

// ============================================================================
// ALUR SETELAH LOGIN: CEK adnan_DataAnggota & TAMPILKAN FOTO + HAK AKSES ADMIN
// ============================================================================
async function handlePostLoginFlow(user) {
  currentLoggedUser = user;
  activeAdminFilterPeserta = 'ALL';
  const authView = document.getElementById('authView');
  const memberAppView = document.getElementById('memberAppView');

  if (!user) {
    stopCameraStream();
    authView.classList.remove('hidden');
    memberAppView.classList.add('hidden');
    return;
  }

  authView.classList.add('hidden');
  memberAppView.classList.remove('hidden');

  const displayName = user.nama_lengkap || user.nama || user.user_id || 'Peserta';
  const displayUid = user.user_id || user.username || '-';
  const adminFlag = isUserAdmin();

  document.getElementById('welcomeUserText').textContent = displayName;
  document.getElementById('userDetailText').textContent = `User ID: ${displayUid} • Role: ${adminFlag ? 'Administrator' : 'Peserta Arisan'}`;

  // Tampilkan fitur-fitur Khusus Admin HANYA jika login menggunakan Role Admin:
  // - Tab & Kartu Pengeluaran
  // - Buat Pengumuman Baru / Unggah Dokumen PDF
  // - Unggah Foto Kegiatan Baru
  // - Tambah / Setting Periode Arisan Baru & Penetapan Pemenang
  [
    'roleBadgePill',
    'navBtnPengeluaran',
    'galleryCardPengeluaran',
    'formPengumumanCard',
    'formGaleriCard',
    'formPeriodeCard',
    'formPemenangCard'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !adminFlag);
  });

  // Set default tanggal hari ini di semua form
  ['payTanggal', 'expTanggal', 'galTanggal', 'winTanggal'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = todayISO();
  });

  try {
    const biodata = await checkBiodataAnggotaInSupabase(user);
    currentBiodataRecord = biodata;
    populateBiodataForm(user, biodata);
    updateHeaderAvatarPhoto(user, biodata);

    const statusPill = document.getElementById('biodataStatusPill');
    const mandatoryBanner = document.getElementById('mandatoryBanner');
    const tabBtnRingkasan = document.getElementById('tabBtnRingkasan');
    const btnBackFromBio = document.getElementById('btnBackToGalleryFromBio');

    if (!biodata) {
      statusPill.textContent = '⚠️ Wajib Isi Biodata';
      statusPill.className = 'status-pill incomplete';
      mandatoryBanner.classList.remove('hidden');
      tabBtnRingkasan.disabled = true;
      if (btnBackFromBio) btnBackFromBio.classList.add('hidden');
      switchMainView('viewBiodata');
      switchBioSubTab('tabPribadi');
    } else {
      statusPill.textContent = '✓ Anggota Terdaftar';
      statusPill.className = 'status-pill complete';
      mandatoryBanner.classList.add('hidden');
      tabBtnRingkasan.disabled = false;
      if (btnBackFromBio) btnBackFromBio.classList.remove('hidden');

      document.getElementById('payNama').value = biodata.nama_lengkap || displayName;
      renderBiodataSummary(biodata);
      switchBioSubTab('tabRingkasan');
      switchMainView('viewGalleryHome');
      await loadAllDashboardModules();
    }
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

// ============================================================================
// EVENT LISTENERS: NAVIGASI, BIODATA, LOGIN, REGISTER, LOGOUT
// ============================================================================
document.querySelectorAll('[data-main-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchMainView(btn.getAttribute('data-main-view'));
  });
});

document.querySelectorAll('[data-open-view]').forEach((el) => {
  el.addEventListener('click', () => {
    switchMainView(el.getAttribute('data-open-view'));
  });
});

document.querySelectorAll('[data-bio-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchBioSubTab(btn.getAttribute('data-bio-tab'));
  });
});

document.querySelectorAll('[data-periode-subtab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchPeriodeSubTab(btn.getAttribute('data-periode-subtab'));
  });
});

function validateRequiredInPanel(panelEl) {
  if (!panelEl) return true;
  const inputs = panelEl.querySelectorAll('input[required], select[required], textarea[required]');
  for (const inp of inputs) {
    if (!String(inp.value || '').trim()) {
      inp.focus();
      showBiodataAlert('Mohon lengkapi semua kolom bertanda bintang (*) pada tab ini.', 'error');
      return false;
    }
  }
  hideBiodataAlert();
  return true;
}

document.querySelectorAll('[data-next-bio-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = btn.closest('.sub-tab-panel');
    if (!validateRequiredInPanel(panel)) return;
    switchBioSubTab(btn.getAttribute('data-next-bio-tab'));
  });
});

document.querySelectorAll('[data-prev-bio-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    hideBiodataAlert();
    switchBioSubTab(btn.getAttribute('data-prev-bio-tab'));
  });
});

const editBiodataBtn = document.getElementById('editBiodataBtn');
if (editBiodataBtn) {
  editBiodataBtn.addEventListener('click', () => {
    switchBioSubTab('tabPribadi');
  });
}

// Submit Form Entry Biodata (adnan_DataAnggota) termasuk Foto Peserta
const biodataForm = document.getElementById('biodataForm');
if (biodataForm) {
  biodataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveBiodataBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan ke adnan_DataAnggota...';
    hideBiodataAlert();

    try {
      const namaLengkap = document.getElementById('bioNamaLengkap').value.trim();
      const namaPanggilan = document.getElementById('bioNamaPanggilan').value.trim();
      const jumlahSlot = Number(document.getElementById('bioJumlahArisan').value || 1);
      const silsilah = document.getElementById('bioSilsilah').value.trim() || 'Bani Adnan';

      const payload = {
        user_id: document.getElementById('bioUserId').value.trim(),
        nama_lengkap: namaLengkap,
        panggilan: namaPanggilan || namaLengkap,
        nama_panggilan: namaPanggilan || namaLengkap,
        jenis_kelamin: document.getElementById('bioJenisKelamin').value,
        tempat_lahir: document.getElementById('bioTempatLahir').value.trim() || null,
        tanggal_lahir: document.getElementById('bioTanggalLahir').value || null,
        pekerjaan: document.getElementById('bioPekerjaan').value.trim() || null,
        no_hp: document.getElementById('bioNoHp').value.trim(),
        email: document.getElementById('bioEmail').value.trim() || null,
        alamat: document.getElementById('bioAlamat').value.trim(),
        kota: document.getElementById('bioKota').value.trim() || null,
        nama_ayah: document.getElementById('bioNamaAyah').value.trim() || 'H. Adnan',
        garis_sanad: silsilah,
        silsilah_keluarga: silsilah,
        nama_pasangan: document.getElementById('bioNamaPasangan').value.trim() || null,
        jumlah_anak: Number(document.getElementById('bioJumlahAnak').value || 0),
        jumlah_slot: jumlahSlot,
        jumlah_ikut_arisan: jumlahSlot,
        nama_bank: document.getElementById('bioNamaBank').value || null,
        no_rekening: document.getElementById('bioNoRekening').value.trim() || null,
        atas_nama_rekening: document.getElementById('bioAtasNama').value.trim() || namaLengkap,
        foto_url: uploadedBioFotoDataUrl || null,
        foto: uploadedBioFotoDataUrl || null,
        status_aktif: true
      };

      const filter =
        currentBiodataRecord && currentBiodataRecord.id
          ? `?id=eq.${encodeURIComponent(currentBiodataRecord.id)}`
          : '';

      const saved = await adaptiveSupabaseWrite(TABLES.ANGGOTA, payload, filter);
      currentBiodataRecord = saved || payload;

      updateHeaderAvatarPhoto(currentLoggedUser, currentBiodataRecord);

      document.getElementById('biodataStatusPill').textContent = '✓ Anggota Terdaftar';
      document.getElementById('biodataStatusPill').className = 'status-pill complete';
      document.getElementById('mandatoryBanner').classList.add('hidden');
      document.getElementById('tabBtnRingkasan').disabled = false;
      document.getElementById('btnBackToGalleryFromBio').classList.remove('hidden');

      renderBiodataSummary(currentBiodataRecord);
      await loadAllDashboardModules();
      switchMainView('viewGalleryHome');
      showGlobalAlert('🎉 Biodata & Foto Peserta telah tersimpan di <b>adnan_DataAnggota</b>!', 'success');
    } catch (err) {
      showBiodataAlert(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Simpan Biodata & Buka Menu Utama';
    }
  });
}

// Toggle Login / Register User
if (toggleAuthLink) {
  toggleAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode(!isRegisterMode);
  });
}

// Submit Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const btn = document.getElementById('loginBtn');

    btn.disabled = true;
    btn.textContent = 'Mengecek adnan_User...';
    hideAlert();

    try {
      const found = await checkUserInSupabase(uid);
      if (!found) {
        showAlert(
          `User <b>${uid}</b> belum terdaftar di <code>adnan_User</code>.<br>Silakan klik <b>Register User</b> di bawah.`,
          'error'
        );
        registerFooter.classList.add('highlight-prompt');
        return;
      }

      if (found.password !== undefined && found.password !== null && String(found.password) !== pass) {
        showAlert('Password yang Anda masukkan salah.', 'error');
        return;
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(found));
      showAlert('Login berhasil! Membuka aplikasi...', 'success');
      setTimeout(() => handlePostLoginFlow(found), 400);
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });
}

// Submit Register User
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama_lengkap = document.getElementById('regNama').value.trim();
    const user_id = document.getElementById('regUsername').value.trim();
    const no_hp = document.getElementById('regNoHp').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const btn = document.getElementById('regBtn');

    btn.disabled = true;
    btn.textContent = 'Mendaftarkan...';
    hideAlert();

    try {
      await registerUserToSupabase({ nama_lengkap, user_id, no_hp, password });
      document.getElementById('loginUsername').value = user_id;
      document.getElementById('loginPassword').value = '';
      registerForm.reset();
      setAuthMode(false);
      showAlert(`User <b>${user_id}</b> berhasil didaftarkan! Silakan Login.`, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Register User';
    }
  });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    stopCameraStream();
    localStorage.removeItem(SESSION_KEY);
    currentLoggedUser = null;
    currentBiodataRecord = null;
    uploadedBioFotoDataUrl = null;
    handlePostLoginFlow(null);
    setAuthMode(false);
  });
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  populateAllBankDropdowns();
  syncPayPeriodeByJenis();
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      handlePostLoginFlow(JSON.parse(saved));
    }
  } catch (_) {
    localStorage.removeItem(SESSION_KEY);
  }
});

