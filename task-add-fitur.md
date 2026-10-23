# Task Fitur: Gambar Pendukung pada Task

_Dibuat 23 Oktober 2026 · Aplikasi: TugasIn_

## Ringkasan Fitur

Setiap task dapat memiliki **gambar pendukung** (misalnya foto soal, tangkapan layar, sketsa, atau hasil praktikum). Fitur ini **opsional**: task tetap bisa dibuat dan disimpan tanpa gambar. Gambar tampil sebagai thumbnail di detail task, dan saat diklik terbuka **preview dalam modal popup**.

## Keputusan yang Sudah Ditetapkan

- Gambar bersifat **opsional** per task.
- Preview menggunakan **modal popup**.

## Usulan Awal (Bisa Diubah)

Nilai berikut adalah usulan awal agar pengerjaan tidak tertahan. Ubah sesuai kebutuhan.

| Parameter                       | Usulan                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| Format yang diterima            | JPG, PNG, WebP, GIF                                                                         |
| Ukuran maksimal per gambar      | 5 MB                                                                                        |
| Jumlah maksimal gambar per task | 10                                                                                          |
| Cara menambah                   | Tombol pilih file, drag-and-drop, dan tempel (paste) dari clipboard                         |
| Penyimpanan                     | Storage privat (misalnya bucket Supabase Storage) dengan URL bertanda tangan (_signed URL_) |
| Keterangan gambar               | Opsional, teks singkat per gambar                                                           |

---

## TASK 1: Model Data dan Penyimpanan

**Prioritas:** P0

| #   | Subtask                  | Detail                                                                                                                                          | Status |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1 | Tabel `task_attachments` | Kolom: `id`, `task_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `width`, `height`, `caption` (opsional), `urutan`, `created_at` | [x]    |
| 1.2 | Relasi                   | `task_id` mengacu ke `tasks` dengan `ON DELETE CASCADE`; tambahkan indeks pada `task_id`                                                        | [x]    |
| 1.3 | Bucket storage           | Buat bucket privat, struktur path `user_id/task_id/uuid.ext`                                                                                    | [x]    |
| 1.4 | Kebijakan akses          | Pastikan pengguna hanya bisa membaca, menulis, dan menghapus file miliknya sendiri (RLS atau pengecekan di server)                              | [x]    |
| 1.5 | Signed URL               | Buat endpoint atau helper yang menghasilkan URL sementara untuk menampilkan gambar                                                              | [x]    |
| 1.6 | Pembersihan              | Saat task dihapus permanen, file di storage ikut dihapus. Pada _soft delete_, file tetap disimpan sampai task dipulihkan atau dihapus permanen  | [x]    |

**Kriteria selesai:**

- [x] Tabel dan bucket tersedia, task tanpa gambar tetap valid.
- [x] Pengguna lain tidak dapat mengakses gambar yang bukan miliknya.
- [x] Tidak ada file yatim di storage setelah task dihapus permanen.

---

## TASK 2: Unggah Gambar (Backend dan Validasi)

**Prioritas:** P0

| #   | Subtask            | Detail                                                                                                 | Status |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| 2.1 | Endpoint unggah    | Terima file, simpan ke storage, catat metadata di `task_attachments`                                   | [x]    |
| 2.2 | Validasi di server | Periksa tipe MIME sebenarnya (bukan hanya ekstensi), ukuran maksimal, dan jumlah maksimal per task     | [x]    |
| 2.3 | Keamanan           | Hapus metadata EXIF (termasuk lokasi GPS) dari gambar, acak nama file, dan batasi laju unggah          | [x]    |
| 2.4 | Pesan error        | Pesan jelas dalam Bahasa Indonesia untuk format salah, ukuran terlalu besar, dan batas jumlah tercapai | [x]    |
| 2.5 | Hapus dan urutkan  | Endpoint untuk menghapus gambar, mengubah urutan, dan mengubah keterangan                              | [x]    |
| 2.6 | Thumbnail          | Buat versi kecil (misalnya lebar 320 px) untuk daftar agar halaman cepat dimuat                        | [x]    |

**Kriteria selesai:**

- [x] File yang tidak valid ditolak dengan pesan yang jelas.
- [x] Gambar tersimpan lengkap dengan metadata dan thumbnail.
- [x] EXIF sudah dibersihkan.

---

## TASK 3: Antarmuka Unggah di Detail Task

**Prioritas:** P0

| #    | Subtask                              | Detail                                                                                                          | Status |
| ---- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------ |
| 3.1  | Bagian "Gambar" di panel detail task | Tampil sebagai area opsional; bila kosong, tampilkan ajakan ringan "Tambah gambar"                              | [x]    |
| 3.2  | Tombol pilih file                    | Gunakan komponen `Button` standar (ikuti ukuran yang sudah diseragamkan pada Task 2 di _Perbaikan Bug TugasIn_) | [x]    |
| 3.3  | Drag-and-drop file                   | Area jatuhkan file dengan indikator visual saat file diseret ke atasnya                                         | [x]    |
| 3.4  | Tempel dari clipboard                | Tangani `paste` agar tangkapan layar bisa langsung ditempel                                                     | [x]    |
| 3.5  | Unggah banyak file                   | Dukung pilih beberapa gambar sekaligus dengan indikator progres per file                                        | [x]    |
| 3.6  | Pratinjau sebelum unggah             | Tampilkan thumbnail sementara, beri opsi batal                                                                  | [x]    |
| 3.7  | Grid thumbnail                       | Tampilkan gambar tersimpan sebagai grid responsif dengan tombol hapus                                           | [x]    |
| 3.8  | Keterangan opsional                  | Kolom teks singkat per gambar, boleh dikosongkan                                                                | [x]    |
| 3.9  | Status dan error                     | Tampilkan _loading_, gagal unggah dengan opsi coba lagi, dan batas jumlah tercapai                              | [x]    |
| 3.10 | Konfirmasi hapus                     | Dialog konfirmasi sebelum gambar dihapus                                                                        | [x]    |

**Kriteria selesai:**

- [x] Gambar bisa ditambah lewat tombol, drag-and-drop, dan paste.
- [x] Task bisa disimpan tanpa gambar tanpa error atau peringatan.
- [x] Tampilan nyaman di desktop dan ponsel.

---

## TASK 4: Preview Gambar dengan Modal Popup

**Prioritas:** P0

| #    | Subtask               | Detail                                                                                                                                                  | Status |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4.1  | Buka modal            | Klik thumbnail membuka modal berisi gambar ukuran besar (muat dalam layar, rasio terjaga)                                                               | [x]    |
| 4.2  | Overlay               | Latar gelap semi-transparan, halaman di belakang tidak ikut ter-scroll saat modal terbuka                                                               | [x]    |
| 4.3  | Cara menutup          | Tombol tutup (X), tombol `Esc`, dan klik di luar gambar                                                                                                 | [x]    |
| 4.4  | Navigasi antar gambar | Tombol sebelumnya/berikutnya dan tombol panah keyboard bila task punya lebih dari satu gambar; tampilkan penanda "2 / 5"                                | [x]    |
| 4.5  | Info gambar           | Tampilkan nama file dan keterangan (bila ada)                                                                                                           | [x]    |
| 4.6  | Zoom                  | Klik atau tombol untuk memperbesar/memperkecil; geser gambar saat diperbesar                                                                            | [x]    |
| 4.7  | Gestur sentuh         | Geser kiri/kanan untuk pindah gambar, cubit untuk zoom di ponsel                                                                                        | [x]    |
| 4.8  | Pemuatan              | Tampilkan thumbnail atau indikator _loading_ selagi gambar penuh dimuat                                                                                 | [x]    |
| 4.9  | Aksesibilitas         | Fokus pindah ke modal saat terbuka dan kembali ke thumbnail saat tertutup (_focus trap_), `role="dialog"`, `aria-modal="true"`, dan `alt` yang bermakna | [x]    |
| 4.10 | Aksi di modal         | Tombol hapus dan unduh gambar, memakai komponen `Button` standar                                                                                        | [x]    |

**Kriteria selesai:**

- [x] Modal terbuka dan tertutup dengan benar lewat mouse, keyboard, dan sentuhan.
- [x] Navigasi antar gambar berjalan lancar.
- [x] Halaman di belakang tidak bergeser atau ter-scroll saat modal terbuka.
- [x] Modal dapat dioperasikan sepenuhnya dengan keyboard.

---

## TASK 5: Integrasi dengan Tampilan Lain

**Prioritas:** P1

| #   | Subtask              | Detail                                                                                            | Status |
| --- | -------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| 5.1 | Kartu kanban         | Tampilkan ikon gambar dengan jumlah bila task punya gambar; tidak menampilkan apa pun bila kosong | [x]    |
| 5.2 | Tampilan List        | Kolom atau ikon kecil penanda adanya gambar                                                       | [x]    |
| 5.3 | Drag-and-drop kanban | Pastikan penanda gambar tidak mengganggu drag-and-drop kartu                                      | [x]    |
| 5.4 | Duplikasi task       | Tentukan perilaku saat task diduplikasi (usulan: gambar ikut disalin atau opsi pilihan)           | [x]    |
| 5.5 | Pindah task          | Gambar ikut pindah saat task dipindah ke mata kuliah atau semester lain                           | [x]    |

**Kriteria selesai:**

- [x] Penanda gambar muncul di kanban dan List tanpa merusak tata letak.
- [x] Memindahkan atau menduplikasi task tidak menghilangkan gambar.

---

## TASK 6: Pengujian

**Prioritas:** P1

- [x] Task tanpa gambar: buat, ubah, simpan, tanpa error.
- [x] Unggah satu dan banyak gambar; semua format yang didukung.
- [x] Tolak file non-gambar, file melebihi batas ukuran, dan melebihi batas jumlah.
- [x] Hapus gambar, hapus task, pulihkan task (soft delete).
- [x] Preview modal: buka, tutup (X, `Esc`, klik luar), navigasi, zoom.
- [x] Uji dengan keyboard saja dan dengan pembaca layar dasar.
- [x] Uji di Chrome, Firefox, Safari, dan ponsel; uji koneksi lambat.
- [x] Pastikan pengguna lain tidak bisa membuka URL gambar yang bukan miliknya.

---

## Urutan Pengerjaan dan Estimasi Kasar

| Urutan | Pekerjaan                            | Estimasi   |
| ------ | ------------------------------------ | ---------- |
| 1      | Task 1 (model data dan storage)      | 0,5–1 hari |
| 2      | Task 2 (backend unggah dan validasi) | 1 hari     |
| 3      | Task 3 (UI unggah)                   | 1–1,5 hari |
| 4      | Task 4 (modal preview)               | 1–1,5 hari |
| 5      | Task 5 (integrasi tampilan lain)     | 0,5 hari   |
| 6      | Task 6 (pengujian dan perbaikan)     | 0,5–1 hari |

Disarankan menyelesaikan perbaikan bug kanban dan standarisasi tombol terlebih dahulu, karena fitur ini memakai komponen `Button` dan menambah elemen pada kartu kanban.

## Pertanyaan Terbuka

1. Batas ukuran dan jumlah gambar di atas sudah sesuai, atau perlu diubah?
2. Perlu mendukung file selain gambar (misalnya PDF) di tahap berikutnya?
3. Saat task diduplikasi, apakah gambar ikut disalin?
4. Perlu fitur gambar sampul (_cover_) yang tampil di kartu kanban?
