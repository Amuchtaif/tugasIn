# PRD: TugasIn, Aplikasi Manajemen Tugas Kuliah & Proyek

*Versi 0.1 (draft) · 22 Oktober 2026 · Nama aplikasi: TugasIn, untuk pemakaian pribadi*

## 1. Ringkasan

TugasIn adalah aplikasi web pribadi ala Notion yang berfokus pada pencatatan tugas kuliah dan tugas proyek. Data diorganisasi secara bertingkat: **Semester → Mata Kuliah → Task**. Setiap task bisa dilihat dalam tampilan **List**, **Kanban**, dan **Kalender**, dilengkapi **pengingat deadline** otomatis. Semua tingkatan (nama, warna, status, properti) dapat dikustomisasi pengguna.

## 2. Latar Belakang dan Masalah

Mahasiswa biasanya mengelola tugas lewat kombinasi catatan di ponsel, grup chat, dan ingatan. Akibatnya:

- Deadline terlewat karena tugas tersebar di banyak tempat.
- Sulit melihat beban kerja lintas mata kuliah dalam satu minggu.
- Aplikasi serbaguna seperti Notion fleksibel tetapi butuh waktu lama untuk disiapkan, dan pengingatnya terbatas.
- Aplikasi to-do biasa tidak mengenal struktur semester dan mata kuliah.

TugasIn mengisi celah ini: terstruktur sesuai kehidupan kampus, tetapi tetap fleksibel.

## 3. Tujuan dan Non-Tujuan

### Tujuan

1. Pengguna dapat mencatat tugas dengan hierarki semester dan mata kuliah dalam kurang dari 10 detik per tugas.
2. Pengguna dapat melihat semua tugas dalam kanban dan kalender.
3. Tidak ada deadline terlewat tanpa pengingat sebelumnya.
4. Pengguna dapat menyesuaikan status, properti, warna, dan tampilan tanpa menulis kode.

### Non-Tujuan (untuk versi awal)

- Editor blok dengan fitur selengkap Notion (database inline, sinkronisasi antar-blok); versi awal hanya blok dasar.
- Aplikasi native iOS/Android dan akses offline (cukup web responsif).
- Fitur akademik seperti perhitungan IPK atau integrasi SIAKAD.
- Kolaborasi multi-pengguna (aplikasi dirancang untuk pemakaian pribadi).

## 4. Target Pengguna

**Pengguna utama:** mahasiswa S1/D3/D4 yang memiliki banyak tugas, laporan praktikum, dan proyek tiap semester.

**Pengguna sekunder:** tidak ada; aplikasi dirancang untuk satu pengguna.

### Persona

| Persona | Kebutuhan | Hambatan saat ini |
|---|---|---|
| Mahasiswa semester 5 dengan 6 mata kuliah dan 2 praktikum | Melihat deadline minggu ini lintas mata kuliah | Tugas tercatat di banyak tempat |
| Mahasiswa dengan proyek tugas besar | Memecah proyek menjadi task dan memantau progresnya | Progres proyek tersebar di banyak catatan |

## 5. User Stories

1. Sebagai mahasiswa, saya ingin membuat semester dan menambahkan mata kuliah di dalamnya agar tugas tertata.
2. Sebagai mahasiswa, saya ingin menambahkan task lengkap dengan deadline dan prioritas agar tidak lupa.
3. Sebagai mahasiswa, saya ingin memindahkan task antar kolom status lewat drag-and-drop agar progres terlihat jelas.
4. Sebagai mahasiswa, saya ingin melihat semua deadline di kalender agar bisa merencanakan minggu saya.
5. Sebagai mahasiswa, saya ingin diingatkan sebelum deadline lewat notifikasi agar tidak telat mengumpulkan.
6. Sebagai mahasiswa, saya ingin mengubah status dan menambah properti sendiri agar sesuai cara kerja tiap mata kuliah.
7. Sebagai mahasiswa, saya ingin mengarsipkan semester lama agar tampilan harian tetap bersih.
8. Sebagai mahasiswa, saya ingin satu halaman "Semua tugas" lintas mata kuliah agar tahu mana yang paling mendesak.

## 6. Ruang Lingkup Fitur

### MVP (Rilis 1)

- Autentikasi (email + password, opsi login Google)
- CRUD Semester, Mata Kuliah, Project, dan Task
- Tampilan List, Kanban, dan Kalender
- Status dan prioritas bawaan, dapat diedit
- Pengingat deadline via Telegram (bot)
- Halaman "Hari ini / Minggu ini" dan "Semua tugas"
- Arsip semester
- Responsif untuk ponsel

### Rilis 2

- Properti kustom (teks, angka, tanggal, pilihan, multi-pilih, checkbox, URL)
- Status kustom per mata kuliah
- Subtask dan checklist
- Tag, filter, pencarian, dan view tersimpan
- Template task dan template mata kuliah
- Editor catatan berbasis blok per task (blok dasar: judul, paragraf, daftar, checklist, kode)
- Pengingat tambahan via email dan Web Push
- Tugas berulang
- Mode gelap

### Rilis 3

- Tampilan progres Project (persentase selesai dan timeline)
- Kolaborasi multi-pengguna (ditunda; saat ini pemakaian pribadi)
- Sinkronisasi Google Calendar
- Statistik dan ringkasan mingguan
- PWA agar bisa dipasang di layar utama ponsel (tanpa akses offline)

## 7. Kebutuhan Fungsional

### 7.1 Hierarki dan Navigasi

- FR-1: Sidebar menampilkan daftar semester yang dapat dilipat, berisi daftar mata kuliah.
- FR-2: Halaman semester menampilkan kartu seluruh mata kuliah dan kalender gabungan semester tersebut.
- FR-3: Halaman mata kuliah menampilkan task dengan tab List, Kanban, dan Kalender.
- FR-4: Halaman "Semua tugas" menampilkan task lintas mata kuliah dan semester aktif dengan filter.
- FR-5: Pengguna dapat mengubah nama, warna, ikon, dan urutan semester serta mata kuliah.

### 7.2 Task

- FR-6: Task memiliki judul, deskripsi, status, prioritas, deadline (tanggal dan jam), pemilik (tepat satu dari: mata kuliah atau project, saling eksklusif), dan tag.
- FR-7: Task dapat dibuat cepat dari satu kolom input (quick add) dengan judul dan deadline.
- FR-8: Pengguna dapat memindahkan task ke mata kuliah lain (untuk tugas makul) atau ke project lain (untuk task project).
- FR-9: Task yang melewati deadline dan belum selesai ditandai visual (overdue).
- FR-10: Penghapusan bersifat *soft delete* dengan opsi pulihkan selama 30 hari.

### 7.3 Kanban

- FR-11: Kolom kanban mengikuti daftar status milik mata kuliah atau project yang sedang aktif.
- FR-12: Kartu dapat dipindah antar kolom dan diurutkan lewat drag-and-drop.
- FR-13: Perubahan posisi tersimpan otomatis dan langsung tercermin di List dan Kalender.
- FR-14: Pengguna dapat menambah, mengganti nama, mengurutkan, dan menghapus kolom status pada mata kuliah atau project tersebut.

### 7.4 Kalender

- FR-15: Tampilan bulanan dan mingguan menampilkan task berdasarkan deadline, berwarna sesuai mata kuliah atau penanda project.
- FR-16: Task dapat dipindah ke tanggal lain dengan drag-and-drop untuk mengubah deadline.
- FR-17: Klik pada tanggal membuka form pembuatan task dengan deadline terisi.

### 7.5 Pengingat

- FR-18: Pengguna dapat mengatur pengingat per task (misalnya H-3, H-1, 2 jam sebelum).
- FR-19: Pengguna dapat mengatur aturan pengingat bawaan di tingkat akun atau mata kuliah.
- FR-20: Pengingat dikirim melalui kanal yang dipilih pengguna (Telegram di MVP; email menyusul).
- FR-21: Pengingat tidak dikirim untuk task berstatus selesai, dan tidak dikirim ganda.
- FR-22: Pengguna dapat menunda (*snooze*) pengingat dari notifikasi atau dari aplikasi.

### 7.6 Kustomisasi (Rilis 2)

- FR-23: Pengguna dapat membuat properti kustom dengan tipe: teks, angka, tanggal, pilihan tunggal, multi-pilih, checkbox, URL.
- FR-24: Properti kustom dapat ditampilkan, disembunyikan, difilter, dan digunakan untuk *grouping* di setiap view.
- FR-25: Pengguna dapat menyimpan view dengan kombinasi filter, sorting, dan grouping.
- FR-26: Pengguna dapat menyimpan mata kuliah atau project sebagai template (status dan properti) untuk dipakai ulang.

## 8. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Performa | Halaman utama termuat < 2 detik pada koneksi 4G; aksi drag-and-drop terasa instan (< 100 ms) |
| Keandalan | Pengingat terkirim dengan toleransi keterlambatan maksimal 5 menit |
| Keamanan | Password di-hash, HTTPS wajib, data tiap pengguna terisolasi |
| Zona waktu | Waktu disimpan dalam UTC, ditampilkan dalam zona waktu pengguna (default WIB) |
| Responsif | Nyaman dipakai di layar ponsel (lebar 360 px ke atas) |
| Aksesibilitas | Kontras warna memadai, navigasi keyboard untuk aksi utama |
| Bahasa | Antarmuka Bahasa Indonesia (opsi Inggris menyusul) |
| Pencadangan | Backup database harian |

## 9. Model Data (Ringkas)

| Entitas | Atribut utama |
|---|---|
| User | id, nama, email, zona waktu, pengaturan |
| Semester | id, user_id, nama, tanggal_mulai, tanggal_selesai, warna, ikon, diarsipkan |
| Course | id, semester_id, nama, kode, dosen, sks, warna, ikon, urutan |
| Project | id, user_id, nama, deskripsi, deadline, status |
| Status | id, course_id, project_id (saling eksklusif: tepat satu terisi), nama, urutan, apakah_selesai |
| Task | id, course_id, project_id (saling eksklusif: tepat satu terisi), status_id, judul, deskripsi, prioritas, deadline, urutan, custom_values (JSON), dihapus_pada |
| CustomField | id, course_id, project_id (saling eksklusif), nama, tipe, opsi, urutan |
| Subtask | id, task_id, judul, selesai |
| Reminder | id, task_id, waktu_kirim, kanal, status_kirim |
| Tag / TaskTag | id, nama, warna / relasi task-tag |

Relasi inti: Setiap Task bersifat salah satu: **Tugas Mata Kuliah** (Course 1–N Task) ATAU **Task Project** (Project 1–N Task). Status dan properti kustom terikat secara independen ke masing-masing Course atau Project (memiliki `course_id` atau `project_id` secara saling eksklusif).

## 10. Alur Utama Pengguna

1. **Onboarding:** daftar → buat semester pertama → tambah mata kuliah (opsi impor cepat dari daftar teks) → tambah task pertama.
2. **Rutinitas harian:** buka halaman "Hari ini" → lihat task mendesak → ubah status → tambah task baru bila ada.
3. **Perencanaan mingguan:** buka kalender gabungan → geser deadline atau prioritas jika perlu.
4. **Ganti semester:** arsipkan semester lama → buat semester baru → (opsional) pindahkan task yang belum selesai.

## 11. Usulan Teknologi

| Lapisan | Usulan |
|---|---|
| Frontend | Next.js (React) + Tailwind CSS |
| Kanban | dnd-kit |
| Kalender | FullCalendar |
| Editor catatan (Rilis 2) | BlockNote (berbasis blok; alternatif: TipTap) |
| Backend & Auth | Next.js API routes + Supabase (atau Laravel sebagai alternatif) |
| Database | PostgreSQL (JSONB untuk properti kustom) |
| Pengingat | Penjadwal berkala (cron) + antrean job; Telegram Bot API (MVP); email via Resend (Rilis 2) |
| Hosting | Vercel + Supabase |

Keputusan akhir tumpukan teknologi dapat disesuaikan dengan keahlian tim.

## 12. Metrik Keberhasilan

- Persentase task yang selesai sebelum deadline (target awal: > 80% untuk pengguna aktif).
- Jumlah deadline terlewat per pengguna per semester (turun dibanding sebelum memakai aplikasi).
- Frekuensi pemakaian: aplikasi dibuka hampir setiap hari kuliah.
- Waktu rata-rata membuat satu task (target < 10 detik).
- Tingkat pengingat yang dibuka atau ditindaklanjuti.

## 13. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Cakupan fitur membengkak karena ingin "seperti Notion" | Proyek tidak selesai | Pegang batas MVP; editor blok dikerjakan setelah Rilis 1 dan dimulai dari blok dasar |
| Pengingat gagal atau ganda | Pengguna kehilangan kepercayaan | Tandai status kirim, uji zona waktu, pantau job |
| Kustomisasi terlalu bebas membuat aplikasi rumit | UX membingungkan | Sediakan nilai bawaan yang baik dan template |
| Performa lambat saat data banyak | Pengalaman buruk | Indeks database, pagination, optimistic UI |
| Kehilangan data | Fatal | Soft delete dan backup harian |

## 14. Roadmap Usulan

| Tahap | Isi | Perkiraan |
|---|---|---|
| 0 | Riset kebutuhan, wireframe, ERD | 1 minggu |
| 1 | Auth, CRUD semester/mata kuliah/project/task, tampilan List | 2 minggu |
| 2 | Kanban dan Kalender | 2 minggu |
| 3 | Pengingat Telegram, halaman Hari ini dan Semua tugas | 1–2 minggu |
| 4 | Dipakai harian secara pribadi, perbaikan | 1–2 minggu |
| 5 | Rilis 2: properti kustom, subtask, template, editor blok | 4 minggu |

Perkiraan waktu mengasumsikan satu pengembang paruh waktu dan dapat bergeser.

## 15. Keputusan dan Hal yang Masih Terbuka

1. Diputuskan: aplikasi untuk pemakaian pribadi, tidak dibuka untuk pengguna lain.
2. Diputuskan: Telegram sebagai kanal pengingat utama.
3. Diputuskan: Project menjadi entitas terpisah sejak MVP.
4. Diputuskan: editor catatan berbasis blok (dikerjakan di Rilis 2, dimulai dari blok dasar).
5. Diputuskan: tidak perlu akses offline.
6. Nama final: TugasIn. Identitas visual (logo dan warna) masih perlu ditentukan.
