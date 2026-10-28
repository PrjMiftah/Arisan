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
  PEMENANG: 'adnan_PemenangArisan',
  GROUP: 'adnan_GroupArisan'
};

const SESSION_KEY = 'adnan_logged_in_user';
const GROUP_STORAGE_KEY = 'adnan_groups_backup_v1';

// Konstanta Default Split Iuran Arisan per Orang (Total Rp 170.000)
const DEFAULT_SPLIT_ARISAN = 100000;
const DEFAULT_SPLIT_KAS = 40000;
const DEFAULT_SPLIT_KONSUMSI = 30000;
const DEFAULT_TOTAL_IURAN = DEFAULT_SPLIT_ARISAN + DEFAULT_SPLIT_KAS + DEFAULT_SPLIT_KONSUMSI;

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
let cachedGroupList = [];

// State untuk Group Arisan pada Form Pembayaran & Modal Konfirmasi
let activeDetectedGroupForPay = null;
let checkedGroupMembersMap = {};

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
// HELPER EKSTRAKSI SPLIT IURAN ARISAN (Rp 100.000 Arisan, Rp 40.000 Kas, Rp 30.000 Konsumsi)
// ============================================================================
function getArisanSplitValues(periodeRow) {
  if (!periodeRow) {
    return {
      uang_arisan: DEFAULT_SPLIT_ARISAN,
      uang_kas: DEFAULT_SPLIT_KAS,
      uang_konsumsi: DEFAULT_SPLIT_KONSUMSI,
      total: DEFAULT_TOTAL_IURAN
    };
  }
  const ket = String(periodeRow.keterangan || '');
  const metaMatch = ket.match(/\[SPLIT:(\d+),(\d+),(\d+)\]/);

  const uang_arisan =
    periodeRow.uang_arisan != null
      ? Number(periodeRow.uang_arisan)
      : metaMatch
      ? Number(metaMatch[1])
      : DEFAULT_SPLIT_ARISAN;
  const uang_kas =
    periodeRow.uang_kas != null
      ? Number(periodeRow.uang_kas)
      : metaMatch
      ? Number(metaMatch[2])
      : DEFAULT_SPLIT_KAS;
  const uang_konsumsi =
    periodeRow.uang_konsumsi != null
      ? Number(periodeRow.uang_konsumsi)
      : metaMatch
      ? Number(metaMatch[3])
      : DEFAULT_SPLIT_KONSUMSI;

  const total = uang_arisan + uang_kas + uang_konsumsi;
  return { uang_arisan, uang_kas, uang_konsumsi, total };
}

function getPaymentSplitValues(payRow) {
  const nominal = Number((payRow && payRow.nominal) || 0);
  const jenis = String((payRow && payRow.jenis_bayar) || '');
  const isArisan = jenis.toLowerCase().includes('arisan');

  if (!isArisan) {
    return {
      uang_arisan: 0,
      uang_kas: 0,
      uang_konsumsi: 0,
      total: nominal
    };
  }

  const ket = String((payRow && payRow.keterangan) || '');
  const metaMatch = ket.match(/\[SPLIT:(\d+),(\d+),(\d+)\]/);

  if (payRow && payRow.uang_arisan != null && (Number(payRow.uang_arisan) > 0 || Number(payRow.uang_kas) > 0 || Number(payRow.uang_konsumsi) > 0)) {
    const ua = Number(payRow.uang_arisan || 0);
    const uk = Number(payRow.uang_kas || 0);
    const uko = Number(payRow.uang_konsumsi || 0);
    return {
      uang_arisan: ua,
      uang_kas: uk,
      uang_konsumsi: uko,
      total: nominal || ua + uk + uko
    };
  }

  if (metaMatch) {
    const ua = Number(metaMatch[1] || 0);
    const uk = Number(metaMatch[2] || 0);
    const uko = Number(metaMatch[3] || 0);
    return {
      uang_arisan: ua,
      uang_kas: uk,
      uang_konsumsi: uko,
      total: nominal || ua + uk + uko
    };
  }

  // Fallback untuk transaksi arisan lama yang belum memiliki kolom split eksplisit
  if (nominal > 0 && nominal % DEFAULT_TOTAL_IURAN === 0) {
    const mult = nominal / DEFAULT_TOTAL_IURAN;
    return {
      uang_arisan: mult * DEFAULT_SPLIT_ARISAN,
      uang_kas: mult * DEFAULT_SPLIT_KAS,
      uang_konsumsi: mult * DEFAULT_SPLIT_KONSUMSI,
      total: nominal
    };
  }

  if (nominal >= DEFAULT_TOTAL_IURAN) {
    return {
      uang_arisan: nominal - (DEFAULT_SPLIT_KAS + DEFAULT_SPLIT_KONSUMSI),
      uang_kas: DEFAULT_SPLIT_KAS,
      uang_konsumsi: DEFAULT_SPLIT_KONSUMSI,
      total: nominal
    };
  }

  return {
    uang_arisan: nominal,
    uang_kas: 0,
    uang_konsumsi: 0,
    total: nominal
  };
}

function stripInternalMetaFromKeterangan(ket) {
  return String(ket || '')
    .replace(/\s*\[SPLIT:\d+,\d+,\d+\]\s*/g, ' ')
    .replace(/\s*\|\s*$/, '')
    .trim();
}

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
    loadGroupArisanData(),
    loadPembayaranData(),
    loadPengeluaranData(),
    loadPengumumanData(),
    loadGaleriData()
  ]);
  populateAdminPesertaDropdowns();
  populateGroupAnggotaDropdowns();
  syncPayGroupSplitUI();
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
    elTglPeriode.textContent = 'Klik Menu 5 (Pengaturan) untuk setting';
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

  // Hitung rekap per jenis_bayar & split arisan dari cachedPembayaranList
  const summaryMap = {};
  let sumArisanTotal = 0;
  let sumSplitArisan = 0;
  let sumSplitKas = 0;
  let sumSplitKonsumsi = 0;
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
      const sp = getPaymentSplitValues(row);
      sumArisanTotal += nom;
      sumSplitArisan += sp.uang_arisan;
      sumSplitKas += sp.uang_kas;
      sumSplitKonsumsi += sp.uang_konsumsi;
      countArisan += 1;
    } else {
      sumNonArisan += nom;
      countNonArisan += 1;
    }
  });

  const filterCards = [
    {
      key: 'Uang Arisan',
      title: '💰 Total Iuran Arisan (Split)',
      amount: sumArisanTotal,
      count: `${countArisan} Tx • Arisan: ${formatRupiah(sumSplitArisan)} | Kas: ${formatRupiah(sumSplitKas)} | Konsumsi: ${formatRupiah(sumSplitKonsumsi)}`
    },
    {
      key: 'NON_ARISAN',
      title: '🤝 Semua Pemasukan Lainnya',
      amount: sumNonArisan,
      count: `${countNonArisan} Transaksi`
    },
    ...Object.keys(summaryMap)
      .filter((k) => k !== 'Uang Arisan')
      .map((k) => ({
        key: k,
        title: `📌 ${k}`,
        amount: summaryMap[k].total,
        count: `${summaryMap[k].count} Transaksi`
      })),
    {
      key: 'ALL',
      title: '📊 Total Seluruh Pemasukan',
      amount: sumArisanTotal + sumNonArisan,
      count: `${(cachedPembayaranList || []).length} Transaksi`
    }
  ];

  gridEl.innerHTML = filterCards
    .map(
      (c) => `
      <div class="jenis-filter-card ${activeFilter === c.key ? 'active' : ''}" onclick="renderTransparencyBreakdown('${c.key}')">
        <div class="jf-title">${c.title}</div>
        <div class="jf-amount">${formatRupiah(c.amount)}</div>
        <div class="jf-count">${c.count}</div>
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
    tbodyEl.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">Belum ada data pembayaran pada kategori ini.</td></tr>`;
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

      const sp = getPaymentSplitValues(r);
      const isArs = isJenisArisan(r.jenis_bayar);
      const cleanKet = stripInternalMetaFromKeterangan(r.keterangan);

      return `
        <tr>
          <td>${r.tanggal_bayar || '-'}</td>
          <td>
            <strong>${r.nama_pembayar || '-'}</strong>
            ${r.nama_group ? `<br><span class="gallery-badge" style="font-size:0.7rem;">👨‍👩‍👧‍👦 ${r.nama_group}</span>` : ''}
            ${cleanKet ? `<br><small style="color:#64748b;">${cleanKet}</small>` : ''}
          </td>
          <td><strong>${r.jenis_bayar || '-'}</strong></td>
          <td>${metodeText}</td>
          <td>${isArs ? `<span style="color:var(--primary); font-weight:700;">${formatRupiah(sp.uang_arisan)}</span>` : '-'}</td>
          <td>${isArs ? `<span style="color:#b45309; font-weight:700;">${formatRupiah(sp.uang_kas)}</span>` : '-'}</td>
          <td>${isArs ? `<span style="color:#0284c7; font-weight:700;">${formatRupiah(sp.uang_konsumsi)}</span>` : '-'}</td>
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
// MODUL 1: PEMBAYARAN, DETEKSI GROUP ARISAN & SPLIT (ARISAN / KAS / KONSUMSI)
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
  const rowPJ = String(row.penanggung_jawab || '').trim().toLowerCase();
  const rowKet = String(row.keterangan || '').toLowerCase();

  if (myUid && rowUid && rowUid === myUid) return true;
  if (myAnggotaId && rowAnggotaId && rowAnggotaId === myAnggotaId) return true;
  if (myNamaBio && rowNama && rowNama === myNamaBio) return true;
  if (myNamaUser && rowNama && rowNama === myNamaUser) return true;
  if (myUid && rowNama && rowNama === myUid) return true;
  if (myNamaBio && rowPJ && rowPJ === myNamaBio) return true;
  if (myNamaBio && rowKet.includes(`pj: ${myNamaBio}`)) return true;
  return false;
}

function getActivePeriodeSplitRates() {
  const payPeriode = document.getElementById('payPeriode');
  const selectedId = payPeriode ? payPeriode.value : '';
  const foundPeriode =
    (selectedId && cachedPeriodeList.find((p) => String(p.id) === String(selectedId))) ||
    cachedPeriodeList.find((p) => p.status === 'aktif') ||
    cachedPeriodeList[0] ||
    null;
  return getArisanSplitValues(foundPeriode);
}

function extractGroupMembersArray(groupRow) {
  if (!groupRow) return [];
  if (Array.isArray(groupRow.anggota_list) && groupRow.anggota_list.length > 0) {
    return groupRow.anggota_list.filter(Boolean).slice(0, 5);
  }
  const raw = [
    groupRow.penanggung_jawab || groupRow.anggota_1,
    groupRow.anggota_2,
    groupRow.anggota_3,
    groupRow.anggota_4,
    groupRow.anggota_5
  ]
    .map((m) => String(m || '').trim())
    .filter(Boolean);

  const unique = [];
  raw.forEach((name) => {
    if (!unique.some((u) => u.toLowerCase() === name.toLowerCase())) {
      unique.push(name);
    }
  });
  return unique.slice(0, 5);
}

function findGroupForMemberName(memberName) {
  const target = String(memberName || '').trim().toLowerCase();
  if (!target) return null;

  // Prioritaskan group di mana peserta adalah Penanggung Jawab
  const asPJ = (cachedGroupList || []).find(
    (g) => String(g.penanggung_jawab || '').trim().toLowerCase() === target
  );
  if (asPJ) return asPJ;

  // Atau peserta terdaftar sebagai anggota di dalam group tersebut
  return (
    (cachedGroupList || []).find((g) => {
      const members = extractGroupMembersArray(g);
      return members.some((m) => m.toLowerCase() === target);
    }) || null
  );
}

function syncPayGroupSplitUI() {
  const payJenis = document.getElementById('payJenis');
  const payNama = document.getElementById('payNama');
  const wrapper = document.getElementById('payGroupSplitWrapper');
  const titleEl = document.getElementById('payGroupSplitTitle');
  const subtitleEl = document.getElementById('payGroupSplitSubtitle');
  const selectAllLabel = document.getElementById('paySelectAllGroupLabel');
  const chkSelectAll = document.getElementById('chkSelectAllGroupPay');
  const memberListContainer = document.getElementById('payGroupMemberListContainer');
  const payNominal = document.getElementById('payNominal');
  const payNominalHint = document.getElementById('payNominalHint');

  if (!payJenis || !wrapper) return;

  const isUangArisan = payJenis.value === 'Uang Arisan';
  if (!isUangArisan) {
    wrapper.classList.add('hidden');
    activeDetectedGroupForPay = null;
    if (payNominalHint) payNominalHint.textContent = '(Masukkan nominal pembayaran)';
    return;
  }

  wrapper.classList.remove('hidden');
  const payerName = String((payNama && payNama.value) || '').trim();
  const matchedGroup = findGroupForMemberName(payerName);
  const rates = getActivePeriodeSplitRates();

  if (matchedGroup) {
    const members = extractGroupMembersArray(matchedGroup);
    const isSameGroup =
      activeDetectedGroupForPay &&
      String(activeDetectedGroupForPay.id || activeDetectedGroupForPay.nama_group) ===
        String(matchedGroup.id || matchedGroup.nama_group);

    activeDetectedGroupForPay = matchedGroup;
    if (!isSameGroup || Object.keys(checkedGroupMembersMap).length === 0) {
      checkedGroupMembersMap = {};
      members.forEach((m) => {
        checkedGroupMembersMap[m] = true;
      });
    }

    if (titleEl) {
      titleEl.innerHTML = `👨‍👩‍👧‍👦 Group Arisan Ditemukan: <span style="text-decoration:underline;">${matchedGroup.nama_group}</span> (${members.length} Orang)`;
    }
    if (subtitleEl) {
      subtitleEl.innerHTML = `Penanggung Jawab: <strong>${matchedGroup.penanggung_jawab}</strong> • Pembayaran akan di-split ke anggota group untuk <strong>Uang Arisan (${formatRupiah(rates.uang_arisan)})</strong>, <strong>Uang Kas (${formatRupiah(rates.uang_kas)})</strong> & <strong>Konsumsi (${formatRupiah(rates.uang_konsumsi)})</strong>.`;
    }
    if (selectAllLabel) selectAllLabel.classList.remove('hidden');

    const allChecked = members.every((m) => checkedGroupMembersMap[m] !== false);
    if (chkSelectAll) chkSelectAll.checked = allChecked;

    if (memberListContainer) {
      memberListContainer.innerHTML = members
        .map((m, idx) => {
          const isPJ = m.toLowerCase() === String(matchedGroup.penanggung_jawab || '').trim().toLowerCase();
          const checked = checkedGroupMembersMap[m] !== false;
          return `
            <label style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; background:${checked ? '#ffffff' : '#f1f5f9'}; border:1.5px solid ${checked ? 'var(--primary)' : '#cbd5e1'}; border-radius:8px; padding:8px 12px; cursor:pointer; margin:0;">
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" class="chk-inline-group-member" data-member-name="${m}" ${checked ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--primary); cursor:pointer;" />
                <span style="font-weight:700; font-size:0.86rem; color:var(--text-main);">
                  ${idx + 1}. ${m}
                </span>
                <span class="gallery-badge" style="font-size:0.7rem; ${isPJ ? 'background:#fef3c7; color:#b45309;' : ''}">
                  ${isPJ ? '👑 Penanggung Jawab' : '👤 Anggota Group'}
                </span>
              </div>
              <div style="font-size:0.78rem; font-weight:700; color:var(--text-secondary);">
                Arisan: <span style="color:var(--primary);">${formatRupiah(rates.uang_arisan)}</span> •
                Kas: <span style="color:#b45309;">${formatRupiah(rates.uang_kas)}</span> •
                Konsumsi: <span style="color:#0284c7;">${formatRupiah(rates.uang_konsumsi)}</span> =
                <strong style="color:var(--primary);">${formatRupiah(rates.total)}</strong>
              </div>
            </label>
          `;
        })
        .join('');

      memberListContainer.querySelectorAll('.chk-inline-group-member').forEach((cb) => {
        cb.addEventListener('change', () => {
          const mName = cb.getAttribute('data-member-name');
          checkedGroupMembersMap[mName] = cb.checked;
          const selectedCount = members.filter((m) => checkedGroupMembersMap[m] !== false).length;
          if (selectedCount === 0) {
            checkedGroupMembersMap[mName] = true;
            cb.checked = true;
            showGlobalAlert('Minimal 1 anggota group harus dipilih untuk pembayaran arisan.', 'error');
          }
          syncPayGroupSplitUI();
        });
      });
    }

    const activeCount = members.filter((m) => checkedGroupMembersMap[m] !== false).length;
    const sumArisan = activeCount * rates.uang_arisan;
    const sumKas = activeCount * rates.uang_kas;
    const sumKonsumsi = activeCount * rates.uang_konsumsi;
    const sumTotal = activeCount * rates.total;

    document.getElementById('splitPreviewArisan').textContent = formatRupiah(sumArisan);
    document.getElementById('splitPreviewKas').textContent = formatRupiah(sumKas);
    document.getElementById('splitPreviewKonsumsi').textContent = formatRupiah(sumKonsumsi);
    document.getElementById('splitPreviewTotal').textContent = formatRupiah(sumTotal);

    if (payNominal) payNominal.value = sumTotal;
    if (payNominalHint) {
      payNominalHint.textContent = `(${activeCount} Orang Group × ${formatRupiah(rates.total)})`;
    }
  } else {
    activeDetectedGroupForPay = null;
    checkedGroupMembersMap = {};

    if (titleEl) {
      titleEl.textContent = `📋 Rincian Split Iuran Arisan Per Orang (1 Peserta)`;
    }
    if (subtitleEl) {
      subtitleEl.innerHTML = `Iuran Arisan otomatis di-split menjadi: <strong>Uang Arisan ${formatRupiah(rates.uang_arisan)}</strong> + <strong>Uang Kas ${formatRupiah(rates.uang_kas)}</strong> + <strong>Uang Konsumsi ${formatRupiah(rates.uang_konsumsi)}</strong> = <strong>${formatRupiah(rates.total)} / orang</strong>.`;
    }
    if (selectAllLabel) selectAllLabel.classList.add('hidden');
    if (memberListContainer) {
      memberListContainer.innerHTML = '';
    }

    document.getElementById('splitPreviewArisan').textContent = formatRupiah(rates.uang_arisan);
    document.getElementById('splitPreviewKas').textContent = formatRupiah(rates.uang_kas);
    document.getElementById('splitPreviewKonsumsi').textContent = formatRupiah(rates.uang_konsumsi);
    document.getElementById('splitPreviewTotal').textContent = formatRupiah(rates.total);

    if (payNominal) payNominal.value = rates.total;
    if (payNominalHint) {
      payNominalHint.textContent = `(1 Orang × ${formatRupiah(rates.total)})`;
    }
  }
}

const chkSelectAllGroupPayEl = document.getElementById('chkSelectAllGroupPay');
if (chkSelectAllGroupPayEl) {
  chkSelectAllGroupPayEl.addEventListener('change', () => {
    if (!activeDetectedGroupForPay) return;
    const members = extractGroupMembersArray(activeDetectedGroupForPay);
    if (chkSelectAllGroupPayEl.checked) {
      members.forEach((m) => {
        checkedGroupMembersMap[m] = true;
      });
    } else {
      // Jika tidak semua group, centang hanya Penanggung Jawab / pembayar utama
      const pjName = activeDetectedGroupForPay.penanggung_jawab || members[0];
      members.forEach((m) => {
        checkedGroupMembersMap[m] = m === pjName;
      });
    }
    syncPayGroupSplitUI();
  });
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
    if (!payPeriode.value && cachedPeriodeList.length > 0) {
      const activePer = cachedPeriodeList.find((p) => p.status === 'aktif') || cachedPeriodeList[0];
      if (activePer) payPeriode.value = activePer.id;
    }
    if (payPeriodeHint) {
      payPeriodeHint.textContent = '(Aktif untuk Uang Arisan)';
      payPeriodeHint.style.color = 'var(--primary)';
    }
  }
  syncPayGroupSplitUI();
}

const payJenisSelect = document.getElementById('payJenis');
if (payJenisSelect) {
  payJenisSelect.addEventListener('change', syncPayPeriodeByJenis);
}

const payPeriodeEl = document.getElementById('payPeriode');
if (payPeriodeEl) {
  payPeriodeEl.addEventListener('change', syncPayGroupSplitUI);
}

const payNamaInputEl = document.getElementById('payNama');
if (payNamaInputEl) {
  payNamaInputEl.addEventListener('input', syncPayGroupSplitUI);
  payNamaInputEl.addEventListener('change', syncPayGroupSplitUI);
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
      subtitleRiwayat.textContent = 'Menampilkan khusus riwayat pembayaran milik akun / group Anda.';
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
      ...sortedPeserta.map((p) => {
        const grp = findGroupForMemberName(p.nama);
        const grpLabel = grp ? ` • [Group: ${grp.nama_group}]` : '';
        return `<option value="${p.nama}" data-uid="${p.user_id || ''}" data-anggota-id="${p.anggota_id || ''}">${p.nama}${p.user_id ? ' (ID: ' + p.user_id + ')' : ''}${grpLabel}</option>`;
      })
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
      if (payNamaInput) {
        payNamaInput.value = chosenName;
        syncPayGroupSplitUI();
      }
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

  // Jika Login User Peserta -> HANYA tampilkan data milik User tersebut (termasuk group-nya)
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
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--text-muted);">${emptyMsg}</td></tr>`;
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

      const sp = getPaymentSplitValues(r);
      const isArs = isJenisArisan(r.jenis_bayar);
      const cleanKet = stripInternalMetaFromKeterangan(r.keterangan);

      return `
        <tr>
          <td>${r.tanggal_bayar || '-'}</td>
          <td><code>${r.kode_transaksi || 'TX-' + (idx + 1)}</code></td>
          <td>
            <strong>${r.nama_pembayar || '-'}</strong>
            ${r.nama_group ? `<br><span class="gallery-badge" style="font-size:0.7rem;">👨‍👩‍👧‍👦 ${r.nama_group}</span>` : ''}
            ${cleanKet ? `<br><small style="color:#64748b;">${cleanKet}</small>` : ''}
          </td>
          <td>${r.jenis_bayar || 'Uang Arisan'}</td>
          <td>${metodeText}</td>
          <td>${isArs ? `<span style="color:var(--primary); font-weight:700;">${formatRupiah(sp.uang_arisan)}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
          <td>${isArs ? `<span style="color:#b45309; font-weight:700;">${formatRupiah(sp.uang_kas)}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
          <td>${isArs ? `<span style="color:#0284c7; font-weight:700;">${formatRupiah(sp.uang_konsumsi)}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
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
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
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

// ============================================================================
// WINDOWS MODAL KONFIRMASI GROUP ARISAN SAAT KLIK SIMPAN PEMBAYARAN
// ============================================================================
function renderGroupModalContents() {
  if (!activeDetectedGroupForPay) return;
  const members = extractGroupMembersArray(activeDetectedGroupForPay);
  const rates = getActivePeriodeSplitRates();

  const titleEl = document.getElementById('modalGroupNameTitle');
  const pjEl = document.getElementById('modalGroupPJInfo');
  const chkAll = document.getElementById('chkModalSelectAllGroup');
  const tbody = document.getElementById('modalGroupMembersTableBody');

  if (titleEl) {
    titleEl.textContent = `${activeDetectedGroupForPay.nama_group} (${members.length} Anggota Terdaftar)`;
  }
  if (pjEl) {
    pjEl.textContent = `Penanggung Jawab: ${activeDetectedGroupForPay.penanggung_jawab}`;
  }

  const allChecked = members.every((m) => checkedGroupMembersMap[m] !== false);
  if (chkAll) chkAll.checked = allChecked;

  if (tbody) {
    tbody.innerHTML = members
      .map((m, idx) => {
        const isPJ =
          m.toLowerCase() === String(activeDetectedGroupForPay.penanggung_jawab || '').trim().toLowerCase();
        const checked = checkedGroupMembersMap[m] !== false;
        return `
          <tr style="background:${checked ? '#ffffff' : '#f8fafc'}; opacity:${checked ? '1' : '0.6'};">
            <td style="text-align:center;">
              <input type="checkbox" class="chk-modal-group-member" data-member-name="${m}" ${checked ? 'checked' : ''} style="width:17px; height:17px; accent-color:var(--primary); cursor:pointer;" />
            </td>
            <td><strong>${idx + 1}. ${m}</strong></td>
            <td>
              <span class="gallery-badge" style="font-size:0.72rem; ${isPJ ? 'background:#fef3c7; color:#b45309;' : ''}">
                ${isPJ ? '👑 Penanggung Jawab' : '👤 Anggota Group'}
              </span>
            </td>
            <td><strong style="color:var(--primary);">${checked ? formatRupiah(rates.uang_arisan) : 'Rp 0'}</strong></td>
            <td><strong style="color:#b45309;">${checked ? formatRupiah(rates.uang_kas) : 'Rp 0'}</strong></td>
            <td><strong style="color:#0284c7;">${checked ? formatRupiah(rates.uang_konsumsi) : 'Rp 0'}</strong></td>
            <td><strong>${checked ? formatRupiah(rates.total) : 'Rp 0'}</strong></td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.chk-modal-group-member').forEach((cb) => {
      cb.addEventListener('change', () => {
        const mName = cb.getAttribute('data-member-name');
        checkedGroupMembersMap[mName] = cb.checked;
        const selectedCount = members.filter((m) => checkedGroupMembersMap[m] !== false).length;
        if (selectedCount === 0) {
          checkedGroupMembersMap[mName] = true;
          cb.checked = true;
          showGlobalAlert('Minimal 1 anggota group harus dipilih.', 'error');
        }
        syncPayGroupSplitUI();
        renderGroupModalContents();
      });
    });
  }

  const activeCount = members.filter((m) => checkedGroupMembersMap[m] !== false).length;
  document.getElementById('modalSumArisan').textContent = formatRupiah(activeCount * rates.uang_arisan);
  document.getElementById('modalSumKas').textContent = formatRupiah(activeCount * rates.uang_kas);
  document.getElementById('modalSumKonsumsi').textContent = formatRupiah(activeCount * rates.uang_konsumsi);
  document.getElementById('modalSumGrandTotal').textContent = formatRupiah(activeCount * rates.total);
}

function openGroupConfirmModal() {
  const modal = document.getElementById('groupConfirmModal');
  if (!modal || !activeDetectedGroupForPay) return;
  renderGroupModalContents();
  modal.classList.remove('hidden');
}

function closeGroupConfirmModal() {
  const modal = document.getElementById('groupConfirmModal');
  if (modal) modal.classList.add('hidden');
}

const chkModalSelectAllGroupEl = document.getElementById('chkModalSelectAllGroup');
if (chkModalSelectAllGroupEl) {
  chkModalSelectAllGroupEl.addEventListener('change', () => {
    if (!activeDetectedGroupForPay) return;
    const members = extractGroupMembersArray(activeDetectedGroupForPay);
    if (chkModalSelectAllGroupEl.checked) {
      members.forEach((m) => {
        checkedGroupMembersMap[m] = true;
      });
    } else {
      const pjName = activeDetectedGroupForPay.penanggung_jawab || members[0];
      members.forEach((m) => {
        checkedGroupMembersMap[m] = m === pjName;
      });
    }
    syncPayGroupSplitUI();
    renderGroupModalContents();
  });
}

const closeGroupModalBtn = document.getElementById('closeGroupModalBtn');
if (closeGroupModalBtn) closeGroupModalBtn.addEventListener('click', closeGroupConfirmModal);

const btnCancelGroupModal = document.getElementById('btnCancelGroupModal');
if (btnCancelGroupModal) btnCancelGroupModal.addEventListener('click', closeGroupConfirmModal);

const btnConfirmSaveGroupPay = document.getElementById('btnConfirmSaveGroupPay');
if (btnConfirmSaveGroupPay) {
  btnConfirmSaveGroupPay.addEventListener('click', async () => {
    closeGroupConfirmModal();
    await executeSavePembayaran(true);
  });
}

async function executeSavePembayaran(confirmedFromGroupModal = false) {
  const btn = document.getElementById('btnSubmitPembayaran');
  const jenisBayar = document.getElementById('payJenis').value;
  const metode = document.getElementById('payMetode').value;
  const namaBank = document.getElementById('payNamaBank').value;

  if (metode === 'Transfer Bank' && !namaBank) {
    showGlobalAlert('Silakan pilih Bank Tujuan / Pengirim pada dropdown Bank.', 'error');
    return;
  }

  // Apabila jenis pembayaran adalah Uang Arisan dan ditemukan Group Arisan,
  // tampilkan terlebih dahulu Windows Konfirmasi Daftar Group Arisan (kecuali sudah dikonfirmasi dari modal)
  if (jenisBayar === 'Uang Arisan' && activeDetectedGroupForPay && !confirmedFromGroupModal) {
    openGroupConfirmModal();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan Pembayaran...';

  try {
    const selectedPeriodeId =
      jenisBayar === 'Uang Arisan' ? document.getElementById('payPeriode').value || null : null;
    const tanggalBayar = document.getElementById('payTanggal').value || todayISO();
    const noRek = document.getElementById('payNoRekening').value.trim();
    const ketInput = document.getElementById('payKeterangan').value.trim();
    const rates = getActivePeriodeSplitRates();

    if (jenisBayar === 'Uang Arisan' && activeDetectedGroupForPay) {
      // Simpan pembayaran ter-split untuk masing-masing anggota group yang dicentang (termasuk Penanggung Jawab)
      const allMembers = extractGroupMembersArray(activeDetectedGroupForPay);
      const selectedMembers = allMembers.filter((m) => checkedGroupMembersMap[m] !== false);
      const groupBatchCode = 'GRP-' + Math.floor(1000 + Math.random() * 9000);

      for (let i = 0; i < selectedMembers.length; i++) {
        const memberName = selectedMembers[i];
        const isPJ =
          memberName.toLowerCase() ===
          String(activeDetectedGroupForPay.penanggung_jawab || '').trim().toLowerCase();
        const matchedAnggota = (cachedAnggotaList || []).find(
          (a) => String(a.nama_lengkap || '').trim().toLowerCase() === memberName.toLowerCase()
        );

        const kode = `${groupBatchCode}-${i + 1}`;
        const splitMeta = `[SPLIT:${rates.uang_arisan},${rates.uang_kas},${rates.uang_konsumsi}]`;
        const fullKeterangan = [
          `Group: ${activeDetectedGroupForPay.nama_group} (${isPJ ? 'Penanggung Jawab' : 'PJ: ' + activeDetectedGroupForPay.penanggung_jawab})`,
          `Split Arisan ${formatRupiah(rates.uang_arisan)}, Kas ${formatRupiah(rates.uang_kas)}, Konsumsi ${formatRupiah(rates.uang_konsumsi)}`,
          ketInput,
          metode === 'Transfer Bank' && namaBank ? `Bank: ${namaBank}` : '',
          noRek ? `Rek: ${noRek}` : '',
          splitMeta
        ]
          .filter(Boolean)
          .join(' | ');

        await adaptiveSupabaseWrite(TABLES.PEMBAYARAN, {
          kode_transaksi: kode,
          anggota_id: (matchedAnggota && matchedAnggota.id) || null,
          arisan_id: selectedPeriodeId,
          user_id:
            (matchedAnggota && matchedAnggota.user_id) ||
            (currentLoggedUser ? currentLoggedUser.user_id : null),
          nama_pembayar: memberName,
          nama_group: activeDetectedGroupForPay.nama_group,
          penanggung_jawab: activeDetectedGroupForPay.penanggung_jawab,
          tanggal_bayar: tanggalBayar,
          jenis_bayar: jenisBayar,
          uang_arisan: rates.uang_arisan,
          uang_kas: rates.uang_kas,
          uang_konsumsi: rates.uang_konsumsi,
          nominal: rates.total,
          metode_bayar: metode === 'Transfer Bank' ? 'Transfer' : 'Tunai',
          nama_bank: metode === 'Transfer Bank' ? namaBank : null,
          no_rekening_pengirim: metode === 'Transfer Bank' ? noRek : null,
          bukti_bayar_url: uploadedPayBuktiDataUrl,
          keterangan: fullKeterangan,
          status: 'Pending'
        });
      }

      showGlobalAlert(
        `✅ Pembayaran Group <b>${activeDetectedGroupForPay.nama_group}</b> berhasil di-split kepada <b>${selectedMembers.length} anggota</b> (@${formatRupiah(rates.total)}: Arisan ${formatRupiah(rates.uang_arisan)}, Kas ${formatRupiah(rates.uang_kas)}, Konsumsi ${formatRupiah(rates.uang_konsumsi)}) dengan status <b>Pending</b>!`,
        'success'
      );
    } else {
      // Pembayaran Perorangan (Single Member)
      const kode = 'TX-ARS-' + Math.floor(1000 + Math.random() * 9000);
      const inputNamaPembayar = document.getElementById('payNama').value.trim();
      const inputNominal = Number(document.getElementById('payNominal').value || 0);

      const isArs = jenisBayar === 'Uang Arisan';
      const ua = isArs ? rates.uang_arisan : 0;
      const uk = isArs ? rates.uang_kas : 0;
      const uko = isArs ? rates.uang_konsumsi : 0;
      const splitMeta = isArs ? `[SPLIT:${ua},${uk},${uko}]` : '';

      const fullKeterangan = [
        isArs
          ? `Split Arisan ${formatRupiah(ua)}, Kas ${formatRupiah(uk)}, Konsumsi ${formatRupiah(uko)}`
          : '',
        ketInput,
        metode === 'Transfer Bank' && namaBank ? `Bank: ${namaBank}` : '',
        noRek ? `Rek: ${noRek}` : '',
        splitMeta
      ]
        .filter(Boolean)
        .join(' | ');

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
        tanggal_bayar: tanggalBayar,
        jenis_bayar: jenisBayar,
        uang_arisan: ua,
        uang_kas: uk,
        uang_konsumsi: uko,
        nominal: inputNominal,
        metode_bayar: metode === 'Transfer Bank' ? 'Transfer' : 'Tunai',
        nama_bank: metode === 'Transfer Bank' ? namaBank : null,
        no_rekening_pengirim: metode === 'Transfer Bank' ? noRek : null,
        bukti_bayar_url: uploadedPayBuktiDataUrl,
        keterangan: fullKeterangan,
        status: 'Pending'
      });

      showGlobalAlert('✅ Data pembayaran berhasil disimpan dengan status <b>Pending</b>!', 'success');
    }

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
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Pembayaran (Status: Pending)';
  }
}

// Submit Form Pembayaran (Default Status: Pending)
const formPembayaran = document.getElementById('formPembayaran');
if (formPembayaran) {
  formPembayaran.addEventListener('submit', async (e) => {
    e.preventDefault();
    await executeSavePembayaran(false);
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
// MODUL 5: PENGATURAN (PERIODE & SPLIT IURAN, PEMENANG & GROUP ARISAN)
// ============================================================================
function syncPeriodeTotalIuranInput() {
  const inpArisan = document.getElementById('perIuranArisan');
  const inpKas = document.getElementById('perIuranKas');
  const inpKonsumsi = document.getElementById('perIuranKonsumsi');
  const inpTotal = document.getElementById('perIuran');
  if (!inpArisan || !inpKas || !inpKonsumsi || !inpTotal) return;

  const ua = Number(inpArisan.value || 0);
  const uk = Number(inpKas.value || 0);
  const uko = Number(inpKonsumsi.value || 0);
  inpTotal.value = ua + uk + uko;
}

['perIuranArisan', 'perIuranKas', 'perIuranKonsumsi'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', syncPeriodeTotalIuranInput);
    el.addEventListener('change', syncPeriodeTotalIuranInput);
  }
});

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
      ...cachedPeriodeList.map((p) => {
        const sp = getArisanSplitValues(p);
        return `<option value="${p.id}">Periode Ke-${p.periode_ke} (${p.bulan_tahun}) - ${formatRupiah(sp.total)}/Orang</option>`;
      })
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
        tbodyPeriode.innerHTML = `<tr><td colspan="10" style="text-align:center;">Belum ada jadwal periode arisan.</td></tr>`;
      } else {
        tbodyPeriode.innerHTML = cachedPeriodeList
          .map((p) => {
            const sp = getArisanSplitValues(p);
            return `
            <tr>
              <td><strong>Periode Ke-${p.periode_ke}</strong></td>
              <td>${p.bulan_tahun || '-'}</td>
              <td>${p.tanggal_arisan || '-'}</td>
              <td>${p.tempat_arisan || '-'}</td>
              <td><span style="color:var(--primary); font-weight:700;">${formatRupiah(sp.uang_arisan)}</span></td>
              <td><span style="color:#b45309; font-weight:700;">${formatRupiah(sp.uang_kas)}</span></td>
              <td><span style="color:#0284c7; font-weight:700;">${formatRupiah(sp.uang_konsumsi)}</span></td>
              <td><strong>${formatRupiah(sp.total)}</strong></td>
              <td>${p.pemenang_nama ? '🏆 <strong>' + p.pemenang_nama + '</strong>' : '<span style="color:#64748b;">Belum diundi</span>'}</td>
              <td><span class="status-pill ${p.status === 'aktif' ? 'complete' : 'incomplete'}">${p.status || 'aktif'}</span></td>
            </tr>`;
          })
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
          keterangan: stripInternalMetaFromKeterangan(p.keterangan) || 'Tercatat di Periode Arisan'
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
              <td>${stripInternalMetaFromKeterangan(w.keterangan) || '-'}</td>
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
      const ua = Number(document.getElementById('perIuranArisan').value || DEFAULT_SPLIT_ARISAN);
      const uk = Number(document.getElementById('perIuranKas').value || DEFAULT_SPLIT_KAS);
      const uko = Number(document.getElementById('perIuranKonsumsi').value || DEFAULT_SPLIT_KONSUMSI);
      const iuran = ua + uk + uko;
      const tempat = document.getElementById('perTempat').value.trim();
      const status = document.getElementById('perStatus').value;
      const ketRaw = document.getElementById('perKeterangan').value.trim();
      const splitMeta = `[SPLIT:${ua},${uk},${uko}]`;
      const keterangan = [ketRaw, splitMeta].filter(Boolean).join(' ');

      await adaptiveSupabaseWrite(TABLES.ARISAN, {
        periode_ke: periodeKe,
        bulan_tahun: bulanTahun,
        tanggal_arisan: tanggalArisan,
        tempat_arisan: tempat,
        uang_arisan: ua,
        uang_kas: uk,
        uang_konsumsi: uko,
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
          uang_arisan: ua,
          uang_kas: uk,
          uang_konsumsi: uko,
          iuran_per_slot: iuran,
          status: status,
          keterangan: keterangan
        });
      } catch (_) { }

      formPeriodeArisan.reset();
      document.getElementById('perIuranArisan').value = DEFAULT_SPLIT_ARISAN;
      document.getElementById('perIuranKas').value = DEFAULT_SPLIT_KAS;
      document.getElementById('perIuranKonsumsi').value = DEFAULT_SPLIT_KONSUMSI;
      document.getElementById('perIuran').value = DEFAULT_TOTAL_IURAN;

      await loadPeriodeAndPemenangData();
      updateQuickStatsBar();
      showGlobalAlert(
        `✅ Setting Periode Ke-${periodeKe} (${bulanTahun}) berhasil disimpan dengan Split Iuran: Arisan ${formatRupiah(ua)}, Kas ${formatRupiah(uk)}, Konsumsi ${formatRupiah(uko)} (Total ${formatRupiah(iuran)})!`,
        'success'
      );
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Setting Periode';
    }
  });
}

// ============================================================================
// SUB-TAB 3 DI PENGATURAN: ENTRY GROUP ARISAN (MAKS 5 ORANG TERMASUK PJ)
// ============================================================================
function getLocalBackupGroups() {
  try {
    const raw = localStorage.getItem(GROUP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveLocalBackupGroups(groups) {
  try {
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups || []));
  } catch (_) {}
}

function populateGroupAnggotaDropdowns() {
  const pjSelect = document.getElementById('grpPenanggungJawab');
  const memberSelectIds = ['grpAnggota2', 'grpAnggota3', 'grpAnggota4', 'grpAnggota5'];

  // Ambil daftar anggota dari adnan_DataAnggota (DaftarAnggota)
  const validMembers = (cachedAnggotaList || []).filter((a) => {
    const uid = String(a.user_id || '').trim().toLowerCase();
    const nama = String(a.nama_lengkap || '').trim().toLowerCase();
    if (uid === 'admin' && nama.includes('admin arisan')) return false;
    return Boolean(nama);
  });

  if (pjSelect) {
    const prevPJ = pjSelect.value;
    pjSelect.innerHTML = [
      '<option value="">-- Pilih Penanggung Jawab Group (dari DaftarAnggota) --</option>',
      ...validMembers.map(
        (a) =>
          `<option value="${a.nama_lengkap}" data-id="${a.id}" data-uid="${a.user_id || ''}">${a.nama_lengkap}${a.no_hp ? ' (' + a.no_hp + ')' : ''}</option>`
      )
    ].join('');
    if (prevPJ && Array.from(pjSelect.options).some((o) => o.value === prevPJ)) {
      pjSelect.value = prevPJ;
    }
  }

  memberSelectIds.forEach((selId, idx) => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const prevVal = sel.value;
    sel.innerHTML = [
      `<option value="">-- Anggota #${idx + 2} (Kosong / Opsional) --</option>`,
      ...validMembers.map(
        (a) => `<option value="${a.nama_lengkap}">${a.nama_lengkap}</option>`
      )
    ].join('');
    if (prevVal && Array.from(sel.options).some((o) => o.value === prevVal)) {
      sel.value = prevVal;
    }
  });
}

async function loadGroupArisanData() {
  let remoteGroups = [];
  try {
    const res = await fetch(`${SUPABASE_REST_URL}/${TABLES.GROUP}?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (res.ok) {
      remoteGroups = await res.json();
    }
  } catch (_) {}

  const localGroups = getLocalBackupGroups();
  const mergedMap = new Map();

  (remoteGroups || []).forEach((g) => {
    const key = String(g.kode_group || g.nama_group || g.id).toLowerCase();
    mergedMap.set(key, g);
  });
  (localGroups || []).forEach((g) => {
    const key = String(g.kode_group || g.nama_group || g.id).toLowerCase();
    if (!mergedMap.has(key)) {
      mergedMap.set(key, g);
    }
  });

  cachedGroupList = Array.from(mergedMap.values());
  saveLocalBackupGroups(cachedGroupList);
  renderGroupArisanTable();
  syncPayGroupSplitUI();
}

function renderGroupArisanTable() {
  const tbody = document.getElementById('tableBodyGroupArisan');
  if (!tbody) return;

  if (!cachedGroupList || cachedGroupList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Belum ada Group Arisan terdaftar. Silakan isi form Entry Group Arisan di atas.</td></tr>`;
    return;
  }

  const rates = getActivePeriodeSplitRates();

  tbody.innerHTML = cachedGroupList
    .map((g, idx) => {
      const members = extractGroupMembersArray(g);
      const count = members.length;
      const totalTagihan = count * rates.total;
      const grpKey = g.id || g.kode_group || idx;

      const memberBadges = members
        .map((m, i) => {
          const isPJ = m.toLowerCase() === String(g.penanggung_jawab || '').trim().toLowerCase();
          return `<span class="gallery-badge" style="margin:2px; display:inline-block; ${isPJ ? 'background:#fef3c7; color:#b45309; border:1px solid #f59e0b;' : 'background:#f1f5f9; color:#334155;'}">
            ${i + 1}. ${m}${isPJ ? ' (👑 PJ)' : ''}
          </span>`;
        })
        .join(' ');

      return `
        <tr>
          <td><code>${g.kode_group || 'GRP-' + (idx + 1)}</code></td>
          <td>
            <strong>${g.nama_group || '-'}</strong>
            ${g.keterangan ? `<br><small style="color:#64748b;">${g.keterangan}</small>` : ''}
          </td>
          <td><strong>👑 ${g.penanggung_jawab || '-'}</strong></td>
          <td>${memberBadges}</td>
          <td><strong>${count} / 5 Orang</strong></td>
          <td>
            <strong style="color:var(--primary);">${formatRupiah(totalTagihan)}</strong>
            <br><small style="color:#64748b;">Arisan ${formatRupiah(count * rates.uang_arisan)} | Kas ${formatRupiah(count * rates.uang_kas)} | Konsumsi ${formatRupiah(count * rates.uang_konsumsi)}</small>
          </td>
          <td>
            <button type="button" class="btn-secondary btn-sm" style="color:#dc2626; border-color:#fecaca;" onclick="deleteGroupArisan('${grpKey}')">
              🗑️ Hapus
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function deleteGroupArisan(groupIdentifier) {
  const target = (cachedGroupList || []).find(
    (g, idx) =>
      String(g.id) === String(groupIdentifier) ||
      String(g.kode_group) === String(groupIdentifier) ||
      String(idx) === String(groupIdentifier)
  );
  if (!target) return;

  try {
    if (target.id) {
      await fetch(`${SUPABASE_REST_URL}/${TABLES.GROUP}?id=eq.${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
    }
  } catch (_) {}

  cachedGroupList = cachedGroupList.filter((g) => g !== target);
  saveLocalBackupGroups(cachedGroupList);
  renderGroupArisanTable();
  populateAdminPesertaDropdowns();
  syncPayGroupSplitUI();
  showGlobalAlert(`🗑️ Group Arisan <b>${target.nama_group}</b> berhasil dihapus.`, 'success');
}

window.deleteGroupArisan = deleteGroupArisan;

const formGroupArisan = document.getElementById('formGroupArisan');
if (formGroupArisan) {
  formGroupArisan.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitGroupArisan');
    const namaGroup = document.getElementById('grpNama').value.trim();
    const pjName = document.getElementById('grpPenanggungJawab').value.trim();
    const a2 = document.getElementById('grpAnggota2').value.trim();
    const a3 = document.getElementById('grpAnggota3').value.trim();
    const a4 = document.getElementById('grpAnggota4').value.trim();
    const a5 = document.getElementById('grpAnggota5').value.trim();
    const ket = document.getElementById('grpKeterangan').value.trim();

    if (!namaGroup || !pjName) {
      showGlobalAlert('Mohon isi Nama Group dan pilih Penanggung Jawab Group.', 'error');
      return;
    }

    // Gabungkan Penanggung Jawab (Anggota #1) + Anggota #2 s/d #5 (maksimal 5 orang unik)
    const rawMembers = [pjName, a2, a3, a4, a5].filter(Boolean);
    const uniqueMembers = [];
    for (const m of rawMembers) {
      if (uniqueMembers.some((u) => u.toLowerCase() === m.toLowerCase())) {
        showGlobalAlert(
          `Nama anggota <b>${m}</b> dipilih lebih dari satu kali dalam group yang sama. Mohon pilih anggota yang berbeda.`,
          'error'
        );
        return;
      }
      uniqueMembers.push(m);
    }

    if (uniqueMembers.length > 5) {
      showGlobalAlert('Jumlah anggota group maksimal 5 orang termasuk Penanggung Jawab.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Menyimpan Group...';

    try {
      const kodeGroup = 'GRP-' + Math.floor(100 + Math.random() * 900);
      const matchedPJ = (cachedAnggotaList || []).find(
        (a) => String(a.nama_lengkap || '').trim().toLowerCase() === pjName.toLowerCase()
      );

      const groupPayload = {
        kode_group: kodeGroup,
        nama_group: namaGroup,
        penanggung_jawab_id: (matchedPJ && matchedPJ.id) || null,
        penanggung_jawab_user_id: (matchedPJ && matchedPJ.user_id) || null,
        penanggung_jawab: pjName,
        anggota_1: uniqueMembers[0] || pjName,
        anggota_2: uniqueMembers[1] || null,
        anggota_3: uniqueMembers[2] || null,
        anggota_4: uniqueMembers[3] || null,
        anggota_5: uniqueMembers[4] || null,
        anggota_list: uniqueMembers,
        jumlah_anggota: uniqueMembers.length,
        keterangan: ket || null,
        status_aktif: true
      };

      let savedRecord = null;
      try {
        savedRecord = await adaptiveSupabaseWrite(TABLES.GROUP, groupPayload);
      } catch (_) {
        // Fallback ke localStorage apabila tabel adnan_GroupArisan belum dieksekusi di SQL Editor
        savedRecord = { ...groupPayload, id: 'local_' + Date.now() };
      }

      const finalGroup = savedRecord || { ...groupPayload, id: 'local_' + Date.now() };
      cachedGroupList = [
        finalGroup,
        ...cachedGroupList.filter(
          (g) => String(g.nama_group || '').toLowerCase() !== namaGroup.toLowerCase()
        )
      ];
      saveLocalBackupGroups(cachedGroupList);

      formGroupArisan.reset();
      renderGroupArisanTable();
      populateAdminPesertaDropdowns();
      syncPayGroupSplitUI();

      showGlobalAlert(
        `✅ Group Arisan <b>${namaGroup}</b> (Penanggung Jawab: <b>${pjName}</b>, Total <b>${uniqueMembers.length} Orang</b>) berhasil disimpan!`,
        'success'
      );
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Group Arisan';
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

