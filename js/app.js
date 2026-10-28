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
      ' Krom Bank',
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

// File DataURL sementara untuk upload bukti/foto/PDF
let uploadedPayBuktiDataUrl = null;
let uploadedExpBuktiDataUrl = null;
let uploadedAnnPdfDataUrl = null;
let uploadedAnnPdfName = null;
let uploadedGalFotoDataUrl = null;

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

function readFileAsDataURL(file, maxWidth = 1100) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    // Jika file gambar, kompres secara proporsional agar ringan disimpan ke database
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
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      // Untuk PDF atau dokumen lain
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
  }, 5500);
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

function openMediaModal(title, dataUrl) {
  const modal = document.getElementById('mediaModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBodyContent');
  if (!modal || !dataUrl) return;

  modalTitle.textContent = title || 'Pratinjau Dokumen / Bukti';
  if (String(dataUrl).startsWith('data:application/pdf') || String(dataUrl).toLowerCase().endsWith('.pdf')) {
    modalBody.innerHTML = `
      <iframe src="${dataUrl}"></iframe>
      <div style="margin-top:12px;">
        <a href="${dataUrl}" download="${title || 'dokumen'}.pdf" class="btn-primary btn-sm">⬇️ Unduh Dokumen PDF</a>
      </div>
    `;
  } else {
    modalBody.innerHTML = `<img src="${dataUrl}" alt="${title}" />`;
  }
  modal.classList.remove('hidden');
}

window.openMediaModal = openMediaModal;

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

  for (let attempt = 0; attempt < 10; attempt++) {
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
    } catch (_) {}

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
  // Jika biodata peserta belum terdaftar di adnan_DataAnggota, wajibkan mengisi Biodata terlebih dahulu!
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
  if (!container || !bio) return;

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
// LOAD DATA SEMUA MODUL (PEMBAYARAN, PENGELUARAN, PENGUMUMAN, GALERI, PERIODE)
// ============================================================================
async function loadAllDashboardModules() {
  await Promise.all([
    fetchAllAnggota(),
    loadPeriodeAndPemenangData(),
    loadPembayaranData(),
    loadPengeluaranData(),
    loadPengumumanData(),
    loadGaleriData()
  ]);
  updateQuickStatsBar();
}

let totalPemasukanKas = 0;
let totalPengeluaranKas = 0;

function updateQuickStatsBar() {
  const elMasuk = document.getElementById('statTotalMasuk');
  const elKeluar = document.getElementById('statTotalKeluar');
  const elSaldo = document.getElementById('statSaldoKas');
  const elPeriode = document.getElementById('statPeriodeAktif');
  const elTglPeriode = document.getElementById('statTanggalPeriode');
  const elPemenang = document.getElementById('statPemenangTerakhir');

  if (elMasuk) elMasuk.textContent = formatRupiah(totalPemasukanKas);
  if (elKeluar) elKeluar.textContent = formatRupiah(totalPengeluaranKas);
  if (elSaldo) elSaldo.textContent = formatRupiah(totalPemasukanKas - totalPengeluaranKas);

  const activePeriode =
    cachedPeriodeList.find((p) => p.status === 'aktif') || cachedPeriodeList[0] || null;
  if (activePeriode) {
    elPeriode.textContent = `Periode #${activePeriode.periode_ke} (${activePeriode.bulan_tahun})`;
    elTglPeriode.textContent = `${activePeriode.tanggal_arisan || '-'} • ${activePeriode.tempat_arisan || ''}`;
  } else {
    elPeriode.textContent = 'Belum Disetting';
    elTglPeriode.textContent = 'Klik Menu 5 untuk setting';
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
// MODUL 1: PEMBAYARAN (ARISAN, SUMBANGAN, ZAKAT, DLL)
// ============================================================================
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

    totalPemasukanKas = (rows || []).reduce((acc, r) => acc + Number(r.nominal || 0), 0);

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Belum ada transaksi pembayaran.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((r, idx) => {
        const metodeText =
          r.metode_bayar === 'Transfer Bank' || r.metode_bayar === 'Transfer'
            ? `Transfer ${r.nama_bank ? '(' + r.nama_bank + ')' : ''}`
            : 'Tunai (Cash)';

        const buktiBtn = r.bukti_bayar_url
          ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaModal('Bukti Pembayaran - ${r.nama_pembayar}', '${r.bukti_bayar_url}')">🖼️ Lihat Bukti</button>`
          : `<span style="color:#94a3b8; font-size:0.8rem;">Tidak ada</span>`;

        return `
          <tr>
            <td>${r.tanggal_bayar || '-'}</td>
            <td><code>${r.kode_transaksi || 'TX-' + (idx + 1)}</code></td>
            <td><strong>${r.nama_pembayar || '-'}</strong><br><small style="color:#64748b;">${r.keterangan || ''}</small></td>
            <td>${r.jenis_bayar || 'Uang Arisan'}</td>
            <td>${metodeText}</td>
            <td><strong>${formatRupiah(r.nominal)}</strong></td>
            <td>${buktiBtn}</td>
            <td><span class="status-pill complete">${r.status || 'disetujui'}</span></td>
          </tr>
        `;
      })
      .join('');
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

// Preview Upload Bukti Pembayaran
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
    if (file.type.startsWith('image/')) {
      previewBox.innerHTML = `<img src="${uploadedPayBuktiDataUrl}" alt="Preview Bukti Bayar" />`;
    } else {
      previewBox.innerHTML = `<span style="color:var(--primary); font-weight:600;">📄 File Bukti Siap Diunggah: ${file.name}</span>`;
    }
  });
}

// Submit Form Pembayaran
const formPembayaran = document.getElementById('formPembayaran');
if (formPembayaran) {
  formPembayaran.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitPembayaran');
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
      const selectedPeriodeId = document.getElementById('payPeriode').value || null;
      const noRek = document.getElementById('payNoRekening').value.trim();
      const ketInput = document.getElementById('payKeterangan').value.trim();
      const fullKeterangan = [
        ketInput,
        metode === 'Transfer Bank' && namaBank ? `Bank: ${namaBank}` : '',
        noRek ? `Rek: ${noRek}` : ''
      ]
        .filter(Boolean)
        .join(' | ');

      await adaptiveSupabaseWrite(TABLES.PEMBAYARAN, {
        kode_transaksi: kode,
        anggota_id: currentBiodataRecord && currentBiodataRecord.id ? currentBiodataRecord.id : null,
        arisan_id: selectedPeriodeId,
        user_id: currentLoggedUser ? currentLoggedUser.user_id : null,
        nama_pembayar: document.getElementById('payNama').value.trim(),
        tanggal_bayar: document.getElementById('payTanggal').value || todayISO(),
        jenis_bayar: document.getElementById('payJenis').value,
        nominal: Number(document.getElementById('payNominal').value || 0),
        metode_bayar: metode === 'Transfer Bank' ? 'Transfer' : 'Tunai',
        nama_bank: metode === 'Transfer Bank' ? namaBank : null,
        no_rekening_pengirim: metode === 'Transfer Bank' ? noRek : null,
        bukti_bayar_url: uploadedPayBuktiDataUrl,
        keterangan: fullKeterangan,
        status: 'disetujui'
      });

      formPembayaran.reset();
      document.getElementById('payTanggal').value = todayISO();
      if (currentBiodataRecord) {
        document.getElementById('payNama').value = currentBiodataRecord.nama_lengkap || '';
      }
      uploadedPayBuktiDataUrl = null;
      document.getElementById('payBuktiPreview').innerHTML = '';

      await loadPembayaranData();
      updateQuickStatsBar();
      showGlobalAlert('✅ Data pembayaran beserta bukti berhasil disimpan ke tabel <b>adnan_Pembayaran</b>!', 'success');
    } catch (err) {
      showGlobalAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Simpan Pembayaran';
    }
  });
}

// ============================================================================
// MODUL 2: PENGELUARAN / AKUNTANSI (KHUSUS ADMIN)
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
        const notaBtn = notaUrl
          ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaModal('Nota Pengeluaran', '${notaUrl}')">🧾 Lihat Nota</button>`
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
// MODUL 3: PENGUMUMAN & DOKUMEN PDF (adnan_Pengumuman)
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
      .map((r) => {
        const pdfUrl = r.file_pdf_url || r.lampiran_url || null;
        const pdfName = r.file_pdf_nama || 'Dokumen-Pengumuman.pdf';
        const pdfActions = pdfUrl
          ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
               <button type="button" class="btn-primary btn-sm" onclick="openMediaModal('${r.judul}', '${pdfUrl}')">📄 Buka / Pratinjau PDF</button>
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
// MODUL 4: GALERI FOTO KEGIATAN (adnan_Galeri)
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
      .map((r) => {
        const title = r.judul_kegiatan || r.judul || 'Kegiatan Keluarga Adnan';
        const imgUrl = r.foto_url || '';
        return `
          <div class="photo-card">
            <img src="${imgUrl}" alt="${title}" onclick="openMediaModal('${title}', '${imgUrl}')" />
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
        diunggah_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Anggota'
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
// MODUL 5: SETTING PERIODE ARISAN & PEMENANG ARISAN
// ============================================================================
async function loadPeriodeAndPemenangData() {
  const tbodyPeriode = document.getElementById('tableBodyPeriode');
  const tbodyPemenang = document.getElementById('tableBodyPemenang');
  const payPeriodeSelect = document.getElementById('payPeriode');
  const winPeriodeSelect = document.getElementById('winPeriode');
  const winAnggotaSelect = document.getElementById('winAnggota');

  try {
    // 1. Ambil daftar periode dari adnan_Arisan
    const resPeriode = await fetch(`${SUPABASE_REST_URL}/${TABLES.ARISAN}?select=*&order=periode_ke.asc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    cachedPeriodeList = resPeriode.ok ? await resPeriode.json() : [];

    // Populate dropdown periode di form Pembayaran & form Pemenang
    const periodeOptions = [
      '<option value="">-- Pilih Periode Arisan --</option>',
      ...cachedPeriodeList.map(
        (p) => `<option value="${p.id}">Periode Ke-${p.periode_ke} (${p.bulan_tahun})</option>`
      )
    ].join('');

    if (payPeriodeSelect) payPeriodeSelect.innerHTML = periodeOptions;
    if (winPeriodeSelect) winPeriodeSelect.innerHTML = periodeOptions;

    // Set default nomor periode berikutnya pada form tambah periode
    const nextPeriodeNum =
      cachedPeriodeList.length > 0
        ? Math.max(...cachedPeriodeList.map((p) => Number(p.periode_ke || 0))) + 1
        : 1;
    const perNomorEl = document.getElementById('perNomor');
    if (perNomorEl) perNomorEl.value = nextPeriodeNum;

    // Render tabel Periode Arisan
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

    // 2. Populate dropdown Anggota pada form Pemenang Arisan
    if (winAnggotaSelect) {
      winAnggotaSelect.innerHTML = [
        '<option value="">-- Pilih Anggota Pemenang --</option>',
        ...cachedAnggotaList.map(
          (a) =>
            `<option value="${a.id}" data-nama="${a.nama_lengkap}">${a.nama_lengkap} (${a.jumlah_slot || a.jumlah_ikut_arisan || 1} Slot ${a.sudah_menang ? '• Sudah Pernah Menang' : ''})</option>`
        )
      ].join('');
    }

    // 3. Ambil daftar Pemenang Arisan dari adnan_PemenangArisan (atau fallback dari adnan_Arisan yang sudah ada pemenang_nama)
    let winnerRows = [];
    const resWin = await fetch(`${SUPABASE_REST_URL}/${TABLES.PEMENANG}?select=*&order=periode_ke.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (resWin.ok) {
      winnerRows = await resWin.json();
    }

    // Gabungkan juga dari adnan_Arisan jika ada pemenang yang tercatat langsung di adnan_Arisan
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

// Submit Form Setting Periode Arisan
const formPeriodeArisan = document.getElementById('formPeriodeArisan');
if (formPeriodeArisan) {
  formPeriodeArisan.addEventListener('submit', async (e) => {
    e.preventDefault();
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

      // Simpan ke adnan_Arisan
      await adaptiveSupabaseWrite(TABLES.ARISAN, {
        periode_ke: periodeKe,
        bulan_tahun: bulanTahun,
        tanggal_arisan: tanggalArisan,
        tempat_arisan: tempat,
        iuran_per_slot: iuran,
        status: status,
        keterangan: keterangan
      });

      // Simpan juga ke adnan_PeriodeArisan jika tabel sudah diaktifkan dari supabase_schema.sql
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
      } catch (_) {}

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

// Tombol Kocok Undian Pemenang Otomatis
const btnKocokUndian = document.getElementById('btnKocokUndian');
if (btnKocokUndian) {
  btnKocokUndian.addEventListener('click', () => {
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

// Submit Form Penetapan Pemenang Arisan
const formPemenangArisan = document.getElementById('formPemenangArisan');
if (formPemenangArisan) {
  formPemenangArisan.addEventListener('submit', async (e) => {
    e.preventDefault();
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

      // 1. Update pemenang pada tabel adnan_Arisan
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

      // 2. Tandai anggota sudah_menang pada adnan_DataAnggota
      await adaptiveSupabaseWrite(
        TABLES.ANGGOTA,
        {
          sudah_menang: true,
          periode_menang_ke: selectedPeriode.periode_ke
        },
        `?id=eq.${encodeURIComponent(selectedAnggota.id)}`
      );

      // 3. Simpan ke tabel adnan_PemenangArisan (jika tabel sudah dibuat di Supabase)
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
      } catch (_) {}

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
// ALUR SETELAH LOGIN: CEK adnan_DataAnggota -> WAJIB ISI ATAU BUKA GALLERY
// ============================================================================
async function handlePostLoginFlow(user) {
  currentLoggedUser = user;
  const authView = document.getElementById('authView');
  const memberAppView = document.getElementById('memberAppView');

  if (!user) {
    authView.classList.remove('hidden');
    memberAppView.classList.add('hidden');
    return;
  }

  authView.classList.add('hidden');
  memberAppView.classList.remove('hidden');

  const displayName = user.nama_lengkap || user.nama || user.user_id || 'Peserta';
  const displayUid = user.user_id || user.username || '-';
  const adminFlag = isUserAdmin();

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  document.getElementById('headerAvatar').textContent = initials || 'KA';
  document.getElementById('welcomeUserText').textContent = displayName;
  document.getElementById('userDetailText').textContent = `User ID: ${displayUid} • Role: ${adminFlag ? 'Administrator' : 'Peserta Arisan'}`;

  // Tampilkan badge Admin & atur akses form Pengeluaran Khusus Admin
  document.getElementById('roleBadgePill').classList.toggle('hidden', !adminFlag);
  document.getElementById('adminExpenseFormCard').classList.toggle('hidden', !adminFlag);
  document.getElementById('nonAdminExpenseNotice').classList.toggle('hidden', adminFlag);

  // Set default tanggal hari ini di semua form
  ['payTanggal', 'expTanggal', 'galTanggal', 'winTanggal'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = todayISO();
  });

  try {
    const biodata = await checkBiodataAnggotaInSupabase(user);
    currentBiodataRecord = biodata;
    populateBiodataForm(user, biodata);

    const statusPill = document.getElementById('biodataStatusPill');
    const mandatoryBanner = document.getElementById('mandatoryBanner');
    const tabBtnRingkasan = document.getElementById('tabBtnRingkasan');
    const btnBackFromBio = document.getElementById('btnBackToGalleryFromBio');

    if (!biodata) {
      // BELUM TEREGISTER DI adnan_DataAnggota -> WAJIB ISI ENTRY BIODATA DULU
      statusPill.textContent = '⚠️ Wajib Isi Biodata';
      statusPill.className = 'status-pill incomplete';
      mandatoryBanner.classList.remove('hidden');
      tabBtnRingkasan.disabled = true;
      if (btnBackFromBio) btnBackFromBio.classList.add('hidden');
      switchMainView('viewBiodata');
      switchBioSubTab('tabPribadi');
    } else {
      // SUDAH TEREGISTER DI adnan_DataAnggota -> TAMPILKAN LAYAR UTAMA MENU GALLERY
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

// Submit Form Entry Biodata (adnan_DataAnggota)
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
        status_aktif: true
      };

      const filter =
        currentBiodataRecord && currentBiodataRecord.id
          ? `?id=eq.${encodeURIComponent(currentBiodataRecord.id)}`
          : '';

      const saved = await adaptiveSupabaseWrite(TABLES.ANGGOTA, payload, filter);
      currentBiodataRecord = saved || payload;

      document.getElementById('biodataStatusPill').textContent = '✓ Anggota Terdaftar';
      document.getElementById('biodataStatusPill').className = 'status-pill complete';
      document.getElementById('mandatoryBanner').classList.add('hidden');
      document.getElementById('tabBtnRingkasan').disabled = false;
      document.getElementById('btnBackToGalleryFromBio').classList.remove('hidden');

      renderBiodataSummary(currentBiodataRecord);
      await loadAllDashboardModules();
      switchMainView('viewGalleryHome');
      showGlobalAlert('🎉 Biodata Anda telah teregister di <b>adnan_DataAnggota</b>! Selamat datang di Layar Utama Menu Gallery.', 'success');
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
    localStorage.removeItem(SESSION_KEY);
    currentLoggedUser = null;
    currentBiodataRecord = null;
    handlePostLoginFlow(null);
    setAuthMode(false);
  });
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  populateAllBankDropdowns();
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      handlePostLoginFlow(JSON.parse(saved));
    }
  } catch (_) {
    localStorage.removeItem(SESSION_KEY);
  }
});
