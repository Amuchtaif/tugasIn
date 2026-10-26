---
version: 2.0
name: TugasIn Unified Design System
description: Comprehensive design guidelines merging Glassline (Light Mode) and Graphite (Dark Mode) themes.
themes:
  light:
    name: Glassline (Default)
    description: Fog-grey neutrals with a sharp cobalt pinprick. Flat, calm, and distraction-free.
    colors:
      primary: "#0F1419"
      secondary: "#4A5568"
      tertiary: "#2C5EF5"
      tertiary-hover: "#1D4ED8"
      neutral: "#F1F3F5"
      surface: "#FFFFFF"
      surface-elevated: "#F8F9FA"
      border: "#CBD5E1"
      border-subtle: "#E2E8F0"
      on-primary: "#FFFFFF"
  dark:
    name: Graphite (Alternative)
    description: Engineering-grade cool dark greys with an electric lime action signal.
    colors:
      primary: "#ECEDEE"
      secondary: "#9CA3AF"
      tertiary: "#B4FF39"
      tertiary-hover: "#C4FF55"
      neutral: "#0E1013"
      surface: "#17191C"
      surface-elevated: "#1D2024"
      border: "#242930"
      border-subtle: "#1A1E24"
      on-primary: "#0E1013"
typography:
  primaryFont: "Geist, -apple-system, BlinkMacSystemFont, sans-serif"
  monoFont: "Geist Mono, JetBrains Mono, monospace"
  scale:
    display:
      fontSize: 3.75rem
      fontWeight: 600
      letterSpacing: "-0.03em"
      lineHeight: 1.15
    h1:
      fontSize: 2.25rem
      fontWeight: 600
      letterSpacing: "-0.02em"
      lineHeight: 1.25
    h2:
      fontSize: 1.5rem
      fontWeight: 600
      letterSpacing: "-0.015em"
      lineHeight: 1.3
    h3:
      fontSize: 1.15rem
      fontWeight: 600
      letterSpacing: "-0.01em"
      lineHeight: 1.35
    body:
      fontSize: 0.95rem
      fontWeight: 400
      lineHeight: 1.55
    small:
      fontSize: 0.825rem
      fontWeight: 400
      lineHeight: 1.45
    label:
      fontSize: 0.75rem
      fontFamily: "{typography.monoFont}"
      letterSpacing: "0.02em"
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{theme.tertiary}"
    textColor: "{theme.on-primary}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    fontWeight: 600
  card:
    backgroundColor: "{theme.surface}"
    textColor: "{theme.primary}"
    border: "1px solid {theme.border}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  select-premium:
    sizes:
      sm:
        height: "32px"
        fontSize: "0.8125rem"
        padding: "0 10px"
        rounded: "{rounded.sm}"
      md:
        height: "40px"
        fontSize: "0.875rem"
        padding: "0 14px"
        rounded: "{rounded.md}"
      lg:
        height: "48px"
        fontSize: "0.9375rem"
        padding: "0 18px"
        rounded: "{rounded.md}"
    trigger:
      backgroundColor: "var(--control-bg)"
      borderColor: "var(--control-border)"
      focusRing: "0 0 0 3px rgba(44, 94, 245, 0.15) / rgba(180, 255, 57, 0.2)"
    dropdownPanel:
      type: "Portal Floating Panel (document.body)"
      backgroundColor: "var(--color-surface)"
      borderColor: "var(--color-border)"
      rounded: "{rounded.md}"
      boxShadow: "0 10px 30px rgba(0,0,0,0.12) / 0 16px 36px rgba(0,0,0,0.5)"
      staggerAnimation: "selectItemStagger 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
    mobileBottomSheet:
      breakpoint: "<= 640px"
      type: "Slide-up Sheet with Drag Handle"
      backdropBlur: "4px"
    features:
      - "Color Dots Indicator (Status Kanban & Prioritas)"
      - "Course Code Badge Support (Monospace)"
      - "Searchable Combobox Real-time"
      - "Full WAI-ARIA Keyboard Navigation"
---

# TugasIn Unified Design System

Dokumen ini merupakan panduan desain terpadu (*Unified Design System*) untuk aplikasi **TugasIn**, yang menggabungkan filosofi dan spesifikasi desain dari tema **Glassline (Light Mode)** dan **Graphite (Dark Mode)**.

---

## 1. Filosofi & Karakter Desain

1. **High-Contrast, Distraction-Free:**
   Antarmuka berfokus pada efisiensi tugas akademik dan proyek. Elemen dekoratif yang tidak perlu dihilangkan agar perhatian pengguna tertuju pada hierarki tugas, jadwal, dan tenggat waktu.
2. **Aturan Aksen Tunggal (*Single-Accent Rule*):**
   Setiap mode tampilan hanya memiliki **satu warna pendorong aksi primer** (*Tertiary*).
   - Mode Terang (*Glassline*): Menggunakan **Cobalt Blue (`#2C5EF5`)**.
   - Mode Gelap (*Graphite*): Menggunakan **Electric Lime (`#B4FF39`)**.
   Warna aksen ini sangat eksklusif dan hanya digunakan pada tombol aksi primer (*CTA*), status aktif (*active state*), dan indikator fokus (*focus ring*).
3. **Flat on Purpose, Zero Gradients:**
   Desain sengaja datar (*flat*), mengandalkan kontras warna netral, tipografi presisi, dan garis batas (*borders*) tipis 1px, bukan gradien tebal atau efek kaca buram yang mengaburkan teks.
4. **Ruang Kosong (*Negative Space*) adalah Fitur:**
   Warna *Neutral* bertindak sebagai fondasi kanvas lapang yang memberikan ruang bernapas pada kartu konten (*Surface*).

---

## 2. Palet Warna (Color Palette Matrix)

Aplikasi TugasIn mendukung transisi instan antara **Light Mode** dan **Dark Mode** melalui atribut `data-theme`.

| Token Desain | Peran Visual | Mode Terang (*Glassline*) | Mode Gelap (*Graphite*) |
| :--- | :--- | :--- | :--- |
| `--color-neutral` | Fondasi kanvas halaman | `#F1F3F5` (Fog-grey) | `#0E1013` (Deep Obsidian) |
| `--color-surface` | Kartu utama, panel, dropdown | `#FFFFFF` (Pure White) | `#17191C` (Carbon Surface) |
| `--color-surface-elevated` | Header kartu, hover state, row genap | `#F8F9FA` | `#1D2024` |
| `--color-surface-hover` | Efek hover tombol sekunder / baris | `#E9ECEF` | `#24282E` |
| `--color-border` | Border kartu, dropdown, pemisah | `#CBD5E1` (Slate Border) | `#242930` (Charcoal Border) |
| `--color-border-subtle` | Garis pemisah internal halus | `#E2E8F0` | `#1A1E24` |
| `--color-border-focus` | Border saat fokus / kolom kanban drag | `#2C5EF5` (Cobalt) | `#3E4552` / `#B4FF39` |
| `--color-primary` | Judul teks, headline, teks utama | `#0F1419` (High-contrast) | `#ECEDEE` (Crisp White) |
| `--color-secondary` | Metadata, deskripsi, caption | `#4A5568` | `#9CA3AF` |
| `--color-muted` | Label nonaktif, placeholder teks | `#718096` | `#656C76` |
| `--color-tertiary` | **Aksen Aksi Primer (CTA)** | **`#2C5EF5` (Cobalt)** | **`#B4FF39` (Electric Lime)** |
| `--color-tertiary-hover` | Hover pada aksi primer | `#1D4ED8` | `#C4FF55` |
| `--color-on-primary` | Warna teks di atas aksi primer | `#FFFFFF` | `#0E1013` |

### Warna Semantik & Prioritas Tugas (Alerts & Badges)

| Kategori | Token | Mode Terang (*Light*) | Mode Gelap (*Dark*) |
| :--- | :--- | :--- | :--- |
| **Mendesak** | `--color-danger` | `#DC2626` (Bg: `#FEF2F2`) | `#E05252` (Bg: `#261616`) |
| **Prioritas Tinggi** | `--priority-tinggi` | `#EA580C` (Bg: `#FFF7ED`) | `#FB923C` (Bg: `#231610`) |
| **Prioritas Sedang** | `--color-info` | `#2563EB` (Bg: `#EFF6FF`) | `#38BDF8` (Bg: `#132337`) |
| **Prioritas Rendah** | `--color-secondary` | `#64748B` (Bg: `#F1F5F9`) | `#9CA3AF` (Bg: `#1E242B`) |
| **Selesai / Success** | `--color-success` | `#16A34A` (Bg: `#F0FDF4`) | `#10B981` (Bg: `#142921`) |

---

## 3. Tipografi (Typography System)

Menggunakan keluarga font modern **Geist** dari Vercel sebagai standar utama, didukung fallback **Inter** dan **Geist Mono / JetBrains Mono** untuk data teknis, waktu, dan label.

- **Keluarga Font Teks & Heading:** `'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- **Keluarga Font Data & Monospace:** `'Geist Mono', 'JetBrains Mono', monospace`

### Skala Ukuran Font

| Tingkat | Ukuran Font | Weight | Line Height | Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `3.75rem` (60px) | 600 | 1.15 | Hero landing / angka ringkasan besar |
| **H1** | `2.25rem` (36px) | 600 | 1.25 | Judul halaman utama |
| **H2** | `1.50rem` (24px) | 600 | 1.30 | Judul bagian / modal header |
| **H3 / Card Title** | `1.05rem` – `1.15rem` | 600 / 700 | 1.35 | Judul mata kuliah, proyek, kelompok kanban |
| **Body (Normal)** | `0.95rem` (15.2px) | 400 / 500 | 1.55 | Teks deskripsi tugas, paragraf |
| **Body Small** | `0.825rem` – `0.875rem` | 400 / 500 | 1.45 | Teks tabel, opsi dropdown, tombol sedang |
| **Mono Label** | `0.72rem` – `0.75rem` | 500 / 600 | 1.00 | Badge SKS, tanggal, jam, tag kode mata kuliah |

---

## 4. Geometri, Sudut Lengkung (*Radius*) & Spasi (*Spacing*)

### Sudut Lengkung (*Corner Radii*)
- **`--radius-sm` (6px):** Badge kecil, chip kalender, indikator status, tombol ikon mikro.
- **`--radius-md` (10px):** Tombol standar, dropdown trigger, input teks, kartu tugas (*task card*).
- **`--radius-lg` (16px):** Kartu kontainer utama (*card*), kolom kanban (*kanban column*), grup tabel (*list-group*), panel modal.
- **`--radius-full` (9999px):** Tombol bulat, pill counter, switch toggle, avatar.

### Skala Spasi (*Spacing Scale*)
- `--space-xs`: `4px`
- `--space-sm`: `8px`
- `--space-md`: `16px`
- `--space-lg`: `24px`
- `--space-xl`: `32px`

---

## 5. Komponen Inti (Core Components)

### 1. Tombol (*Buttons*)
- **Primary Button (`.btn-primary`):** Latar belakang aksen tunggal (`--color-tertiary`), teks `--color-on-primary`, sudut `10px`, padding vertikal seimbang. Hanya satu aksi primer per pandangan layar utama.
- **Secondary Button (`.btn-secondary`):** Latar belakang netral (`--color-surface-elevated`), border tipis `--color-border`, teks `--color-primary`.
- **Icon Button (`.btn-icon`):** Ukuran persegi seragam: `36×36px` untuk mobile topbar, `32×32px` untuk aksi baris tugas.

### 2. Kartu Kontainer & Header Kelompok
- Seluruh kartu pembungkus kelompok status (*Kanban Column* maupun *List Group*) wajib memiliki:
  - `border-radius: var(--radius-lg);` (16px)
  - `overflow: hidden;`
  - *Header* status memiliki `border-top-left-radius` dan `border-top-right-radius` yang melengkung sempurna agar tidak menghasilkan sudut persegi tajam.

### 3. Banner Konteks Mata Kuliah & Proyek (`.context-banner-card`)
- **Layar Desktop (> 768px):** Tata letak horizontal; info mata kuliah di kiri dan tombol aksi di kanan.
- **Layar Mobile (≤ 768px):** Bertransformasi otomatis menjadi susunan **vertikal**:
  - Bagian atas: Ikon mata kuliah (40px) + Badge Kode + Judul + Info Dosen & SKS.
  - Garis pembatas tipis 1px.
  - Bagian bawah: Dua tombol aksi (`[Edit]` dan `[+ Tambah]`) berdampingan dengan lebar simetris 50% / 50% (`flex: 1 1 0`).

### 4. Select Option Premium (`CustomSelect` Component)

Aplikasi TugasIn menggantikan elemen `<select>` bawaan browser dengan komponen **`CustomSelect`** berbasis WAI-ARIA yang dirancang khusus untuk pengalaman interaksi tingkat tinggi (*premium micro-interactions*).

#### A. Tiga Tingkat Ukuran Standar (*Control Sizes*)
| Ukuran | Tinggi Kontrol | Ukuran Font | Padding | Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Small (`sm`)** | `32px` | `0.8125rem` (13px) | `0 10px` | Strip toolbar filter halaman, bar filter jadwal |
| **Medium (`md`)** | `40px` (Default) | `0.875rem` (14px) | `0 14px` | Form modal tugas, mata kuliah, dan dialog |
| **Large (`lg`)** | `48px` | `0.9375rem` (15px) | `0 18px` | Input form fokus tinggi / headline filter |

#### B. Anatomi Visual Kontrol (*Trigger Button*)
- **Background & Border:** Menggunakan `--control-bg` dengan batas 1px `--control-border`. Saat hover bertransisi halus ke `--control-border-hover`.
- **Indikator Titik Warna (*Color Dots*):** Otomatis mendeteksi token warna status kanban (`--status-todo`, `--status-doing`, `--status-review`, `--status-done`) dan prioritas (`--priority-tinggi`, `--color-danger`, `--color-info`, dll) dalam lingkaran 8px.
- **Lencana Kode (*Monospace Badge*):** Mendukung badge kode mata kuliah (misal: `IF3101`) dengan font `Geist Mono` pada label opsi.
- **Tombol Clear Cepat (`×`):** Muncul saat ada nilai terpilih untuk mereset pilihan dengan satu klik tanpa perlu membuka dropdown.
- **Chevron Animasi:** Ikon panah yang berputar mulus `180deg` dengan kurva bezier presisi (`cubic-bezier(0.16, 1, 0.3, 1)`) saat status terbuka (`.is-open`).
- **Focus Ring:** Efek ring fokus halus tanpa outline kasar browser (`box-shadow: var(--control-ring)`).

#### C. Portal Panel Melayang Desktop (*Desktop Floating Portal*)
- **Render via Portal `document.body`:** Panel dropdown dirender langsung ke elemen root `body` sehingga **tidak akan pernah terpotong** oleh `overflow: hidden` pada modal dialog maupun kartu kanban.
- **Auto-Placement / Flip Detection:** Secara otomatis mendeteksi sisa ruang viewport vertikal. Jika ruang di bawah sempit, panel otomatis melayang ke atas trigger (`placement-top`).
- **Mikro-Animasi Stagger:** Panel muncul dengan transisi *scale(0.96) → scale(1)* dan *fade-in*. Setiap baris opsi dianimasikan secara berurutan (*stagger animation delay* 16ms per opsi) untuk kesan fluida dan responsif.
- **Checkmark Indikator:** Opsi yang sedang aktif menampilkan tanda centang (`fa-check`) di sisi kanan.

#### D. Transformasi Mobile Bottom Sheet (`<= 640px`)
- Pada layar smartphone (lebar viewport `≤ 640px`), dropdown **secara otomatis bertransformasi menjadi Bottom Sheet** dari tepi bawah layar.
- **Drag Handle:** Dilengkapi pegangan geser (*drag handle*) di bagian atas sheet untuk gestur usap ke bawah (*swipe-to-dismiss*).
- **Backdrop Blur:** Latar belakang halaman diredupkan dengan efek *backdrop-filter: blur(4px)*, memfokuskan perhatian pengguna pada pilihan.
- **Aksesibilitas Satu Tangan:** Area opsi diperlebar dengan target sentuh (*touch target*) minimal 44px, sangat ergonomis untuk jangkauan jempol.

#### E. Mode Combobox & Pencarian Real-Time (`searchable: true`)
- Menyediakan kolom input pencarian instan dengan ikon *magnifying glass*.
- Menyaring daftar opsi secara *real-time* berdasarkan label maupun teks badge.
- Dilengkapi tampilan status kosong (*empty state*) `"Tidak ada hasil ditemukan"` jika kata kunci tidak cocok.

#### F. Aksesibilitas Keyboard WAI-ARIA
- **Peran Semantik:** Menerapkan `role="combobox"`, `aria-expanded`, `role="listbox"`, dan `role="option"`.
- **Navigasi Tombol:**
  - `Space` / `Enter`: Membuka panel atau memilih opsi yang disorot.
  - `ArrowDown` / `ArrowUp`: Menavigasi opsi ke bawah / ke atas.
  - `Home` / `End`: Lompat langsung ke opsi pertama / terakhir.
  - `Escape`: Menutup panel dan mengembalikan fokus ke trigger.
  - *Typeahead*: Mengetik huruf pertama untuk melompat langsung ke opsi terkait.

---

## 6. Aturan Praktis (Do's and Don'ts)

### ✅ Do's (Hal yang Harus Dilakukan)
1. **Gunakan warna Tertiary untuk tepat satu aksi utama per layar.** Jangan membuat banyak tombol primer yang saling berebut perhatian.
2. **Biarkan warna Neutral bernapas.** Ruang kosong di sekitar kartu tugas meningkatkan keterbacaan (*readability*).
3. **Pastikan teks kontras tinggi.** Teks penting selalu memakai `--color-primary` baik di mode terang maupun mode gelap.
4. **Jaga sudut melengkung tetap utuh.** Semua kontainer bertingkat wajib menerapkan `overflow: hidden` dan border radius atas pada elemen header anak.
5. **Dukung navigasi satu tangan di mobile.** Target sentuh tombol minimal 36–44px dan form penting dapat diakses via sheet bawah.

### ❌ Don'ts (Hal yang Dilarang)
1. **Jangan gunakan gradien warna mencolok pada tombol atau latar belakang.** Sistem ini sengaja dirancang *flat & subtle*.
2. **Jangan mencampur warna aksen primer.** Di mode terang aksen adalah **Cobalt (`#2C5EF5`)**, di mode gelap aksen adalah **Electric Lime (`#B4FF39`)**. Jangan menggabungkan keduanya di satu tema.
3. **Jangan biarkan teks melebihi (*overflow*) batas kartu.** Selalu pasang `min-width: 0; overflow: hidden; text-overflow: ellipsis;` pada teks judul dan deskripsi ringkas.
4. **Jangan gunakan `<select>` bawaan browser mentah.** Selalu gunakan komponen kustom `CustomSelect` agar seragam dengan token tema dan mendukung bottom sheet di smartphone.
