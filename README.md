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

## 🎛️ Panduan Form Control Premium (Form Controls Design System)

Seluruh form control utama (dropdown `<select>`, input teks, textarea, switch toggle, checkbox, dan multi-select tags) menggunakan token desain seragam dengan `Button` dan mendukung penuh Light Mode & Dark Mode.

### 1. Komponen `CustomSelect` (`js/form-controls.js`)
Komponen dropdown kustom berbasis WAI-ARIA combobox/listbox dengan portal floating panel:
- **Tinggi Kontrol**: `sm` (32px), `md` (40px, default), `lg` (48px).
- **Titik Warna (Color Dots)**: Otomatis mendeteksi token warna status (Belum Mulai, Sedang Dikerjakan, Butuh Review, Selesai) dan prioritas (Mendesak, Tinggi, Sedang, Rendah).
- **Lencana (Badges)**: Mendukung `data-badge` untuk kode mata kuliah (misal: `IF3101`).
- **Pencarian (Combobox)**: Mode `searchable: true` menyertakan kolom pencarian real-time dan pesan "Tidak ada hasil ditemukan".
- **Floating Portal**: Panel dirender ke `document.body` via portal sehingga tidak terpotong `overflow` modal dialog maupun kartu kanban.
- **Auto-placement**: Membalik posisi ke atas trigger jika ruang bawah viewport terbatas.
- **Mobile Bottom Sheet**: Di layar ponsel (`<= 640px`), otomatis bertransisi menjadi bottom sheet dari bawah layar dengan *drag handle* dan *dimmed backdrop*.
- **Aksesibilitas Keyboard**: Mendukung `Space`/`Enter` untuk buka/pilih, `ArrowUp`/`ArrowDown` navigasi, `Home`/`End`, `Escape` untuk tutup, dan *typeahead* cepat.

```javascript
// Contoh inisialisasi pada elemen native <select>
CustomSelect.enhance('#filter-priority', {
  size: 'sm',
  placeholder: 'Semua Prioritas',
  onChange: (val) => { console.log('Selected:', val); }
});

// Contoh combobox dengan pencarian
CustomSelect.enhance('#qa-course', {
  size: 'md',
  searchable: true,
  placeholder: 'Pilih Mata Kuliah'
});

// Sinkronisasi data dinamis setelah mengubah opsi
CustomSelect.syncAll();
```

### 2. Multi-Select Tags Input (`TagInput`)
Komponen pemilih tag dengan chip badge interaktif:
- Mengetik tag lalu menekan `Enter` atau `,` akan menambahkan chip.
- Menekan tombol `×` atau tombol `Backspace` saat input kosong akan menghapus tag.
- Sinkronisasi otomatis dua arah dengan string teks berpemisah koma.

```javascript
new TagInput('#edit-task-tags', {
  placeholder: 'Ketik tag lalu tekan Enter...'
});
```

### 3. Switch / Toggle (`.custom-switch`)
Pilihan biner aktif/nonaktif bergaya minimalis:
```html
<label class="custom-switch">
  <input type="checkbox" id="setting-tg-enabled">
  <span class="custom-switch-track"><span class="custom-switch-thumb"></span></span>
  <span class="custom-switch-label">Aktifkan pengiriman pengingat</span>
</label>
```

### 4. Custom Checkbox (`.custom-checkbox`)
Checkbox kustom dengan ikon centang SVG beranimasi halus:
```html
<label class="custom-checkbox">
  <input type="checkbox">
  <span class="custom-checkbox-box"><i class="fa-solid fa-check custom-checkbox-check"></i></span>
  <span>Label Opsi</span>
</label>
```

---

## 📋 Kanban Drag and Drop

Fitur Kanban telah dilengkapi dengan:
1. **Desktop HTML5 Drag & Drop**: Drag kartu antar kolom maupun reorder di dalam kolom yang sama.
2. **Mobile Touch Drag**: Deteksi sentuhan dengan threshold 8px dan floating ghost card.
3. **Empty Column Drop**: Kolom tanpa kartu dapat menerima drop secara langsung.
4. **Drop Indicator Line**: Garis visual indikator posisi kartu sebelum dilepas.
5. **Pencegahan Konflik Klik**: Menghindari terbukanya modal detail tugas secara tidak sengaja saat kartu dilepas setelah drag.
6. **Sinkronisasi MySQL**: Kolom `urutan` dan `status_id` diperbarui secara asinkron ke database `tugasin_db` via `api.php`.
