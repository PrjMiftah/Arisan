// ============================================================================
// MODUL PENGATURAN: MANAJEMEN TABEL DATABASE SUPABASE (EDIT & DELETE)
// ============================================================================

const SUPABASE_REST = {
  url: 'https://zufpuadipntstcnqxxpm.supabase.co/rest/v1',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZnB1YWRpcG50c3RjbnF4eHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjM2OTMsImV4cCI6MjEwODYzOTY5M30.gjXuVjWUjIaJX4JI6_d_fpq01fnsvDPedMuKD9SCYIA'
};

const supabaseFetchHeaders = {
  'apikey': SUPABASE_REST.key,
  'Authorization': `Bearer ${SUPABASE_REST.key}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

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
      headers: supabaseFetchHeaders
    });

    if (!res.ok) {
      // Fallback jika tabel tidak memiliki kolom id untuk sorting
      res = await fetch(`${SUPABASE_REST.url}/${tableName}?select=*`, {
        headers: supabaseFetchHeaders
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

  const idCol = row.id !== undefined ? 'id' : Object.keys(row)[0];
  const idVal = row[idCol];

  if (!confirm(`Hapus baris data dengan ${idCol} = "${idVal}" dari tabel "${activeDbTable}"?`)) {
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_REST.url}/${activeDbTable}?${idCol}=eq.${encodeURIComponent(idVal)}`, {
      method: 'DELETE',
      headers: supabaseFetchHeaders
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);

    alert('Data berhasil dihapus!');
    fetchDbTableData(activeDbTable);
  } catch (err) {
    alert('Gagal menghapus data: ' + err.message);
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
    const isReadOnly = isId || key === 'created_at';
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

  const idCol = row.id !== undefined ? 'id' : Object.keys(row)[0];
  const idVal = row[idCol];
  const payload = {};

  for (const key of Object.keys(row)) {
    if (key === 'id' || key === 'created_at') continue;

    const input = document.getElementById(`dbFieldInput_${key}`);
    if (input) {
      let val = input.value;
      if (typeof row[key] === 'number') {
        val = val === '' ? null : Number(val);
      } else if (typeof row[key] === 'boolean') {
        val = (val === 'true');
      }
      payload[key] = val;
    }
  }

  const btnSave = document.getElementById('btnSaveDbRecord');
  if (btnSave) {
    btnSave.textContent = 'Menyimpan...';
    btnSave.disabled = true;
  }

  try {
    const res = await fetch(`${SUPABASE_REST.url}/${activeDbTable}?${idCol}=eq.${encodeURIComponent(idVal)}`, {
      method: 'PATCH',
      headers: supabaseFetchHeaders,
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);

    alert('Perubahan berhasil disimpan!');
    closeEditDbModal();
    fetchDbTableData(activeDbTable);
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  } finally {
    if (btnSave) {
      btnSave.textContent = 'Simpan Perubahan';
      btnSave.disabled = false;
    }
  }
}
