/**
 * INPRESIVE MEMBER CLUB — MOBILE APPLICATION LOGIC
 * High performance, pure JS SPA designed for mobile browser viewport.
 */

// App State
const state = {
  user: null,
  transactions: [],
  catalog: null,
  activeTab: "home",
  activeCatalogSubTab: "services",
  reviewRating: 5,
  activeReviewTxId: null
};

// -------------------------------------------------------------
// HELPER UTILITIES
// -------------------------------------------------------------
function formatRupiah(num) {
  return "Rp " + Number(num || 0).toLocaleString("id-ID");
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) {
    return String(dateStr);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimer = null;
function showToast(message, icon = "✓") {
  const el = document.getElementById("toastMessage");
  const textEl = document.getElementById("toastText");
  const iconEl = document.getElementById("toastIcon");
  if (!el || !textEl) return;

  textEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;

  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3200);
}

// Base API URL configuration:
// Automatically uses the current origin when served on the same host (http://localhost:3000/member).
// If later published to a standalone GitHub repository (e.g. Vercel / Cloudflare Pages),
// you can simply define window.INPRESIVE_API_BASE = "https://your-pos-domain.com"
const API_BASE_URL = window.INPRESIVE_API_BASE || "";

async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : (API_BASE_URL + endpoint);
  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  const config = {
    ...options,
    credentials: "include",
    headers: { ...defaultHeaders, ...(options.headers || {}) }
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || "Terjadi kesalahan pada sistem";
    throw new Error(errorMsg);
  }

  return data;
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btnEl.textContent = "🙈";
  } else {
    input.type = "password";
    btnEl.textContent = "👁";
  }
}

// -------------------------------------------------------------
// AUTHENTICATION & INITIALIZATION
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  // Always load latest catalog & dynamic news immediately from database
  loadCatalog();

  try {
    const res = await apiRequest("/api/member/me");
    if (res.ok && res.member) {
      state.user = res.member;
      showMainApp();
      loadTransactions();
    } else {
      showAuthScreen();
    }
  } catch (_) {
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById("authScreen").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
}

function showMainApp() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  renderVirtualCard();
  updateProfileView();
  switchNavTab("home");
}

function switchAuthMode(mode) {
  const isLogin = mode === "LOGIN";
  document.getElementById("formLoginWrap").classList.toggle("hidden", !isLogin);
  document.getElementById("formRegisterWrap").classList.toggle("hidden", isLogin);

  const btnLogin = document.getElementById("btnTabAuthLogin");
  const btnReg = document.getElementById("btnTabAuthRegister");

  if (isLogin) {
    btnLogin.style.background = "#ffffff";
    btnLogin.style.color = "var(--primary)";
    btnLogin.style.boxShadow = "var(--shadow-sm)";
    btnReg.style.background = "transparent";
    btnReg.style.color = "var(--text-muted)";
    btnReg.style.boxShadow = "none";
  } else {
    btnReg.style.background = "#ffffff";
    btnReg.style.color = "var(--primary)";
    btnReg.style.boxShadow = "var(--shadow-sm)";
    btnLogin.style.background = "transparent";
    btnLogin.style.color = "var(--text-muted)";
    btnLogin.style.boxShadow = "none";
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("btnLoginSubmit");

  btn.disabled = true;
  btn.textContent = "Memverifikasi...";

  try {
    const res = await apiRequest("/api/member/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (res.ok && res.member) {
      state.user = res.member;
      showToast(`Selamat datang, ${state.user.name}!`, "👋");
      showMainApp();
      loadTransactions();
      loadCatalog();
    }
  } catch (err) {
    showToast(err.message, "⚠️");
  } finally {
    btn.disabled = false;
    btn.textContent = "Masuk ke Member Club →";
  }
}

function formatBirthDateDDMMMYYYY(dateStr) {
  if (!dateStr) return '';
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const m = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = m[1];
    const mo = parseInt(m[2], 10) - 1;
    const d = String(m[3]).padStart(2, '0');
    return `${d}/${months[mo] || 'Jan'}/${y}`;
  }
  return dateStr;
}

function handleBirthDateChange(val) {
  const preview = document.getElementById("regBirthDatePreview");
  if (!preview) return;
  if (!val) {
    preview.innerHTML = 'Contoh format: <b>17/Ags/1998</b> (Wajib diisi untuk reward spesial ulang tahun Anda).';
    preview.style.color = 'var(--text-muted)';
    return;
  }
  const formatted = formatBirthDateDDMMMYYYY(val);
  preview.innerHTML = `✓ Format Terpilih: <b style="color:var(--accent);">${formatted}</b>`;
  preview.style.color = 'var(--accent)';
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPassword").value;
  const birthDate = document.getElementById("regBirthDate").value;
  const city = document.getElementById("regCity").value.trim();
  const btn = document.getElementById("btnRegisterSubmit");

  if (!birthDate) {
    showToast("Tanggal lahir wajib diisi dengan format DD/MMM/YYYY (Contoh: 17/Ags/1998)", "⚠️");
    document.getElementById("regBirthDate").focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = "Mendaftarkan & Menerbitkan ID...";

  try {
    const res = await apiRequest("/api/member/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password, birthDate, city })
    });

    if (res.ok && res.member) {
      state.user = res.member;
      showToast(`Pendaftaran berhasil! ID: ${state.user.memberId}`, "🎉");
      showMainApp();
      loadTransactions();
      loadCatalog();
    }
  } catch (err) {
    showToast(err.message, "⚠️");
  } finally {
    btn.disabled = false;
    btn.textContent = "Daftar & Terbitkan Kartu Member →";
  }
}

async function confirmLogout() {
  if (!confirm("Apakah Anda yakin ingin keluar dari akun member?")) return;
  try {
    await apiRequest("/api/member/logout", { method: "POST" });
  } catch (_) {}
  state.user = null;
  state.transactions = [];
  showToast("Anda telah keluar", "ℹ️");
  showAuthScreen();
}

// -------------------------------------------------------------
// VIRTUAL MEMBER CARD & STATIC QR CODE (POINT 1 USER)
// -------------------------------------------------------------
function renderVirtualCard() {
  if (!state.user) return;

  const u = state.user;
  const tier = (u.levelCode || "Silver").toUpperCase();

  // Greeting
  const greetEl = document.getElementById("headerGreeting");
  if (greetEl) greetEl.textContent = `Halo, ${u.name.split(" ")[0]}!`;

  // Virtual Card fields
  document.getElementById("cardMemberName").textContent = u.name;
  document.getElementById("cardMemberPhone").textContent = u.phone || "—";
  document.getElementById("cardMemberId").textContent = u.memberId;

  // Tier Badge
  const tierBadge = document.getElementById("cardTierBadge");
  tierBadge.className = `tier-badge ${tier.toLowerCase()}`;
  tierBadge.textContent = tier;

  // Render High-Contrast Static QR Code (ID Member only)
  const qrBox = document.getElementById("memberQrContainer");
  qrBox.innerHTML = "";
  if (typeof QRCode !== "undefined") {
    new QRCode(qrBox, {
      text: String(u.memberId),
      width: 130,
      height: 130,
      colorDark: "#141210",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  // Points & Tier Progress
  document.getElementById("pointsBalanceValue").textContent = Number(u.pointsBalance || 0).toLocaleString("id-ID");

  const multBadge = document.getElementById("tierMultiplierBadge");
  multBadge.textContent = `${Number(u.multiplier || 1).toFixed(2).replace(/\.00$/, "")}x Poin`;

  const curLabel = document.getElementById("currentTierLabel");
  const nextLabel = document.getElementById("nextTierLabel");
  const progFill = document.getElementById("tierProgressFill");
  const hintEl = document.getElementById("tierProgressHint");

  curLabel.textContent = `Tier: ${tier}`;

  if (u.nextLevel) {
    nextLabel.textContent = `Menuju ${u.nextLevel}`;
    const spend = Number(u.lifetimeSpend || 0);
    const target = Number(u.nextThreshold || 500000);
    const pct = Math.min(100, Math.round((spend / target) * 100));

    progFill.style.width = `${Math.max(5, pct)}%`;
    hintEl.textContent = `Total belanja ${formatRupiah(spend)} / ${formatRupiah(target)} (${pct}%) menuju ${u.nextLevel}`;
  } else {
    nextLabel.textContent = "VIP Tier Tertinggi 🎉";
    progFill.style.width = "100%";
    hintEl.textContent = "Selamat! Anda telah mencapai status member tertinggi di Inpresive.";
  }
}

function openFullscreenQR() {
  if (!state.user) return;
  const container = document.getElementById("fullscreenQrContainer");
  container.innerHTML = "";
  if (typeof QRCode !== "undefined") {
    new QRCode(container, {
      text: String(state.user.memberId),
      width: 200,
      height: 200,
      colorDark: "#141210",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
  document.getElementById("fullscreenMemberId").textContent = state.user.memberId;
  document.getElementById("fullscreenMemberName").textContent = state.user.name;
  document.getElementById("modalFullscreenQR").classList.add("open");
}

function closeFullscreenQR() {
  document.getElementById("modalFullscreenQR").classList.remove("open");
}

// -------------------------------------------------------------
// NAVIGATION TABS
// -------------------------------------------------------------
function switchNavTab(tabName) {
  state.activeTab = tabName;

  const tabs = ["home", "history", "services", "profile"];
  tabs.forEach(t => {
    const pane = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`navBtn-${t}`);
    if (pane) pane.classList.toggle("hidden", t !== tabName);
    if (btn) btn.classList.toggle("active", t !== tabName);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (tabName === "history") {
    renderTransactions();
  } else if (tabName === "services") {
    renderCatalog();
  } else if (tabName === "profile") {
    updateProfileView();
  }
}

// -------------------------------------------------------------
// TRANSACTIONS & REVIEWS (POINT 4 USER)
// -------------------------------------------------------------
async function loadTransactions() {
  try {
    const res = await apiRequest("/api/member/transactions");
    if (res.ok && Array.isArray(res.transactions)) {
      state.transactions = res.transactions;
      renderTransactions();
    }
  } catch (err) {
    console.warn("Failed to load transactions:", err.message);
  }
}

// -------------------------------------------------------------
// INFO & BERITA MODAL HANDLER
// -------------------------------------------------------------
const newsArticles = {
  1: {
    category: "Operasional Cabang",
    title: "Standar Layanan & Jam Operasional Seluruh Cabang Inpresive",
    content: `
      <p style="margin-bottom:10px;">Halo Pelanggan Setia Inpresive! Seluruh gerai Inpresive Barbershop (INP01 hingga INP08) beroperasi normal setiap hari mulai pukul <b>10:00 hingga 21:00 WIB</b>.</p>
      <p style="margin-bottom:10px;"><b>Kenyamanan & Kebersihan:</b> Seluruh peralatan cukur disterilisasi sebelum dan sesudah penggunaan. Ruangan ber-AC dan kursi ergonomis disiapkan untuk memastikan pengalaman potong rambut terbaik.</p>
      <p><b>Cara Menggunakan Kartu Member:</b> Anda cukup menunjukkan QR Code statis pada kartu member digital Anda atau menyebutkan nomor HP saat tiba di meja kasir. Poin loyalitas akan otomatis masuk ke akun Anda setelah transaksi selesai.</p>
    `
  },
  2: {
    category: "Tips Grooming Pria",
    title: "Waktu Ideal Merapikan Rambut Agar Tetap Rapi & Segar",
    content: `
      <p style="margin-bottom:10px;">Banyak pria bingung kapan waktu yang tepat untuk kembali ke barbershop. Rekomendasi capster profesional Inpresive:</p>
      <ul style="padding-left:18px; margin-bottom:10px; line-height:1.6;">
        <li><b>Potongan Fade / Taper Pendek:</b> Idealnya dirapikan setiap <b>2 sampai 3 minggu</b> sekali agar gradasi tetap tajam.</li>
        <li><b>Potongan Medium / Classic Pompadour:</b> Cukup dirapikan setiap <b>3 sampai 4 minggu</b> sekali untuk menjaga volume dan kerapian samping.</li>
        <li><b>Kumis & Jenggot:</b> Sebaiknya ditrim setiap <b>1 sampai 2 minggu</b> untuk bentuk yang presisi dan bersih.</li>
      </ul>
      <p>Konsultasikan gaya rambut impian Anda dengan capster Inpresive saat sesi konsultasi potong rambut.</p>
    `
  },
  3: {
    category: "Program Loyalitas Member",
    title: "Kumpulkan Poin Loyalitas & Dapatkan Cukur Gratis",
    content: `
      <p style="margin-bottom:10px;">Tahukah Anda bahwa setiap kunjungan ke Inpresive memberikan Anda poin loyalitas? Melalui program Inpresive Member Club:</p>
      <ul style="padding-left:18px; margin-bottom:10px; line-height:1.6;">
        <li><b>Silver Tier:</b> Dapatkan 1.0x poin loyalitas pada setiap transaksi.</li>
        <li><b>Gold Tier (Belanja Rp 500rb):</b> Nikmati percepatan <b>1.25x poin</b> di setiap kunjungan.</li>
        <li><b>Platinum Tier (Belanja Rp 1.5jt):</b> Nikmati percepatan <b>1.5x poin VIP</b> dan promo eksklusif.</li>
      </ul>
      <p style="margin-top:10px;"><b>100% Poin Pembayaran:</b> Saldo poin Anda dapat digunakan langsung di kasir untuk membayar potong rambut hingga 100% tanpa perlu mengeluarkan uang tunai!</p>
    `
  }
};

function renderHomeNews() {
  const container = document.getElementById("homeNewsList");
  if (!container) return;

  const newsList = (state.catalog && Array.isArray(state.catalog.news)) ? state.catalog.news : [];

  if (newsList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 12px; background: var(--surface); border: 1px dashed var(--border); border-radius: 8px;">
        Belum ada berita atau pengumuman saat ini.
      </div>
    `;
    return;
  }

  container.innerHTML = newsList.map(item => `
    <div class="card-item" onclick="openNewsDetail(${item.id})" style="cursor: pointer; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span class="badge" style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">
          ${escapeHtml(item.category || 'Info')}
        </span>
        <span style="font-size: 11px; color: var(--text-subtle);">${formatDateDisplay(item.created_at || new Date())}</span>
      </div>
      <div style="font-weight: 850; font-size: 13.5px; color: var(--primary); margin-bottom: 4px;">
        ${escapeHtml(item.title)}
      </div>
      <div style="font-size: 12px; color: var(--text-muted); line-height: 1.45;">
        ${escapeHtml(item.summary || (item.content ? item.content.replace(/<[^>]+>/g, '').slice(0, 140) + '...' : ''))}
      </div>
    </div>
  `).join("");
}

function openNewsDetail(id) {
  const item = (state.catalog?.news || []).find(n => n.id === Number(id));
  if (!item) {
    showToast("Berita tidak ditemukan atau sudah dihapus.", "⚠️");
    return;
  }

  document.getElementById("newsModalCategory").textContent = item.category || "Informasi";
  document.getElementById("newsModalTitle").textContent = item.title;
  document.getElementById("newsModalContent").innerHTML = item.content;

  document.getElementById("modalNewsSheet").classList.add("open");
}

function closeNewsDetail() {
  document.getElementById("modalNewsSheet").classList.remove("open");
}

function renderTransactions() {
  const container = document.getElementById("transactionsList");
  if (!container) return;

  if (state.transactions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
        <div style="font-size: 36px; margin-bottom: 8px;">✂️</div>
        <div style="font-size: 14px; font-weight: 800; color: var(--primary);">Belum Ada Riwayat Kunjungan</div>
        <div style="font-size: 12px; margin-top: 4px; line-height: 1.4;">
          Kunjungi cabang Inpresive terdekat, lalu tunjukkan ID Member atau scan QR Anda di kasir. Riwayat potong rambut dan fasilitas ulasan kepuasan akan otomatis tercatat di sini.
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = state.transactions.map(tx => {
    const itemsText = (tx.items || []).map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ") || "Layanan Barbershop";
    const fb = tx.feedback;
    const isPuas = fb && Number(fb.rating) === 5;

    return `
      <div class="card-item">
        <div class="tx-header">
          <div>
            <div class="tx-date">📅 ${formatDateDisplay(tx.date)} ${tx.time ? `· ${tx.time}` : ""}</div>
            <div style="font-size: 12.5px; font-weight: 800; color: var(--primary); margin-top: 2px;">
              ${escapeHtml(tx.branchName || tx.branchCode)}
            </div>
          </div>
          <div style="text-align: right;">
            <div class="tx-total">${formatRupiah(tx.total)}</div>
            <div style="font-size: 10.5px; color: var(--text-muted);">${escapeHtml(tx.paymentMethod || "Cash")}</div>
          </div>
        </div>

        <div class="tx-meta" style="margin-top: 6px;">
          Dilayani oleh Capster: <b>${escapeHtml(tx.capsterName)}</b>
        </div>

        <div class="tx-services">
          ✂️ ${escapeHtml(itemsText)}
        </div>

        <!-- Feedback & Review Section -->
        <div style="margin-top: 10px;">
          ${fb ? `
            <div class="feedback-box-reviewed" style="border-left: 3px solid ${isPuas ? 'var(--success)' : '#dc2626'};">
              <div class="flex-between">
                <div>
                  <span style="font-size: 13px;">${'⭐'.repeat(Number(fb.rating))}</span>
                  <span style="font-size: 11px; font-weight: 800; margin-left: 4px; color: ${isPuas ? 'var(--success)' : '#dc2626'};">
                    ${isPuas ? '😊 Puas' : '😐 Masukan'}
                  </span>
                </div>
                <span style="font-size: 10.5px; color: var(--text-muted);">${formatDateDisplay(fb.createdAt)}</span>
              </div>
              <div style="font-size: 12px; font-style: italic; margin-top: 5px; color: var(--text-main);">
                "${escapeHtml(fb.message)}"
              </div>
              ${fb.reply ? `
                <div class="admin-reply-box">
                  <b>Balasan Manajemen Inpresive:</b> "${escapeHtml(fb.reply)}"
                </div>
              ` : `
                <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 5px;">
                  ⏳ Sedang ditinjau oleh Super Admin
                </div>
              `}
            </div>
          ` : `
            <div style="display: flex; justify-content: flex-end;">
              <button class="btn sm primary" onclick="openReviewModal('${tx.id}')">
                ⭐ Beri Rating & Review (Kritik/Saran)
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }).join("");
}

// -------------------------------------------------------------
// REVIEW MODAL & RATING HANDLER
// -------------------------------------------------------------
function openReviewModal(txId) {
  state.activeReviewTxId = txId;
  const tx = state.transactions.find(t => t.id === txId);

  const metaEl = document.getElementById("modalReviewTxMeta");
  if (tx && metaEl) {
    metaEl.textContent = `Kunjungan: ${formatDateDisplay(tx.date)} · ${tx.branchName || tx.branchCode} · Capster: ${tx.capsterName}`;
  }

  document.getElementById("reviewTransactionId").value = txId;
  document.getElementById("reviewMessage").value = "";
  setReviewRating(5); // default 5 star

  document.getElementById("modalReviewSheet").classList.add("open");
}

function closeReviewModal() {
  document.getElementById("modalReviewSheet").classList.remove("open");
  state.activeReviewTxId = null;
}

function setReviewRating(rating) {
  state.reviewRating = rating;

  const starBtns = document.querySelectorAll(".star-rating-box .star-btn");
  starBtns.forEach((btn, index) => {
    btn.classList.toggle("active", index < rating);
  });

  const badge = document.getElementById("reviewRatingBadge");
  if (!badge) return;

  if (rating === 5) {
    badge.innerHTML = `<span style="color:#16a34a;">😊 Bintang 5 — Sangat Puas</span>`;
  } else if (rating === 4) {
    badge.innerHTML = `<span style="color:#d97706;">🙂 Bintang 4 — Cukup Puas</span>`;
  } else if (rating === 3) {
    badge.innerHTML = `<span style="color:#ea580c;">😐 Bintang 3 — Biasa Saja</span>`;
  } else {
    badge.innerHTML = `<span style="color:#dc2626;">🙁 Bintang ${rating} — Kurang Puas / Ada Masukan</span>`;
  }
}

async function handleSubmitReview(event) {
  event.preventDefault();
  const txId = document.getElementById("reviewTransactionId").value;
  const message = document.getElementById("reviewMessage").value.trim();
  const btn = document.getElementById("btnSendReview");

  if (!txId) return;
  if (!message || message.length < 3) {
    showToast("Silakan tulis ulasan atau kritik minimal 3 karakter", "⚠️");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Mengirim...";

  try {
    const res = await apiRequest("/api/member/feedback", {
      method: "POST",
      body: JSON.stringify({
        transactionId: txId,
        rating: state.reviewRating,
        message
      })
    });

    if (res.ok) {
      showToast("Terima kasih atas ulasan Anda!", "⭐");

      // Update local transaction state
      const targetTx = state.transactions.find(t => t.id === txId);
      if (targetTx) {
        targetTx.feedback = {
          id: res.feedback?.id || `FB-${Date.now()}`,
          rating: state.reviewRating,
          message,
          status: "BARU",
          reply: null,
          createdAt: new Date().toISOString()
        };
      }

      closeReviewModal();
      renderTransactions();
    }
  } catch (err) {
    showToast(err.message, "⚠️");
  } finally {
    btn.disabled = false;
    btn.textContent = "Kirim Ulasan →";
  }
}

// -------------------------------------------------------------
// CATALOG, BRANCHES & TIERS (POINT 6 USER)
// -------------------------------------------------------------
async function loadCatalog() {
  try {
    const res = await apiRequest("/api/member/catalog");
    if (res.ok) {
      state.catalog = res;
      renderCatalog();
      renderHomeNews();
    }
  } catch (err) {
    console.warn("Catalog load failed:", err.message);
  }
}

function switchCatalogSubTab(subTab) {
  state.activeCatalogSubTab = subTab;

  const tabs = ["services", "branches", "tiers"];
  tabs.forEach(t => {
    const view = document.getElementById(`subView${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`catalogSubTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (view) view.classList.toggle("hidden", t !== subTab);
    if (btn) {
      if (t === subTab) {
        btn.className = "btn sm primary";
      } else {
        btn.className = "btn sm outline";
      }
    }
  });
}

function renderCatalog() {
  if (!state.catalog) return;

  // 1. Services
  const svcContainer = document.getElementById("servicesList");
  if (svcContainer && state.catalog.services) {
    svcContainer.innerHTML = state.catalog.services.map(s => `
      <div class="card-item" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:800; font-size:13.5px; color:var(--primary);">${escapeHtml(s.name)}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
            ${s.category === 'CUKUR' ? '✂️ Kategori Cukur' : '💆 Layanan & Perawatan'}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:900; font-size:13.5px; color:var(--accent);">
            ${formatRupiah(s.min_price || s.price || 30000)}
          </div>
          <div style="font-size:10px; color:var(--text-subtle);">Mulai dari</div>
        </div>
      </div>
    `).join("");
  }

  // 2. Branches
  const brContainer = document.getElementById("branchesList");
  if (brContainer && state.catalog.branches) {
    brContainer.innerHTML = state.catalog.branches.map(b => `
      <div class="card-item">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:850; font-size:14px; color:var(--primary);">${escapeHtml(b.name || b.code)}</div>
            <div style="font-size:11px; font-weight:700; color:var(--accent); font-family:monospace;">Kode: ${escapeHtml(b.code)}</div>
          </div>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:6px; line-height:1.4;">
          📍 ${escapeHtml(b.address || 'Alamat cabang operasional Inpresive')}
        </div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          ${(b.mapsUrl || b.maps_url) ? `
            <a href="${escapeHtml(b.mapsUrl || b.maps_url)}" target="_blank" rel="noopener noreferrer" class="btn sm" style="font-size:11.5px; padding:6px 12px; background:#2563eb; color:#ffffff; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:600;">
              📍 Buka Google Maps
            </a>
          ` : ''}
          ${b.phone ? `
            <a href="tel:${b.phone}" class="btn sm outline" style="font-size:11.5px; padding:6px 12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
              📞 Hubungi Cabang
            </a>
          ` : ''}
        </div>
      </div>
    `).join("");
  }

  // 3. Tiers
  const tierContainer = document.getElementById("tiersList");
  if (tierContainer && state.catalog.tiers) {
    tierContainer.innerHTML = state.catalog.tiers.map(t => {
      const benefitList = (t.benefits || '').split('\n').map(s => s.trim()).filter(Boolean);
      const benefitHtml = benefitList.length > 1
        ? `<ul style="margin:4px 0 0 16px; padding:0; line-height:1.5;">${benefitList.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
        : `<span>${escapeHtml(t.benefits || 'Benefit eksklusif member')}</span>`;

      const tierBorderColors = {
        platinum: '#9333ea',
        gold: '#d97706',
        silver: '#9ca3af',
        diamond: '#06b6d4',
        vip: '#e11d48',
        bronze: '#b45309'
      };
      const borderColor = tierBorderColors[String(t.code || '').toLowerCase()] || 'var(--accent)';

      return `
        <div class="card-item" style="border-left:4px solid ${borderColor};">
          <div class="flex-between">
            <strong style="font-size:14px;">${escapeHtml(t.name)}</strong>
            <span class="tier-badge ${escapeHtml(String(t.code || '').toLowerCase())}" style="font-size:10px;">${t.multiplier}x POIN</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            Syarat Belanja: <b>${formatRupiah(t.minSpend)}</b>
          </div>
          <div style="font-size:12px; color:var(--text-main); margin-top:6px; background:var(--bg-app); padding:8px 10px; border-radius:var(--radius-sm);">
            🎁 <b>Keuntungan:</b> ${benefitHtml}
          </div>
        </div>
      `;
    }).join("");
  }
}

// -------------------------------------------------------------
// PROFILE & ACCOUNT SETTINGS (EDIT DATA DIRI & GANTI PASSWORD)
// -------------------------------------------------------------
function updateProfileView() {
  if (!state.user) return;
  const u = state.user;

  // Header card in Profile tab
  document.getElementById("profileNameDisplay").textContent = u.name;
  document.getElementById("profileEmailDisplay").textContent = u.email;
  document.getElementById("profileIdTag").textContent = u.memberId;

  const initials = u.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  document.getElementById("profileAvatar").textContent = initials || "IN";

  const pBadge = document.getElementById("profileTierBadge");
  pBadge.className = `tier-badge ${(u.levelCode || "Silver").toLowerCase()}`;
  pBadge.textContent = `${(u.levelCode || "Silver").toUpperCase()} TIER`;

  // Fill Edit Profile inputs
  document.getElementById("editName").value = u.name || "";
  document.getElementById("editPhone").value = u.phone || "";
  document.getElementById("editBirthDate").value = u.birthDate || "";
  document.getElementById("editCity").value = u.city || "";
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  const birthDate = document.getElementById("editBirthDate").value;
  const city = document.getElementById("editCity").value.trim();
  const btn = document.getElementById("btnSaveProfile");

  btn.disabled = true;
  btn.textContent = "Menyimpan Perubahan...";

  try {
    const res = await apiRequest("/api/member/profile", {
      method: "PUT",
      body: JSON.stringify({ name, phone, birthDate, city })
    });

    if (res.ok && res.member) {
      state.user = res.member;
      renderVirtualCard();
      updateProfileView();
      showToast("Data diri berhasil diperbarui!", "✓");
    }
  } catch (err) {
    showToast(err.message, "⚠️");
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Perubahan Data";
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  const oldPassword = document.getElementById("pwdOld").value;
  const newPassword = document.getElementById("pwdNew").value;
  const confirmPassword = document.getElementById("pwdConfirm").value;
  const btn = document.getElementById("btnSavePassword");

  if (newPassword !== confirmPassword) {
    showToast("Konfirmasi password baru tidak cocok", "⚠️");
    return;
  }

  if (newPassword.length < 6) {
    showToast("Password baru minimal 6 karakter", "⚠️");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Memperbarui Password...";

  try {
    const res = await apiRequest("/api/member/change-password", {
      method: "PUT",
      body: JSON.stringify({ oldPassword, newPassword })
    });

    if (res.ok) {
      showToast("Password berhasil diganti!", "🔒");
      document.getElementById("formChangePassword").reset();
    }
  } catch (err) {
    showToast(err.message, "⚠️");
  } finally {
    btn.disabled = false;
    btn.textContent = "Perbarui Password";
  }
}

// Modal Backdrop Dismiss
function handleOverlayClick(event, modalId) {
  if (event.target && event.target.id === modalId) {
    document.getElementById(modalId).classList.remove("open");
  }
}
