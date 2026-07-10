// =============================================
// ZAYTUN RIVERSIDE — MODUL PRINTER BLUETOOTH
// printer.js — dipakai bersama di semua halaman yang butuh cetak
// (Input Penjualan, Dashboard, dst). Include SETELAH _app.js.
// =============================================
// CATATAN: Web Bluetooth hanya jalan di Chrome Android/Desktop, dan hanya
// untuk printer tipe BLE. Printer Bluetooth Classic (SPP) tidak bisa
// dideteksi dari browser — batasan platform, bukan bug.
//
// PENTING: koneksi Bluetooth TIDAK tersimpan lintas halaman — kalau pindah
// halaman (misal dari Dashboard ke Input Penjualan), printer harus
// dihubungkan ulang. Ini batasan Web Bluetooth API itu sendiri.

const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
];

let btDevice = null;
let btCharacteristic = null;

function getPaperWidth() {
  return localStorage.getItem('zaytun_paper_width') || '58';
}

function updatePrinterBadge(state, label) {
  const badge = document.getElementById('printerBadge');
  if (!badge) return;
  const map = {
    connected   : { icon:'🟢', cls:'printer-connected' },
    connecting  : { icon:'🟡', cls:'printer-connecting' },
    disconnected: { icon:'🔴', cls:'printer-disconnected' },
  };
  const m = map[state] || map.disconnected;
  badge.innerHTML = `${m.icon} ${label}`;
  badge.className = 'printer-badge ' + m.cls;
}

// ── Cari characteristic yang bisa ditulis (dipakai connect manual & auto-reconnect) ──
async function _findWritableCharacteristic(server) {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    const w = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
    if (w) return w;
  }
  return null;
}

function _bindDeviceEvents() {
  btDevice.addEventListener('gattserverdisconnected', () => {
    btCharacteristic = null;
    updatePrinterBadge('disconnected', 'Printer terputus');
  });
}

async function connectPrinterBLE() {
  if (!navigator.bluetooth) {
    alert('Browser ini tidak mendukung Web Bluetooth.\n\nGunakan Chrome di Android/Desktop. Kalau tetap tidak bisa, kemungkinan printer Anda tipe Bluetooth Classic — gunakan tombol Print Preview seperti biasa.');
    return;
  }
  try {
    updatePrinterBadge('connecting', 'Mencari printer...');
    btDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_PRINTER_SERVICES
    });

    updatePrinterBadge('connecting', 'Menghubungkan...');
    const server = await btDevice.gatt.connect();

    const writable = await _findWritableCharacteristic(server);
    if (!writable) throw new Error('Tidak ditemukan jalur tulis (characteristic) di printer ini.');

    btCharacteristic = writable;
    _bindDeviceEvents();

    // Simpan ID printer — dipakai auto-reconnect di halaman lain, tanpa perlu klik ulang
    localStorage.setItem('zaytun_printer_id', btDevice.id);

    updatePrinterBadge('connected', `${btDevice.name || 'Printer'} — Siap`);
  } catch (e) {
    updatePrinterBadge('disconnected', 'Belum terhubung');
    alert('Gagal connect: ' + e.message + '\n\nKemungkinan printer Anda tipe Bluetooth Classic (SPP), bukan BLE.');
  }
}

// ── Auto-reconnect ke printer yang PERNAH diizinkan — jalan otomatis tiap
// halaman dibuka, TANPA perlu klik "Hubungkan" lagi. Butuh Chrome yang
// mendukung navigator.bluetooth.getDevices() (Chrome Desktop/Android versi
// baru). Kalau tidak didukung, diam-diam gagal — user tinggal klik manual
// seperti biasa, tidak ada yang rusak.
async function tryAutoReconnectPrinter() {
  if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return;
  const savedId = localStorage.getItem('zaytun_printer_id');
  if (!savedId) return;

  try {
    const devices = await navigator.bluetooth.getDevices();
    const found = devices.find(d => d.id === savedId);
    if (!found) return;

    updatePrinterBadge('connecting', 'Menyambung ulang...');
    btDevice = found;
    const server = await btDevice.gatt.connect();
    const writable = await _findWritableCharacteristic(server);
    if (!writable) { updatePrinterBadge('disconnected', 'Belum terhubung'); return; }

    btCharacteristic = writable;
    _bindDeviceEvents();
    updatePrinterBadge('connected', `${btDevice.name || 'Printer'} — Siap`);
  } catch (e) {
    updatePrinterBadge('disconnected', 'Belum terhubung');
    // Gagal auto-reconnect (printer mati/di luar jangkauan) — biarkan saja,
    // user tinggal klik "Hubungkan" manual, tidak perlu alert mengganggu.
  }
}

async function sendToPrinterBLE(bytes) {
  const CHUNK = 20; // batas aman banyak stack BLE tanpa negosiasi MTU
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.slice(i, i + CHUNK);
    if (btCharacteristic.properties.writeWithoutResponse) {
      await btCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await btCharacteristic.writeValue(chunk);
    }
    await new Promise(r => setTimeout(r, 15));
  }
}

function padRight(str, len) {
  str = String(str);
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}
function padBetween(left, right, cols) {
  left = String(left); right = String(right);
  const space = cols - left.length - right.length;
  return left + ' '.repeat(Math.max(space, 1)) + right;
}
function rpPlain(n) { return Number(n || 0).toLocaleString('id-ID'); }

// ── Logo CZR → bitmap ESC/POS (GS v 0), di-cache biar tidak convert ulang tiap cetak ──
let _logoBitmapCache = null;
function getLogoBitmap(maxWidthDots) {
  if (_logoBitmapCache && _logoBitmapCache.forWidth === maxWidthDots) return Promise.resolve(_logoBitmapCache.bytes);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const targetW = Math.min(100, maxWidthDots);
        const scale   = targetW / img.width;
        const targetH = Math.round(img.height * scale);
        const canvas  = document.createElement('canvas');
        canvas.width = targetW; canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const px = ctx.getImageData(0, 0, targetW, targetH).data;

        const bytesPerRow = Math.ceil(targetW / 8);
        const raster = new Uint8Array(bytesPerRow * targetH);
        for (let y = 0; y < targetH; y++) {
          for (let x = 0; x < targetW; x++) {
            const i = (y * targetW + x) * 4;
            const a = px[i + 3];
            const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            if (a > 128 && lum < 160) raster[y * bytesPerRow + (x >> 3)] |= (0x80 >> (x & 7));
          }
        }
        const xL = bytesPerRow & 0xFF, xH = (bytesPerRow >> 8) & 0xFF;
        const yL = targetH & 0xFF, yH = (targetH >> 8) & 0xFF;
        const bytes = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH, ...raster]);
        _logoBitmapCache = { forWidth: maxWidthDots, bytes };
        resolve(bytes);
      } catch (e) { resolve(null); } // gagal convert logo → tetap lanjut cetak tanpa logo
    };
    img.onerror = () => resolve(null);
    img.src = 'icon.png';
  });
}

// ── Bangun struk customer (dipakai Input Penjualan & cetak ulang dari Dashboard) ──
// meta = { idTrx, tglFmt, jam, kasir, metodeBayar, total, diterima, kembalian }
async function buildEscPosReceipt(items, meta, cols, dots) {
  const enc = new TextEncoder();
  const bytes = [];
  const push = (arr) => bytes.push(...arr);
  const text = (str) => push(Array.from(enc.encode(str)));

  push([0x1B, 0x40]); // init
  push([0x1B, 0x61, 0x01]); // center

  const logo = await getLogoBitmap(dots);
  if (logo) { push(Array.from(logo)); text('\n'); }

  push([0x1D, 0x21, 0x10]); // double-height
  push([0x1B, 0x45, 0x01]); text('ZAYTUN RIVERSIDE\n'); push([0x1B, 0x45, 0x00]);
  push([0x1D, 0x21, 0x00]); // normal
  text('Cafe & Kuliner\n');
  push([0x1D, 0x21, 0x00]); // normal — alamat sama ukuran dengan tagline
  text('Alam Pauh Duo, Solok Selatan\n');
  push([0x1D, 0x21, 0x10]); // double-height untuk no HP
  text('0851-1144-7878\n');
  push([0x1D, 0x21, 0x00]); // reset normal
  text('='.repeat(cols) + '\n');
  push([0x1B, 0x61, 0x00]); // left
  text(`No   : ${meta.idTrx}\n`);
  text(`Tgl  : ${meta.tglFmt} ${meta.jam}\n`);
  text(`Kasir: ${meta.kasir}\n`);
  text(`Bayar: ${meta.metodeBayar}\n`);
  text('='.repeat(cols) + '\n');

  items.forEach(it => {
    text(padRight(it.nama_menu, cols) + '\n');
    const line = `${it.qty} x ${rpPlain(it.harga)}`;
    text(padBetween(line, rpPlain(it.qty * it.harga), cols) + '\n');
  });

  text('-'.repeat(cols) + '\n');
  push([0x1B, 0x45, 0x01]);
  text(padBetween('TOTAL', 'Rp ' + rpPlain(meta.total), cols) + '\n');
  push([0x1B, 0x45, 0x00]);
  if (meta.diterima) {
    text(padBetween('Diterima', rpPlain(meta.diterima), cols) + '\n');
    text(padBetween('Kembali', rpPlain(meta.kembalian), cols) + '\n');
  }
  text('='.repeat(cols) + '\n');
  push([0x1B, 0x61, 0x01]); // center
  text('Terima Kasih,\nDatang Kembali ;)\n');
  text('\n\n\n');
  push([0x1D, 0x56, 0x42, 0x00]); // potong kertas (partial cut + feed)
  return new Uint8Array(bytes);
}

// Terapkan pilihan lebar kertas tersimpan + coba auto-reconnect printer
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('paperWidthSelect');
  if (sel) {
    sel.value = getPaperWidth();
    sel.addEventListener('change', () => localStorage.setItem('zaytun_paper_width', sel.value));
  }
  tryAutoReconnectPrinter();
});
