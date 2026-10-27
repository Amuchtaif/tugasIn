# Task Perbaikan Bug TugasIn

_Dibuat 23 Oktober 2026 | Diperbarui 23 Oktober 2026 - Semua task selesai diperbaiki_

Dua bug yang ditemukan setelah sistem jadi:

1. Kanban tidak bisa di-drag and drop.
2. Ukuran tombol di UI tidak konsisten.

---

## TASK 1: Kanban tidak bisa di-drag and drop

**Prioritas:** P0  
**Tujuan:** kartu bisa dipindah antar kolom dan diurutkan ulang, posisi tersimpan setelah refresh.

| #    | Subtask                   | Detail                                                                                                                                                                   | Status |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1.1  | Reproduksi dan baca error | Identifikasi penyebab error: `window.kanbanView` belum diekspos ke objek global window, menyebabkan pemanggilan inline handler crash dan `preventDefault()` tidak terpanggil. | [x]    |
| 1.2  | Periksa pemasangan dasar  | Pasang instance global `window.kanbanView`, event listeners `dragstart`, `dragover`, `dragleave`, `drop`, `dragend`, dan touch handlers pada elemen kartu dan kolom. | [x]    |
| 1.3  | Periksa ID                | ID kartu dan status konsisten bertipe string (`tsk_...` dan `st_...`), stabil antar render.                                                                               | [x]    |
| 1.4  | Kolom kosong              | Droppable dipasang langsung pada kontainer `.kanban-column` dan `.kanban-card-list` sehingga kartu dapat dijatuhkan ke kolom kosong tanpa error.                         | [x]    |
| 1.5  | Perbaiki `onDragEnd`      | Handler `handleDrop` dan `reorderTask` memperbarui state `status_id` dan `urutan`, menyimpan ke `localStorage` dan tabel MySQL `tasks` secara asinkron.                   | [x]    |
| 1.6  | Konflik klik              | Ditambahkan mekanisme flag `preventClick` pada kartu saat proses drag berlangsung agar tidak memicu pembukaan modal `openTaskDetail`.                                   | [x]    |
| 1.7  | CSS                       | Ditambahkan `touch-action: pan-y;`, visual indikator posisi drop (`.kanban-drop-indicator`), dan feedback styling `.kanban-card.dragging`.                               | [x]    |
| 1.8  | Arsitektur Komponen       | Komponen `KanbanView` di-refactor secara modular, sinkron dengan store subscribe event tanpa re-render yang memutus drag.                                                | [x]    |
| 1.9  | Simpan urutan             | Implementasi metode `store.reorderTask(taskId, targetStatusId, targetIndex)` yang mengkalkulasi posisi kartu dan mengupdate kolom `urutan` ke MySQL via `api.php`.      | [x]    |
| 1.10 | Uji                       | Uji pindah antar kolom, in-column reordering, drop ke kolom kosong, reload halaman, dan responsif mobile touch.                                                          | [x]    |

**Kriteria selesai:**

- [x] Kartu dapat dipindah dan diurutkan di desktop dan layar sentuh.
- [x] Status dan posisi tetap setelah refresh.
- [x] Perubahan juga tampil di List dan Kalender.
- [x] Tidak ada error di console saat drag.

---

## TASK 2: Ukuran tombol tidak konsisten

**Prioritas:** P1  
**Tujuan:** semua tombol memakai ukuran, padding, dan gaya yang seragam.

| #   | Subtask                     | Detail                                                                                                                                | Status |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.1 | Audit                       | Seluruh tombol di aplikasi (topbar, modal footers, detail panel, kanban, kalender, list) telah diaudit dan diinventarisasi.           | [x]    |
| 2.2 | Tetapkan token ukuran       | Ditetapkan token ukuran: `sm` (tinggi 32 px), `md` (tinggi 40 px, default), `lg` (tinggi 48 px), serta tombol ikon persegi (32 & 40 px). | [x]    |
| 2.3 | Buat satu komponen `Button` | Dibuat helper `window.Button` di `js/button.js` dengan props: `variant` (primary, secondary, ghost, danger), `size`, `icon`, `loading`, dll. | [x]    |
| 2.4 | Migrasi                     | Seluruh `<button>` dan kelas ad-hoc dimigrasi ke token desain sistem terstandarisasi (`.btn`, `.btn-sm`, `.btn-icon-sm`, dll).        | [x]    |
| 2.5 | Aturan penggunaan           | Ditentukan aturan baku penggunaan ukuran (`sm` untuk kartu/tabel/toast, `md` untuk modal footer & form, `lg` untuk hero/CTA).         | [x]    |
| 2.6 | Cek responsif               | Target sentuh di ponsel otomatis ditingkatkan minimal 36–42 px pada viewport seluler (`max-width: 900px`).                          | [x]    |
| 2.7 | Pencegahan                  | Panduan lengkap Button Design System dan cara penggunaannya didokumentasikan di `README.md`.                                         | [x]    |

**Kriteria selesai:**

- [x] Tombol dengan peran yang sama tampak sama persis di semua halaman.
- [x] Tidak ada tombol yang memakai gaya manual di luar komponen `Button`.
- [x] Tampilan tetap rapi di layar ponsel.

---

## TASK 3: Pengecekan ulang setelah perbaikan

**Prioritas:** P2

- [x] Telusuri alur utama: buat semester → mata kuliah → task → pindah di kanban → lihat di kalender → terima pengingat.
- [x] Uji di browser desktop dan viewport mobile.
- [x] Catat bug lain yang muncul sebagai task baru, tidak mencampur ke Task 1 dan 2.

---

## TASK 4: Sinkronisasi Status Kanban dan List Task

**Prioritas:** P0  
**Tujuan:** Status tugas di Kanban dan List View sinkron 100%, pengelompokan dinamis sesuai status global, dan status dapat diubah langsung dari baris tabel List View.

| #   | Subtask                     | Detail                                                                                                                                                                          | Status |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4.1 | Migrasi Status Database     | Bersihkan 36 data status per-course legacy di tabel `statuses`. Hapus check constraint `chk_status_owner` dan jadikan 4 status global kanban standar (`st_todo`, `st_prog`, `st_rev`, `st_done`). | [x]    |
| 4.2 | Dynamic Grouping List View  | Ubah `ListView.render()` agar membaca langsung daftar status dari `this.store.getStatuses()` secara dinamis, mengurutkan task berdasarkan kolom `urutan`, dan tidak memakai hardcoded string. | [x]    |
| 4.3 | Kolom Status di List View   | Tambahkan kolom status `.task-status-col` dan elemen select badge interaktif `.task-status-inline-select` di setiap baris tugas List View.                                    | [x]    |
| 4.4 | Handler Perubahan Status    | Buat fungsi `window.app.updateTaskStatus(taskId, statusId)` yang menyimpan perubahan ke MySQL via `api.php?action=save_task` dan memicu update reaktif di semua view.          | [x]    |
| 4.5 | Sinkronisasi Filter Status  | Standarkan value `<select id="filter-status">` di `index.html` dan buat sinkronisasi dinamis `syncFilterStatusDropdown()` agar opsi filter status selalu valid.                | [x]    |

---

## TASK 5: Notifikasi Bot Telegram Latar Belakang (Server Cron 24/7 Tanpa Browser)

**Prioritas:** P0  
**Tujuan:** Pengingat bot Telegram berjalan otomatis di latar belakang server via Linux Crontab, mengirimkan notifikasi deadline tugas dan jadwal kuliah tanpa perlu browser terbuka.

| #   | Subtask                     | Detail                                                                                                                                                                          | Status |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5.1 | Server Cron Worker          | Refactor [cron_reminders.php](file:///var/www/html/tugasIn/cron_reminders.php) agar mendukung offset reminder dinamis (`[72, 24, 2]`), deduplikasi via `task_reminder_logs` dan `schedule_reminder_logs`.     | [x]    |
| 5.2 | Background Task Scheduler   | Pasang entri Linux Crontab: `* * * * * /usr/bin/php /var/www/html/tugasIn/cron_reminders.php >> /var/www/html/tugasIn/cron.log 2>&1` agar worker berjalan otomatis setiap menit. | [x]    |
| 5.3 | Timezone & Health Logging   | Samakan timezone PHP dan MySQL ke `Asia/Jakarta` di [config.php](file:///var/www/html/tugasIn/config.php) dan catat timestamp `cron_last_run` di tabel `settings`.                   | [x]    |
| 5.4 | Endpoint API Status Cron    | Tambahkan action `get_cron_status`, `run_cron`, dan `setup_cron` di [api.php](file:///var/www/html/tugasIn/api.php).                                                            | [x]    |
| 5.5 | UI Status Cron di Settings  | Tampilkan kartu **Pengingat Otomatis Latar Belakang (Server Cron 24/7)** di halaman Pengaturan lengkap dengan badge live, status detak cron, dan tombol eksekusi manual.       | [x]    |

---

## TASK 6: Sinkronisasi Skema Database Hosting & Lokal (Zero Data Loss)

**Prioritas:** P0  
**Tujuan:** Menstandarkan skema database antara lokal dan shared hosting (cPanel/phpMyAdmin) secara 100% kompatibel tanpa merusak, menghapus, atau mengubah rekaman data tugas yang sudah ada.

| #   | Subtask                     | Detail                                                                                                                                                                          | Status |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6.1 | Refactor Script SQL Migrasi | Hapus ketergantungan `USE tugasin_db;`, `DELIMITER $$`, dan Stored Procedure pada [alter_schema.sql](file:///var/www/html/tugasIn/alter_schema.sql). Ganti dengan Dynamic SQL `PREPARE` murni berbasis `DATABASE()` yang kompatibel di semua versi MySQL/MariaDB & phpMyAdmin. | [x] |
| 6.2 | Preservasi Data (Zero Loss) | Buat pemetaan relasi data lama: seluruh variasi `status_id` legacy (`_todo`, `_prog`, `_rev`, `_done`) dipetakan ke 4 status global, normalisasi relasi invalid sebelum pemasangan foreign key baru. | [x] |
| 6.3 | Endpoint API `sync_schema`  | Tambahkan action `sync_schema` di [api.php](file:///var/www/html/tugasIn/api.php) yang dapat mengeksekusi migrasi skema via PDO backend secara instan.                        | [x]    |
| 6.4 | Tombol Sinkronisasi di UI   | Tambahkan box **Sinkronisasi Skema (.SQL)** di halaman Pengaturan web TugasIn lengkap dengan tombol **"Sinkronkan Skema Sekarang"** dan tautan unduh [alter_schema.sql](file:///var/www/html/tugasIn/alter_schema.sql). | [x]    |
| 6.5 | Validasi Eksekusi & Uji Coba| Uji eksekusi langsung via CLI dan Browser Subagent: script berhasil dieksekusi berkali-kali (idempotent) dengan 0 error dan seluruh catatan data tugas tetap utuh.           | [x]    |

