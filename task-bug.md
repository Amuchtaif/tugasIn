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
