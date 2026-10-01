# Inpresive Member Club — Mobile Web Portal

Aplikasi web ramah tampilan seluler (*mobile-first SPA*) khusus untuk member Inpresive Barbershop. Aplikasi ini memungkinkan pelanggan melihat kartu member digital ber-QR code, memeriksa poin & tingkatan tier, riwayat cukur, memberikan rating bintang & ulasan, melihat katalog layanan, lokasi cabang Google Maps, serta membaca berita & pengumuman.

---

## 📁 Struktur Berkas

Project ini dirancang **100% mandiri (self-contained)** tanpa framework rumit (Pure HTML5, CSS3, dan Vanilla JavaScript ES6+):

```
frontend/member/
├── index.html       # Struktur antarmuka mobile SPA & modal bottom-sheet
├── style.css        # Desain visual barbershop gelap modern (mobile-first max 480px)
├── app.js           # Logika aplikasi, state, otentikasi, REST API client, review & QR
├── qrcode.min.js    # Generator QR Code offline (ringan & tanpa dependensi eksternal)
└── README.md        # Dokumentasi project & panduan deployment
```

---

## 🚀 Cara Menghubungkan ke Backend POS

Secara bawaan (*default*), jika web ini disajikan dari server yang sama di:
`http://localhost:3000/member` atau `https://pos.inpresive.com/member`
Aplikasi akan otomatis memanggil relative path `/api/member/...`.

### Jika Dibuatkan Repository Terpisah & Dideploy Sendiri (Contoh: Vercel, Netlify, Cloudflare Pages)

Jika aplikasi ini dideploy di domain terpisah (misal: `https://member.inpresive.com`), cukup tambahkan satu baris konfigurasi di dalam tag `<head>` pada file `index.html`:

```html
<script>
  window.INPRESIVE_API_BASE = "https://pos.inpresive.com";
</script>
```

Backend Inpresive POS telah dilengkapi dukungan **CORS & Credentials (Cookies)** sehingga request login, ulasan, dan data member dari domain terpisah akan berjalan lancar dan aman.

---

## 📱 Fitur Utama Member Portal

1. **Virtual Member Card & QR Code Statis:**
   - Menampilkan Member ID dalam bentuk QR Code.
   - Dapat langsung ditembak menggunakan scanner barcode kasir POS untuk pemanggilan data instan.
2. **Loyalty Points & Tier System:**
   - Saldo poin loyalitas aktif.
   - Badge tingkat tier (`Silver`, `Gold`, `Platinum`) dan progress bar akumulasi belanja (*lifetime spend*).
3. **Info & Berita Inpresive:**
   - Menampilkan pengumuman operasional, tips grooming, dan promo yang dikelola Super Admin via POS.
4. **Riwayat Kunjungan & Rating Ulasan:**
   - Riwayat potong rambut pelanggan.
   - Formulir review 1–5 bintang interaktif yang langsung tersimpan ke database ulasan POS.
5. **Katalog Layanan & Lokasi Cabang:**
   - Daftar harga layanan potong rambut.
   - Lokasi seluruh gerai aktif dilengkapi tombol **`📍 Buka Google Maps`**.
6. **Profil & Pengaturan Akun:**
   - Fitur ubah data diri (Nama, No HP, Tanggal Lahir, Kota).
   - Fitur ganti kata sandi.
