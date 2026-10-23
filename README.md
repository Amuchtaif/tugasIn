# TugasIn - Manajemen Tugas Kuliah & Proyek Pribadi

Aplikasi web manajemen tugas kuliah dan proyek pribadi ala Notion dengan hierarki Semester, Mata Kuliah, Kanban, Kalender, dan sinkronisasi basis data MySQL.

---

## 🎨 Panduan Desain & Sistem Tombol (Design System)

Untuk menjaga konsistensi tampilan antar halaman dan modal, semua tombol wajib mengikuti token dan aturan berikut.

### 1. Token Ukuran (Size Tokens)

| Token | Tinggi | Padding Horizontal | Ukuran Font | Border Radius | Kapan Digunakan |
|---|---|---|---|---|---|
| `sm` (`.btn-sm`) | 32 px | 10 px | 0.8125rem (13px) | 6 px (`--radius-sm`) | Di dalam baris tabel, kartu tugas, toast notifikasi, atau header kolom |
| `md` (`.btn` / `.btn-md`) | 40 px | 16 px | 0.875rem (14px) | 10 px (`--radius-md`) | Ukuran default untuk modal footer, toolbar, tombol form, dan aksi umum |
| `lg` (`.btn-lg`) | 48 px | 22 px | 0.9375rem (15px) | 10 px (`--radius-md`) | Aksi utama halaman/hero CTA (misal: tombol Onboarding) |

### 2. Tombol Ikon Persegi (Square Icon Buttons)

Untuk tombol yang hanya memuat simbol atau emoji tanpa label teks:
- `.btn-icon-sm` (atau `.btn-icon.btn-sm`): **32 x 32 px**
- `.btn-icon` (atau `.btn-icon.btn-md`): **40 x 40 px**
- `.btn-icon-lg` (atau `.btn-icon.btn-lg`): **48 x 48 px**

### 3. Varian Gaya (Variants)

- `.btn-primary`: Aksen Cobalt (`#2C5EF5`), teks putih, shadow halus. Digunakan maksimal satu aksi primer per tampilan.
- `.btn-secondary`: Latar surface putih/elevated dengan border netral (`#CBD5E1`). Digunakan untuk tombol Batal, Tutup, dan aksi pendukung.
- `.btn-ghost`: Transparan tanpa border, berubah latar saat di-hover. Digunakan untuk ikon aksi (edit, hapus di tabel/sidebar).
- `.btn-danger`: Latar merah lembut dengan teks dan border merah (`#DC2626`). Digunakan khusus aksi destruktif (Hapus, Kosongkan Sampah).

### 4. Helper Komponen JS (`window.Button`)

Tersedia fungsi pembantu di `js/button.js` untuk membuat tombol terstandar secara dinamis:

```javascript
// Menghasilkan string HTML
const html = Button({
  text: 'Simpan Task',
  variant: 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  size: 'md',         // 'sm' | 'md' | 'lg'
  icon: '💾',
  onClick: 'window.app.saveTask()'
});

// Menghasilkan elemen DOM langsung
const el = Button.createElement({
  icon: '✕',
  variant: 'ghost',
  size: 'sm',
  isIconOnly: true,
  onClick: () => closeModal()
});
```

### 5. Aturan Mobile & Aksesibilitas
Pada viewport ponsel (`max-width: 900px`), tinggi tombol secara otomatis ditingkatkan menjadi minimal 36–42 px agar memenuhi standar sentuhan jari (touch target size minimal 40–44 px).

---

## 📋 Kanban Drag and Drop

Fitur Kanban telah dilengkapi dengan:
1. **Desktop HTML5 Drag & Drop**: Drag kartu antar kolom maupun reorder di dalam kolom yang sama.
2. **Mobile Touch Drag**: Deteksi sentuhan dengan threshold 8px dan floating ghost card.
3. **Empty Column Drop**: Kolom tanpa kartu dapat menerima drop secara langsung.
4. **Drop Indicator Line**: Garis visual indikator posisi kartu sebelum dilepas.
5. **Pencegahan Konflik Klik**: Menghindari terbukanya modal detail tugas secara tidak sengaja saat kartu dilepas setelah drag.
6. **Sinkronisasi MySQL**: Kolom `urutan` dan `status_id` diperbarui secara asinkron ke database `tugasin_db` via `api.php`.
