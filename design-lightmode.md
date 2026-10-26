---
version: 2.0
name: Glassline (Light Mode) - TugasIn Unified Design System
description: Light Mode design guideline for TugasIn, merged and fully documented in design.md.
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
typography:
  primaryFont: "Geist, -apple-system, BlinkMacSystemFont, sans-serif"
  monoFont: "Geist Mono, JetBrains Mono, monospace"
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
  select-premium:
    component: "CustomSelect"
    portal: true
    mobileBottomSheet: true
    sizes: ["sm (32px)", "md (40px)", "lg (48px)"]
    features: ["Color Dots", "Badge IF3101", "Searchable Combobox", "WAI-ARIA"]
---

# Glassline (Light Mode) Design Guideline

> [!NOTE]
> Panduan desain ini telah digabungkan secara lengkap dan tersinkronisasi bersama mode gelap (*Graphite*) ke dalam file utama:
> 📄 **[design.md](file:///d:/xampp/htdocs/tugasIn/design.md)** (TugasIn Unified Design System).

---

## Ringkasan Mode Terang (*Glassline*)

Palet warna *cool & quiet* berfondasi netral kabut (*fog-grey* `#F1F3F5`) dengan satu aksen penentu aksi yaitu **Cobalt Blue (`#2C5EF5`)**.

### Palet Warna Inti:
- **Primary (`#0F1419`):** Judul utama dan teks esensial (kontras tinggi).
- **Secondary (`#4A5568`):** Subtitle, metadata, border kartu, dan caption.
- **Tertiary (`#2C5EF5`):** Satu-satunya pendorong aksi interaksi (CTA). Digunakan hemat dan eksklusif.
- **Neutral (`#F1F3F5`):** Kanvas dan latar belakang halaman.
- **Surface (`#FFFFFF`):** Latar kartu konten dan panel form.
- **Surface Elevated (`#F8F9FA`):** Header kolom status, hover baris, modal bar.

### Komponen Select Option Premium (`CustomSelect`):
- Terintegrasi penuh dengan token Glassline (`--control-bg`, `--control-border`, ring fokus Cobalt).
- Portal floating panel di desktop dan otomatis bertransformasi menjadi **Mobile Bottom Sheet** (≤ 640px) dengan pegangan geser (*drag handle*) & *backdrop blur*.
- Dilengkapi indikator titik warna (*Color Dots*), lencana kode mata kuliah (*Monospace Badge*), serta pencarian combobox real-time.

### Aturan Utama:
1. **Satu Aksi Primer per Layar:** Tombol Cobalt hanya untuk tindakan utama.
2. **Tanpa Gradien:** Desain sengaja datar (*flat on purpose*).
3. **Detail Lengkap:** Silakan merujuk ke **[design.md](file:///d:/xampp/htdocs/tugasIn/design.md)** untuk matriks perbandingan lengkap dengan mode gelap, skala spasi, dan spesifikasi komponen mobile/desktop.
