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

// Perincian Uang Arisan:
// a. Uang Arisan: Rp 100.000
// b. Konsumsi:    Rp 30.000
// c. Kas:         Rp 40.000
// Total:          Rp 170.000
// Dibayarkan ke Pemenang = Uang Arisan (100.000) + Konsumsi (30.000) = Rp 130.000 (sisanya Rp 40.000 masuk Kas)
const DEFAULT_SPLIT_ARISAN = 100000;
const DEFAULT_SPLIT_KONSUMSI = 30000;
const DEFAULT_SPLIT_KAS = 40000;
const DEFAULT_TOTAL_IURAN = 170000;
const DEFAULT_DIBAYARKAN_PEMENANG = 130000;

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
let cachedPengeluaranList = [];
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
// HELPER EKSTRAKSI NILAI PERIODE ARISAN
// Perincian Uang Arisan:
// a. Uang Arisan = 100.000
// b. Konsumsi    = 30.000
// c. Kas         = 40.000
// Total          = 170.000
// Dibayarkan ke Pemenang = Uang Arisan (100.000) + Konsumsi (30.000) = 130.000, sisanya (40.000) masuk Kas
// ============================================================================
function getArisanSplitValues(periodeRow) {
  if (!periodeRow) {
    return {
      uang_arisan: DEFAULT_SPLIT_ARISAN,
      uang_kas: DEFAULT_SPLIT_KAS,
      uang_konsumsi: DEFAULT_SPLIT_KONSUMSI,
      nominal_arisan_konsumsi: DEFAULT_DIBAYARKAN_PEMENANG,
      total: DEFAULT_TOTAL_IURAN
    };
  }
  const ket = String(periodeRow.keterangan || '');
  const metaMatch = ket.match(/\[SPLIT:(\d+),(\d+),(\d+)\]/);

  const rawArisan =
    periodeRow.uang_arisan ??
    periodeRow.nominal_arisan ??
    periodeRow.dana_arisan ??
    periodeRow.arisan ??
    (metaMatch ? metaMatch[1] : null);
  const rawKas =
    periodeRow.uang_kas ??
    periodeRow.dana_kas ??
    periodeRow.kas ??
    (metaMatch ? metaMatch[2] : null);
  const rawKonsumsi =
    periodeRow.uang_konsumsi ??
    periodeRow.dana_konsumsi ??
    periodeRow.konsumsi ??
    periodeRow.biaya_konsumsi ??
    (metaMatch ? metaMatch[3] : null);

  let uang_arisan = rawArisan != null && Number(rawArisan) > 0 ? Number(rawArisan) : DEFAULT_SPLIT_ARISAN;
  let uang_konsumsi = rawKonsumsi != null && Number(rawKonsumsi) > 0 ? Number(rawKonsumsi) : DEFAULT_SPLIT_KONSUMSI;
  let uang_kas = rawKas != null && Number(rawKas) > 0 ? Number(rawKas) : DEFAULT_SPLIT_KAS;

  // Dibayarkan ke pemenang: Uang Arisan (100.000) + Uang Konsumsi (30.000) = 130.000
  const nominal_arisan_konsumsi = uang_arisan + uang_konsumsi;
  // Total rincian uang arisan: Arisan (100.000) + Konsumsi (30.000) + Kas (40.000) = 170.000
  const total = uang_arisan + uang_konsumsi + uang_kas;

  return { uang_arisan, uang_kas, uang_konsumsi, nominal_arisan_konsumsi, total };
}

function getEffectiveJenisBayar(payRow) {
  if (!payRow) return 'Uang Arisan';
  if (typeof payRow === 'string') return payRow.trim() || 'Uang Arisan';
  const ket = String(payRow.keterangan || '');
  const jenisMatch = ket.match(/\[JENIS:([^\]]+)\]/);
  if (jenisMatch && jenisMatch[1]) {
    return jenisMatch[1].trim();
  }
  return String(payRow.jenis_bayar || 'Uang Arisan').trim();
}

function getPaymentSplitValues(payRow) {
  const nominal = Number((payRow && payRow.nominal) || 0);
  const jenis = getEffectiveJenisBayar(payRow);
  const isArisan = jenis.toLowerCase().includes('arisan');

  if (!isArisan) {
    return {
      uang_arisan: 0,
      uang_kas: 0,
      uang_konsumsi: 0,
      dibayarkan_pemenang: nominal,
      total_rincian: nominal,
      total: nominal
    };
  }

  // Cek periode terkait terlebih dahulu untuk referensi rate dasar
  let baseRates = getArisanSplitValues(null);
  if (payRow && payRow.arisan_id && Array.isArray(cachedPeriodeList) && cachedPeriodeList.length > 0) {
    const relPeriode = cachedPeriodeList.find((p) => String(p.id) === String(payRow.arisan_id));
    if (relPeriode) {
      baseRates = getArisanSplitValues(relPeriode);
    }
  }

  const ket = String((payRow && payRow.keterangan) || '');
  const metaMatch = ket.match(/\[SPLIT:(\d+),(\d+),(\d+)\]/);

  if (
    payRow &&
    (payRow.uang_arisan != null || payRow.uang_kas != null || payRow.uang_konsumsi != null) &&
    (Number(payRow.uang_arisan) > 0 || Number(payRow.uang_kas) > 0 || Number(payRow.uang_konsumsi) > 0)
  ) {
    const ua = Number(payRow.uang_arisan || 0) || baseRates.uang_arisan;
    const uko = Number(payRow.uang_konsumsi || 0) || baseRates.uang_konsumsi;
    const mult = baseRates.uang_arisan > 0 ? Math.max(1, Math.round(ua / baseRates.uang_arisan)) : 1;
    const uk = Number(payRow.uang_kas || 0) > 0 ? Number(payRow.uang_kas) : mult * baseRates.uang_kas;
    const dibayarkan_pemenang = ua + uko;
    const total_rincian = ua + uko + uk;
    return {
      uang_arisan: ua,
      uang_kas: uk,
      uang_konsumsi: uko,
      dibayarkan_pemenang,
      total_rincian,
      total: nominal || dibayarkan_pemenang
    };
  }

  if (metaMatch) {
    const ua = Number(metaMatch[1] || 0) || baseRates.uang_arisan;
    const uko = Number(metaMatch[3] || 0) || baseRates.uang_konsumsi;
    const mult = baseRates.uang_arisan > 0 ? Math.max(1, Math.round(ua / baseRates.uang_arisan)) : 1;
    const uk = Number(metaMatch[2] || 0) > 0 ? Number(metaMatch[2]) : mult * baseRates.uang_kas;
    const dibayarkan_pemenang = ua + uko;
    const total_rincian = ua + uko + uk;
    return {
      uang_arisan: ua,
      uang_kas: uk,
      uang_konsumsi: uko,
      dibayarkan_pemenang,
      total_rincian,
      total: nominal || dibayarkan_pemenang
    };
  }

  // Fallback ke rincian standar (a. Arisan 100.000, b. Konsumsi 30.000, c. Kas 40.000 = Total 170.000; Dibayarkan Pemenang = 130.000)
  const ua = baseRates.uang_arisan;
  const uko = baseRates.uang_konsumsi;
  const uk = baseRates.uang_kas;
  const dibayarkan_pemenang = ua + uko;
  const total_rincian = ua + uko + uk;

  return {
    uang_arisan: ua,
    uang_kas: uk,
    uang_konsumsi: uko,
    dibayarkan_pemenang,
    total_rincian,
    total: nominal || dibayarkan_pemenang
  };
}

function isPeriodeArisanAktif(p) {
  if (!p) return false;
  const st = String(p.status || 'aktif').trim().toLowerCase();
  return st === 'aktif' || st === 'active';
}

function getActivePeriodeList() {
  return (cachedPeriodeList || []).filter((p) => isPeriodeArisanAktif(p));
}

function formatPeriodeArisanLabel(p) {
  if (!p) return '';
  const cleanKet = stripInternalMetaFromKeterangan(p.keterangan);
  if (cleanKet && cleanKet.trim()) {
    return cleanKet.trim();
  }
  const bulanText = p.bulan_tahun ? ` - ${p.bulan_tahun}` : '';
  return `Periode ${p.periode_ke}${bulanText}`;
}

function getPaymentPeriodeArisanLabel(payRow) {
  if (!payRow) return '-';
  if (payRow.periode_arisan) return String(payRow.periode_arisan).trim();
  if (payRow.Periode_Arisan) return String(payRow.Periode_Arisan).trim();
  if (payRow['Periode Arisan']) return String(payRow['Periode Arisan']).trim();
  if (payRow.nama_periode) return String(payRow.nama_periode).trim();
  const ket = String(payRow.keterangan || '');
  const perMatch = ket.match(/\[PERIODE:([^\]]+)\]/);
  if (perMatch && perMatch[1]) return perMatch[1].trim();
  if (payRow.arisan_id && Array.isArray(cachedPeriodeList) && cachedPeriodeList.length > 0) {
    const relPeriode = cachedPeriodeList.find((p) => String(p.id) === String(payRow.arisan_id));
    if (relPeriode) return stripInternalMetaFromKeterangan(relPeriode.keterangan) || formatPeriodeArisanLabel(relPeriode);
  }
  if (isJenisArisan(payRow)) {
    const activePer = getActivePeriodeList()[0];
    if (activePer) return stripInternalMetaFromKeterangan(activePer.keterangan) || formatPeriodeArisanLabel(activePer);
  }
  return '-';
}

function stripInternalMetaFromKeterangan(ket) {
  if (!ket) return '';
  return String(ket)
    .replace(/\s*\[SPLIT:[^\]]*\]\s*/gi, '')
    .replace(/\s*\[JENIS:[^\]]*\]\s*/gi, '')
    .replace(/\s*\[PERIODE:[^\]]*\]\s*/gi, '')
    .replace(/\s*\[LIVESPINSTATE:[^\]]*\]\s*/gi, '')
    .replace(/\s*\[REK:[^\]]*\]\s*/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[\[\]]/g, '')
    .split('|')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const lower = part.toLowerCase();
      if (lower.startsWith('group:')) return false;
      if (lower.startsWith('split arisan')) return false;
      if (lower.includes('dibayarkan pemenang')) return false;
      if (lower.includes('masuk kas')) return false;
      if (lower.includes('sisa kas')) return false;
      if (lower.includes('uang arisan') && lower.includes('konsumsi')) return false;
      return true;
    })
    .join(' | ')
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
// HELPER FORMAT RUPIAH, TANGGAL (dd mmm yyyy) & FILE READER
// ============================================================================
const BULAN_PENDEK_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDateDdMmmYyyy(val) {
  if (val === null || val === undefined || val === '') return '-';
  const str = String(val).trim();
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const day = String(d.getDate()).padStart(2, '0');
  const month = BULAN_PENDEK_ID[d.getMonth()] || 'Jan';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function isDateColumnOrIsoValue(colName, val) {
  const c = String(colName || '').toLowerCase();
  const v = String(val || '').trim();
  if (
    c.includes('created_at') ||
    c.includes('updated_at') ||
    c.includes('tanggal') ||
    c.includes('tgl') ||
    c.includes('date')
  ) {
    return true;
  }
  return /^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(v);
}

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
      } catch (_) { }
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
function getJenisBayarFallbackCandidates(originalJenis) {
  const orig = String(originalJenis || 'Uang Arisan').trim();
  const lower = orig.toLowerCase();
  const specific = [];

  if (lower.includes('sumbangan')) {
    specific.push('Sumbangan Keluarga', 'Sumbangan', 'Sumbangan Wajib', 'Sumbangan Sukarela', 'Donasi', 'sumbangan');
  } else if (lower.includes('zakat')) {
    specific.push('Zakat', 'Zakat Maal', 'Zakat Fitrah', 'Zakat & Infaq', 'zakat');
  } else if (lower.includes('infaq') || lower.includes('sedekah') || lower.includes('infak')) {
    specific.push('Infaq & Sedekah', 'Infaq', 'Infak', 'Sedekah', 'Infaq/Sedekah', 'infaq', 'sedekah');
  } else if (lower.includes('sosial') || lower.includes('duka') || lower.includes('santunan')) {
    specific.push('Dana Sosial / Duka', 'Dana Sosial', 'Santunan Duka', 'Santunan', 'Sosial', 'Duka', 'Sumbangan Keluarga', 'Sumbangan', 'sosial');
  } else if (lower.includes('konsumsi') || lower.includes('kas')) {
    specific.push('Uang Konsumsi', 'Konsumsi', 'Uang Kas', 'Kas', 'Iuran Kas', 'konsumsi', 'kas');
  } else if (lower.includes('arisan')) {
    specific.push('Uang Arisan', 'Arisan', 'Iuran Arisan', 'Setoran Arisan', 'arisan', 'iuran');
  } else {
    specific.push('Lainnya', 'Lain-lain', 'Umum', 'lainnya');
  }

  // Ambil nilai jenis_bayar yang sudah terbukti lolos constraint dari baris yang ada di tabel adnan_Pembayaran
  const existingDbValues = [];
  const existingArisanDbValues = [];
  (cachedPembayaranList || []).forEach((r) => {
    const dbVal = String(r.jenis_bayar_db || r.jenis_bayar || '').trim();
    if (!dbVal) return;
    if (dbVal.toLowerCase().includes('arisan')) {
      if (!existingArisanDbValues.includes(dbVal)) existingArisanDbValues.push(dbVal);
    } else {
      if (!existingDbValues.includes(dbVal)) existingDbValues.push(dbVal);
    }
  });

  const general = [
    'Lainnya',
    'Sumbangan Keluarga',
    'Sumbangan',
    'Zakat',
    'Infaq & Sedekah',
    'Infaq',
    'Dana Sosial / Duka',
    'Dana Sosial',
    'Santunan',
    'Uang Konsumsi',
    'Konsumsi',
    'Uang Kas',
    'Kas',
    ...existingDbValues,
    'Uang Arisan',
    'Arisan',
    'Iuran Arisan',
    ...existingArisanDbValues,
    'lainnya',
    'sumbangan',
    'zakat',
    'infaq',
    'arisan',
    'iuran',
    'kas',
    'konsumsi'
  ];

  const unique = [];
  [...specific, ...general].forEach((val) => {
    if (val && !unique.includes(val)) {
      unique.push(val);
    }
  });
  return unique;
}

async function adaptiveSupabaseWrite(tableName, payloadObj, queryFilter = '') {
  let payload = { ...payloadObj };
  const method = queryFilter ? 'PATCH' : 'POST';
  const url = `${SUPABASE_REST_URL}/${tableName}${queryFilter}`;

  const originalJenisBayar = payload.jenis_bayar ? String(payload.jenis_bayar).trim() : null;
  const triedJenisBayar = new Set(originalJenisBayar ? [originalJenisBayar] : []);
  const triedMetodeBayar = new Set(payload.metode_bayar ? [String(payload.metode_bayar)] : []);
  const triedStatus = new Set(payload.status ? [String(payload.status)] : []);
  const triedKategori = new Set(payload.kategori ? [String(payload.kategori)] : []);

  for (let attempt = 0; attempt < 30; attempt++) {
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
      const missingCol = missingColMatch[1];
      if (missingCol === 'periode_arisan' && payload.periode_arisan !== undefined) {
        payload['Periode_Arisan'] = payload.periode_arisan;
        delete payload.periode_arisan;
        continue;
      }
      delete payload[missingCol];
      continue;
    }

    // Jika terjadi pelanggaran CHECK CONSTRAINT (Error 23514) pada jenis_bayar, metode_bayar, status, atau kategori
    if (errData.code === '23514') {
      const errText = `${errData.message || ''} ${errData.details || ''} ${errData.hint || ''}`.toLowerCase();

      // 1. Check constraint pada jenis_bayar (contoh: "adnan_Pembayaran_jenis_bayar_check")
      if (errText.includes('jenis_bayar') && originalJenisBayar) {
        // Pastikan jenis pembayaran asli yang dipilih user tersimpan utuh di metadata keterangan [JENIS:...]
        const currentKet = String(payload.keterangan || '');
        if (!currentKet.includes('[JENIS:')) {
          payload.keterangan = [currentKet, `[JENIS:${originalJenisBayar}]`].filter(Boolean).join(' | ');
        }

        const candidates = getJenisBayarFallbackCandidates(originalJenisBayar);
        const nextJenis = candidates.find((c) => !triedJenisBayar.has(c));
        if (nextJenis) {
          triedJenisBayar.add(nextJenis);
          payload.jenis_bayar = nextJenis;
          continue;
        }
      }

      // 2. Check constraint pada metode_bayar (contoh: "adnan_Pembayaran_metode_bayar_check")
      if (errText.includes('metode') && payload.metode_bayar != null) {
        const isTransfer = String(payload.metode_bayar).toLowerCase().includes('transfer');
        const metodeCandidates = isTransfer
          ? ['Transfer Bank', 'Transfer', 'transfer', 'Bank Transfer', 'Tunai', 'tunai']
          : ['Tunai', 'tunai', 'Cash', 'cash', 'Transfer Bank', 'Transfer'];
        const nextMetode = metodeCandidates.find((m) => !triedMetodeBayar.has(m));
        if (nextMetode) {
          triedMetodeBayar.add(nextMetode);
          payload.metode_bayar = nextMetode;
          continue;
        }
      }

      // 3. Check constraint pada kategori (misal adnan_Pengeluaran / adnan_Pengumuman)
      if (errText.includes('kategori') && payload.kategori != null) {
        const kategoriCandidates = ['Lainnya', 'Operasional', 'Konsumsi', 'Santunan', 'Arisan', 'Umum', 'lainnya', 'umum'];
        const nextKat = kategoriCandidates.find((k) => !triedKategori.has(k));
        if (nextKat) {
          triedKategori.add(nextKat);
          payload.kategori = nextKat;
          continue;
        }
      }

      // 4. Check constraint pada kolom status (misal 'Pending' -> 'pending' / 'menunggu' / 'disetujui' / 'lunas')
      if (payload.status != null && (errText.includes('status') || !errText.includes('jenis_bayar'))) {
        const statusCandidates = ['Pending', 'pending', 'menunggu', 'Menunggu', 'belum_lunas', 'disetujui', 'Disetujui', 'lunas', 'Lunas', 'verified', 'aktif'];
        const nextStatus = statusCandidates.find((s) => !triedStatus.has(s));
        if (nextStatus) {
          triedStatus.add(nextStatus);
          payload.status = nextStatus;
          continue;
        }
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
  const role = String(currentLoggedUser.role || '').trim().toLowerCase();
  if (role) return role === 'admin';
  const uid = String(currentLoggedUser.user_id || currentLoggedUser.username || '').trim().toLowerCase();
  return uid === 'admin';
}

function switchMainView(targetViewId) {
  stopCameraStream();

  // Proteksi Tab Pengaturan: Hanya bisa dibuka oleh User yang memiliki Role Admin
  if (targetViewId === 'viewPeriode' && !isUserAdmin()) {
    showGlobalAlert('Menu Pengaturan hanya dapat diakses oleh User yang memiliki Role Admin.', 'error');
    return;
  }

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

  if (targetViewId === 'viewLiveUndian' && typeof refreshLiveUndianUI === 'function') {
    refreshLiveUndianUI();
  }

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
  if (!isUserAdmin()) {
    showGlobalAlert('Menu Pengaturan hanya dapat diakses oleh User yang memiliki Role Admin.', 'error');
    return;
  }
  document.querySelectorAll('[data-periode-subtab]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-periode-subtab') === targetSubTabId);
  });

  document.querySelectorAll('#viewPeriode .sub-tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetSubTabId);
  });

  if (targetSubTabId === 'subTabMonitoringBayar') {
    renderMonitoringPembayaran();
  } else if (targetSubTabId === 'subTabMutasiKeuangan') {
    renderMutasiKeuanganTable();
  } else if (targetSubTabId === 'subTabDaftarUser') {
    loadRegisteredUsersData();
  } else if (targetSubTabId === 'subTabDatabaseManager') {
    const selector = document.getElementById('dbTableSelector');
    if (selector && !selector.value) {
      selector.value = 'adnan_User';
      fetchDbTableData('adnan_User');
    }
  }
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
  const elBuyut = document.getElementById('bioNamaKakekBuyut');
  if (elBuyut) elBuyut.value = (bio && bio.nama_kakek_buyut) || '';
  const elNenekBuyut = document.getElementById('bioNamaNenekBuyut');
  if (elNenekBuyut) elNenekBuyut.value = (bio && bio.nama_nenek_buyut) || '';
  const elKakek = document.getElementById('bioNamaKakek');
  if (elKakek) elKakek.value = (bio && bio.nama_kakek) || '';
  const elNenek = document.getElementById('bioNamaNenek');
  if (elNenek) elNenek.value = (bio && bio.nama_nenek) || '';
  const elAyah = document.getElementById('bioNamaAyah');
  if (elAyah) elAyah.value = (bio && bio.nama_ayah) || 'H. Adnan';
  const elIbu = document.getElementById('bioNamaIbu');
  if (elIbu) elIbu.value = (bio && bio.nama_ibu) || '';
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
let totalPengeluaranPembayaran = 0;
let totalSplitArisanPeriode = 0;
let totalSplitKasPeriode = 0;
let totalSplitKonsumsiPeriode = 0;

async function loadAllDashboardModules() {
  await Promise.all([
    fetchAllAnggota(),
    loadPeriodeAndPemenangData(),
    loadGroupArisanData(),
    loadRegisteredUsersData(),
    loadPembayaranData(),
    loadPengeluaranData(),
    loadPengumumanData(),
    loadGaleriData()
  ]);
  populateAdminPesertaDropdowns();
  populateGroupAnggotaDropdowns();
  populatePengeluaranAnggotaDropdown();
  syncPayGroupSplitUI();
  renderPembayaranTableRows();
  renderMemberGallery();
  updateQuickStatsBar();
  if (typeof initOrRefreshLiveUndian === 'function') {
    await initOrRefreshLiveUndian();
  }
}

function isJenisArisan(jenisBayarOrRow) {
  const effectiveJenis = getEffectiveJenisBayar(jenisBayarOrRow);
  return String(effectiveJenis || '').toLowerCase().includes('arisan');
}

function computePeriodeArisanPemasukanTotals() {
  let sumTotal = 0;
  let sumArisan = 0;
  let sumKas = 0;
  let sumKonsumsi = 0;

  // 1. Ambil data Periode Aktif (dari kotak disamping / tabel adnan_Arisan dengan status Aktif)
  const activePeriods = getActivePeriodeList();
  const activePeriode = activePeriods[0] || null;

  const activeKet = activePeriode && activePeriode.keterangan ? String(activePeriode.keterangan).trim().toLowerCase() : '';
  const activeId = activePeriode && activePeriode.id ? String(activePeriode.id).trim().toLowerCase() : '';
  const activeNo = activePeriode && activePeriode.periode_ke != null ? String(activePeriode.periode_ke).trim() : '';
  const activeBulan = activePeriode && activePeriode.bulan_tahun ? String(activePeriode.bulan_tahun).trim().toLowerCase() : '';

  // 2. Cari pada tabel adnan_Pembayaran dan filter berdasarkan Periode_Arisan sesuai Periode Aktif
  const arisanPayments = (cachedPembayaranList || []).filter((r) => {
    if (!isJenisArisan(r)) return false;

    // Abaikan jika status ditolak
    const st = String(r.status || '').toLowerCase();
    if (st === 'ditolak') return false;

    // Jika belum ada jadwal periode aktif yang diset
    if (!activePeriode) return false;

    // Nilai header Periode_Arisan / periode_arisan pada record pembayaran
    const rPeriode = String(
      r.Periode_Arisan ||
      r.periode_arisan ||
      r['Periode Arisan'] ||
      getPaymentPeriodeArisanLabel(r) ||
      ''
    ).trim().toLowerCase();

    // Kecocokan 1: ID Periode cocok
    if (r.arisan_id && activeId && String(r.arisan_id).toLowerCase() === activeId) {
      return true;
    }

    // Kecocokan 2: Header Periode_Arisan sama persis atau mengandung keterangan Periode Aktif
    if (rPeriode && activeKet && (rPeriode === activeKet || rPeriode.includes(activeKet) || activeKet.includes(rPeriode))) {
      return true;
    }

    // Kecocokan 3: Cocok dengan format nomor periode (contoh: "Periode 1")
    if (activeNo && rPeriode && (rPeriode === `periode ${activeNo}` || rPeriode.startsWith(`periode ${activeNo}`) || rPeriode.startsWith(`periode ke-${activeNo}`))) {
      return true;
    }

    // Kecocokan 4: Cocok dengan Bulan & Tahun
    if (activeBulan && rPeriode && rPeriode.includes(activeBulan)) {
      return true;
    }

    return false;
  });

  arisanPayments.forEach((p) => {
    const sp = getPaymentSplitValues(p);
    sumArisan += Number(sp.uang_arisan || 0);
    sumKas += Number(sp.uang_kas || 0);
    sumKonsumsi += Number(sp.uang_konsumsi || 0);
    sumTotal += Number(sp.total_rincian || p.nominal || 0);
  });

  totalSplitArisanPeriode = sumArisan;
  totalSplitKasPeriode = sumKas;
  totalSplitKonsumsiPeriode = sumKonsumsi;
  totalPemasukanArisan = sumTotal;

  return {
    total: sumTotal,
    uang_arisan: sumArisan,
    uang_kas: sumKas,
    uang_konsumsi: sumKonsumsi,
    count: arisanPayments.length,
    payments: arisanPayments
  };
}

function updateQuickStatsBar() {
  computePeriodeArisanPemasukanTotals();
  const activePeriods = getActivePeriodeList();

  const elMasukArisan = document.getElementById('statTotalMasukArisan');
  const elSubMasukArisan = document.getElementById('statSubMasukArisan');
  const elMasukLain = document.getElementById('statTotalMasukLain');
  const elKeluar = document.getElementById('statTotalKeluar');
  const elSubKeluar = document.getElementById('statSubTotalKeluar');
  const elSaldo = document.getElementById('statSaldoKas');
  const elPeriode = document.getElementById('statPeriodeAktif');
  const elTglPeriode = document.getElementById('statTanggalPeriode');
  const elPemenang = document.getElementById('statPemenangTerakhir');

  if (elMasukArisan) elMasukArisan.textContent = formatRupiah(totalPemasukanArisan);
  if (elSubMasukArisan) {
    elSubMasukArisan.textContent = '';
  }
  if (elMasukLain) elMasukLain.textContent = formatRupiah(totalPemasukanLain);

  // Total Pengeluaran murni bersumber dari adnan_Pengeluaran
  const combinedPengeluaran = totalPengeluaranKas;
  if (elKeluar) elKeluar.textContent = formatRupiah(combinedPengeluaran);
  if (elSubKeluar) {
    elSubKeluar.textContent = '';
  }

  // Saldo Akhir = Total Penerimaan (Arisan + Pemasukan Lain) - Total Pengeluaran Kas
  const saldoAkhir = totalPemasukanArisan + totalPemasukanLain - combinedPengeluaran;
  if (elSaldo) elSaldo.textContent = formatRupiah(saldoAkhir);

  const activePeriode = activePeriods[0] || null;
  if (activePeriode) {
    const _rawKet1395 = stripInternalMetaFromKeterangan(activePeriode.keterangan);
    const activeLabel = (_rawKet1395 && _rawKet1395.trim())
      ? _rawKet1395.trim()
      : `Periode ${activePeriode.periode_ke}${activePeriode.bulan_tahun ? ' - ' + activePeriode.bulan_tahun : ''}`;
    elPeriode.textContent = activeLabel;
    elTglPeriode.textContent = `${activePeriode.tanggal_arisan || '-'} • ${activePeriode.tempat_arisan || ''}`;
  } else {
    elPeriode.textContent = 'Periode Arisan Belum di Input';
    elTglPeriode.textContent = 'Belum ada jadwal periode berstatus Aktif di adnan_Arisan';
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
// MODAL TRANSPARANSI: PEMASUKAN PERIODE ARISAN, LAINNYA, TOTAL PENGELUARAN & SALDO KAS
// ============================================================================
let activeTransparencyMode = 'Uang Arisan';

function openTransparencyModal(initialFilter = 'Uang Arisan') {
  const modal = document.getElementById('transparencyModal');
  if (!modal) return;
  activeTransparencyMode = initialFilter;
  modal.classList.remove('hidden');
  renderTransparencyBreakdown(initialFilter);
}

function renderTransparencyBreakdown(activeFilter = 'Uang Arisan') {
  const gridEl = document.getElementById('transparencyBreakdownGrid');
  const theadEl = document.getElementById('transparencyTableHead');
  const tbodyEl = document.getElementById('transparencyTableBody');
  const titleEl = document.getElementById('transparencyModalTitle');
  const subtitleEl = document.getElementById('transparencyModalSubtitle');
  if (!gridEl || !tbodyEl) return;

  // MODE 1: PEMASUKAN UANG ARISAN (Sesuai Data di adnan_Pembayaran yang telah dikelompokkan berdasar Periode)
  if (
    activeFilter === 'Uang Arisan' ||
    activeFilter === 'PEMASUKAN_PERIODE_ARISAN' ||
    String(activeFilter).startsWith('PERIODE_')
  ) {
    computePeriodeArisanPemasukanTotals();

    // Ambil semua transaksi arisan dari adnan_Pembayaran (kecuali yang ditolak)
    const arisanPayments = (cachedPembayaranList || []).filter(r => isJenisArisan(r) && String(r.status || '').toLowerCase() !== 'ditolak');

    // Kelompokkan data berdasarkan label Periode Arisan
    const summaryByPeriod = {};
    arisanPayments.forEach(r => {
      const perLabel = getPaymentPeriodeArisanLabel(r);
      if (!summaryByPeriod[perLabel]) {
        summaryByPeriod[perLabel] = {
          total: 0, count: 0, uang_arisan: 0, uang_kas: 0, uang_konsumsi: 0, items: []
        };
      }
      const sp = getPaymentSplitValues(r);
      // Tambahkan nominal untuk seluruh transaksi valid (kecuali ditolak)
      if (String(r.status || '').toLowerCase() !== 'ditolak') {
        summaryByPeriod[perLabel].total += Number(sp.total_rincian || r.nominal || 0);
        summaryByPeriod[perLabel].uang_arisan += Number(sp.uang_arisan || 0);
        summaryByPeriod[perLabel].uang_kas += Number(sp.uang_kas || 0);
        summaryByPeriod[perLabel].uang_konsumsi += Number(sp.uang_konsumsi || 0);
      }
      summaryByPeriod[perLabel].count += 1;
      summaryByPeriod[perLabel].items.push(r);
    });

    if (titleEl) {
      titleEl.textContent = '  Rincian Pemasukan Uang Arisan (Dari Tabel Pembayaran)';
    }
    if (subtitleEl) {
      subtitleEl.innerHTML =
        'Menampilkan rekap pemasukan Uang Arisan riil berdasarkan data transaksi di <strong>adnan_Pembayaran</strong>, dikelompokkan per <strong>Periode Arisan</strong>.';
    }

    // Header Tabel Disamakan untuk Menampilkan Kolom Periode dan Pembayar
    if (theadEl) {
      theadEl.innerHTML = `
        <tr>
          <th>Tanggal</th>
          <th>Nama Pembayar</th>
          <th>Periode Arisan</th>
          <th>Metode & Bank</th>
          <th>Uang Arisan</th>
          <th>Uang Kas</th>
          <th>Konsumsi</th>
          <th>Total Rincian</th>
          <th>Bukti</th>
          <th>Status</th>
        </tr>
      `;
    }

    const periodKeys = Object.keys(summaryByPeriod).sort();

    const periodCards = [
      {
        key: 'Uang Arisan',
        title: '  Total Pemasukan Arisan',
        amount: totalPemasukanArisan,
        count: `${arisanPayments.length} Transaksi Tercatat`
      },
      ...periodKeys.map((k) => {
        const s = summaryByPeriod[k];
        const safeKey = 'PERIODE_' + k.replace(/[^a-zA-Z0-9]/g, '_');
        return {
          key: safeKey,
          originalKey: k,
          title: `  ${k}`,
          amount: s.total,
          count: `${s.count} Transaksi`
        };
      })
    ];

    gridEl.innerHTML = periodCards
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

    let filteredPayments = arisanPayments;
    if (String(activeFilter).startsWith('PERIODE_')) {
      const matchingCard = periodCards.find(c => c.key === activeFilter);
      if (matchingCard && matchingCard.originalKey) {
        filteredPayments = summaryByPeriod[matchingCard.originalKey].items;
      }
    }

    if (filteredPayments.length === 0) {
      tbodyEl.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">Belum ada data pembayaran arisan.</td></tr>`;
      return;
    }

    tbodyEl.innerHTML = filteredPayments
      .map((r, idx) => {
        const statusLower = String(r.status || 'Pending').toLowerCase();
        const isPending = statusLower === 'pending' || statusLower === 'menunggu';
        const metodeText =
          r.metode_bayar === 'Transfer Bank' || r.metode_bayar === 'Transfer'
            ? `Transfer ${r.nama_bank ? '(' + r.nama_bank + ')' : ''}`
            : 'Tunai';

        const mediaKey = `arisan_pay_${r.id || idx}`;
        if (r.bukti_bayar_url) {
          registerMediaPreview(mediaKey, `Bukti Pembayaran - ${r.nama_pembayar || 'Peserta'}`, r.bukti_bayar_url);
        }
        const buktiBtn = r.bukti_bayar_url
          ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('${mediaKey}')">  Lihat Bukti</button>`
          : `<span style="color:#94a3b8; font-size:0.8rem;">-</span>`;

        const sp = getPaymentSplitValues(r);
        const cleanKet = stripInternalMetaFromKeterangan(r.keterangan);
        const perLabel = getPaymentPeriodeArisanLabel(r);
        const totalRincianVal = sp.total_rincian || Number(r.nominal || 0);

        return `
          <tr>
            <td>${r.tanggal_bayar || '-'}</td>
            <td>
              <strong>${r.nama_pembayar || '-'}</strong>
              ${cleanKet ? `<br><small style="color:#64748b;">${cleanKet}</small>` : ''}
            </td>
            <td><strong>${perLabel}</strong></td>
            <td>${metodeText}</td>
            <td><span style="color:var(--primary); font-weight:700;">${formatRupiah(sp.uang_arisan)}</span></td>
            <td><span style="color:#b45309; font-weight:700;">${formatRupiah(sp.uang_kas)}</span></td>
            <td><span style="color:#0284c7; font-weight:700;">${formatRupiah(sp.uang_konsumsi)}</span></td>
            <td><strong>${formatRupiah(totalRincianVal)}</strong></td>
            <td>${buktiBtn}</td>
            <td><span class="status-pill ${isPending ? 'incomplete' : 'complete'}">${r.status || 'Pending'}</span></td>
          </tr>
        `;
      })
      .join('');

    return;
  }

  // MODE 2: TOTAL PENGELUARAN (Murni dari adnan_Pengeluaran)
  if (
    activeFilter === 'TOTAL_PENGELUARAN' ||
    String(activeFilter).startsWith('EXP_KAT_')
  ) {
    const totalKeluar = totalPengeluaranKas;
    if (titleEl) {
      titleEl.textContent = '📉 Rincian Total Pengeluaran Kas (adnan_Pengeluaran)';
    }
    if (subtitleEl) {
      subtitleEl.innerHTML =
        'Menampilkan seluruh data pengeluaran kas resmi dari tabel <strong>adnan_Pengeluaran</strong>.';
    }
    if (theadEl) {
      theadEl.innerHTML = `
        <tr>
          <th>Tanggal</th>
          <th>Kode</th>
          <th>Kategori</th>
          <th>Penerima</th>
          <th>Uraian / Deskripsi</th>
          <th>Metode, Bank & Rekening</th>
          <th>Nominal Pengeluaran</th>
          <th>Bukti / Nota</th>
          <th>Dicatat Oleh</th>
        </tr>
      `;
    }

    const expenseRows = (cachedPengeluaranList || []).map((r, idx) => ({
      id: r.id || idx,
      tanggal: r.tanggal_pengeluaran || r.tanggal || '-',
      kode: r.kode_pengeluaran || `EXP-${idx + 1}`,
      kategori: r.kategori || 'Pengeluaran Kas',
      penerima: r.penerima || '-',
      deskripsi: stripInternalMetaFromKeterangan(r.deskripsi || r.nama_pengeluaran || '-'),
      metode: r.metode_bayar || 'Tunai',
      bank: r.nama_bank || '',
      rekening: extractNoRekeningPengeluaran(r),
      nominal: Number(r.nominal || 0),
      bukti_url: r.bukti_url || r.nota_url || null,
      pencatat: r.dicatat_oleh || 'Admin'
    }));

    const katMap = {};
    expenseRows.forEach((item) => {
      if (!katMap[item.kategori]) katMap[item.kategori] = { total: 0, count: 0 };
      katMap[item.kategori].total += item.nominal;
      katMap[item.kategori].count += 1;
    });

    const expCards = [
      {
        key: 'TOTAL_PENGELUARAN',
        title: '📊 Total Seluruh Pengeluaran',
        amount: totalKeluar,
        count: `${expenseRows.length} Transaksi Pengeluaran`
      },
      ...Object.keys(katMap).map((k) => ({
        key: `EXP_KAT_${k}`,
        title: `📁 ${k}`,
        amount: katMap[k].total,
        count: `${katMap[k].count} Transaksi`
      }))
    ];

    gridEl.innerHTML = expCards
      .map(
        (c) => `
        <div class="jenis-filter-card ${activeFilter === c.key ? 'active' : ''}" onclick="renderTransparencyBreakdown('${c.key}')">
          <div class="jf-title">${c.title}</div>
          <div class="jf-amount" style="color:#dc2626;">${formatRupiah(c.amount)}</div>
          <div class="jf-count">${c.count}</div>
        </div>
      `
      )
      .join('');

    const filteredExp = expenseRows.filter((item) => {
      if (String(activeFilter).startsWith('EXP_KAT_')) {
        const kat = String(activeFilter).replace('EXP_KAT_', '');
        return item.kategori === kat;
      }
      return true;
    });

    if (filteredExp.length === 0) {
      tbodyEl.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">Belum ada data pengeluaran kas yang tercatat.</td></tr>`;
      return;
    }

    tbodyEl.innerHTML = filteredExp
      .map((item, idx) => {
        const mediaKey = `trans_exp_${item.id || idx}`;
        if (item.bukti_url) {
          registerMediaPreview(mediaKey, `Nota Pengeluaran - ${item.penerima}`, item.bukti_url);
        }
        const buktiBtn = item.bukti_url
          ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('${mediaKey}')">🔍 Lihat Nota</button>`
          : `<span style="color:#94a3b8; font-size:0.8rem;">-</span>`;

        const bankRekText = [
          item.metode,
          item.bank ? `(${item.bank})` : '',
          item.rekening ? `<br><small style="color:var(--primary); font-weight:600;">No. Rek: ${item.rekening}</small>` : ''
        ]
          .filter(Boolean)
          .join(' ');

        return `
          <tr>
            <td>${item.tanggal}</td>
            <td><code>${item.kode}</code></td>
            <td><strong>${item.kategori}</strong></td>
            <td><strong>${item.penerima}</strong></td>
            <td>${item.deskripsi}</td>
            <td>${bankRekText}</td>
            <td><strong style="color:#dc2626;">${formatRupiah(item.nominal)}</strong></td>
            <td>${buktiBtn}</td>
            <td><span class="status-pill complete">${item.pencatat}</span></td>
          </tr>
        `;
      })
      .join('');
    return;
  }

  // MODE 3: SALDO KAS KELUARGA (Penerimaan adnan_Pembayaran vs Pengeluaran adnan_Pengeluaran)
  if (
    activeFilter === 'SALDO_KAS' ||
    activeFilter === 'MUTASI_MASUK' ||
    activeFilter === 'MUTASI_KELUAR'
  ) {
    computePeriodeArisanPemasukanTotals();
    const totalMasukAll = totalPemasukanArisan + totalPemasukanLain;
    const totalKeluarAll = totalPengeluaranKas; // Murni dari adnan_Pengeluaran
    const saldoAkhir = totalMasukAll - totalKeluarAll;

    if (titleEl) {
      titleEl.textContent = '🏛️ Rincian Saldo Kas Keluarga (Pemasukan vs Pengeluaran)';
    }
    if (subtitleEl) {
      subtitleEl.innerHTML =
        'Rekapitulasi mutasi <strong>Pemasukan (adnan_Pembayaran)</strong> dikurangi <strong>Total Pengeluaran (adnan_Pengeluaran)</strong> sehingga menghasilkan Saldo Kas Keluarga.';
    }
    if (theadEl) {
      theadEl.innerHTML = `
        <tr>
          <th>TANGGAL</th>
          <th>ARUS KAS</th>
          <th>KATEGORI / SUMBER</th>
          <th>KETERANGAN / NAMA</th>
          <th>PEMASUKAN (+)</th>
          <th>PENGELUARAN (-)</th>
          <th>STATUS</th>
        </tr>
      `;
    }

    const saldoCards = [
      {
        key: 'SALDO_KAS',
        title: '🏛️ Saldo Akhir Kas Keluarga',
        amount: saldoAkhir,
        count: `Pemasukan (${formatRupiah(totalMasukAll)}) - Pengeluaran (${formatRupiah(totalKeluarAll)})`
      },
      {
        key: 'MUTASI_MASUK',
        title: '📈 Total Seluruh Pemasukan (+)',
        amount: totalMasukAll,
        count: `Periode Arisan: ${formatRupiah(totalPemasukanArisan)} • Lainnya: ${formatRupiah(totalPemasukanLain)}`
      },
      {
        key: 'MUTASI_KELUAR',
        title: '📉 Total Seluruh Pengeluaran (-)',
        amount: totalKeluarAll,
        count: `Kas (adnan_Pengeluaran): ${formatRupiah(totalKeluarAll)}`
      }
    ];

    gridEl.innerHTML = saldoCards
      .map(
        (c) => `
        <div class="jenis-filter-card ${activeFilter === c.key ? 'active' : ''}" onclick="renderTransparencyBreakdown('${c.key}')">
          <div class="jf-title">${c.title}</div>
          <div class="jf-amount" style="${c.key === 'MUTASI_KELUAR' ? 'color:#dc2626;' : ''}">${formatRupiah(c.amount)}</div>
          <div class="jf-count">${c.count}</div>
        </div>
      `
      )
      .join('');

    // PEMASUKAN (+): SEMUA DARI TABEL adnan_Pembayaran
    const mutasiMasukRows = (cachedPembayaranList || []).map((r) => {
      const sp = getPaymentSplitValues(r);
      const isArs = isJenisArisan(r);
      const cleanKet = stripInternalMetaFromKeterangan(r.keterangan);
      const nominalMasuk = isArs ? Number(sp.total_rincian || r.nominal || 0) : Number(r.nominal || 0);
      const perLabel = getPaymentPeriodeArisanLabel(r);
      const sumberText = isArs
        ? `Pembayaran Arisan (${perLabel})`
        : `Pembayaran Lainnya: ${r.jenis_bayar || 'Lainnya'}`;

      let ketText = r.nama_pembayar || '-';
      if (cleanKet) {
        ketText += ` • ${cleanKet}`;
      }

      return {
        tipe: 'MASUK',
        tanggal: r.tanggal_bayar || '-',
        sumber: sumberText,
        keterangan: ketText,
        masuk: nominalMasuk,
        keluar: 0,
        status: r.status || 'disetujui'
      };
    });

    // PENGELUARAN (-): SEMUA DARI TABEL adnan_Pengeluaran
    const mutasiKeluarRows = (cachedPengeluaranList || []).map((r) => {
      const cleanKet = stripExpInternalMeta(r.deskripsi || r.nama_pengeluaran || '-');
      let ketText = r.penerima ? `${r.penerima}` : '-';
      if (cleanKet && cleanKet !== '-') {
        ketText = ketText === '-' ? cleanKet : `${ketText} • ${cleanKet}`;
      }

      return {
        tipe: 'KELUAR',
        tanggal: r.tanggal_pengeluaran || r.tanggal || '-',
        sumber: `Pengeluaran Kas: ${r.kategori || 'Kas'}`,
        keterangan: ketText,
        masuk: 0,
        keluar: Number(r.nominal || 0),
        status: 'Tercatat'
      };
    });

    const allMutasi = [...mutasiMasukRows, ...mutasiKeluarRows];
    // Urutkan berdasarkan tanggal terbaru ke terlama
    allMutasi.sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));

    const filteredMutasi = allMutasi.filter((m) => {
      if (activeFilter === 'MUTASI_MASUK') return m.tipe === 'MASUK';
      if (activeFilter === 'MUTASI_KELUAR') return m.tipe === 'KELUAR';
      return true;
    });

    if (filteredMutasi.length === 0) {
      tbodyEl.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Belum ada data mutasi kas.</td></tr>`;
      return;
    }

    tbodyEl.innerHTML = filteredMutasi
      .map(
        (m) => `
        <tr>
          <td>${m.tanggal}</td>
          <td>
            <span class="status-pill ${m.tipe === 'MASUK' ? 'complete' : 'incomplete'}" style="${m.tipe === 'KELUAR' ? 'background:#fef2f2; color:#dc2626; border:1px solid #fecaca;' : ''}">
              ${m.tipe === 'MASUK' ? '+ PEMASUKAN' : '- PENGELUARAN'}
            </span>
          </td>
          <td><strong>${m.sumber}</strong></td>
          <td>${m.keterangan}</td>
          <td><strong style="color:var(--primary);">${m.masuk > 0 ? '+ ' + formatRupiah(m.masuk) : '-'}</strong></td>
          <td><strong style="color:#dc2626;">${m.keluar > 0 ? '- ' + formatRupiah(m.keluar) : '-'}</strong></td>
          <td><span class="status-pill complete">${m.status}</span></td>
        </tr>
      `
      )
      .join('');
    return;
  }

  // MODE 4: PEMASUKAN LAINNYA / RINCIAN PER JENIS BAYAR
  if (theadEl) {
    theadEl.innerHTML = `
      <tr>
        <th>Tanggal</th>
        <th>Nama Pembayar</th>
        <th>Jenis Pembayaran</th>
        <th>Metode & Bank</th>
        <th>Uang Arisan</th>
        <th>Uang Kas</th>
        <th>Uang Konsumsi</th>
        <th>Total Nominal</th>
        <th>Bukti Bayar</th>
        <th>Status</th>
      </tr>
    `;
  }

  const summaryMap = {};
  let sumNonArisan = 0;
  let countNonArisan = 0;

  (cachedPembayaranList || []).forEach((row) => {
    const jenis = row.jenis_bayar || 'Lainnya';
    const nom = Number(row.nominal || 0);
    if (!isJenisArisan(jenis)) {
      if (!summaryMap[jenis]) {
        summaryMap[jenis] = { total: 0, count: 0 };
      }
      summaryMap[jenis].total += nom;
      summaryMap[jenis].count += 1;
      sumNonArisan += nom;
      countNonArisan += 1;
    }
  });

  const filterCards = [
    {
      key: 'NON_ARISAN',
      title: '🤝 Semua Pemasukan Lainnya',
      amount: sumNonArisan,
      count: `${countNonArisan} Transaksi`
    },
    ...Object.keys(summaryMap).map((k) => ({
      key: k,
      title: `📌 ${k}`,
      amount: summaryMap[k].total,
      count: `${summaryMap[k].count} Transaksi`
    }))
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

  const filteredRows = (cachedPembayaranList || []).filter((r) => {
    if (activeFilter === 'NON_ARISAN') return !isJenisArisan(r.jenis_bayar);
    return String(r.jenis_bayar || '') === activeFilter;
  });

  if (titleEl) {
    const labelFilter =
      activeFilter === 'NON_ARISAN'
        ? 'Pemasukan Lainnya (Zakat, Sumbangan, Infaq, dll)'
        : activeFilter;
    titleEl.textContent = `📊 Transparansi Pemasukan: ${labelFilter}`;
  }

  if (filteredRows.length === 0) {
    tbodyEl.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">Belum ada data pada kategori ini.</td></tr>`;
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

const statCardTotalPengeluaran = document.getElementById('statCardTotalPengeluaran');
if (statCardTotalPengeluaran) {
  statCardTotalPengeluaran.addEventListener('click', () => openTransparencyModal('TOTAL_PENGELUARAN'));
}

const statCardSaldoKas = document.getElementById('statCardSaldoKas');
if (statCardSaldoKas) {
  statCardSaldoKas.addEventListener('click', () => openTransparencyModal('SALDO_KAS'));
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

  const rowNama = String(row.nama_pembayar || '').trim().toLowerCase();
  const rowAnggotaId = String(row.anggota_id || '').trim().toLowerCase();
  const rowUid = String(row.user_id || '').trim().toLowerCase();

  // Tampilkan sesuai nama user yang login saja (tidak menampilkan nama anggota group lain)
  if (rowNama) {
    if (myNamaBio && rowNama === myNamaBio) return true;
    if (myNamaUser && rowNama === myNamaUser) return true;
    if (myUid && rowNama === myUid) return true;
    return false;
  }

  if (myAnggotaId && rowAnggotaId && rowAnggotaId === myAnggotaId) return true;
  if (myUid && rowUid && rowUid === myUid) return true;
  return false;
}

function getActivePeriodeSplitRates() {
  const payPeriode = document.getElementById('payPeriode');
  const payPeriodeId = document.getElementById('payPeriodeId');
  const activeList = getActivePeriodeList();
  const targetId = (payPeriodeId && payPeriodeId.value) || (payPeriode && payPeriode.dataset && payPeriode.dataset.arisanId);
  const targetKet = payPeriode ? payPeriode.value.trim() : '';

  let found = null;
  if (targetId) {
    found = activeList.find((p) => String(p.id) === String(targetId)) ||
      cachedPeriodeList.find((p) => String(p.id) === String(targetId));
  }
  if (!found && targetKet) {
    found = activeList.find((p) => String(p.keterangan || '').trim().toLowerCase() === targetKet.toLowerCase()) ||
      cachedPeriodeList.find((p) => String(p.keterangan || '').trim().toLowerCase() === targetKet.toLowerCase());
  }
  if (!found) {
    found = activeList[0] || null;
  }
  return getArisanSplitValues(found);
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
  const titleEl = document.getElementById('payGroupTitleText') || document.getElementById('payGroupSplitTitle');
  const subtitleEl = document.getElementById('payGroupSubtitleText') || document.getElementById('payGroupSplitSubtitle');
  const selectAllLabel = document.getElementById('payGroupSelectAllLabel') || document.getElementById('paySelectAllGroupLabel');
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
  const nominalArisanDanKonsumsi = rates.nominal_arisan_konsumsi;

  if (matchedGroup) {
    wrapper.classList.remove('hidden');
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
      subtitleEl.innerHTML = `Penanggung Jawab: <strong>${matchedGroup.penanggung_jawab}</strong> • Silakan centang anggota group yang ingin dibayarkan:`;
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
    const sumTotalRincian = activeCount * rates.total;
    const sumDibayarkanPemenang = activeCount * nominalArisanDanKonsumsi;

    const elArisan = document.getElementById('splitPreviewArisan');
    if (elArisan) elArisan.textContent = formatRupiah(sumArisan);
    const elKas = document.getElementById('splitPreviewKas');
    if (elKas) elKas.textContent = formatRupiah(sumKas);
    const elKonsumsi = document.getElementById('splitPreviewKonsumsi');
    if (elKonsumsi) elKonsumsi.textContent = formatRupiah(sumKonsumsi);
    const elTotalIuran = document.getElementById('splitPreviewTotalIuran');
    if (elTotalIuran) elTotalIuran.textContent = formatRupiah(sumTotalRincian);
    const elTotal = document.getElementById('splitPreviewTotal');
    if (elTotal) elTotal.textContent = formatRupiah(sumDibayarkanPemenang);

    if (payNominal) payNominal.value = sumDibayarkanPemenang > 0 ? sumDibayarkanPemenang : '';
    if (payNominalHint) {
      payNominalHint.textContent = `(${activeCount} Orang Dipilih)`;
    }
  } else {
    activeDetectedGroupForPay = null;
    checkedGroupMembersMap = {};

    wrapper.classList.add('hidden');
    if (selectAllLabel) selectAllLabel.classList.add('hidden');
    if (memberListContainer) {
      memberListContainer.innerHTML = '';
    }

    if (payNominal) payNominal.value = '';
    if (payNominalHint) {
      payNominalHint.textContent = '';
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
  const payPeriodeId = document.getElementById('payPeriodeId');
  const payPeriodeHint = document.getElementById('payPeriodeHint');
  if (!payJenis || !payPeriode) return;

  const isUangArisan = payJenis.value === 'Uang Arisan';
  if (!isUangArisan) {
    payPeriode.value = '';
    payPeriode.placeholder = '- Nonaktif untuk ' + payJenis.value + ' -';
    payPeriode.disabled = true;
    if (payPeriodeId) payPeriodeId.value = '';
    if (payPeriodeHint) {
      payPeriodeHint.textContent = '(Nonaktif - Hanya untuk Uang Arisan)';
      payPeriodeHint.style.color = '#64748b';
    }
  } else {
    payPeriode.disabled = false;
    const activePeriods = getActivePeriodeList();
    const activePer = activePeriods[0] || null;
    if (activePer) {
      const _rawKet2295 = stripInternalMetaFromKeterangan(activePer.keterangan);
      const activeLabel = (_rawKet2295 && _rawKet2295.trim())
        ? _rawKet2295.trim()
        : `Periode ${activePer.periode_ke}${activePer.bulan_tahun ? ' - ' + activePer.bulan_tahun : ''}`;
      payPeriode.value = activeLabel;
      payPeriode.placeholder = activeLabel;
      if (payPeriodeId) payPeriodeId.value = activePer.id || '';
      if (payPeriodeHint) {
        payPeriodeHint.textContent = '(Aktif untuk Uang Arisan)';
        payPeriodeHint.style.color = 'var(--primary)';
      }
    } else {
      payPeriode.value = '';
      payPeriode.placeholder = 'Periode Arisan Belum di Input';
      if (payPeriodeId) payPeriodeId.value = '';
      if (payPeriodeHint) {
        payPeriodeHint.textContent = '⚠️ Periode Arisan Belum di Input';
        payPeriodeHint.style.color = '#dc2626';
      }
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
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; color:var(--text-muted);">${emptyMsg}</td></tr>`;
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
          ${adminFlag && isPending
          ? `<button type="button" class="btn-primary btn-sm" onclick="approvePaymentStatus('${r.id}')">✓ Setujui</button>`
          : ''
        }
          ${adminFlag && !isPending
          ? `<button type="button" class="btn-secondary btn-sm" style="padding:4px 8px; font-size:0.74rem;" onclick="updatePaymentStatusByAdmin('${r.id}', 'Pending')" title="Kembalikan status ke Pending">↺ Pending</button>`
          : ''
        }
        </div>
      `;

      const sp = getPaymentSplitValues(r);
      const isArs = isJenisArisan(r.jenis_bayar);
      const cleanKet = stripInternalMetaFromKeterangan(r.keterangan);
      const periodeArisanLabel = getPaymentPeriodeArisanLabel(r);
      const dibayarkanVal = isArs ? sp.dibayarkan_pemenang : Number(r.nominal || 0);
      const totalRincianVal = isArs ? sp.total_rincian : Number(r.nominal || 0);

      return `
        <tr>
          <td>${r.tanggal_bayar || '-'}</td>
          <td><code>${r.kode_transaksi || 'TX-' + (idx + 1)}</code></td>
          <td>
            <strong>${r.nama_pembayar || '-'}</strong>
            ${cleanKet ? `<br><small style="color:#64748b;">${cleanKet}</small>` : ''}
          </td>
          <td>${r.jenis_bayar || 'Uang Arisan'}</td>
          <td><strong>${periodeArisanLabel}</strong></td>
          <td>${isArs ? `<span style="color:var(--primary); font-weight:700;">${formatRupiah(sp.uang_arisan)}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
          <td>${isArs ? `<span style="color:#0284c7; font-weight:700;">${formatRupiah(sp.uang_konsumsi)}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
          <td>${isArs ? `<span style="color:#b45309; font-weight:700;">${formatRupiah(sp.uang_kas)}</span><br><small style="color:#b45309; font-size:0.7rem;">(Masuk Kas)</small>` : '<span style="color:#94a3b8;">-</span>'}</td>
          <td><strong>${formatRupiah(totalRincianVal)}</strong></td>
          <td>
            <strong style="color:#15803d;">${formatRupiah(dibayarkanVal)}</strong>
            ${isArs ? `<br><small style="color:#15803d; font-size:0.7rem;">Arisan + Konsumsi</small>` : ''}
          </td>
          <td>${metodeText}</td>
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
    cachedPembayaranList = (rows || []).map((r) => ({
      ...r,
      periode_arisan: r.periode_arisan || r.Periode_Arisan || r['Periode Arisan'] || null,
      Periode_Arisan: r.Periode_Arisan || r.periode_arisan || r['Periode Arisan'] || null,
      jenis_bayar_db: r.jenis_bayar,
      jenis_bayar: getEffectiveJenisBayar(r)
    }));

    // adnan_Pembayaran MURNI sebagai Penerimaan / Pemasukan:
    totalPengeluaranPembayaran = 0;
    totalPemasukanLain = 0;
    cachedPembayaranList.forEach((r) => {
      // Jika bukan Uang Arisan (misal Zakat, Sumbangan, Infaq), masuk ke Pemasukan Lainnya
      if (!isJenisArisan(r)) {
        totalPemasukanLain += Number(r.nominal || 0);
      }
    });
    computePeriodeArisanPemasukanTotals();

    populateAdminPesertaDropdowns();
    renderPembayaranTableRows();
    updateQuickStatsBar();
    renderMonitoringPembayaranTable();
    renderMutasiKeuanganTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
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
  const nominalArisanDanKonsumsi = rates.nominal_arisan_konsumsi;

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
            <td><strong style="color:#0284c7;">${checked ? formatRupiah(rates.uang_konsumsi) : 'Rp 0'}</strong></td>
            <td><strong style="color:#b45309;">${checked ? formatRupiah(rates.uang_kas) : 'Rp 0'}</strong></td>
            <td><strong>${checked ? formatRupiah(rates.total) : 'Rp 0'}</strong></td>
            <td><strong style="color:#15803d;">${checked ? formatRupiah(nominalArisanDanKonsumsi) : 'Rp 0'}</strong></td>
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
  const elModalTotalRincian = document.getElementById('modalSumTotalRincian');
  if (elModalTotalRincian) elModalTotalRincian.textContent = formatRupiah(activeCount * rates.total);
  document.getElementById('modalSumGrandTotal').textContent = formatRupiah(activeCount * nominalArisanDanKonsumsi);
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
    const payPeriodeInput = document.getElementById('payPeriode');
    const payPeriodeIdInput = document.getElementById('payPeriodeId');
    const selectedPeriodeLabel = jenisBayar === 'Uang Arisan'
      ? (payPeriodeInput ? payPeriodeInput.value.trim() : null)
      : null;
    const selectedPeriodeId = jenisBayar === 'Uang Arisan'
      ? (payPeriodeIdInput && payPeriodeIdInput.value
        ? payPeriodeIdInput.value
        : (getActivePeriodeList()[0] ? getActivePeriodeList()[0].id : null))
      : null;

    if (jenisBayar === 'Uang Arisan' && (!selectedPeriodeLabel || selectedPeriodeLabel === 'Periode Arisan Belum di Input')) {
      showGlobalAlert('⚠️ <b>Periode Arisan Belum di Input</b> pada tabel <code>adnan_Arisan</code>. Harap atur dan aktifkan Periode Arisan terlebih dahulu pada Menu Pengaturan (Setting Periode & Iuran).', 'error');
      btn.disabled = false;
      btn.textContent = '💾 Simpan Pembayaran (Status: Pending)';
      return;
    }
    const tanggalBayar = document.getElementById('payTanggal').value || todayISO();
    const noRek = document.getElementById('payNoRekening').value.trim();
    const ketInput = document.getElementById('payKeterangan').value.trim();
    const rates = getActivePeriodeSplitRates();

    if (jenisBayar === 'Uang Arisan' && activeDetectedGroupForPay) {
      // Simpan pembayaran ter-split untuk masing-masing anggota group yang dicentang (termasuk Penanggung Jawab)
      const allMembers = extractGroupMembersArray(activeDetectedGroupForPay);
      const selectedMembers = allMembers.filter((m) => checkedGroupMembersMap[m] !== false);
      const groupBatchCode = 'GRP-' + Math.floor(1000 + Math.random() * 9000);
      const nominalPerMember = rates.nominal_arisan_konsumsi;

      for (let i = 0; i < selectedMembers.length; i++) {
        const memberName = selectedMembers[i];
        const matchedAnggota = (cachedAnggotaList || []).find(
          (a) => String(a.nama_lengkap || '').trim().toLowerCase() === memberName.toLowerCase()
        );

        const kode = `${groupBatchCode}-${i + 1}`;
        const splitMeta = `[SPLIT:${rates.uang_arisan},${rates.uang_kas},${rates.uang_konsumsi}]`;
        const jenisMeta = `[JENIS:${jenisBayar}]`;
        const periodeMeta = selectedPeriodeLabel ? `[PERIODE:${selectedPeriodeLabel}]` : '';
        const fullKeterangan = [
          ketInput,
          metode === 'Transfer Bank' && namaBank ? `Bank: ${namaBank}` : '',
          noRek ? `Rek: ${noRek}` : '',
          splitMeta,
          jenisMeta,
          periodeMeta
        ]
          .filter(Boolean)
          .join(' | ');

        await adaptiveSupabaseWrite(TABLES.PEMBAYARAN, {
          kode_transaksi: kode,
          anggota_id: (matchedAnggota && matchedAnggota.id) || null,
          arisan_id: selectedPeriodeId || (selectedPeriodeObj && selectedPeriodeObj.id) || null,
          periode_arisan: selectedPeriodeLabel,
          user_id: (matchedAnggota && matchedAnggota.user_id) || null,
          nama_pembayar: memberName,
          nama_group: activeDetectedGroupForPay.nama_group,
          penanggung_jawab: activeDetectedGroupForPay.penanggung_jawab,
          tanggal_bayar: tanggalBayar,
          jenis_bayar: jenisBayar,
          uang_arisan: rates.uang_arisan,
          uang_kas: rates.uang_kas,
          uang_konsumsi: rates.uang_konsumsi,
          nominal: nominalPerMember,
          metode_bayar: metode === 'Transfer Bank' ? 'Transfer' : 'Tunai',
          nama_bank: metode === 'Transfer Bank' ? namaBank : null,
          no_rekening_pengirim: metode === 'Transfer Bank' ? noRek : null,
          bukti_bayar_url: uploadedPayBuktiDataUrl,
          keterangan: fullKeterangan,
          status: 'Pending'
        });
      }

      showGlobalAlert(
        `✅ Pembayaran Group <b>${activeDetectedGroupForPay.nama_group}</b> berhasil disimpan untuk <b>${selectedMembers.length} anggota</b> (@${formatRupiah(nominalPerMember)} dibayarkan ke pemenang: Arisan ${formatRupiah(rates.uang_arisan)} + Konsumsi ${formatRupiah(rates.uang_konsumsi)}, dan Kas ${formatRupiah(rates.uang_kas)} masuk Kas) pada <b>${selectedPeriodeLabel || 'Periode Aktif'}</b> dengan status <b>Pending</b>!`,
        'success'
      );
    } else {
      // Pembayaran Perorangan (Single Member)
      const kode = 'TX-ARS-' + Math.floor(1000 + Math.random() * 9000);
      const inputNamaPembayar = document.getElementById('payNama').value.trim();
      const isArs = jenisBayar === 'Uang Arisan';
      const ua = isArs ? rates.uang_arisan : 0;
      const uk = isArs ? rates.uang_kas : 0;
      const uko = isArs ? rates.uang_konsumsi : 0;
      const rawNominalInput = document.getElementById('payNominal').value;
      const inputNominal = Number(rawNominalInput || 0);
      if (inputNominal <= 0) {
        showGlobalAlert('Silakan isi Nominal Pembayaran (Rp) yang valid terlebih dahulu.', 'error');
        btn.disabled = false;
        btn.textContent = '💾 Simpan Pembayaran (Status: Pending)';
        return;
      }
      const splitMeta = isArs ? `[SPLIT:${ua},${uk},${uko}]` : '';
      const jenisMeta = `[JENIS:${jenisBayar}]`;
      const periodeMeta = isArs && selectedPeriodeLabel ? `[PERIODE:${selectedPeriodeLabel}]` : '';

      const fullKeterangan = [
        ketInput,
        metode === 'Transfer Bank' && namaBank ? `Bank: ${namaBank}` : '',
        noRek ? `Rek: ${noRek}` : '',
        splitMeta,
        jenisMeta,
        periodeMeta
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
        arisan_id: isArs ? selectedPeriodeId || (selectedPeriodeObj && selectedPeriodeObj.id) || null : null,
        periode_arisan: isArs ? selectedPeriodeLabel : null,
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
function extractNoRekeningPengeluaran(row) {
  if (!row) return '';
  if (row.no_rekening) return String(row.no_rekening).trim();
  if (row.no_rekening_penerima) return String(row.no_rekening_penerima).trim();
  const desc = String(row.deskripsi || '');
  const match = desc.match(/\[REK:([^\]]+)\]/i) || desc.match(/No\.?\s*Rek(?:ening)?\s*:\s*([0-9A-Za-z\- ]+)/i);
  return match ? String(match[1]).trim() : '';
}

function stripExpInternalMeta(text) {
  return stripInternalMetaFromKeterangan(String(text || '').replace(/\s*\[REK:[^\]]+\]/gi, '').trim());
}

function populatePengeluaranAnggotaDropdown(searchQuery = '') {
  const selectEl = document.getElementById('expSelectAnggota');
  const datalistEl = document.getElementById('expAnggotaDatalist');
  const filterTableEl = document.getElementById('filterPengeluaranAnggota');
  const q = String(searchQuery || '').trim().toLowerCase();

  const allMembers = (cachedAnggotaList || []).filter((a) => a && a.nama_lengkap);

  // Filter berdasarkan pencarian nama atau atribut header di adnan_DataAnggota
  const filteredMembers = allMembers.filter((a) => {
    if (!q) return true;
    const searchableText = [
      a.nama_lengkap,
      a.panggilan,
      a.user_id,
      a.no_hp,
      a.nama_bank,
      a.no_rekening,
      a.alamat
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchableText.includes(q);
  });

  if (selectEl) {
    const currentVal = selectEl.value;
    selectEl.innerHTML = [
      `<option value="">-- Pilih Nama dari adnan_DataAnggota (${filteredMembers.length} ditemukan) --</option>`,
      ...filteredMembers.map((a) => {
        const infoPanggilan = a.panggilan ? ` (${a.panggilan})` : '';
        const infoBank = a.nama_bank ? ` • ${a.nama_bank}${a.no_rekening ? ' - ' + a.no_rekening : ''}` : '';
        return `<option value="${a.nama_lengkap}" data-bank="${a.nama_bank || ''}" data-rekening="${a.no_rekening || ''}">${a.nama_lengkap}${infoPanggilan}${infoBank}</option>`;
      })
    ].join('');
    if (currentVal && filteredMembers.some((a) => a.nama_lengkap === currentVal)) {
      selectEl.value = currentVal;
    } else if (q && filteredMembers.length === 1) {
      // Jika hasil pencarian tepat 1 anggota, langsung pilih otomatis
      selectEl.value = filteredMembers[0].nama_lengkap;
      applySelectedAnggotaToPengeluaranForm(filteredMembers[0].nama_lengkap);
    }
  }

  if (datalistEl) {
    datalistEl.innerHTML = allMembers
      .map((a) => {
        const infoBank = a.nama_bank ? `${a.nama_bank} ${a.no_rekening || ''}` : a.panggilan || '';
        return `<option value="${a.nama_lengkap}">${infoBank}</option>`;
      })
      .join('');
  }

  if (filterTableEl && !q) {
    const curFilter = filterTableEl.value || 'ALL';
    filterTableEl.innerHTML = [
      '<option value="ALL">-- Semua Anggota (adnan_DataAnggota) --</option>',
      ...allMembers.map((a) => `<option value="${a.nama_lengkap}">${a.nama_lengkap}</option>`)
    ].join('');
    filterTableEl.value = curFilter;
  }
}

function applySelectedAnggotaToPengeluaranForm(namaAnggota) {
  const penerimaInput = document.getElementById('expPenerima');
  if (!namaAnggota) return;
  if (penerimaInput) {
    penerimaInput.value = namaAnggota;
  }

  const matched = (cachedAnggotaList || []).find(
    (a) => String(a.nama_lengkap || '').trim().toLowerCase() === String(namaAnggota).trim().toLowerCase()
  );
  if (matched) {
    const expBank = document.getElementById('expNamaBank');
    const expNoRek = document.getElementById('expNoRekening');
    if (matched.nama_bank && expBank && !expBank.value) {
      expBank.value = matched.nama_bank;
    }
    if (matched.no_rekening && expNoRek && !expNoRek.value) {
      expNoRek.value = matched.no_rekening;
    }
  }
}

const expSearchAnggotaInput = document.getElementById('expSearchAnggota');
if (expSearchAnggotaInput) {
  expSearchAnggotaInput.addEventListener('input', () => {
    populatePengeluaranAnggotaDropdown(expSearchAnggotaInput.value);
  });
}

const expSelectAnggotaEl = document.getElementById('expSelectAnggota');
if (expSelectAnggotaEl) {
  expSelectAnggotaEl.addEventListener('change', () => {
    if (expSelectAnggotaEl.value) {
      applySelectedAnggotaToPengeluaranForm(expSelectAnggotaEl.value);
    }
  });
}

const expPenerimaInputEl = document.getElementById('expPenerima');
if (expPenerimaInputEl) {
  expPenerimaInputEl.addEventListener('change', () => {
    applySelectedAnggotaToPengeluaranForm(expPenerimaInputEl.value);
  });
}

function renderPengeluaranTableRows() {
  const tbody = document.getElementById('tableBodyPengeluaran');
  if (!tbody) return;

  const searchQ = String((document.getElementById('searchPengeluaranNama') && document.getElementById('searchPengeluaranNama').value) || '')
    .trim()
    .toLowerCase();
  const filterAnggota = String(
    (document.getElementById('filterPengeluaranAnggota') && document.getElementById('filterPengeluaranAnggota').value) || 'ALL'
  ).trim();

  const filteredRows = (cachedPengeluaranList || []).filter((r) => {
    if (filterAnggota !== 'ALL') {
      const pName = String(r.penerima || '').trim().toLowerCase();
      const dText = String(r.deskripsi || '').toLowerCase();
      const target = filterAnggota.toLowerCase();
      if (pName !== target && !dText.includes(target)) return false;
    }
    if (searchQ) {
      const combined = [
        r.penerima,
        r.kategori,
        r.deskripsi,
        r.nama_pengeluaran,
        r.kode_pengeluaran,
        r.nama_bank,
        extractNoRekeningPengeluaran(r)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!combined.includes(searchQ)) return false;
    }
    return true;
  });

  if (filteredRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Belum ada pencatatan pengeluaran kas yang sesuai filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredRows
    .map((r, idx) => {
      const notaUrl = r.bukti_url || r.nota_url || null;
      const mediaKey = `exp_${r.id || idx}`;
      if (notaUrl) {
        registerMediaPreview(mediaKey, `Nota Pengeluaran - ${r.kategori || ''}`, notaUrl);
      }
      const notaBtn = notaUrl
        ? `<button type="button" class="btn-secondary btn-sm" onclick="openMediaByKey('${mediaKey}')">🧾 Lihat Nota</button>`
        : `<span style="color:#94a3b8; font-size:0.8rem;">-</span>`;

      const noRek = extractNoRekeningPengeluaran(r);
      const cleanDesc = stripExpInternalMeta(r.deskripsi || r.nama_pengeluaran || '-');

      return `
        <tr>
          <td>${r.tanggal_pengeluaran || r.tanggal || '-'}</td>
          <td><code>${r.kode_pengeluaran || 'EXP-' + (idx + 1)}</code></td>
          <td><strong>${r.kategori || 'Pengeluaran'}</strong></td>
          <td>${cleanDesc} ${r.penerima ? '<br><small><strong>Penerima:</strong> ' + r.penerima + '</small>' : ''}</td>
          <td>
            ${r.metode_bayar || 'Tunai'} ${r.nama_bank ? '(' + r.nama_bank + ')' : ''}
            ${noRek ? `<br><small style="color:var(--primary); font-weight:700;">No. Rek: ${noRek}</small>` : ''}
          </td>
          <td><strong style="color:#dc2626;">${formatRupiah(r.nominal)}</strong></td>
          <td>${notaBtn}</td>
          <td>${r.dicatat_oleh || 'Admin'}</td>
        </tr>
      `;
    })
    .join('');
}

const searchPengeluaranNamaEl = document.getElementById('searchPengeluaranNama');
if (searchPengeluaranNamaEl) {
  searchPengeluaranNamaEl.addEventListener('input', renderPengeluaranTableRows);
}

const filterPengeluaranAnggotaEl = document.getElementById('filterPengeluaranAnggota');
if (filterPengeluaranAnggotaEl) {
  filterPengeluaranAnggotaEl.addEventListener('change', renderPengeluaranTableRows);
}

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
    cachedPengeluaranList = Array.isArray(rows) ? rows : [];

    totalPengeluaranKas = cachedPengeluaranList.reduce((acc, r) => acc + Number(r.nominal || 0), 0);

    populatePengeluaranAnggotaDropdown();
    renderPengeluaranTableRows();
    updateQuickStatsBar();
    renderMutasiKeuanganTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
  }
}

function syncExpTransferFieldsUI() {
  const expMetode = document.getElementById('expMetode');
  const expBankGroup = document.getElementById('expBankGroup');
  const expRekeningGroup = document.getElementById('expRekeningGroup');
  if (!expMetode) return;
  const isTransfer = expMetode.value === 'Transfer Bank';
  if (expBankGroup) expBankGroup.classList.toggle('hidden', !isTransfer);
  if (expRekeningGroup) expRekeningGroup.classList.toggle('hidden', !isTransfer);
}

const expMetodeSelect = document.getElementById('expMetode');
if (expMetodeSelect) {
  expMetodeSelect.addEventListener('change', syncExpTransferFieldsUI);
}

const expNamaBankSelect = document.getElementById('expNamaBank');
if (expNamaBankSelect) {
  expNamaBankSelect.addEventListener('change', () => {
    const expRekeningGroup = document.getElementById('expRekeningGroup');
    if (expRekeningGroup && expNamaBankSelect.value) {
      expRekeningGroup.classList.remove('hidden');
      const expNoRekInput = document.getElementById('expNoRekening');
      if (expNoRekInput) expNoRekInput.focus();
    }
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

    const metode = document.getElementById('expMetode').value;
    const namaBank = document.getElementById('expNamaBank').value;
    const noRekening = (document.getElementById('expNoRekening') && document.getElementById('expNoRekening').value.trim()) || '';

    if (metode === 'Transfer Bank' && !namaBank) {
      showGlobalAlert('Silakan pilih Bank Pencairan / Transfer terlebih dahulu.', 'error');
      return;
    }

    const btn = document.getElementById('btnSubmitPengeluaran');
    btn.disabled = true;
    btn.textContent = 'Menyimpan Pengeluaran...';

    try {
      const kode = 'EXP-' + Math.floor(1000 + Math.random() * 9000);
      const kategori = document.getElementById('expKategori').value;
      const deskripsiInput = document.getElementById('expDeskripsi').value.trim();
      const penerimaVal =
        document.getElementById('expPenerima').value.trim() ||
        (document.getElementById('expSelectAnggota') && document.getElementById('expSelectAnggota').value) ||
        null;

      const deskripsiWithMeta = [
        deskripsiInput,
        metode === 'Transfer Bank' && noRekening ? `[REK:${noRekening}]` : ''
      ]
        .filter(Boolean)
        .join(' ');

      await adaptiveSupabaseWrite(TABLES.PENGELUARAN, {
        kode_pengeluaran: kode,
        tanggal_pengeluaran: document.getElementById('expTanggal').value || todayISO(),
        kategori: kategori,
        nama_pengeluaran: kategori,
        deskripsi: deskripsiWithMeta,
        nominal: Number(document.getElementById('expNominal').value || 0),
        penerima: penerimaVal,
        metode_bayar: metode,
        nama_bank: metode === 'Transfer Bank' ? namaBank : null,
        no_rekening: metode === 'Transfer Bank' ? noRekening || null : null,
        bukti_url: uploadedExpBuktiDataUrl,
        dicatat_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin'
      });

      formPengeluaran.reset();
      document.getElementById('expTanggal').value = todayISO();
      syncExpTransferFieldsUI();
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
    const rawRows = await res.json();
    const rows = (rawRows || []).filter(
      (r) => String(r.kategori || '') !== 'LIVE_SPIN_STATE' && String(r.judul || '') !== '__LIVE_SPIN_STATE__'
    );

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
    let rowsArisan = resPeriode.ok ? await resPeriode.json() : [];

    // Jika adnan_Arisan kosong atau ada data tambahan di adnan_PeriodeArisan di Supabase, sinkronkan dari Supabase
    try {
      const resPeriodeAlt = await fetch(`${SUPABASE_REST_URL}/${TABLES.PERIODE}?select=*&order=periode_ke.asc`, {
        method: 'GET',
        headers: supabaseHeaders
      });
      if (resPeriodeAlt.ok) {
        const rowsAlt = await resPeriodeAlt.json();
        if ((!rowsArisan || rowsArisan.length === 0) && Array.isArray(rowsAlt) && rowsAlt.length > 0) {
          rowsArisan = rowsAlt;
        } else if (Array.isArray(rowsArisan) && Array.isArray(rowsAlt) && rowsAlt.length > 0) {
          rowsArisan = rowsArisan.map((p) => {
            const matchAlt = rowsAlt.find((a) => Number(a.periode_ke) === Number(p.periode_ke));
            if (!matchAlt) return p;
            return {
              ...matchAlt,
              ...p,
              uang_arisan: p.uang_arisan ?? matchAlt.uang_arisan,
              uang_kas: p.uang_kas ?? matchAlt.uang_kas,
              uang_konsumsi: p.uang_konsumsi ?? matchAlt.uang_konsumsi
            };
          });
        }
      }
    } catch (_) { }

    cachedPeriodeList = Array.isArray(rowsArisan) ? rowsArisan : [];
    const activePeriods = getActivePeriodeList();

    const allPeriodeOptions = [
      '<option value="">-- Pilih Periode Arisan --</option>',
      ...cachedPeriodeList.map((p) => `<option value="${p.id}">${formatPeriodeArisanLabel(p)}</option>`)
    ].join('');
    if (winPeriodeSelect) winPeriodeSelect.innerHTML = allPeriodeOptions;
    syncPayPeriodeByJenis();

    const nextPeriodeNum =
      cachedPeriodeList.length > 0
        ? Math.max(...cachedPeriodeList.map((p) => Number(p.periode_ke || 0))) + 1
        : 1;
    const perNomorEl = document.getElementById('perNomor');
    if (perNomorEl) {
      perNomorEl.value = nextPeriodeNum;
      autoFillPeriodeKeterangan();
    }

    if (tbodyPeriode) {
      if (cachedPeriodeList.length === 0) {
        tbodyPeriode.innerHTML = `<tr><td colspan="11" style="text-align:center;">Belum ada jadwal periode arisan.</td></tr>`;
      } else {
        tbodyPeriode.innerHTML = cachedPeriodeList
          .map((p) => {
            const sp = getArisanSplitValues(p);
            const perId = p.id || '';
            const perKe = Number(p.periode_ke || 0);
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
              <td>
                <button type="button" class="btn-secondary btn-sm" style="color:#dc2626; border-color:#fecaca;" onclick="deletePeriodeArisan('${perId}', ${perKe})">
                  🗑️ Hapus
                </button>
              </td>
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
        tbodyPemenang.innerHTML = `<tr><td colspan="8" style="text-align:center;">Belum ada pemenang arisan yang ditetapkan.</td></tr>`;
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
              <td style="white-space:nowrap;">
                <div style="display:flex; gap:6px;">
                  <button type="button" class="btn-secondary btn-sm" style="color:#0284c7; border-color:#bae6fd;" onclick="openModalEditPemenang('${w.id || ''}', ${Number(w.periode_ke || 0)})">
                    ✏️ Edit
                  </button>
                  <button type="button" class="btn-secondary btn-sm" style="color:#dc2626; border-color:#fecaca;" onclick="openModalKonfirmasiHapusPemenang('${w.id || ''}', ${Number(w.periode_ke || 0)}, '${encodeURIComponent(w.nama_pemenang || '')}')">
                    🗑️ Hapus
                  </button>
                </div>
              </td>
            </tr>`
          )
          .join('');
      }
    }
    renderMonitoringPembayaran();
  } catch (err) {
    console.error(err);
  }
}

async function deletePeriodeArisan(periodeId, periodeKe) {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya Role Admin yang dapat menghapus data Periode Arisan.', 'error');
    return;
  }
  const target = (cachedPeriodeList || []).find(
    (p) => (periodeId && String(p.id) === String(periodeId)) || Number(p.periode_ke) === Number(periodeKe)
  );
  const labelPeriode = target
    ? `Periode Ke-${target.periode_ke} (${target.bulan_tahun || '-'})`
    : `Periode Ke-${periodeKe}`;

  if (!window.confirm(`Apakah Anda yakin ingin menghapus data ${labelPeriode} dari tabel adnan_Arisan?`)) {
    return;
  }

  try {
    if (periodeId) {
      await fetch(`${SUPABASE_REST_URL}/${TABLES.ARISAN}?id=eq.${encodeURIComponent(periodeId)}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
    }
    if (periodeKe) {
      await fetch(`${SUPABASE_REST_URL}/${TABLES.ARISAN}?periode_ke=eq.${encodeURIComponent(periodeKe)}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      try {
        await fetch(`${SUPABASE_REST_URL}/${TABLES.PERIODE}?periode_ke=eq.${encodeURIComponent(periodeKe)}`, {
          method: 'DELETE',
          headers: supabaseHeaders
        });
      } catch (_) { }
    }

    await loadPeriodeAndPemenangData();
    syncPayGroupSplitUI();
    updateQuickStatsBar();
    showGlobalAlert(`🗑️ Data <b>${labelPeriode}</b> berhasil dihapus dari Supabase!`, 'success');
  } catch (err) {
    showGlobalAlert(err.message || 'Gagal menghapus data Periode Arisan.', 'error');
  }
}

// ============================================================================
// MODAL & ACTION EDIT PEMENANG ARISAN (Item 5)
// ============================================================================
function openModalEditPemenang(winnerId, periodeKe) {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya Role Admin yang dapat mengedit data Pemenang Arisan.', 'error');
    return;
  }
  const target = (cachedPemenangList || []).find(
    (w) => (winnerId && String(w.id) === String(winnerId)) || Number(w.periode_ke) === Number(periodeKe)
  );
  if (!target) {
    showGlobalAlert('Data pemenang arisan tidak ditemukan.', 'error');
    return;
  }

  const modal = document.getElementById('modalEditPemenang');
  if (!modal) return;

  document.getElementById('editWinId').value = target.id || '';
  document.getElementById('editWinOldPeriodeKe').value = target.periode_ke || '';
  document.getElementById('editWinPeriodeId').value = target.periode_id || '';
  document.getElementById('editWinPeriodeKe').value = target.periode_ke || 1;
  document.getElementById('editWinBulanTahun').value = target.bulan_tahun || '';
  document.getElementById('editWinNama').value = target.nama_pemenang || '';
  document.getElementById('editWinTanggalUndi').value = target.tanggal_undi || todayISO();
  document.getElementById('editWinNominal').value = target.nominal_diterima || 0;

  const metodeSelect = document.getElementById('editWinMetode');
  if (metodeSelect) {
    metodeSelect.value =
      target.metode_pencairan && target.metode_pencairan.toLowerCase().includes('tunai')
        ? 'Tunai'
        : 'Transfer Bank';
  }

  populateBankDropdowns();
  const bankSelect = document.getElementById('editWinBank');
  if (bankSelect && target.nama_bank) {
    bankSelect.value = target.nama_bank;
  }

  toggleModalEditWinBankDropdown();
  document.getElementById('editWinKeterangan').value = stripInternalMetaFromKeterangan(target.keterangan) || '';

  modal.style.display = 'flex';
}

function closeModalEditPemenang() {
  const modal = document.getElementById('modalEditPemenang');
  if (modal) modal.style.display = 'none';
}

function toggleModalEditWinBankDropdown() {
  const metode = document.getElementById('editWinMetode').value;
  const wrapper = document.getElementById('editWinBankWrapper');
  if (wrapper) {
    wrapper.style.display = metode === 'Transfer Bank' ? 'block' : 'none';
  }
}

async function submitModalEditPemenang(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya Role Admin yang berhak menyimpan perubahan pemenang.', 'error');
    return;
  }

  const btn = document.getElementById('btnSaveEditPemenang');
  const winId = document.getElementById('editWinId').value;
  const oldPeriodeKe = Number(document.getElementById('editWinOldPeriodeKe').value || 0);
  const periodeKe = Number(document.getElementById('editWinPeriodeKe').value || 1);
  const bulanTahun = document.getElementById('editWinBulanTahun').value.trim();
  const namaPemenang = document.getElementById('editWinNama').value.trim();
  const tanggalUndi = document.getElementById('editWinTanggalUndi').value || todayISO();
  const nominal = Number(document.getElementById('editWinNominal').value || 0);
  const metode = document.getElementById('editWinMetode').value;
  const namaBank = metode === 'Transfer Bank' ? document.getElementById('editWinBank').value : null;
  const keterangan = document.getElementById('editWinKeterangan').value.trim();

  if (!namaPemenang) {
    showGlobalAlert('Nama pemenang wajib diisi.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    const payload = {
      periode_ke: periodeKe,
      bulan_tahun: bulanTahun,
      nama_pemenang: namaPemenang,
      tanggal_undi: tanggalUndi,
      nominal_diterima: nominal,
      metode_pencairan: metode,
      nama_bank: namaBank,
      keterangan: keterangan
    };

    if (winId) {
      await adaptiveSupabaseWrite(TABLES.PEMENANG, payload, `?id=eq.${encodeURIComponent(winId)}`);
    } else {
      await adaptiveSupabaseWrite(TABLES.PEMENANG, payload, `?periode_ke=eq.${encodeURIComponent(oldPeriodeKe || periodeKe)}`);
    }

    // Sinkronkan juga pada adnan_Arisan
    const matchPer = (cachedPeriodeList || []).find((p) => Number(p.periode_ke) === Number(oldPeriodeKe || periodeKe));
    if (matchPer && matchPer.id) {
      try {
        await adaptiveSupabaseWrite(
          TABLES.ARISAN,
          {
            pemenang_nama: namaPemenang,
            total_diterima: nominal
          },
          `?id=eq.${encodeURIComponent(matchPer.id)}`
        );
      } catch (_) { }
    }

    closeModalEditPemenang();
    await loadPeriodeAndPemenangData();
    updateQuickStatsBar();
    showGlobalAlert(`✅ Perubahan Pemenang <b>Periode Ke-${periodeKe} (${namaPemenang})</b> berhasil disimpan!`, 'success');
  } catch (err) {
    showGlobalAlert(err.message || 'Gagal menyimpan perubahan pemenang.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Perubahan';
  }
}

// ============================================================================
// MODAL & ACTION KONFIRMASI HAPUS PEMENANG ARISAN (Item 5)
// ============================================================================
function openModalKonfirmasiHapusPemenang(winnerId, periodeKe, encodedNama) {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya Role Admin yang dapat menghapus data Pemenang Arisan.', 'error');
    return;
  }
  const modal = document.getElementById('modalKonfirmasiHapusPemenang');
  if (!modal) return;

  const nama = encodedNama ? decodeURIComponent(encodedNama) : 'Pemenang';
  document.getElementById('delWinId').value = winnerId || '';
  document.getElementById('delWinPeriodeKe').value = periodeKe || '';
  document.getElementById('delWinDetailText').innerHTML = `Periode Ke-<strong>${periodeKe || '-'}</strong> • 🏆 <strong>${nama}</strong>`;

  modal.style.display = 'flex';
}

function closeModalHapusPemenang() {
  const modal = document.getElementById('modalKonfirmasiHapusPemenang');
  if (modal) modal.style.display = 'none';
}

async function executeConfirmedDeletePemenang() {
  const winId = document.getElementById('delWinId').value;
  const periodeKe = document.getElementById('delWinPeriodeKe').value;
  const btn = document.getElementById('btnExecuteDeletePemenang');

  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  try {
    if (winId) {
      await fetch(`${SUPABASE_REST_URL}/${TABLES.PEMENANG}?id=eq.${encodeURIComponent(winId)}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
    }
    if (periodeKe) {
      await fetch(`${SUPABASE_REST_URL}/${TABLES.PEMENANG}?periode_ke=eq.${encodeURIComponent(periodeKe)}`, {
        method: 'DELETE',
        headers: supabaseHeaders
      });
      // Kosongkan juga pemenang_nama pada adnan_Arisan
      const matchPer = (cachedPeriodeList || []).find((p) => Number(p.periode_ke) === Number(periodeKe));
      if (matchPer && matchPer.id && matchPer.pemenang_nama) {
        try {
          await adaptiveSupabaseWrite(
            TABLES.ARISAN,
            { pemenang_nama: null, pemenang_id: null },
            `?id=eq.${encodeURIComponent(matchPer.id)}`
          );
        } catch (_) { }
      }
    }

    closeModalHapusPemenang();
    await loadPeriodeAndPemenangData();
    updateQuickStatsBar();
    showGlobalAlert(`🗑️ Data Pemenang <b>Periode Ke-${periodeKe}</b> berhasil dihapus!`, 'success');
  } catch (err) {
    showGlobalAlert(err.message || 'Gagal menghapus data Pemenang Arisan.', 'error');
  }
}

window.deletePeriodeArisan = deletePeriodeArisan;
window.deletePemenangArisan = deletePemenangArisan;


// ============================================================================
// OTOMATISASI KOTAK INPUT KETERANGAN PERIODE ARISAN (Rumus: "Periode " & [Ke-] & " - " & [Bulan & Tahun])
// ============================================================================
function autoFillPeriodeKeterangan() {
  const perNomorEl = document.getElementById('perNomor');
  const perBulanTahunEl = document.getElementById('perBulanTahun');
  const perKeteranganEl = document.getElementById('perKeterangan');
  if (!perKeteranganEl) return;
  const no = perNomorEl ? String(perNomorEl.value || '').trim() : '';
  const bln = perBulanTahunEl ? String(perBulanTahunEl.value || '').trim() : '';
  if (no || bln) {
    perKeteranganEl.value = `Periode ${no}${bln ? ' - ' + bln : ''}`;
  }
}

const perNomorInputEl = document.getElementById('perNomor');
if (perNomorInputEl) {
  perNomorInputEl.addEventListener('input', autoFillPeriodeKeterangan);
  perNomorInputEl.addEventListener('change', autoFillPeriodeKeterangan);
}
const perBulanTahunInputEl = document.getElementById('perBulanTahun');
if (perBulanTahunInputEl) {
  perBulanTahunInputEl.addEventListener('input', autoFillPeriodeKeterangan);
  perBulanTahunInputEl.addEventListener('change', autoFillPeriodeKeterangan);
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
      const ua = Number(document.getElementById('perIuranArisan').value || 0);
      const uk = Number(document.getElementById('perIuranKas').value || 0);
      const uko = Number(document.getElementById('perIuranKonsumsi').value || 0);
      const iuran = ua + uk + uko;
      const tempat = document.getElementById('perTempat').value.trim();
      const status = document.getElementById('perStatus').value;
      const ketRaw = document.getElementById('perKeterangan').value.trim();
      const generatedKet = `Periode ${periodeKe}${bulanTahun ? ' - ' + bulanTahun : ''}`;
      const keterangan = ketRaw || generatedKet;

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
      document.getElementById('perIuranKonsumsi').value = DEFAULT_SPLIT_KONSUMSI;
      document.getElementById('perIuranKas').value = DEFAULT_SPLIT_KAS;
      document.getElementById('perIuran').value = DEFAULT_TOTAL_IURAN;

      await loadPeriodeAndPemenangData();
      updateQuickStatsBar();
      showGlobalAlert(
        `✅ Setting Periode Ke-${periodeKe} (${bulanTahun}) berhasil disimpan dengan Rincian: a. Arisan ${formatRupiah(ua)}, b. Konsumsi ${formatRupiah(uko)}, c. Kas ${formatRupiah(uk)} (Total ${formatRupiah(iuran)}; Dibayarkan Pemenang ${formatRupiah(ua + uko)}, Sisa ${formatRupiah(uk)} masuk Kas)!`,
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
// Hanya menampilkan data dari tabel adnan_GroupArisan di Supabase (tanpa data lokal/dummy)
// ============================================================================
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
    let res = await fetch(`${SUPABASE_REST_URL}/${TABLES.GROUP}?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (!res.ok) {
      res = await fetch(`${SUPABASE_REST_URL}/${TABLES.GROUP}?select=*`, {
        method: 'GET',
        headers: supabaseHeaders
      });
    }
    if (res.ok) {
      remoteGroups = await res.json();
    }
  } catch (_) { }

  cachedGroupList = Array.isArray(remoteGroups) ? remoteGroups : [];
  renderGroupArisanTable();
  syncPayGroupSplitUI();
}

function renderGroupArisanTable() {
  const tbody = document.getElementById('tableBodyGroupArisan');
  if (!tbody) return;

  if (!cachedGroupList || cachedGroupList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Belum ada Group Arisan terdaftar di Supabase. Silakan isi form Entry Group Arisan di atas.</td></tr>`;
    return;
  }

  const rates = getActivePeriodeSplitRates();

  tbody.innerHTML = cachedGroupList
    .map((g, idx) => {
      const members = extractGroupMembersArray(g);
      const count = members.length;
      const totalTagihan = count * rates.nominal_arisan_konsumsi;
      const totalRincianGroup = count * rates.total;
      const grpKey = g.id || g.kode_group || idx;
      const pjDisplay = g.penanggung_jawab || g.penanggung_jawab_nama || '-';

      const memberBadges = members
        .map((m, i) => {
          const isPJ = m.toLowerCase() === String(pjDisplay).trim().toLowerCase();
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
          <td><strong>👑 ${pjDisplay}</strong></td>
          <td>${memberBadges}</td>
          <td><strong>${count} / 5 Orang</strong></td>
          <td>
            <strong style="color:#15803d;">Dibayarkan Pemenang: ${formatRupiah(totalTagihan)}</strong>
            <br><small style="color:#64748b;">a. Arisan ${formatRupiah(count * rates.uang_arisan)} + b. Konsumsi ${formatRupiah(count * rates.uang_konsumsi)} + c. Kas ${formatRupiah(count * rates.uang_kas)} (Total Rincian: ${formatRupiah(totalRincianGroup)})</small>
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
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya Role Admin yang dapat menghapus Group Arisan.', 'error');
    return;
  }
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
    await loadGroupArisanData();
    populateAdminPesertaDropdowns();
    syncPayGroupSplitUI();
    showGlobalAlert(`🗑️ Group Arisan <b>${target.nama_group}</b> berhasil dihapus dari Supabase.`, 'success');
  } catch (err) {
    showGlobalAlert(err.message || 'Gagal menghapus Group Arisan.', 'error');
  }
}

window.deleteGroupArisan = deleteGroupArisan;

const formGroupArisan = document.getElementById('formGroupArisan');
if (formGroupArisan) {
  formGroupArisan.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isUserAdmin()) {
      showGlobalAlert('Hanya Role Admin yang dapat menambah atau mengatur Group Arisan.', 'error');
      return;
    }
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
        penanggung_jawab_nama: pjName,
        anggota_1: uniqueMembers[0] || pjName,
        anggota_1_nama: uniqueMembers[0] || pjName,
        anggota_2: uniqueMembers[1] || null,
        anggota_2_nama: uniqueMembers[1] || null,
        anggota_3: uniqueMembers[2] || null,
        anggota_3_nama: uniqueMembers[2] || null,
        anggota_4: uniqueMembers[3] || null,
        anggota_4_nama: uniqueMembers[3] || null,
        anggota_5: uniqueMembers[4] || null,
        anggota_5_nama: uniqueMembers[4] || null,
        anggota_list: uniqueMembers,
        jumlah_anggota: uniqueMembers.length,
        keterangan: ket || null,
        status_aktif: true
      };

      await adaptiveSupabaseWrite(TABLES.GROUP, groupPayload);
      await loadGroupArisanData();

      formGroupArisan.reset();
      populateAdminPesertaDropdowns();
      syncPayGroupSplitUI();

      showGlobalAlert(
        `✅ Group Arisan <b>${namaGroup}</b> (Penanggung Jawab: <b>${pjName}</b>, Total <b>${uniqueMembers.length} Orang</b>) berhasil disimpan ke Supabase!`,
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

// ============================================================================
// SUB-TAB 4 DI PENGATURAN: DAFTAR USER TERDAFTAR (adnan_User)
// Seluruh header ditampilkan kecuali 'id', format tanggal dd mmm yyyy,
// dilengkapi ikon Update Password, Update Role, dan Simpan.
// ============================================================================
let cachedUserList = [];

function escapeHtmlAttr(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadRegisteredUsersData() {
  const thead = document.getElementById('tableHeadDaftarUser');
  const tbody = document.getElementById('tableBodyDaftarUser');
  if (!thead || !tbody) return;

  try {
    let res = await fetch(`${SUPABASE_REST_URL}/${TABLES.USER}?select=*&order=created_at.asc`, {
      method: 'GET',
      headers: supabaseHeaders
    });
    if (!res.ok) {
      res = await fetch(`${SUPABASE_REST_URL}/${TABLES.USER}?select=*`, {
        method: 'GET',
        headers: supabaseHeaders
      });
    }
    if (!res.ok) throw new Error('Gagal memuat daftar user dari tabel adnan_User.');

    const rows = await res.json();
    cachedUserList = Array.isArray(rows) ? rows : [];
    renderRegisteredUsersTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
  }
}

function renderRegisteredUsersTable() {
  const thead = document.getElementById('tableHeadDaftarUser');
  const tbody = document.getElementById('tableBodyDaftarUser');
  if (!thead || !tbody) return;

  if (!cachedUserList || cachedUserList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Belum ada user terdaftar pada tabel adnan_User.</td></tr>`;
    return;
  }

  const adminFlag = isUserAdmin();

  // Kumpulkan seluruh header kolom dari adnan_User KECUALI 'id'
  const headerKeys = [];
  cachedUserList.forEach((row) => {
    Object.keys(row || {}).forEach((k) => {
      if (k.toLowerCase() !== 'id' && !headerKeys.includes(k)) {
        headerKeys.push(k);
      }
    });
  });

  // Render seluruh header kolom kecuali 'id' + kolom Aksi
  thead.innerHTML = `
    <tr>
      ${headerKeys
      .map((col) => `<th>${col.replace(/_/g, ' ').toUpperCase()}</th>`)
      .join('')}
      ${adminFlag ? `<th style="text-align:center;">AKSI ADMIN (EDIT SEMUA & SIMPAN)</th>` : ''}
    </tr>
  `;

  tbody.innerHTML = cachedUserList
    .map((row, idx) => {
      const cellsHtml = headerKeys
        .map((col) => {
          const colLower = col.toLowerCase();
          const val = row[col];

          // Khusus kolom tanggal: tampilkan format dd mmm yyyy (contoh: 28 Okt 2026)
          if (isDateColumnOrIsoValue(col, val)) {
            return `<td style="white-space:nowrap; font-weight:600;">${formatDateDdMmmYyyy(val)}</td>`;
          }

          // Jika ada kolom foto berupa base64 image
          if ((colLower === 'foto_url' || colLower === 'foto') && val && String(val).startsWith('data:image')) {
            return `<td><img src="${val}" alt="Foto" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" /></td>`;
          }

          // Jika bukan Admin, tampilkan secara read-only
          if (!adminFlag) {
            if (colLower === 'password') {
              return `<td><code>••••••</code></td>`;
            }
            if (typeof val === 'boolean') {
              return `<td><span class="status-pill ${val ? 'complete' : 'incomplete'}">${val ? 'Aktif' : 'Nonaktif'}</span></td>`;
            }
            return `<td>${val !== null && val !== undefined && val !== '' ? val : '-'}</td>`;
          }

          // =================================================================
          // MODE USER ADMIN: SELURUH KOLOM DAPAT DIEDIT OLEH ADMIN
          // =================================================================

          // 1. Kolom Password dengan ikon 🔑
          if (colLower === 'password') {
            return `
              <td>
                <div style="display:inline-flex; align-items:center; gap:5px;">
                  <input
                    type="text"
                    class="usr-edit-field"
                    data-row="${idx}"
                    data-col="${col}"
                    id="usrPassInput_${idx}"
                    value="${escapeHtmlAttr(val)}"
                    readonly
                    onclick="unlockUserField(${idx}, 'all')"
                    style="width:120px; padding:6px 8px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.82rem; font-family:monospace; background:#f8fafc; color:var(--text-main);"
                  />
                  <button
                    type="button"
                    class="btn-secondary btn-sm"
                    style="padding:5px 7px;"
                    title="Klik untuk update Password"
                    onclick="unlockUserField(${idx}, 'password')"
                  >🔑</button>
                </div>
              </td>
            `;
          }

          // 2. Kolom Role dengan ikon 🛡️
          if (colLower === 'role') {
            const currentRole = String(val || 'peserta').toLowerCase();
            const isAdminRole = currentRole === 'admin';
            return `
              <td>
                <div style="display:inline-flex; align-items:center; gap:5px;">
                  <select
                    class="usr-edit-field"
                    data-row="${idx}"
                    data-col="${col}"
                    id="usrRoleSelect_${idx}"
                    disabled
                    style="padding:6px 8px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.82rem; font-weight:700; background:#f8fafc; color:${isAdminRole ? 'var(--primary)' : 'var(--text-main)'};"
                  >
                    <option value="peserta" ${!isAdminRole ? 'selected' : ''}>peserta</option>
                    <option value="admin" ${isAdminRole ? 'selected' : ''}>admin</option>
                  </select>
                  <button
                    type="button"
                    class="btn-secondary btn-sm"
                    style="padding:5px 7px;"
                    title="Klik untuk update Role"
                    onclick="unlockUserField(${idx}, 'role')"
                  >🛡️</button>
                </div>
              </td>
            `;
          }

          // 3. Kolom Boolean (misal status_aktif)
          if (typeof val === 'boolean' || colLower === 'status_aktif') {
            const isTrue = val !== false;
            return `
              <td>
                <select
                  class="usr-edit-field"
                  data-row="${idx}"
                  data-col="${col}"
                  data-type="boolean"
                  disabled
                  style="padding:6px 8px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.82rem; font-weight:600; background:#f8fafc;"
                >
                  <option value="true" ${isTrue ? 'selected' : ''}>Aktif (true)</option>
                  <option value="false" ${!isTrue ? 'selected' : ''}>Nonaktif (false)</option>
                </select>
              </td>
            `;
          }

          // 4. Seluruh kolom teks lainnya (user_id, username, nama, nama_lengkap, no_hp, deskripsi, dll.)
          const isWideCol = colLower.includes('nama') || colLower.includes('deskripsi');
          return `
            <td>
              <input
                type="text"
                class="usr-edit-field"
                data-row="${idx}"
                data-col="${col}"
                id="usrField_${idx}_${col}"
                value="${escapeHtmlAttr(val ?? '')}"
                readonly
                onclick="unlockUserField(${idx}, 'all')"
                style="width:${isWideCol ? '165px' : '125px'}; padding:6px 8px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:0.82rem; ${colLower === 'user_id' ? 'font-weight:700;' : ''} background:#f8fafc; color:var(--text-main);"
              />
            </td>
          `;
        })
        .join('');

      const actionCellHtml = adminFlag
        ? `
          <td style="white-space:nowrap; text-align:center;">
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <button
                type="button"
                class="btn-secondary btn-sm"
                title="Buka kunci edit seluruh kolom pada baris ini"
                onclick="unlockUserField(${idx}, 'all')"
              >✏️ Edit</button>
              <button
                type="button"
                class="btn-primary btn-sm"
                id="btnSaveUser_${idx}"
                title="Simpan seluruh perubahan baris ini ke adnan_User"
                onclick="saveUserPasswordAndRole(${idx})"
              >💾 Simpan</button>
              <button
                type="button"
                class="btn-secondary btn-sm"
                style="color:#dc2626; border-color:#fecaca;"
                title="Hapus user ini dari tabel adnan_User"
                onclick="deleteRegisteredUser(${idx})"
              >🗑️ Hapus</button>
            </div>
          </td>
        `
        : '';

      return `
        <tr id="usrRow_${idx}">
          ${cellsHtml}
          ${actionCellHtml}
        </tr>
      `;
    })
    .join('');
}

function unlockUserField(idx, fieldType = 'all') {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya User Admin yang dapat mengedit data Daftar User Terdaftar.', 'error');
    return;
  }

  // Buka kunci seluruh input & select pada baris tersebut agar Admin bisa mengedit seluruhnya
  const rowFields = document.querySelectorAll(`.usr-edit-field[data-row="${idx}"]`);
  rowFields.forEach((el) => {
    if (el.tagName === 'SELECT') {
      el.disabled = false;
    } else {
      el.readOnly = false;
    }
    el.style.background = '#ffffff';
    el.style.borderColor = 'var(--primary)';
    el.style.boxShadow = '0 0 0 2px rgba(15, 118, 110, 0.14)';
  });

  const passInp = document.getElementById(`usrPassInput_${idx}`);
  const roleSel = document.getElementById(`usrRoleSelect_${idx}`);

  if (fieldType === 'password' && passInp) {
    passInp.focus();
    passInp.select();
  } else if (fieldType === 'role' && roleSel) {
    roleSel.focus();
  } else if (rowFields.length > 0) {
    rowFields[0].focus();
  }
}

async function saveUserPasswordAndRole(idx) {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya User Admin yang dapat menyimpan perubahan Daftar User.', 'error');
    return;
  }

  const userRow = cachedUserList[idx];
  if (!userRow) return;

  const saveBtn = document.getElementById(`btnSaveUser_${idx}`);
  const rowFields = document.querySelectorAll(`.usr-edit-field[data-row="${idx}"]`);

  // Kumpulkan nilai dari seluruh kolom yang diedit oleh Admin
  const updatePayload = {};
  rowFields.forEach((el) => {
    const col = el.getAttribute('data-col');
    const dtype = el.getAttribute('data-type');
    if (!col) return;
    if (dtype === 'boolean') {
      updatePayload[col] = el.value === 'true';
    } else {
      const trimmed = String(el.value ?? '').trim();
      updatePayload[col] = trimmed === '' ? null : trimmed;
    }
  });

  if (updatePayload.password !== undefined && !updatePayload.password) {
    showGlobalAlert('Password tidak boleh kosong.', 'error');
    const passInp = document.getElementById(`usrPassInput_${idx}`);
    if (passInp) passInp.focus();
    return;
  }

  if (updatePayload.user_id !== undefined && !updatePayload.user_id) {
    showGlobalAlert('User ID tidak boleh kosong.', 'error');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳...';
  }

  try {
    const queryFilter =
      userRow.id != null
        ? `?id=eq.${encodeURIComponent(userRow.id)}`
        : `?user_id=eq.${encodeURIComponent(userRow.user_id)}`;

    const updated = await adaptiveSupabaseWrite(
      TABLES.USER,
      updatePayload,
      queryFilter
    );

    cachedUserList[idx] = {
      ...userRow,
      ...updatePayload,
      ...(updated || {})
    };

    // Jika user yang diupdate adalah akun yang sedang login, sinkronkan session & hak akses
    if (
      currentLoggedUser &&
      ((userRow.id && String(currentLoggedUser.id) === String(userRow.id)) ||
        (userRow.user_id &&
          String(currentLoggedUser.user_id).toLowerCase() === String(userRow.user_id).toLowerCase()))
    ) {
      Object.assign(currentLoggedUser, updatePayload);
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentLoggedUser));
    }

    renderRegisteredUsersTable();
    showGlobalAlert(
      `✅ Seluruh perubahan data User <b>${cachedUserList[idx].user_id || cachedUserList[idx].nama || ''}</b> berhasil disimpan ke <code>adnan_User</code>!`,
      'success'
    );
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Simpan';
    }
  }
}

async function deleteRegisteredUser(idx) {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya Role Admin yang dapat menghapus data User.', 'error');
    return;
  }
  const userRow = cachedUserList[idx];
  if (!userRow) return;

  const labelUser = userRow.user_id || userRow.username || userRow.nama_lengkap || userRow.nama || `Baris #${idx + 1}`;
  if (!window.confirm(`Apakah Anda yakin ingin menghapus User "${labelUser}" dari tabel adnan_User?`)) {
    return;
  }

  try {
    const queryFilter =
      userRow.id != null
        ? `?id=eq.${encodeURIComponent(userRow.id)}`
        : `?user_id=eq.${encodeURIComponent(userRow.user_id)}`;

    await fetch(`${SUPABASE_REST_URL}/${TABLES.USER}${queryFilter}`, {
      method: 'DELETE',
      headers: supabaseHeaders
    });

    await loadRegisteredUsersData();
    showGlobalAlert(`🗑️ Data User <b>${labelUser}</b> berhasil dihapus dari <code>adnan_User</code>!`, 'success');
  } catch (err) {
    showGlobalAlert(err.message || 'Gagal menghapus data User.', 'error');
  }
}

window.unlockUserField = unlockUserField;
window.saveUserPasswordAndRole = saveUserPasswordAndRole;
window.deleteRegisteredUser = deleteRegisteredUser;

const btnRefreshDaftarUser = document.getElementById('btnRefreshDaftarUser');
if (btnRefreshDaftarUser) {
  btnRefreshDaftarUser.addEventListener('click', () => {
    loadRegisteredUsersData();
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

const winPeriodeEl = document.getElementById('winPeriode');
if (winPeriodeEl) {
  winPeriodeEl.addEventListener('change', () => {
    const selectedPeriode = (cachedPeriodeList || []).find((p) => String(p.id) === String(winPeriodeEl.value));
    const winNominalEl = document.getElementById('winNominal');
    if (winNominalEl) {
      const sp = getArisanSplitValues(selectedPeriode || null);
      winNominalEl.value = sp.nominal_arisan_konsumsi || DEFAULT_DIBAYARKAN_PEMENANG;
    }
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
      const spWin = getArisanSplitValues(selectedPeriode);
      const nominalDiterima = Number(document.getElementById('winNominal').value || spWin.nominal_arisan_konsumsi || DEFAULT_DIBAYARKAN_PEMENANG);
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

      const memberKey = String(a.id || a.user_id || idx);
      return `
        <div class="member-gallery-card" onclick="showDetailBiodataAnggota('${memberKey}')" style="cursor:pointer;" title="Klik untuk melihat Biodata Lengkap ${nama}">
          <div class="member-photo-box">
            ${photoContent}
          </div>
          <div class="member-name-label">${nama}</div>
          <div style="font-size:0.75rem; color:var(--primary); font-weight:700; margin-top:4px;">👤 Lihat Biodata Lengkap &rarr;</div>
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
// MODUL LIVE UNDIAN ARISAN (SPIN WHEEL REAL-TIME MULTI-CLIENT + HISTORY PUTARAN)
// ============================================================================
const LIVE_SPIN_STORAGE_KEY = 'adnan_live_spin_state_v1';
const LIVE_SPIN_CHANNEL_NAME = 'adnan_live_spin_channel';
const WHEEL_PALETTE = [
  '#0f766e',
  '#b45309',
  '#1d4ed8',
  '#7e22ce',
  '#be123c',
  '#047857',
  '#c2410c',
  '#4338ca',
  '#0369a1',
  '#a21caf'
];

let liveSpinBroadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    liveSpinBroadcastChannel = new BroadcastChannel(LIVE_SPIN_CHANNEL_NAME);
  }
} catch (_) { }

let liveSpinSupabaseRecordId = null;
let liveSpinPollerTimer = null;
let isWheelCurrentlySpinning = false;
let activeSpinRafId = null;
let currentWheelAngleRad = 0;
let lastProcessedSpinId = 0;
let hasInitializedSpinBoot = false;
let checkedSpinCandidatesMap = {};

let liveSpinState = {
  spin_id: 0,
  updated_at_ms: 0,
  status: 'IDLE', // 'IDLE' | 'SPINNING' | 'FINISHED'
  putaran_ke: 0,
  periode_id: '',
  periode_ke: 1,
  periode_label: '-',
  nominal_diterima: 0,
  candidates: [],
  winner_id: '',
  winner_user_id: '',
  winner_name: '',
  target_angle: 0,
  duration_ms: 60000,
  started_at: 0,
  triggered_by: 'Admin',
  official_history_id: null,
  history: []
};

function getEligibleWheelMembers() {
  const includeWonEl = document.getElementById('chkIncludeAlreadyWon');
  const includeWon = includeWonEl ? includeWonEl.checked : false;

  return (cachedAnggotaList || []).filter((a) => {
    const uid = String(a.user_id || '').trim().toLowerCase();
    const nama = String(a.nama_lengkap || '').trim();
    if (!nama) return false;
    if (uid === 'admin' && nama.toLowerCase().includes('admin arisan')) return false;
    if (!includeWon && a.sudah_menang === true) return false;
    return true;
  });
}

function getActiveWheelCandidateNames() {
  if (!isUserAdmin() && Array.isArray(liveSpinState.candidates) && liveSpinState.candidates.length > 0) {
    return liveSpinState.candidates;
  }
  const eligible = getEligibleWheelMembers();
  const selected = eligible
    .map((a) => String(a.nama_lengkap || '').trim())
    .filter((nama) => checkedSpinCandidatesMap[nama] !== false);

  if (selected.length > 0) return selected;
  if (Array.isArray(liveSpinState.candidates) && liveSpinState.candidates.length > 0) {
    return liveSpinState.candidates;
  }
  return eligible.map((a) => String(a.nama_lengkap || '').trim());
}

function findAnggotaByNameOrId(nameOrId, userId) {
  const targetName = String(nameOrId || '').trim().toLowerCase();
  const targetUid = String(userId || '').trim().toLowerCase();
  return (
    (cachedAnggotaList || []).find((a) => {
      if (String(a.id || '') === String(nameOrId || '')) return true;
      if (targetUid && String(a.user_id || '').trim().toLowerCase() === targetUid) return true;
      if (targetName && String(a.nama_lengkap || '').trim().toLowerCase() === targetName) return true;
      return false;
    }) || null
  );
}

function formatSpinTimestamp(dateObj = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = months[dateObj.getMonth()];
  const y = dateObj.getFullYear();
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const mm = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  return `${d} ${m} ${y}, ${hh}:${mm}:${ss}`;
}

function populateLiveSpinPeriodeDropdown() {
  const selectEl = document.getElementById('liveSpinPeriodeSelect');
  const nominalEl = document.getElementById('liveSpinNominalInput');
  if (!selectEl) return;

  const list = cachedPeriodeList || [];
  if (list.length === 0) {
    selectEl.innerHTML = `<option value="">-- Belum Ada Data Periode di Supabase --</option>`;
    if (nominalEl) nominalEl.value = '';
    return;
  }

  const prevVal = selectEl.value;
  selectEl.innerHTML = list
    .map((p) => {
      const sp = getArisanSplitValues(p);
      const nom = Number(p.total_dana_arisan || p.total_diterima || sp.nominal_arisan_konsumsi || 0);
      return `<option value="${p.id}" data-periode-ke="${p.periode_ke}" data-nominal="${nom}">Periode #${p.periode_ke}${p.bulan_tahun ? ' - ' + p.bulan_tahun : ''} (${p.status || 'aktif'})</option>`;
    })
    .join('');

  if (prevVal && list.some((p) => String(p.id) === String(prevVal))) {
    selectEl.value = prevVal;
  } else {
    const activeP = list.find((p) => p.status === 'aktif') || list[0];
    if (activeP) selectEl.value = activeP.id;
  }

  const chosen = list.find((p) => String(p.id) === String(selectEl.value)) || list[0];
  if (chosen && nominalEl) {
    const sp = getArisanSplitValues(chosen);
    const calcPot = Number(chosen.total_dana_arisan || chosen.total_diterima || sp.nominal_arisan_konsumsi || 0);
    nominalEl.value = calcPot > 0 ? calcPot : '';
  }
}

function renderLiveSpinCandidateChecklist() {
  const container = document.getElementById('liveSpinCandidateList');
  const countEl = document.getElementById('liveCandidateCountText');
  const chkAll = document.getElementById('chkAllSpinCandidates');
  if (!container) return;

  const eligible = getEligibleWheelMembers();
  if (Object.keys(checkedSpinCandidatesMap).length === 0) {
    eligible.forEach((a) => {
      checkedSpinCandidatesMap[a.nama_lengkap] = true;
    });
  }

  const activeNames = eligible
    .map((a) => a.nama_lengkap)
    .filter((nama) => checkedSpinCandidatesMap[nama] !== false);

  if (countEl) countEl.textContent = activeNames.length;
  if (chkAll) {
    chkAll.checked = eligible.length > 0 && activeNames.length === eligible.length;
  }

  if (eligible.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:14px;">Tidak ada kandidat yang belum menang. Centang "Sertakan yang Sudah Menang" untuk menampilkan semua anggota.</div>`;
    drawArisanWheel(currentWheelAngleRad, []);
    return;
  }

  container.innerHTML = eligible
    .map((a) => {
      const nama = a.nama_lengkap;
      const isChecked = checkedSpinCandidatesMap[nama] !== false;
      const wonBadge = a.sudah_menang
        ? `<small style="color:#d97706; font-weight:700;">(Sudah Menang #${a.periode_menang_ke || ''})</small>`
        : '';
      return `
        <label class="candidate-check-item">
          <input type="checkbox" class="chk-spin-candidate-item" data-candidate-name="${nama}" ${isChecked ? 'checked' : ''} />
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${nama}">
            ${nama} ${wonBadge}
          </span>
        </label>
      `;
    })
    .join('');

  container.querySelectorAll('.chk-spin-candidate-item').forEach((cb) => {
    cb.addEventListener('change', () => {
      const cName = cb.getAttribute('data-candidate-name');
      checkedSpinCandidatesMap[cName] = cb.checked;
      renderLiveSpinCandidateChecklist();
    });
  });

  if (!isWheelCurrentlySpinning) {
    if (isUserAdmin() || !Array.isArray(liveSpinState.candidates) || liveSpinState.candidates.length === 0) {
      liveSpinState.candidates = activeNames;
    }
    drawArisanWheel(currentWheelAngleRad, liveSpinState.candidates);
  }
}

function drawArisanWheel(angleRad = 0, candidatesInput = null) {
  const canvas = document.getElementById('arisanWheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 10;

  const candidates =
    Array.isArray(candidatesInput) && candidatesInput.length > 0
      ? candidatesInput
      : getActiveWheelCandidateNames();

  ctx.clearRect(0, 0, width, height);

  if (!candidates || candidates.length === 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pilih Kandidat Peserta Undian', cx, cy - 45);
    ctx.restore();
    return;
  }

  const count = candidates.length;
  const sliceAngle = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const startAngle = angleRad + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();

    // Tulis nama peserta pada potongan juring roda
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    const fontSize = count > 18 ? 11 : count > 12 ? 12.5 : 14;
    ctx.font = `700 ${fontSize}px Inter, sans-serif`;

    const rawName = String(candidates[i] || '');
    const shortName = rawName.length > 20 ? rawName.slice(0, 19) + '…' : rawName;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 3;
    ctx.fillText(shortName, radius - 18, 0);
    ctx.restore();
  }

  // Lingkaran luar dekoratif emas
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();
  ctx.restore();
}

function getSliceIndexAtTopPointer(angleRad, count) {
  if (!count || count <= 0) return 0;
  const sliceAngle = (Math.PI * 2) / count;
  const pointerAngle = -Math.PI / 2; // Posisi jarum di puncak atas (jam 12)
  let relative = (pointerAngle - angleRad) % (Math.PI * 2);
  if (relative < 0) relative += Math.PI * 2;
  return Math.floor(relative / sliceAngle) % count;
}

function updateSpinSpotlightUI(state) {
  const badgeText = document.getElementById('liveSpinStatusText');
  const titleEl = document.getElementById('liveSpinPeriodeTitle');
  const avatarEl = document.getElementById('spinSpotlightAvatar');
  const labelEl = document.getElementById('spinSpotlightLabel');
  const nameEl = document.getElementById('spinSpotlightName');
  const metaEl = document.getElementById('spinSpotlightMeta');
  const centerHub = document.getElementById('wheelCenterHub');

  if (!state) return;

  if (titleEl && state.periode_label) {
    titleEl.textContent = `Undian Pemenang Arisan • ${state.periode_label}`;
  }

  // Cek apakah sudah ada history yang disahkan sebagai pemenang resmi
  const officialEntry = (state.history || []).find((h) => h.is_official === true);

  if (isWheelCurrentlySpinning) {
    if (badgeText) {
      badgeText.textContent = `🔴 LIVE SPIN BERJALAN • Putaran Ke-${state.putaran_ke || 1} Sedang Berputar...`;
    }
    if (labelEl) labelEl.textContent = `🎡 MENGUNDI PUTARAN KE-${state.putaran_ke || 1}...`;
    if (centerHub) {
      centerHub.innerHTML = `<img src="img/wheel-spin-logo.jpg" alt="Logo Arisan Keluarga Adnan" class="logo-img" style="width:100%; height:100%; object-fit:contain; background:#ffffff; border-radius:50%;" />`;
    }
    return;
  }

  if (officialEntry) {
    const member = findAnggotaByNameOrId(officialEntry.winner_name, officialEntry.winner_user_id);
    const photoUrl = member && (member.foto_url || member.foto);
    const initials = String(officialEntry.winner_name || 'KA')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
    if (badgeText) {
      badgeText.textContent = `🏆 PEMENANG RESMI DISAHKAN • Putaran Ke-${officialEntry.putaran_ke} (${officialEntry.winner_name})`;
    }
    if (labelEl) {
      labelEl.textContent = `🏆 PEMENANG RESMI TERPILIH (DARI HISTORY PUTARAN KE-${officialEntry.putaran_ke})`;
    }
    if (nameEl) nameEl.textContent = officialEntry.winner_name;
    if (metaEl) {
      metaEl.innerHTML = `${officialEntry.periode_label || 'Periode Aktif'} • Disahkan oleh ${officialEntry.disahkan_oleh || 'Admin'}`;
    }
    if (avatarEl) {
      avatarEl.innerHTML = photoUrl
        ? `<img src="${photoUrl}" alt="${officialEntry.winner_name}" />`
        : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; font-size:1.1rem; background:var(--primary); border-radius:50%;">${initials}</div>`;
    }
    if (centerHub) {
      centerHub.innerHTML = photoUrl
        ? `<img src="${photoUrl}" alt="${officialEntry.winner_name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`
        : `<div style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, #0f766e, #115e59); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:1rem; font-weight:800; text-align:center;"><span style="font-size:1.25rem; line-height:1;">👑</span><span style="margin-top:2px;">${initials}</span></div>`;
    }
    return;
  }

  if (state.winner_name && state.putaran_ke > 0) {
    const member = findAnggotaByNameOrId(state.winner_name, state.winner_user_id);
    const photoUrl = member && (member.foto_url || member.foto);
    const initials = String(state.winner_name || 'KA')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
    if (badgeText) {
      badgeText.textContent = `🟢 HASIL PUTARAN KE-${state.putaran_ke}: ${state.winner_name} (Menunggu Pengesahan Admin)`;
    }
    if (labelEl) {
      labelEl.textContent = `🎯 TERPILIH PADA PUTARAN KE-${state.putaran_ke}`;
    }
    if (nameEl) nameEl.textContent = state.winner_name;
    if (metaEl) {
      metaEl.innerHTML = `Tercatat di History Putaran #${state.putaran_ke}. Admin dapat memutar lagi atau memilih putaran ini sebagai Pemenang Resmi.`;
    }
    if (avatarEl) {
      avatarEl.innerHTML = photoUrl
        ? `<img src="${photoUrl}" alt="${state.winner_name}" />`
        : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; font-size:1.1rem; background:var(--primary); border-radius:50%;">${initials}</div>`;
    }
    if (centerHub) {
      centerHub.innerHTML = photoUrl
        ? `<img src="${photoUrl}" alt="${state.winner_name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`
        : `<div style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, #0f766e, #115e59); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:1rem; font-weight:800; text-align:center;"><span style="font-size:1.25rem; line-height:1;">🎉</span><span style="margin-top:2px;">${initials}</span></div>`;
    }
  } else {
    if (badgeText) badgeText.textContent = '🟢 LIVE SYNC AKTIF • Menunggu Putaran Undian Admin';
    if (labelEl) labelEl.textContent = 'HASIL PUTARAN UNDIAN';
    if (nameEl) nameEl.textContent = 'Belum Ada Putaran';
    if (metaEl) {
      metaEl.textContent = 'Setiap hasil putaran ke-1, ke-2, dst. akan tercatat di Tabel History di bawah.';
    }
    if (avatarEl) avatarEl.innerHTML = '🎯';
    if (centerHub) {
      centerHub.innerHTML = `<img src="img/wheel-spin-logo.jpg" alt="Logo Arisan Keluarga Adnan" class="logo-img" style="width:100%; height:100%; object-fit:contain; background:#ffffff; border-radius:50%;" />`;
    }
  }
}

function renderSpinHistoryTable() {
  const tbody = document.getElementById('tableBodySpinHistory');
  const badge = document.getElementById('spinHistoryCountBadge');
  const thAction = document.getElementById('thActionSpinHistory');
  if (!tbody) return;

  const adminFlag = isUserAdmin();
  if (thAction) {
    thAction.textContent = adminFlag ? 'Aksi Pengesahan (Admin)' : 'Keterangan Pengesahan';
  }

  const historyList = Array.isArray(liveSpinState.history) ? liveSpinState.history : [];
  if (badge) {
    badge.textContent = `${historyList.length} Putaran Tercatat`;
  }

  if (historyList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">
          Belum ada history putaran undian. Setiap kali roda diputar (Putaran Ke-1, Ke-2, dst.), hasilnya akan tampil di sini.
        </td>
      </tr>
    `;
    return;
  }

  // Tampilkan berurutan dari Putaran terbaru di atas atau Putaran #1..#N
  tbody.innerHTML = historyList
    .map((item, idx) => {
      const member = findAnggotaByNameOrId(item.winner_name, item.winner_user_id);
      const photoUrl = member && (member.foto_url || member.foto);
      const initials = String(item.winner_name || 'KA')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');

      const mediaKey = `spin_hist_photo_${item.history_id || idx}`;
      if (photoUrl) {
        registerMediaPreview(mediaKey, `Foto Terpilih Putaran Ke-${item.putaran_ke} - ${item.winner_name}`, photoUrl);
      }

      const avatarHtml = photoUrl
        ? `<img src="${photoUrl}" alt="${item.winner_name}" onclick="openMediaByKey('${mediaKey}')" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); cursor:pointer; flex-shrink:0;" />`
        : `<div style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.82rem; flex-shrink:0;">${initials}</div>`;

      const isOfficial = item.is_official === true;
      const rowBg = isOfficial ? 'background:#f0fdf4;' : '';

      const statusBadge = isOfficial
        ? `<span class="status-pill complete" style="background:#16a34a; color:#ffffff; font-weight:800;">🏆 PEMENANG RESMI DISAHKAN</span>`
        : `<span class="status-pill incomplete" style="background:#fef3c7; color:#b45309;">🎯 Hasil Putaran Ke-${item.putaran_ke}</span>`;

      let actionHtml = '';
      if (adminFlag) {
        if (isOfficial) {
          actionHtml = `
            <span style="color:#15803d; font-weight:800; font-size:0.82rem;">
              ✅ Terpilih Jadi Pemenang Resmi
            </span>
          `;
        } else {
          actionHtml = `
            <button type="button" class="btn-primary btn-sm" onclick="selectSpinHistoryAsOfficialWinner('${item.history_id}')">
              🏆 Pilih & Tetapkan Jadi Pemenang
            </button>
          `;
        }
      } else {
        actionHtml = isOfficial
          ? `<span style="color:#15803d; font-weight:700; font-size:0.82rem;">✅ Disahkan oleh ${item.disahkan_oleh || 'Admin'}</span>`
          : `<span style="color:var(--text-muted); font-size:0.8rem;">Kandidat History Putaran #${item.putaran_ke}</span>`;
      }

      return `
        <tr style="${rowBg}">
          <td>
            <span class="gallery-badge" style="background:${isOfficial ? '#16a34a' : 'var(--primary-light)'}; color:${isOfficial ? '#ffffff' : 'var(--primary)'}; font-size:0.82rem; font-weight:800;">
              Putaran #${item.putaran_ke}
            </span>
          </td>
          <td style="font-size:0.82rem; color:var(--text-secondary);">${item.waktu || '-'}</td>
          <td><strong>${item.periode_label || 'Periode #' + (item.periode_ke || 1)}</strong></td>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              ${avatarHtml}
              <div>
                <strong style="font-size:0.94rem; color:var(--text-main);">${item.winner_name || '-'}</strong>
                ${isOfficial ? `<div style="font-size:0.74rem; color:#15803d; font-weight:700;">⭐ Pemenang Arisan Sah</div>` : ''}
              </div>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    })
    .join('');
}

function animateWheelSpinToState(stateObj) {
  const candidates =
    stateObj && Array.isArray(stateObj.candidates) && stateObj.candidates.length > 0
      ? stateObj.candidates
      : getActiveWheelCandidateNames();

  if (!candidates || candidates.length === 0) return;

  // Layar langsung menuju putaran roda saat tombol putar diklik atau animasi spin dimulai
  const wheelStage = document.querySelector('.wheel-stage-card') || document.getElementById('arisanWheelCanvas');
  if (wheelStage) {
    wheelStage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (activeSpinRafId) {
    cancelAnimationFrame(activeSpinRafId);
    activeSpinRafId = null;
  }

  isWheelCurrentlySpinning = true;
  const centerHub = document.getElementById('wheelCenterHub');
  if (centerHub) {
    centerHub.innerHTML = `<img src="img/wheel-spin-logo.jpg" alt="Logo Arisan Keluarga Adnan" class="logo-img" style="width:100%; height:100%; object-fit:contain; background:#ffffff; border-radius:50%;" />`;
  }
  const btnSpin = document.getElementById('btnTriggerLiveSpin');
  const btnSpinText = document.getElementById('btnTriggerLiveSpinText');
  if (btnSpin) btnSpin.disabled = true;
  if (btnSpinText) {
    btnSpinText.textContent = `🎡 SEDANG MEMUTAR PUTARAN KE-${stateObj.putaran_ke || 1}...`;
  }

  updateSpinSpotlightUI(stateObj);

  const startAngle = currentWheelAngleRad % (Math.PI * 2);
  let targetAngle = Number(stateObj.target_angle || (Math.PI * 2 * 50));
  if (targetAngle <= startAngle + Math.PI * 10) {
    targetAngle += Math.PI * 2 * 50;
  }
  const duration = Number(stateObj.duration_ms || 60000);
  let startTime = null;

  const nameEl = document.getElementById('spinSpotlightName');
  const metaEl = document.getElementById('spinSpotlightMeta');

  function stepFrame(now) {
    // Jika tab client sempat berada di background saat sinyal masuk, mulai hitungan animasi saat tab terlihat
    if (document.hidden) {
      activeSpinRafId = requestAnimationFrame(stepFrame);
      return;
    }

    if (startTime === null) {
      startTime = now;
    }

    const elapsed = Math.max(0, now - startTime);
    const progress = Math.min(1, elapsed / duration);
    // Quintic ease-out agar putaran melambat secara dramatis dan halus selama 60 detik (1 menit)
    const eased = 1 - Math.pow(1 - progress, 3.5);
    const angle = startAngle + (targetAngle - startAngle) * eased;

    currentWheelAngleRad = angle;
    drawArisanWheel(angle, candidates);

    const currentSliceIdx = getSliceIndexAtTopPointer(angle, candidates.length);
    const passingName = candidates[currentSliceIdx] || '';
    if (nameEl && progress < 0.99) {
      nameEl.textContent = passingName;
    }
    if (metaEl && progress < 0.99) {
      metaEl.textContent = `Roda sedang berputar serentak di seluruh layar client (${Math.round(progress * 100)}%)...`;
    }

    if (progress < 1) {
      activeSpinRafId = requestAnimationFrame(stepFrame);
    } else {
      activeSpinRafId = null;
      currentWheelAngleRad = targetAngle % (Math.PI * 2);
      isWheelCurrentlySpinning = false;
      liveSpinState.status = 'FINISHED';
      if (btnSpin) btnSpin.disabled = false;
      if (btnSpinText) {
        btnSpinText.textContent = `🎡 PUTAR RODA UNDIAN LAGI (PUTARAN KE-${(liveSpinState.history.length || 0) + 1})`;
      }
      updateSpinSpotlightUI(liveSpinState);
      renderSpinHistoryTable();
      showGlobalAlert(
        `🎉 <b>Hasil Putaran Ke-${stateObj.putaran_ke}:</b> Jarum berhenti pada <b>${stateObj.winner_name}</b>! Tercatat di Tabel History Putaran.`,
        'success'
      );
    }
  }

  activeSpinRafId = requestAnimationFrame(stepFrame);
}

function encodeSpinStateMetaTag(stateObj) {
  try {
    return `[LIVESPINSTATE:${encodeURIComponent(JSON.stringify(stateObj))}]`;
  } catch (_) {
    return '';
  }
}

function extractSpinStateFromText(rawText) {
  if (!rawText) return null;
  const str = String(rawText);
  const tagMatch = str.match(/\[LIVESPINSTATE:([^\]]+)\]/);
  if (tagMatch && tagMatch[1]) {
    try {
      return JSON.parse(decodeURIComponent(tagMatch[1]));
    } catch (_) { }
  }
  if (str.trim().startsWith('{') && str.includes('"spin_id"')) {
    try {
      return JSON.parse(str.trim());
    } catch (_) { }
  }
  return null;
}

async function broadcastLiveSpinStateToAllClients(newState) {
  const stampedState = {
    ...newState,
    updated_at_ms: Date.now()
  };
  liveSpinState = stampedState;

  // 1. Kanal Lokal Instan (Antar-Tab / Jendela pada Browser yang Sama)
  try {
    localStorage.setItem(LIVE_SPIN_STORAGE_KEY, JSON.stringify(stampedState));
  } catch (_) { }

  if (liveSpinBroadcastChannel) {
    try {
      liveSpinBroadcastChannel.postMessage(stampedState);
    } catch (_) { }
  }

  const jsonStr = JSON.stringify(stampedState);
  const metaTag = encodeSpinStateMetaTag(stampedState);

  // 2. Kanal Supabase Utama #1: Simpan pada tabel adnan_Arisan (kolom keterangan periode aktif)
  // Tabel adnan_Arisan pasti ada, memiliki kolom keterangan, dan dibaca oleh seluruh client!
  const writeArisanPromise = (async () => {
    try {
      let targetPeriode =
        (cachedPeriodeList || []).find((p) => String(p.id) === String(stampedState.periode_id)) ||
        (cachedPeriodeList || []).find((p) => p.status === 'aktif') ||
        (cachedPeriodeList || [])[0] ||
        null;

      if (!targetPeriode) {
        const resP = await fetch(`${SUPABASE_REST_URL}/${TABLES.ARISAN}?select=*&limit=1`, {
          method: 'GET',
          headers: supabaseHeaders,
          cache: 'no-store'
        });
        if (resP.ok) {
          const rowsP = await resP.json();
          if (rowsP && rowsP.length > 0) targetPeriode = rowsP[0];
        }
      }

      if (targetPeriode && targetPeriode.id != null) {
        const cleanExistingKet = String(targetPeriode.keterangan || '')
          .replace(/\s*\[LIVESPINSTATE:[^\]]*\]\s*/g, '')
          .trim();
        const combinedKet = [cleanExistingKet, metaTag].filter(Boolean).join(' ');
        await adaptiveSupabaseWrite(
          TABLES.ARISAN,
          { keterangan: combinedKet },
          `?id=eq.${encodeURIComponent(targetPeriode.id)}`
        );
      }
    } catch (_) { }
  })();

  // 3. Kanal Supabase Cadangan #2: Simpan pada tabel adnan_Pengumuman menggunakan select=* (tanpa kolom spesifik yang rawan error 400)
  const writePengumumanPromise = (async () => {
    try {
      if (!liveSpinSupabaseRecordId) {
        const checkRes = await fetch(`${SUPABASE_REST_URL}/${TABLES.PENGUMUMAN}?select=*`, {
          method: 'GET',
          headers: supabaseHeaders,
          cache: 'no-store'
        });
        if (checkRes.ok) {
          const allRows = await checkRes.json();
          const foundRow = (allRows || []).find(
            (r) =>
              String(r.judul || '') === '__LIVE_SPIN_STATE__' ||
              String(r.kategori || '') === 'LIVE_SPIN_STATE'
          );
          if (foundRow && foundRow.id != null) {
            liveSpinSupabaseRecordId = foundRow.id;
          }
        }
      }

      const payload = {
        judul: '__LIVE_SPIN_STATE__',
        kategori: 'LIVE_SPIN_STATE',
        isi: jsonStr,
        isi_pengumuman: jsonStr,
        tanggal_pengumuman: todayISO(),
        dibuat_oleh: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin',
        status_aktif: true
      };

      if (liveSpinSupabaseRecordId) {
        await adaptiveSupabaseWrite(
          TABLES.PENGUMUMAN,
          payload,
          `?id=eq.${encodeURIComponent(liveSpinSupabaseRecordId)}`
        );
      } else {
        const created = await adaptiveSupabaseWrite(TABLES.PENGUMUMAN, payload);
        if (created && created.id != null) {
          liveSpinSupabaseRecordId = created.id;
        }
      }
    } catch (_) { }
  })();

  await Promise.all([writeArisanPromise, writePengumumanPromise]);
}

function applyIncomingSpinState(remoteState, isInitialBoot = false) {
  if (!remoteState || typeof remoteState !== 'object') return;

  const incomingSpinId = Number(remoteState.spin_id || 0);
  const incomingUpdatedMs = Number(remoteState.updated_at_ms || incomingSpinId || 0);
  const currentUpdatedMs = Number(liveSpinState.updated_at_ms || liveSpinState.spin_id || 0);

  // Abaikan jika state yang masuk lebih lama dari state yang sudah aktif di layar
  if (incomingSpinId < lastProcessedSpinId && incomingUpdatedMs < currentUpdatedMs) {
    return;
  }

  const incomingHistory = Array.isArray(remoteState.history) ? remoteState.history : [];
  const currentHistory = Array.isArray(liveSpinState.history) ? liveSpinState.history : [];
  const historyChanged = incomingHistory.length !== currentHistory.length;
  const officialChanged = remoteState.official_history_id !== liveSpinState.official_history_id;

  liveSpinState = {
    ...liveSpinState,
    ...remoteState,
    history: incomingHistory
  };

  const ageMs = Date.now() - Number(remoteState.started_at || incomingSpinId || 0);

  // Saat baru pertama kali memuat halaman, jangan memutar ulang undian lama yang sudah lewat > 25 detik
  if (isInitialBoot && (remoteState.status !== 'SPINNING' || ageMs > 25000)) {
    lastProcessedSpinId = incomingSpinId;
    currentWheelAngleRad = Number(remoteState.target_angle || 0) % (Math.PI * 2);
    drawArisanWheel(currentWheelAngleRad, liveSpinState.candidates);
    updateSpinSpotlightUI(liveSpinState);
    renderSpinHistoryTable();
    return;
  }

  // JIKA ADA PUTARAN BARU DARI ADMIN (spin_id baru): PUTAR RODA DI LAYAR CLIENT SEKARANG!
  if (incomingSpinId > 0 && incomingSpinId !== lastProcessedSpinId) {
    lastProcessedSpinId = incomingSpinId;

    // Jika statusnya IDLE (misal Admin menekan tombol Reset History Putaran)
    if (remoteState.status === 'IDLE' && incomingHistory.length === 0) {
      if (activeSpinRafId) {
        cancelAnimationFrame(activeSpinRafId);
        activeSpinRafId = null;
      }
      isWheelCurrentlySpinning = false;
      currentWheelAngleRad = 0;
      drawArisanWheel(0, liveSpinState.candidates);
      updateSpinSpotlightUI(liveSpinState);
      renderSpinHistoryTable();
      return;
    }

    // Jika putaran baru saja dipicu oleh Admin (dalam rentang 90 detik terakhir), jalankan animasi putaran roda!
    if (ageMs < 90000) {
      const liveSection = document.getElementById('viewLiveUndian');
      if (liveSection && !liveSection.classList.contains('active') && currentBiodataRecord) {
        switchMainView('viewLiveUndian');
      }
      animateWheelSpinToState(liveSpinState);
      return;
    } else {
      currentWheelAngleRad = Number(remoteState.target_angle || 0) % (Math.PI * 2);
    }
  }

  if (!isWheelCurrentlySpinning) {
    drawArisanWheel(currentWheelAngleRad, liveSpinState.candidates);
    updateSpinSpotlightUI(liveSpinState);
    if (historyChanged || officialChanged) {
      renderSpinHistoryTable();
    }
  }
}

async function pollLiveSpinStateFromSupabase(isInitialBoot = false) {
  if (!currentLoggedUser) return;

  const candidatesStates = [];

  // 1. Cek dari tabel adnan_Arisan (kolom keterangan) dengan cache: 'no-store'
  try {
    const resArisan = await fetch(`${SUPABASE_REST_URL}/${TABLES.ARISAN}?select=*`, {
      method: 'GET',
      headers: supabaseHeaders,
      cache: 'no-store'
    });
    if (resArisan.ok) {
      const rowsArisan = await resArisan.json();
      (rowsArisan || []).forEach((r) => {
        const parsed = extractSpinStateFromText(r.keterangan);
        if (parsed && parsed.spin_id) {
          candidatesStates.push(parsed);
        }
      });
    }
  } catch (_) { }

  // 2. Cek dari tabel adnan_Pengumuman dengan select=* dan cache: 'no-store'
  try {
    const resAnn = await fetch(`${SUPABASE_REST_URL}/${TABLES.PENGUMUMAN}?select=*`, {
      method: 'GET',
      headers: supabaseHeaders,
      cache: 'no-store'
    });
    if (resAnn.ok) {
      const rowsAnn = await resAnn.json();
      (rowsAnn || []).forEach((r) => {
        if (
          String(r.judul || '') === '__LIVE_SPIN_STATE__' ||
          String(r.kategori || '') === 'LIVE_SPIN_STATE'
        ) {
          if (r.id != null) liveSpinSupabaseRecordId = r.id;
          const rawText = r.isi_pengumuman || r.isi || r.deskripsi || r.keterangan || '';
          const parsed = extractSpinStateFromText(rawText);
          if (parsed && parsed.spin_id) {
            candidatesStates.push(parsed);
          }
        }
      });
    }
  } catch (_) { }

  if (candidatesStates.length === 0) {
    try {
      localStorage.removeItem(LIVE_SPIN_STORAGE_KEY);
    } catch (_) { }
    return;
  }

  // Pilih state terbaru berdasarkan updated_at_ms / spin_id tertinggi
  candidatesStates.sort((a, b) => {
    const timeB = Number(b.updated_at_ms || b.spin_id || 0);
    const timeA = Number(a.updated_at_ms || a.spin_id || 0);
    return timeB - timeA;
  });

  const newestState = candidatesStates[0];
  applyIncomingSpinState(newestState, isInitialBoot);
}

function startLiveSpinPoller() {
  if (liveSpinPollerTimer) clearInterval(liveSpinPollerTimer);
  liveSpinPollerTimer = setInterval(() => {
    pollLiveSpinStateFromSupabase(false);
  }, 1200);
}

async function triggerAdminLiveSpin() {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya User Admin yang dapat menekan tombol Putar Roda Undian.', 'error');
    return;
  }
  if (isWheelCurrentlySpinning) return;

  const candidates = getActiveWheelCandidateNames();
  if (!candidates || candidates.length < 2) {
    showGlobalAlert('Pilih minimal 2 kandidat peserta pada daftar kandidat roda undian.', 'error');
    return;
  }

  const periodeSelect = document.getElementById('liveSpinPeriodeSelect');
  const nominalInput = document.getElementById('liveSpinNominalInput');
  const selectedPeriodeId = periodeSelect ? periodeSelect.value : '';
  const selectedPeriodeObj =
    (cachedPeriodeList || []).find((p) => String(p.id) === String(selectedPeriodeId)) ||
    cachedPeriodeList[0] ||
    null;

  const periodeKe = selectedPeriodeObj ? Number(selectedPeriodeObj.periode_ke || 1) : 1;
  const periodeLabel = selectedPeriodeObj
    ? `Periode #${selectedPeriodeObj.periode_ke} (${selectedPeriodeObj.bulan_tahun})`
    : '-';
  const spChosen = getArisanSplitValues(selectedPeriodeObj);
  const nominalDiterima = Number((nominalInput && nominalInput.value) || spChosen.nominal_arisan_konsumsi || 0);

  // Pilih pemenang acak menggunakan crypto.getRandomValues agar adil & acak murni
  let randomIdx = Math.floor(Math.random() * candidates.length);
  if (window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    randomIdx = arr[0] % candidates.length;
  }

  const winnerName = candidates[randomIdx];
  const winnerMember = findAnggotaByNameOrId(winnerName, null);

  // Hitung sudut berhenti (target_angle) agar juring `randomIdx` berhenti tepat di bawah jarum atas (-PI/2)
  const sliceAngle = (Math.PI * 2) / candidates.length;
  const jitterWithinSlice = (0.25 + Math.random() * 0.5) * sliceAngle;
  const baseStopAngle = -Math.PI / 2 - (randomIdx * sliceAngle + jitterWithinSlice);
  // Putaran 1 menit (60 detik) dengan ~50 putaran penuh
  const extraFullRotations = (50 + Math.floor(Math.random() * 5)) * Math.PI * 2;
  const targetAngle = baseStopAngle + extraFullRotations;

  const existingHistory = Array.isArray(liveSpinState.history) ? [...liveSpinState.history] : [];
  const nextPutaranKe = existingHistory.length + 1;
  const spinTimestamp = Date.now();
  const historyId = `spin_${spinTimestamp}_${nextPutaranKe}`;

  const newHistoryEntry = {
    history_id: historyId,
    putaran_ke: nextPutaranKe,
    waktu: formatSpinTimestamp(new Date()),
    periode_id: selectedPeriodeObj ? selectedPeriodeObj.id : selectedPeriodeId,
    periode_ke: periodeKe,
    periode_label: periodeLabel,
    winner_id: winnerMember ? winnerMember.id : '',
    winner_user_id: winnerMember ? winnerMember.user_id || '' : '',
    winner_name: winnerName,
    nominal_diterima: nominalDiterima,
    is_official: false,
    disahkan_oleh: null,
    disahkan_waktu: null
  };

  existingHistory.push(newHistoryEntry);

  const nextState = {
    spin_id: spinTimestamp,
    updated_at_ms: spinTimestamp,
    status: 'SPINNING',
    putaran_ke: nextPutaranKe,
    periode_id: selectedPeriodeObj ? selectedPeriodeObj.id : selectedPeriodeId,
    periode_ke: periodeKe,
    periode_label: periodeLabel,
    nominal_diterima: nominalDiterima,
    candidates: candidates,
    winner_id: winnerMember ? winnerMember.id : '',
    winner_user_id: winnerMember ? winnerMember.user_id || '' : '',
    winner_name: winnerName,
    target_angle: targetAngle,
    duration_ms: 60000,
    started_at: spinTimestamp,
    triggered_by: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin',
    official_history_id: liveSpinState.official_history_id || null,
    history: existingHistory
  };

  lastProcessedSpinId = spinTimestamp;

  // Layar langsung menuju putaran roda
  const wheelStage = document.querySelector('.wheel-stage-card') || document.getElementById('arisanWheelCanvas');
  if (wheelStage) {
    wheelStage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Kirim sinyal ke seluruh client sekaligus mulai putaran roda
  broadcastLiveSpinStateToAllClients(nextState);
  animateWheelSpinToState(nextState);
}

function selectSpinHistoryAsOfficialWinner(historyId) {
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya User Admin yang dapat menetapkan pemenang resmi dari History Putaran.', 'error');
    return;
  }

  const historyList = Array.isArray(liveSpinState.history) ? [...liveSpinState.history] : [];
  const targetEntry = historyList.find((h) => String(h.history_id) === String(historyId));
  if (!targetEntry) {
    showGlobalAlert('Data putaran tidak ditemukan pada history.', 'error');
    return;
  }

  const modal = document.getElementById('modalPengesahanPemenang');
  if (!modal) return;

  const periodeObj =
    (cachedPeriodeList || []).find((p) => String(p.id) === String(targetEntry.periode_id)) ||
    (cachedPeriodeList || []).find((p) => Number(p.periode_ke) === Number(targetEntry.periode_ke)) ||
    cachedPeriodeList[0] ||
    null;

  const perKe = targetEntry.periode_ke || (periodeObj ? periodeObj.periode_ke : 1);
  const blnTahun = periodeObj ? periodeObj.bulan_tahun : targetEntry.periode_label || '-';
  const member = findAnggotaByNameOrId(targetEntry.winner_name, targetEntry.winner_id);

  document.getElementById('modalSahHistoryId').value = historyId;
  document.getElementById('modalSahWinnerId').value = (member && member.id) || targetEntry.winner_id || '';
  document.getElementById('modalSahWinnerUserId').value = (member && member.user_id) || targetEntry.winner_user_id || '';
  document.getElementById('modalSahNamaPemenang').value = targetEntry.winner_name;
  document.getElementById('modalSahPeriodeLabel').textContent = `Periode Ke-${perKe}`;
  document.getElementById('modalSahBulanTahun').textContent = blnTahun;
  document.getElementById('modalSahTanggalUndi').value = todayISO();
  document.getElementById('modalSahTotalDiterima').value = ''; // Nilai awal dikosongkan ("") sesuai permintaan

  document.getElementById('modalSahMetode').value = 'Transfer Bank';
  populateBankDropdowns();
  const bankSelect = document.getElementById('modalSahBank');
  if (bankSelect && member && member.nama_bank) {
    bankSelect.value = member.nama_bank;
  }
  toggleModalSahBankDropdown();

  document.getElementById('modalSahKeterangan').value = `Disahkan dari Live Spin Undian Putaran Ke-${targetEntry.putaran_ke || 1} (${targetEntry.waktu || ''})`;

  const btnConfirm = document.getElementById('btnConfirmSahPemenang');
  if (btnConfirm) {
    btnConfirm.innerHTML = `🏆 Konfirmasi Penerima Periode Ke-${perKe}`;
  }

  modal.style.display = 'flex';
}

function closeModalPengesahanPemenang() {
  const modal = document.getElementById('modalPengesahanPemenang');
  if (modal) modal.style.display = 'none';
}

function toggleModalSahBankDropdown() {
  const metode = document.getElementById('modalSahMetode').value;
  const wrapper = document.getElementById('modalSahBankWrapper');
  if (wrapper) {
    wrapper.style.display = metode === 'Transfer Bank' ? 'block' : 'none';
  }
}

async function submitModalPengesahanPemenang(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isUserAdmin()) {
    showGlobalAlert('Hanya Role Admin yang berhak mengesahkan pemenang.', 'error');
    return;
  }

  const historyId = document.getElementById('modalSahHistoryId').value;
  const historyList = Array.isArray(liveSpinState.history) ? [...liveSpinState.history] : [];
  const targetEntry = historyList.find((h) => String(h.history_id) === String(historyId));
  if (!targetEntry) {
    showGlobalAlert('Data putaran tidak valid.', 'error');
    return;
  }

  const btn = document.getElementById('btnConfirmSahPemenang');
  btn.disabled = true;
  btn.textContent = 'Mengesahkan...';

  const adminName = currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin';
  const totalDiterima = Number(document.getElementById('modalSahTotalDiterima').value || 0);
  const tanggalUndi = document.getElementById('modalSahTanggalUndi').value || todayISO();
  const metode = document.getElementById('modalSahMetode').value;
  const namaBank = metode === 'Transfer Bank' ? document.getElementById('modalSahBank').value : null;
  const keterangan = document.getElementById('modalSahKeterangan').value.trim();

  const updatedHistory = historyList.map((h) => ({
    ...h,
    is_official: String(h.history_id) === String(historyId),
    disahkan_oleh: String(h.history_id) === String(historyId) ? adminName : null,
    disahkan_waktu: String(h.history_id) === String(historyId) ? formatSpinTimestamp(new Date()) : null
  }));

  const updatedState = {
    ...liveSpinState,
    updated_at_ms: Date.now(),
    status: 'FINISHED',
    official_history_id: historyId,
    winner_name: targetEntry.winner_name,
    winner_id: targetEntry.winner_id,
    winner_user_id: targetEntry.winner_user_id,
    putaran_ke: targetEntry.putaran_ke,
    history: updatedHistory
  };

  try {
    const member = findAnggotaByNameOrId(targetEntry.winner_name, targetEntry.winner_user_id);
    const periodeObj =
      (cachedPeriodeList || []).find((p) => String(p.id) === String(targetEntry.periode_id)) ||
      (cachedPeriodeList || []).find((p) => Number(p.periode_ke) === Number(targetEntry.periode_ke)) ||
      cachedPeriodeList[0] ||
      null;

    if (periodeObj && periodeObj.id) {
      await adaptiveSupabaseWrite(
        TABLES.ARISAN,
        {
          pemenang_id: member ? member.id : null,
          pemenang_nama: targetEntry.winner_name,
          total_diterima: totalDiterima,
          status: 'selesai'
        },
        `?id=eq.${encodeURIComponent(periodeObj.id)}`
      );
    }

    if (member && member.id) {
      await adaptiveSupabaseWrite(
        TABLES.ANGGOTA,
        {
          sudah_menang: true,
          periode_menang_ke: targetEntry.periode_ke || (periodeObj ? periodeObj.periode_ke : 1)
        },
        `?id=eq.${encodeURIComponent(member.id)}`
      );
    }

    try {
      await adaptiveSupabaseWrite(TABLES.PEMENANG, {
        periode_id: periodeObj ? periodeObj.id : null,
        periode_ke: targetEntry.periode_ke || (periodeObj ? periodeObj.periode_ke : 1),
        bulan_tahun: periodeObj ? periodeObj.bulan_tahun : targetEntry.periode_label || '-',
        anggota_id: member ? member.id : null,
        user_id: member ? member.user_id || null : null,
        nama_pemenang: targetEntry.winner_name,
        tanggal_undi: tanggalUndi,
        nominal_diterima: totalDiterima,
        metode_pencairan: metode,
        nama_bank: namaBank,
        keterangan: keterangan,
        ditetapkan_oleh: adminName
      });
    } catch (_) { }

    await broadcastLiveSpinStateToAllClients(updatedState);
    updateSpinSpotlightUI(updatedState);
    renderSpinHistoryTable();
    await fetchAllAnggota();
    await loadPeriodeAndPemenangData();
    renderLiveSpinCandidateChecklist();
    updateQuickStatsBar();
    closeModalPengesahanPemenang();

    showGlobalAlert(
      `🏆 <b>Pemenang Resmi Disahkan!</b> <b>${targetEntry.winner_name}</b> telah ditetapkan sebagai Penerima Arisan Periode Ke-${targetEntry.periode_ke || 1}!`,
      'success'
    );
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🏆 Konfirmasi Penetapan Pemenang';
  }
}

window.selectSpinHistoryAsOfficialWinner = selectSpinHistoryAsOfficialWinner;
window.closeModalPengesahanPemenang = closeModalPengesahanPemenang;
window.toggleModalSahBankDropdown = toggleModalSahBankDropdown;
window.submitModalPengesahanPemenang = submitModalPengesahanPemenang;

async function resetLiveSpinHistoryByAdmin() {
  if (!isUserAdmin()) return;

  const resetTs = Date.now();
  const emptyState = {
    spin_id: resetTs,
    updated_at_ms: resetTs,
    status: 'IDLE',
    putaran_ke: 0,
    periode_id: liveSpinState.periode_id || '',
    periode_ke: liveSpinState.periode_ke || 1,
    periode_label: liveSpinState.periode_label || '-',
    nominal_diterima: liveSpinState.nominal_diterima || 0,
    candidates: getActiveWheelCandidateNames(),
    winner_id: '',
    winner_user_id: '',
    winner_name: '',
    target_angle: 0,
    duration_ms: 60000,
    started_at: resetTs,
    triggered_by: currentLoggedUser ? currentLoggedUser.nama_lengkap || currentLoggedUser.user_id : 'Admin',
    official_history_id: null,
    history: []
  };

  lastProcessedSpinId = emptyState.spin_id;
  const btnSpinText = document.getElementById('btnTriggerLiveSpinText');
  if (btnSpinText) {
    btnSpinText.textContent = 'PUTAR RODA UNDIAN SEKARANG (LIVE KE SEMUA CLIENT)';
  }

  await broadcastLiveSpinStateToAllClients(emptyState);
  updateSpinSpotlightUI(emptyState);
  renderSpinHistoryTable();
  drawArisanWheel(currentWheelAngleRad, emptyState.candidates);
  showGlobalAlert('🔄 History putaran undian telah di-reset. Siap memulai Putaran Ke-1 baru.', 'success');
}

function refreshLiveUndianUI() {
  const adminFlag = isUserAdmin();
  const adminCard = document.getElementById('adminLiveSpinControlCard');
  const viewerCard = document.getElementById('viewerLiveSpinInfoCard');
  if (adminCard) adminCard.classList.toggle('hidden', !adminFlag);
  if (viewerCard) viewerCard.classList.toggle('hidden', adminFlag);

  populateLiveSpinPeriodeDropdown();
  renderLiveSpinCandidateChecklist();
  updateSpinSpotlightUI(liveSpinState);
  renderSpinHistoryTable();
  pollLiveSpinStateFromSupabase(false);
}

async function initOrRefreshLiveUndian() {
  const isFirstBoot = !hasInitializedSpinBoot;
  hasInitializedSpinBoot = true;

  refreshLiveUndianUI();
  await pollLiveSpinStateFromSupabase(isFirstBoot);
}

// Listener untuk perubahan antar-tab / jendela pada browser yang sama
if (liveSpinBroadcastChannel) {
  liveSpinBroadcastChannel.onmessage = (ev) => {
    if (ev && ev.data) {
      applyIncomingSpinState(ev.data);
    }
  };
}

window.addEventListener('storage', (ev) => {
  if (ev.key === LIVE_SPIN_STORAGE_KEY && ev.newValue) {
    try {
      applyIncomingSpinState(JSON.parse(ev.newValue));
    } catch (_) { }
  }
});

const chkAllSpinCandidatesEl = document.getElementById('chkAllSpinCandidates');
if (chkAllSpinCandidatesEl) {
  chkAllSpinCandidatesEl.addEventListener('change', () => {
    const eligible = getEligibleWheelMembers();
    eligible.forEach((a) => {
      checkedSpinCandidatesMap[a.nama_lengkap] = chkAllSpinCandidatesEl.checked;
    });
    renderLiveSpinCandidateChecklist();
  });
}

const chkIncludeAlreadyWonEl = document.getElementById('chkIncludeAlreadyWon');
if (chkIncludeAlreadyWonEl) {
  chkIncludeAlreadyWonEl.addEventListener('change', () => {
    checkedSpinCandidatesMap = {};
    renderLiveSpinCandidateChecklist();
  });
}

const liveSpinPeriodeSelectEl = document.getElementById('liveSpinPeriodeSelect');
if (liveSpinPeriodeSelectEl) {
  liveSpinPeriodeSelectEl.addEventListener('change', () => {
    const chosen = (cachedPeriodeList || []).find(
      (p) => String(p.id) === String(liveSpinPeriodeSelectEl.value)
    );
    const nominalEl = document.getElementById('liveSpinNominalInput');
    if (chosen && nominalEl) {
      const sp = getArisanSplitValues(chosen);
      const val = Number(chosen.total_dana_arisan || chosen.total_diterima || sp.nominal_arisan_konsumsi || 0);
      nominalEl.value = val > 0 ? val : '';
    }
  });
}

const btnTriggerLiveSpinEl = document.getElementById('btnTriggerLiveSpin');
if (btnTriggerLiveSpinEl) {
  btnTriggerLiveSpinEl.addEventListener('click', () => {
    triggerAdminLiveSpin();
  });
}

const btnResetLiveSpinHistoryEl = document.getElementById('btnResetLiveSpinHistory');
if (btnResetLiveSpinHistoryEl) {
  btnResetLiveSpinHistoryEl.addEventListener('click', () => {
    resetLiveSpinHistoryByAdmin();
  });
}

const btnManualSyncSpinEl = document.getElementById('btnManualSyncSpin');
if (btnManualSyncSpinEl) {
  btnManualSyncSpinEl.addEventListener('click', async () => {
    await pollLiveSpinStateFromSupabase();
    showGlobalAlert('🔄 Status Live Undian & History Putaran berhasil disinkronkan!', 'success');
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
    if (liveSpinPollerTimer) clearInterval(liveSpinPollerTimer);
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
  // - Tab & Kartu Pengaturan (navBtnPeriode & galleryCardPeriode)
  // - Tab & Kartu Pengeluaran (navBtnPengeluaran & galleryCardPengeluaran)
  // - Buat Pengumuman Baru / Unggah Dokumen PDF
  // - Unggah Foto Kegiatan Baru
  // - Tambah / Setting Periode Arisan Baru, Penetapan Pemenang & Entry Group Arisan
  // - Panel Kontrol Live Spin Undian Arisan
  [
    'roleBadgePill',
    'navBtnPeriode',
    'galleryCardPeriode',
    'navBtnPengeluaran',
    'galleryCardPengeluaran',
    'formPengumumanCard',
    'formGaleriCard',
    'formPeriodeCard',
    'formPemenangCard',
    'formGroupArisanCard',
    'adminLiveSpinControlCard'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !adminFlag);
  });

  const viewerSpinCard = document.getElementById('viewerLiveSpinInfoCard');
  if (viewerSpinCard) viewerSpinCard.classList.toggle('hidden', adminFlag);

  startLiveSpinPoller();

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
        nama_kakek_buyut: (document.getElementById('bioNamaKakekBuyut') && document.getElementById('bioNamaKakekBuyut').value.trim()) || null,
        nama_nenek_buyut: (document.getElementById('bioNamaNenekBuyut') && document.getElementById('bioNamaNenekBuyut').value.trim()) || null,
        nama_kakek: (document.getElementById('bioNamaKakek') && document.getElementById('bioNamaKakek').value.trim()) || null,
        nama_nenek: (document.getElementById('bioNamaNenek') && document.getElementById('bioNamaNenek').value.trim()) || null,
        nama_ayah: (document.getElementById('bioNamaAyah') && document.getElementById('bioNamaAyah').value.trim()) || 'H. Adnan',
        nama_ibu: (document.getElementById('bioNamaIbu') && document.getElementById('bioNamaIbu').value.trim()) || null,
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
document.addEventListener('DOMContentLoaded', async () => {
  try {
    localStorage.removeItem('adnan_groups_backup_v1');
  } catch (_) { }
  populateAllBankDropdowns();
  syncPayPeriodeByJenis();
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsedUser = JSON.parse(saved);
      const uid = parsedUser && (parsedUser.user_id || parsedUser.username);
      if (uid) {
        try {
          const freshUser = await checkUserInSupabase(uid);
          if (freshUser) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser));
            handlePostLoginFlow(freshUser);
            return;
          }
        } catch (_) { }
      }
      handlePostLoginFlow(parsedUser);
    }
  } catch (_) {
    localStorage.removeItem(SESSION_KEY);
  }
});



// ============================================================================
// MODUL PENGATURAN: MANAJEMEN TABEL DATABASE SUPABASE (EDIT & DELETE)
// ============================================================================

const SUPABASE_REST = {
  url: 'https://zufpuadipntstcnqxxpm.supabase.co/rest/v1'
};

function getEffectiveSupabaseKey() {
  const customKey = localStorage.getItem('adnan_custom_supabase_key');
  if (customKey && customKey.trim()) return customKey.trim();
  return SUPABASE_ANON_KEY;
}

function getSupabaseDbHeaders(preferReturnRepresentation = false) {
  const activeKey = getEffectiveSupabaseKey();
  const headers = {
    'apikey': activeKey,
    'Authorization': `Bearer ${activeKey}`,
    'Content-Type': 'application/json'
  };
  if (preferReturnRepresentation) {
    headers['Prefer'] = 'return=representation';
  } else {
    headers['Prefer'] = 'return=minimal';
  }
  return headers;
}

function promptConfigureSupabaseKey() {
  const currentKey = localStorage.getItem('adnan_custom_supabase_key') || '';
  const newKey = prompt(
    '🔑 PENGATURAN KUNCI API SUPABASE (DATABASE EDITOR)\n\nJika tabel mengembalikan error 401 saat mengubah/menghapus data, Anda dapat memasukkan Service Role Key Supabase untuk bypass RLS secara penuh.\n\nKosongkan jika ingin kembali ke Anon Key default:',
    currentKey
  );
  if (newKey !== null) {
    if (newKey.trim()) {
      localStorage.setItem('adnan_custom_supabase_key', newKey.trim());
      alert('✅ Kunci API Supabase kustom berhasil disimpan!');
    } else {
      localStorage.removeItem('adnan_custom_supabase_key');
      alert('🔄 Kunci API Supabase dikembalikan ke Anon Key default.');
    }
    if (activeDbTable) {
      fetchDbTableData(activeDbTable);
    }
  }
}
window.promptConfigureSupabaseKey = promptConfigureSupabaseKey;

let activeDbTable = '';
let activeDbRows = [];
let editingDbIndex = -1;

// Pasang event listener saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  const selectEl = document.getElementById('dbTableSelector');
  const btnRefresh = document.getElementById('btnRefreshDbTable');

  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      activeDbTable = e.target.value;
      if (activeDbTable) {
        fetchDbTableData(activeDbTable);
      } else {
        clearDbTableView();
      }
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (activeDbTable) {
        fetchDbTableData(activeDbTable);
      } else {
        alert('Pilih tabel terlebih dahulu pada dropdown.');
      }
    });
  }
});

function clearDbTableView() {
  const head = document.getElementById('dbTableHeader');
  const body = document.getElementById('dbTableBody');
  const status = document.getElementById('dbTableStatus');
  if (head) head.innerHTML = `<tr><th style="padding:12px; color:#64748b;">Silakan pilih salah satu tabel di dropdown atas</th></tr>`;
  if (body) body.innerHTML = `<tr><td style="padding:24px; text-align:center; color:#94a3b8;">Belum ada tabel yang dipilih.</td></tr>`;
  if (status) status.style.display = 'none';
}

// 1. Ambil data dari tabel yang dipilih
async function fetchDbTableData(tableName) {
  const head = document.getElementById('dbTableHeader');
  const body = document.getElementById('dbTableBody');
  const status = document.getElementById('dbTableStatus');

  if (!body) return;
  body.innerHTML = `<tr><td style="padding:24px; text-align:center; color:#2563eb;">Memuat data dari <strong>${tableName}</strong>...</td></tr>`;

  try {
    let res = await fetch(`${SUPABASE_REST.url}/${tableName}?select=*&order=id.desc`, {
      headers: getSupabaseDbHeaders(false)
    });

    if (!res.ok) {
      // Fallback jika tabel tidak memiliki kolom id untuk sorting
      res = await fetch(`${SUPABASE_REST.url}/${tableName}?select=*`, {
        headers: getSupabaseDbHeaders(false)
      });
    }

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    activeDbRows = await res.json();

    renderDbTableData(tableName, activeDbRows);

    if (status) {
      status.style.display = 'block';
      status.innerHTML = `Menampilkan <strong>${activeDbRows.length}</strong> baris dari tabel <code>${tableName}</code>.`;
    }
  } catch (err) {
    console.error('Database viewer error:', err);
    body.innerHTML = `<tr><td style="padding:20px; text-align:center; color:#dc2626;">Gagal memuat tabel: ${err.message}</td></tr>`;
  }
}

// 2. Render Header & Baris Tabel
function renderDbTableData(tableName, rows) {
  const head = document.getElementById('dbTableHeader');
  const body = document.getElementById('dbTableBody');

  if (!rows || rows.length === 0) {
    head.innerHTML = `<tr><th style="padding:10px 12px;">Status</th></tr>`;
    body.innerHTML = `<tr><td style="padding:24px; text-align:center; color:#64748b;">Tabel <strong>${tableName}</strong> masih kosong.</td></tr>`;
    return;
  }

  const columns = Object.keys(rows[0]);

  // Header
  let headHtml = '<tr><th style="padding:10px 12px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; text-align:center; width:110px;">Aksi</th>';
  columns.forEach(col => {
    headHtml += `<th style="padding:10px 12px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; white-space:nowrap; color:#334155;">${col}</th>`;
  });
  headHtml += '</tr>';
  head.innerHTML = headHtml;

  // Body
  let bodyHtml = '';
  rows.forEach((row, idx) => {
    bodyHtml += `<tr style="border-bottom:1px solid #e2e8f0;">`;

    // Tombol Edit & Hapus
    bodyHtml += `
      <td style="padding:6px 10px; text-align:center; white-space:nowrap;">
        <button type="button" onclick="openEditDbModal(${idx})" style="padding:3px 8px; font-size:0.75rem; border:1px solid #2563eb; color:#2563eb; background:#eff6ff; border-radius:4px; cursor:pointer; margin-right:4px;">Edit</button>
        <button type="button" onclick="deleteDbRow(${idx})" style="padding:3px 8px; font-size:0.75rem; border:1px solid #dc2626; color:#dc2626; background:#fef2f2; border-radius:4px; cursor:pointer;">Hapus</button>
      </td>
    `;

    // Kolom Nilai
    columns.forEach(col => {
      let val = row[col];
      let displayVal = val;
      if (typeof val === 'object' && val !== null) {
        displayVal = JSON.stringify(val);
      } else if (val === null || val === undefined) {
        displayVal = '<span style="color:#94a3b8; font-style:italic;">null</span>';
      }
      bodyHtml += `<td style="padding:8px 12px; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${String(val || '')}">${displayVal}</td>`;
    });
    bodyHtml += `</tr>`;
  });

  body.innerHTML = bodyHtml;
}

// 3. Fungsi Hapus Data (DELETE)
async function deleteDbRow(rowIndex) {
  const row = activeDbRows[rowIndex];
  if (!row) return;

  let idCol = 'id';
  let idVal = row.id;
  if (idVal === undefined || idVal === null || idVal === '') {
    const altKeys = ['user_id', 'kode_transaksi', 'periode_ke', 'nama_group', 'kategori'];
    const foundAlt = altKeys.find((k) => row[k] !== undefined && row[k] !== null && row[k] !== '');
    if (foundAlt) {
      idCol = foundAlt;
      idVal = row[foundAlt];
    } else {
      idCol = Object.keys(row)[0];
      idVal = row[idCol];
    }
  }

  if (!confirm(`Hapus baris data dengan ${idCol} = "${idVal}" dari tabel "${activeDbTable}"?`)) {
    return;
  }

  const url = `${SUPABASE_REST.url}/${activeDbTable}?${idCol}=eq.${encodeURIComponent(idVal)}`;

  try {
    let res = await fetch(url, {
      method: 'DELETE',
      headers: getSupabaseDbHeaders(false)
    });

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = errJson.message || errJson.details || errJson.hint || JSON.stringify(errJson);
      } catch (_) {
        errDetail = res.statusText || `HTTP ${res.status}`;
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Status ${res.status}: ${errDetail}.\n\nSolusi: Gunakan tombol '🔑 Kunci API Supabase' di pojok atas tabel untuk memasukkan Service Role Key Supabase.`
        );
      }
      throw new Error(`Status ${res.status}: ${errDetail}`);
    }

    alert('✅ Data berhasil dihapus!');
    fetchDbTableData(activeDbTable);
  } catch (err) {
    alert('❌ Gagal menghapus data: ' + err.message);
  }
}

// 4. Modal Edit
function openEditDbModal(rowIndex) {
  editingDbIndex = rowIndex;
  const row = activeDbRows[rowIndex];
  if (!row) return;

  const modal = document.getElementById('modalEditDbRecord');
  const title = document.getElementById('modalEditDbTitle');
  const form = document.getElementById('modalEditDbFormContainer');

  title.textContent = `✏️ Edit: ${activeDbTable}`;

  let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
  for (const [key, value] of Object.entries(row)) {
    const isId = (key === 'id');
    const isReadOnly = isId || key === 'created_at' || key === 'updated_at';
    const valStr = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : (value ?? '');

    html += `
      <div style="display:flex; flex-direction:column; gap:3px;">
        <label style="font-weight:600; font-size:0.8rem; color:#475569;">
          ${key} ${isReadOnly ? '<small style="color:#94a3b8;">(Terkunci)</small>' : ''}
        </label>
        <input 
          type="text" 
          id="dbFieldInput_${key}" 
          value="${String(valStr).replace(/"/g, '&quot;')}" 
          ${isReadOnly ? 'readonly style="background:#f1f5f9; color:#64748b; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;"' : 'style="padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;"'}
        />
      </div>
    `;
  }
  html += '</div>';

  form.innerHTML = html;
  modal.style.display = 'flex';
}

function closeEditDbModal() {
  const modal = document.getElementById('modalEditDbRecord');
  if (modal) modal.style.display = 'none';
  editingDbIndex = -1;
}

// 5. Simpan Perubahan (PATCH / UPDATE)
async function saveEditedDbRecord() {
  if (editingDbIndex < 0) return;
  const row = activeDbRows[editingDbIndex];
  if (!row) return;

  // Temukan primary key identifier yang valid
  let idCol = 'id';
  let idVal = row.id;
  if (idVal === undefined || idVal === null || idVal === '') {
    const altKeys = ['user_id', 'kode_transaksi', 'periode_ke', 'nama_group', 'kategori'];
    const foundAlt = altKeys.find((k) => row[k] !== undefined && row[k] !== null && row[k] !== '');
    if (foundAlt) {
      idCol = foundAlt;
      idVal = row[foundAlt];
    } else {
      idCol = Object.keys(row)[0];
      idVal = row[idCol];
    }
  }

  if (idVal === undefined || idVal === null) {
    alert('❌ Gagal menyimpan: Baris data tidak memiliki ID atau kunci penentu unik.');
    return;
  }

  const payload = {};
  for (const key of Object.keys(row)) {
    // Jangan kirim primary key atau generated timestamp
    if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;

    const input = document.getElementById(`dbFieldInput_${key}`);
    if (input) {
      let val = input.value;
      if (typeof row[key] === 'number') {
        val = (val === '' || val === null) ? null : Number(val);
      } else if (typeof row[key] === 'boolean') {
        val = (val === 'true' || val === true);
      } else if (val === '') {
        // Jika aslinya null atau kolom bertipe foreign key/uuid/date/timestamp, kirim null bukan string kosong
        if (row[key] === null || /^(tanggal.*|.*_at|.*_id|arisan_id|anggota_id|pemenang_id)$/i.test(key)) {
          val = null;
        }
      }
      payload[key] = val;
    }
  }

  const btnSave = document.getElementById('btnSaveDbRecord');
  if (btnSave) {
    btnSave.textContent = 'Menyimpan...';
    btnSave.disabled = true;
  }

  const url = `${SUPABASE_REST.url}/${activeDbTable}?${idCol}=eq.${encodeURIComponent(idVal)}`;

  try {
    // Coba percobaan 1: Gunakan return=representation
    let res = await fetch(url, {
      method: 'PATCH',
      headers: getSupabaseDbHeaders(true),
      body: JSON.stringify(payload)
    });

    // Jika 401 atau 403 atau 406 (sering terjadi karena RLS SELECT atau format Prefer representation):
    // Coba percobaan 2: Fallback ke Prefer: return=minimal
    if (!res.ok && (res.status === 401 || res.status === 403 || res.status === 406)) {
      console.warn(`PATCH percobaan 1 gagal dengan status ${res.status}. Mencoba percobaan 2 dengan return=minimal...`);
      res = await fetch(url, {
        method: 'PATCH',
        headers: getSupabaseDbHeaders(false),
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = errJson.message || errJson.details || errJson.hint || JSON.stringify(errJson);
      } catch (_) {
        errDetail = res.statusText || `HTTP ${res.status}`;
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Status ${res.status} (Izin Akses/RLS Supabase): ${errDetail}.\n\nTips Solusi:\n1. Pastikan RLS diizinkan untuk UPDATE di tabel ${activeDbTable}.\n2. Atau masukkan Service Role Key Supabase Anda pada tombol '🔑 Kunci API Supabase' di pojok atas tabel.`
        );
      }

      throw new Error(`Status ${res.status}: ${errDetail}`);
    }

    alert('✅ Perubahan berhasil disimpan ke tabel Supabase!');
    closeEditDbModal();
    fetchDbTableData(activeDbTable);
  } catch (err) {
    alert('❌ Gagal menyimpan: ' + err.message);
  } finally {
    if (btnSave) {
      btnSave.textContent = 'Simpan Perubahan';
      btnSave.disabled = false;
    }
  }
}
