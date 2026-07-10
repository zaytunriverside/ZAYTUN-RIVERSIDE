// ============================================
// ZAYTUN-RIVERSIDE — Shared App JS (_app.js)
// ============================================

const NAV_ITEMS = [
  { id:'dashboard', href:'dashboard.html', icon:'🏠', label:'Dashboard',        section:'Menu Utama' },

  { id:'penjualan', href:'penjualan.html', icon:'💵', label:'Input Penjualan',  section:'Operasional' },
  { id:'belanja',   href:'belanja.html',   icon:'🛒', label:'Input Belanja',    section:'Operasional' },
  { id:'stok',      href:'stok.html',      icon:'📦', label:'Stok Opname',      section:'Operasional' },
  { id:'resep',     href:'resep.html',     icon:'📖', label:'Daftar Menu',      section:'Operasional' },
  { id:'transaksi', href:'transaksi.html', icon:'📥', label:'Import KasPOS',    section:'Operasional' },

  { id:'modal',     href:'modal.html',     icon:'💰', label:'Modal & Kas',      section:'Keuangan' },

  { id:'karyawan',  href:'karyawan.html',  icon:'👥', label:'Karyawan',         section:'SDM' },

  { id:'rekap',     href:'rekap.html',     icon:'📊', label:'Rekap Penjualan',  section:'Laporan' },
  { id:'rekap_belanja', href:'rekap_belanja.html', icon:'📉', label:'Rekap Belanja', section:'Laporan' },
  { id:'laporan',   href:'laporan.html',   icon:'📈', label:'Laba Rugi',        section:'Laporan' },

  { id:'notifikasi', href:'notifikasi.html', icon:'🔔', label:'Notifikasi',    section:'Pengaturan' },
  { id:'pengaturan_printer', href:'pengaturan_printer.html', icon:'🖨️', label:'Printer & Kertas', section:'Pengaturan' },
  { id:'pengaturan_akses', href:'pengaturan_akses.html', icon:'🔐', label:'Hak Akses', section:'Pengaturan' },
];

function initPage(activeId) {
  const userRaw = localStorage.getItem('zaytun_user');
  if (!userRaw) { window.location.href = 'index.html'; return; }
  const user = JSON.parse(userRaw);

  const isAdmin = String(user.role).toLowerCase() === 'admin';
  const allowed = isAdmin ? null : (user.allowed_pages || []);

  // Cek akses ke halaman aktif — kalau tidak diizinkan, tendang ke dashboard
  if (!isAdmin && activeId !== 'dashboard' && !allowed.includes(activeId)) {
    alert('Anda tidak memiliki akses ke halaman ini.');
    window.location.href = 'dashboard.html';
    return;
  }

  const navItems = isAdmin ? NAV_ITEMS : NAV_ITEMS.filter(n => allowed.includes(n.id));

  const sidebar  = document.getElementById('sidebar');
  const sections = [...new Set(navItems.map(n => n.section))];

  let html = `
    <div class="sidebar-logo" onclick="doLogout()" title="Klik untuk keluar" style="cursor:pointer;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="icon.png" class="sidebar-logo-img" alt="Logo">
        <div>
          <div class="name">Zaytun Riverside</div>
          <div class="sub">${user.username||'—'}</div>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">`;

  sections.forEach(sec => {
    html += `<div class="nav-section">${sec}</div>`;
    navItems.filter(n => n.section === sec).forEach(n => {
      html += `<a class="nav-item${n.id===activeId?' active':''}" href="${n.href}">
        <span class="nav-icon">${n.icon}</span>
        <span class="nav-label">${n.label}</span>
      </a>`;
    });
  });

  html += `</nav>`;
  if (sidebar) sidebar.innerHTML = html;
}

// ── Format rupiah ────────────────────────────
function rp(n) {
  return 'Rp ' + Number(n||0).toLocaleString('id-ID');
}

// ── Format tanggal YYYY-MM-DD → dd/MM/yyyy ──
function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── Tanggal lokal → YYYY-MM-DD (AMAN dari bug timezone) ──
// JANGAN pakai date.toISOString().split('T')[0] — itu konversi ke UTC,
// dan untuk WIB (UTC+7) bisa mundur 1 hari kalau dipanggil sebelum jam 7 pagi.
function toLocalISODate(date) {
  const d = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── API URL ──────────────────────────────────
function getApiUrl() {
  return localStorage.getItem('zaytun_api') || 'https://bill.czr.workers.dev';
}

// ── API GET ──────────────────────────────────
async function apiGet(params) {
  const qs  = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`${getApiUrl()}?${qs}`);
  return await res.json();
}

// ── API POST ─────────────────────────────────
async function apiPost(body) {
  const res = await fetch(getApiUrl(), {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(body),
  });
  return await res.json();
}

// ── Sidebar mobile ───────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── Logout ───────────────────────────────────
function doLogout() {
  if (confirm('Yakin ingin keluar?')) {
    localStorage.removeItem('zaytun_user');
    window.location.href = 'index.html';
  }
}
