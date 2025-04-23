# Request Music App

Aplikasi web untuk mengelola permintaan lagu dengan antrian dan penjadwalan. Data disimpan di MongoDB Atlas dan kode tersedia di GitHub.

## Fitur

- Permintaan lagu dengan YouTube link
- Antrian lagu
- Penjadwalan untuk hari ini dan besok
- Panel admin untuk mengelola permintaan
- Pencarian lagu YouTube terintegrasi

## Teknologi

- Node.js
- Express.js
- MongoDB Atlas
- Vanilla JavaScript

## Instalasi

1. Clone repository ini
2. Install dependencies: `npm install`
3. Buat file `.env` dan atur MongoDB URI
4. Jalankan server: `npm start`

## Konfigurasi

Buat file `.env` dengan isi:
```
MONGODB_URI=your_mongodb_atlas_uri
PORT=3000
```