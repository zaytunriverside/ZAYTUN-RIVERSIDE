// ============================================
// ZAYTUN-RIVERSIDE — Shared App JS (_app.js)
// ============================================

const NAV_ITEMS = [
  { id:'dashboard', href:'dashboard.html', icon:'🏠', label:'Dashboard',       section:'Menu Utama' },
  { id:'transaksi', href:'transaksi.html', icon:'🧾', label:'Transaksi',       section:'Menu Utama' },
  { id:'belanja',   href:'belanja.html',   icon:'🛒', label:'Input Belanja',   section:'Operasional' },
  { id:'stok',      href:'stok.html',      icon:'📦', label:'Stok Opname',     section:'Operasional' },
  { id:'resep',     href:'resep.html',     icon:'📖', label:'Resep Menu',      section:'Operasional' },
  { id:'rekap',     href:'rekap.html',     icon:'📊', label:'Rekap Penjualan', section:'Laporan' },
  { id:'laporan',   href:'laporan.html',   icon:'📈', label:'Laba Rugi',       section:'Laporan' },
];

function initPage(activeId) {
  const userRaw = localStorage.getItem('zaytun_user');
  if (!userRaw) { window.location.href = 'index.html'; return; }
  const user = JSON.parse(userRaw);
  const sidebar = document.getElementById('sidebar');
  const sections = [...new Set(NAV_ITEMS.map(n => n.section))];
  let html = `
    <div class="sidebar-logo">
      <span class="icon">🌿</span>
      <div class="name">Zaytun Riverside</div>
      <div class="sub">Pembukuan Cafe</div>
    </div>
    <div class="sidebar-user">
      <div class="user-avatar">👤</div>
      <div class="user-info">
        <div class="uname">${user.username||'—'}</div>
        <div class="urole">${user.role||'—'}</div>
      </div>
    </div>
    <nav class="sidebar-nav">`;
  sections.forEach(sec => {
    html += `<div class="nav-section">${sec}</div>`;
    NAV_ITEMS.filter(n => n.section===sec).forEach(n => {
      html += `<a class="nav-item${n.id===activeId?' active':''}" href="${n.href}">
        <span class="nav-icon">${n.icon}</span><span>${n.label}</span></a>`;
    });
  });
  html += `</nav>`;
  sidebar.innerHTML = html;

  // Tambah tombol logout di topbar kanan (semua halaman)
  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) {
    const btnLogout = document.createElement('button');
    btnLogout.innerHTML = '⏻';
    btnLogout.title = 'Keluar';
    btnLogout.onclick = doLogout;
    btnLogout.style.cssText = 'background:rgba(192,57,43,0.1);border:1.5px solid rgba(192,57,43,0.3);border-radius:8px;padding:7px 12px;font-size:16px;cursor:pointer;color:#c0392b;transition:all 0.2s;line-height:1;';
    btnLogout.onmouseover = () => btnLogout.style.background = 'rgba(192,57,43,0.25)';
    btnLogout.onmouseout  = () => btnLogout.style.background = 'rgba(192,57,43,0.1)';
    topbarRight.appendChild(btnLogout);
  }

  // Tampilkan info user di topbar
  const topbarLeft = document.querySelector('.topbar-left');
  if (topbarLeft) {
    const userBadge = document.createElement('div');
    userBadge.style.cssText = 'font-size:11px;color:var(--teks-abu);margin-top:2px;';
    userBadge.textContent = `👤 ${user.username}`;
    topbarLeft.appendChild(userBadge);
  }
}

// ── Format rupiah ────────────────────────────
function rp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }

// ── Format tanggal YYYY-MM-DD → dd/MM/yyyy ──
function fmtDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── API URL ──────────────────────────────────
function getApiUrl() {
  return localStorage.getItem('zaytun_api') || 'https://bill.czr.workers.dev';
}

// ── API GET via fetch (CORS handled by Worker) ──
async function apiGet(params) {
  const qs  = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`${getApiUrl()}?${qs}`);
  return await res.json();
}

// ── API POST via fetch ───────────────────────
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
