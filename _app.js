// ============================================
// ZAYTUN-RIVERSIDE — Shared App JS (_app.js)
// ============================================

const NAV_ITEMS = [
  { id:'dashboard', href:'dashboard.html', icon:'🏠', label:'Dashboard',       section:'Menu Utama' },
  { id:'transaksi', href:'transaksi.html', icon:'🧾', label:'Transaksi',       section:'Menu Utama' },
  { id:'belanja',   href:'belanja.html',   icon:'🛒', label:'Input Belanja',   section:'Operasional' },
  { id:'stok',      href:'stok.html',      icon:'📦', label:'Stok Opname',     section:'Operasional' },
  { id:'resep',     href:'resep.html',     icon:'📖', label:'Resep Menu',      section:'Operasional' },
  { id:'modal',     href:'modal.html',     icon:'💰', label:'Modal & Kas',     section:'Keuangan' },
  { id:'rekap',     href:'rekap.html',     icon:'📊', label:'Rekap Penjualan', section:'Laporan' },
  { id:'laporan',   href:'laporan.html',   icon:'📈', label:'Laba Rugi',       section:'Laporan' },
];

function initPage(activeId) {
  // Auth check
  const userRaw = localStorage.getItem('zaytun_user');
  if (!userRaw) { window.location.href = 'index.html'; return; }
  const user = JSON.parse(userRaw);

  // Build sidebar
  const sidebar  = document.getElementById('sidebar');
  const sections = [...new Set(NAV_ITEMS.map(n => n.section))];

  let html = `
    <div class="sidebar-logo" onclick="doLogout()" title="Klik untuk keluar" style="cursor:pointer;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="icon" style="margin-bottom:0;">🌿</span>
        <div>
          <div class="name">Zaytun Riverside</div>
          <div class="sub">${user.username||'—'}</div>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">`;

  sections.forEach(sec => {
    html += `<div class="nav-section">${sec}</div>`;
    NAV_ITEMS.filter(n => n.section === sec).forEach(n => {
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
