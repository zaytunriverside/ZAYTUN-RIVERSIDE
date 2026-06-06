// ============================================
// ZAYTUN-RIVERSIDE — Shared App JS (_app.js)
// ============================================

const NAV_ITEMS = [
  { id:'dashboard', href:'dashboard.html', icon:'🏠', label:'Dashboard',       section:'Menu Utama' },
  { id:'transaksi', href:'transaksi.html', icon:'🧾', label:'Transaksi',       section:'Menu Utama' },
  { id:'belanja',   href:'belanja.html',   icon:'🛒', label:'Input Belanja',   section:'Operasional' },
  { id:'stok',      href:'stok.html',      icon:'📦', label:'Stok Opname',     section:'Operasional' },
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
  html += `</nav><div class="sidebar-bottom">
    <button class="btn-logout" onclick="doLogout()">🚪 Keluar</button>
  </div>`;
  sidebar.innerHTML = html;
}

// ── Format rupiah ────────────────────────────
function rp(n) { return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }

// ── Format tanggal YYYY-MM-DD → dd/MM/yyyy ──
function fmtDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── API GET via no-cors + script tag (bypass CORS) ──
function apiGet(params) {
  return new Promise((resolve, reject) => {
    const API_URL = localStorage.getItem('zaytun_api') || '';
    const cbName  = 'zrcb_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    const qs      = Object.entries(params)
                      .map(([k,v]) => `${k}=${encodeURIComponent(v)}`)
                      .join('&');
    const url = `${API_URL}?${qs}&callback=${cbName}`;

    // Timeout 15 detik
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout — periksa koneksi'));
    }, 15000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      const el = document.getElementById(cbName);
      if (el) el.remove();
    }

    window[cbName] = function(data) {
      cleanup();
      resolve(data);
    };

    const script  = document.createElement('script');
    script.id     = cbName;
    script.src    = url;
    script.onerror = () => { cleanup(); reject(new Error('Gagal terhubung ke server')); };
    document.head.appendChild(script);
  });
}

// ── API POST via fetch (Apps Script menerima POST tanpa CORS preflight) ──
async function apiPost(body) {
  const API_URL = localStorage.getItem('zaytun_api') || '';
  try {
    const res = await fetch(API_URL, {
      method    : 'POST',
      mode      : 'no-cors',   // skip preflight
      body      : JSON.stringify(body),
    });
    // no-cors tidak bisa baca response — pakai workaround GET setelah POST
    return { status: 'ok' };
  } catch(e) {
    throw new Error('Gagal terhubung ke server');
  }
}

// ── API POST dengan response (pakai redirect GET trick) ──
async function apiPostWithResponse(body) {
  const API_URL = localStorage.getItem('zaytun_api') || '';
  // Kirim via form POST — Apps Script menerima dan redirect ke GET
  return new Promise((resolve, reject) => {
    const cbName = 'zrcb_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    const timer  = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 20000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      const el = document.getElementById(cbName);
      if (el) el.remove();
    }

    window[cbName] = function(data) { cleanup(); resolve(data); };

    // Tambahkan callback ke body, kirim via script inject ke URL dengan body di query
    const encoded = encodeURIComponent(JSON.stringify(body));
    const url     = `${API_URL}?_postbody=${encoded}&callback=${cbName}`;

    const script  = document.createElement('script');
    script.id     = cbName;
    script.src    = url;
    script.onerror = () => { cleanup(); reject(new Error('Gagal terhubung')); };
    document.head.appendChild(script);
  });
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
