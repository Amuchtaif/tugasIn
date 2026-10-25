# Task Revisi: Pisahkan Task Mata Kuliah dan Task Project

*Dibuat 25 Oktober 2026 · Aplikasi: TugasIn*

## Latar Belakang

Saat ini form **Tambah Task** menampilkan opsi tautan ke **Mata Kuliah** dan ke **Project** sekaligus, di mana pun form dibuka. Padahal **tugas mata kuliah dan task project adalah hal yang berbeda**, sehingga opsi tersebut membingungkan dan memungkinkan data bercampur.

## Keputusan

| Konteks form dibuka | Yang ditampilkan | Yang disembunyikan |
|---|---|---|
| Di halaman **Mata Kuliah** (tugas makul) | Task otomatis milik mata kuliah tersebut | Opsi **Tautkan ke Project** |
| Di halaman **Project** (task project) | Task otomatis milik project tersebut | Opsi **Tautkan ke Mata Kuliah** |

Konsekuensinya, setiap task kini bersifat **salah satu**: tugas mata kuliah **atau** task project, tidak keduanya.

## Dampak pada Rancangan Sebelumnya

Pemisahan ini mengubah beberapa asumsi di PRD dan model data:

- Model data lama: `Task` memiliki `course_id` dan `project_id` (opsional). Sekarang `course_id` dan `project_id` bersifat **saling eksklusif** (tepat satu terisi).
- Status kanban dan properti kustom saat ini terikat ke mata kuliah (`Status.course_id`, `CustomField.course_id`). Task project membutuhkan **status dan properti milik project** sendiri agar kanban project berfungsi.
- Fitur lain yang mengikuti task (gambar pendukung, subtask, pengingat) tidak berubah, karena melekat pada `task_id`.

---

## TASK 1: Model Data

**Prioritas:** P0

| # | Subtask | Detail | Status |
|---|---|---|---|
| 1.1 | Jadikan `course_id` nullable | Task project tidak memiliki `course_id` | [x] |
| 1.2 | Constraint eksklusif | Tambahkan `CHECK` agar **tepat satu** dari `course_id` atau `project_id` terisi (tidak boleh keduanya, tidak boleh kosong keduanya) | [x] |
| 1.3 | Pemilik status | Ubah tabel `Status` agar dimiliki mata kuliah **atau** project (`course_id` atau `project_id`, juga dengan constraint eksklusif) | [x] |
| 1.4 | Pemilik properti kustom | Lakukan hal yang sama pada `CustomField` | [x] |
| 1.5 | Status bawaan project | Saat project dibuat, buat status bawaan (usulan: Belum mulai, Dikerjakan, Review, Selesai) yang dapat diedit | [x] |
| 1.6 | Indeks | Tambahkan indeks pada `project_id` (dan pastikan `course_id` tetap terindeks) | [x] |
| 1.7 | Perbarui dokumentasi | Sesuaikan bagian model data dan FR-6 di PRD | [x] |

**Kriteria selesai:**

- [x] Database menolak task yang memiliki kedua tautan atau tidak memiliki tautan sama sekali.
- [x] Project memiliki set status sendiri yang terpisah dari mata kuliah.

---

## TASK 2: Form Tambah Task Sesuai Konteks

**Prioritas:** P0

| # | Subtask | Detail | Status |
|---|---|---|---|
| 2.1 | Form di halaman Mata Kuliah | Sembunyikan field **Tautkan ke Project**; `course_id` terisi otomatis dari halaman yang sedang dibuka | [x] |
| 2.2 | Form di halaman Project | Sembunyikan field **Tautkan ke Mata Kuliah**; `project_id` terisi otomatis dari project yang sedang dibuka | [x] |
| 2.3 | Opsi status mengikuti pemilik | Dropdown status hanya menampilkan status milik mata kuliah atau project yang sedang aktif | [x] |
| 2.4 | Quick add global | Pada tempat yang tidak punya konteks (halaman Semua tugas, Hari ini, kalender), tampilkan pemilih jenis di awal: **Tugas Mata Kuliah** atau **Task Project**, lalu tampilkan hanya pemilih yang sesuai (daftar mata kuliah atau daftar project) | [x] |
| 2.5 | Form edit task | Terapkan aturan yang sama pada form edit; field tautan lawan tidak ditampilkan | [x] |
| 2.6 | Label jenis | Tampilkan keterangan jelas di form, misalnya "Menambah tugas di: Mikrokontroler IoT" atau "Menambah task di: Project X" | [x] |
| 2.7 | Komponen form | Gunakan komponen `Button` dan `Select` standar agar tampilan konsisten | [x] |

**Kriteria selesai:**

- [x] Di halaman mata kuliah tidak ada opsi tautan ke project, dan sebaliknya.
- [x] Task yang dibuat selalu memiliki tepat satu pemilik.
- [x] Quick add global memaksa pengguna memilih jenis terlebih dahulu.

---

## TASK 3: Tampilan dan Navigasi

**Prioritas:** P1

| # | Subtask | Detail | Status |
|---|---|---|---|
| 3.1 | Sidebar | Pisahkan bagian **Semester → Mata Kuliah** dan bagian **Project** agar jelas bahwa keduanya berbeda | [x] |
| 3.2 | Kanban | Kanban mata kuliah memakai status mata kuliah; kanban project memakai status project | [x] |
| 3.3 | Halaman gabungan | Pada Semua tugas, Hari ini, dan kalender, tampilkan penanda jenis (warna mata kuliah atau warna project, plus label kecil) | [x] |
| 3.4 | Filter jenis | Tambahkan filter **Semua / Tugas Mata Kuliah / Task Project** pada tampilan gabungan | [x] |
| 3.5 | Kartu dan detail | Panel detail menampilkan induk task (mata kuliah atau project) tanpa menampilkan field tautan lawan | [x] |

**Kriteria selesai:**

- [x] Pengguna dapat membedakan tugas makul dan task project sekilas di semua tampilan.
- [x] Tidak ada tampilan yang menampilkan kedua tautan sekaligus pada satu task.

---

## TASK 4: Validasi di Backend

**Prioritas:** P0

| # | Subtask | Detail | Status |
|---|---|---|---|
| 4.1 | Validasi API | Tolak permintaan yang mengirim `course_id` dan `project_id` bersamaan, atau tidak mengirim keduanya | [x] |
| 4.2 | Validasi status | Pastikan `status_id` milik mata kuliah atau project yang sama dengan task | [x] |
| 4.3 | Pesan error | Pesan jelas dalam Bahasa Indonesia, misalnya "Task hanya boleh dimiliki satu mata kuliah atau satu project" | [x] |
| 4.4 | Pindah induk | Tetapkan aturan saat task dipindah ke mata kuliah atau project lain (lihat Pertanyaan Terbuka) | [x] |

**Kriteria selesai:**

- [x] Data tidak valid ditolak di sisi server, bukan hanya disembunyikan di tampilan.

---

## TASK 5: Migrasi Data yang Sudah Ada

**Prioritas:** P0

| # | Subtask | Detail | Status |
|---|---|---|---|
| 5.1 | Cadangkan | Buat cadangan database sebelum migrasi | [x] |
| 5.2 | Cari data bermasalah | Query task yang memiliki **dua tautan sekaligus** atau **tidak punya tautan** | [x] |
| 5.3 | Putuskan aturan | Untuk task dengan dua tautan, tentukan yang dipertahankan (usulan: pertahankan tautan mata kuliah, hapus tautan project; atau tinjau manual jika jumlahnya sedikit) | [x] |
| 5.4 | Skrip migrasi | Terapkan perubahan skema dan perbaikan data dalam satu migrasi yang dapat diulang | [x] |
| 5.5 | Status project | Buat status bawaan untuk project yang sudah ada dan petakan task project ke status yang sesuai | [x] |
| 5.6 | Verifikasi | Cek jumlah task sebelum dan sesudah migrasi, pastikan tidak ada yang hilang | [x] |

**Kriteria selesai:**

- [x] Semua task lama memiliki tepat satu pemilik.
- [x] Tidak ada data yang hilang setelah migrasi.

---

## TASK 6: Pengujian

**Prioritas:** P1

- [x] Tambah task dari halaman mata kuliah: field project tidak tampil, task tersimpan di mata kuliah yang benar.
- [x] Tambah task dari halaman project: field mata kuliah tidak tampil, task tersimpan di project yang benar.
- [x] Quick add global: pilih jenis, lalu hanya pemilih yang sesuai yang tampil.
- [x] Edit task: field tautan lawan tetap tidak tampil.
- [x] Kanban mata kuliah dan kanban project memakai status masing-masing, drag-and-drop tetap berfungsi.
- [x] API menolak data dengan dua tautan atau tanpa tautan.
- [x] Tampilan gabungan (Semua tugas, Hari ini, kalender) menampilkan penanda jenis dengan benar.
- [x] Gambar pendukung, subtask, dan pengingat pada task tetap berfungsi setelah perubahan.
- [x] Uji di desktop dan ponsel.

---

## Urutan Pengerjaan dan Estimasi Kasar

| Urutan | Pekerjaan | Estimasi |
|---|---|---|
| 1 | Task 5.1–5.3 (cadangan dan keputusan aturan migrasi) | 0,5 hari |
| 2 | Task 1 (model data) dan Task 5.4–5.6 (migrasi) | 1 hari |
| 3 | Task 4 (validasi backend) | 0,5 hari |
| 4 | Task 2 (form tambah dan edit task) | 1 hari |
| 5 | Task 3 (tampilan dan navigasi) | 1 hari |
| 6 | Task 6 (pengujian) | 0,5 hari |

## Pertanyaan Terbuka

1. Apakah task boleh dipindahkan dari mata kuliah ke project (atau sebaliknya) lewat aksi "Pindahkan" yang eksplisit, atau dilarang sama sekali?
2. Untuk data lama yang memiliki dua tautan sekaligus, tautan mana yang dipertahankan?
3. Apakah status bawaan project (Belum mulai, Dikerjakan, Review, Selesai) sudah sesuai?