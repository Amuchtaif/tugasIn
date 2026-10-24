# Task Fitur: Form Control Premium (Dropdown Select dan Lainnya)

_Dibuat 24 Oktober 2026 · Aplikasi: TugasIn_

## Ringkasan

Saat ini form control, terutama `<select>` dan `<option>`, masih memakai tampilan bawaan browser. Tujuannya mengganti dengan komponen kustom bergaya **premium**, memiliki **animasi halus**, konsisten di semua browser dan perangkat, serta tetap **aksesibel** (keyboard dan pembaca layar).

> Catatan teknis: daftar `<option>` bawaan browser tidak bisa di-style dan dianimasikan secara penuh dengan CSS. Karena itu dropdown perlu dibuat sebagai komponen kustom (listbox/combobox), bukan sekadar mengubah CSS `<select>`.

## Sasaran

- Dropdown tampil dan terasa premium: rapi, modern, dengan animasi buka-tutup yang halus.
- Gaya seragam dengan komponen `Button` dan token desain aplikasi.
- Berfungsi penuh dengan mouse, keyboard, dan sentuhan.
- Mendukung mode terang dan gelap.

## Keputusan yang Sudah Ditetapkan

- Gaya: **minimalis** (bersih, banyak ruang kosong, warna netral, bayangan tipis, tanpa efek kaca atau gradien mencolok).
- Di ponsel: dropdown tampil sebagai **bottom sheet**.
- Animasi opsi muncul bergantian (**stagger**) dipakai.
- Date picker dan time picker **tidak termasuk** tahap ini; dikerjakan sebagai task terpisah.

## Usulan Spesifikasi Desain (Bisa Diubah)

| Aspek                  | Usulan                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pemicu (trigger)       | Tinggi mengikuti ukuran `Button` (`sm` 32 px, `md` 40 px, `lg` 48 px), sudut membulat, border tipis, ikon chevron di kanan |
| Panel opsi             | Muncul di bawah trigger (atau di atas bila ruang tidak cukup), sudut membulat, bayangan lembut, latar sesuai tema          |
| Animasi buka           | Fade-in + skala dari 0,96 ke 1 + geser 4 px, durasi sekitar 150–200 ms, easing _ease-out_                                  |
| Animasi opsi (stagger) | Opsi muncul bergantian dengan jeda sekitar 15–25 ms per opsi, dibatasi pada beberapa opsi pertama agar tidak terasa lambat |
| Animasi tutup          | Kebalikan buka, lebih cepat (sekitar 120 ms)                                                                               |
| Ikon chevron           | Berputar 180° saat terbuka                                                                                                 |
| Opsi                   | Hover dan fokus dengan highlight halus, opsi terpilih diberi centang dan latar berbeda                                     |
| Gerak berkurang        | Matikan animasi atau sederhanakan saat `prefers-reduced-motion` aktif                                                      |
| Fokus                  | Cincin fokus (_focus ring_) yang jelas dan seragam                                                                         |

---

## TASK 1: Audit dan Desain Token

**Prioritas:** P1

| #   | Subtask            | Detail                                                                                                                                                                         | Status |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1.1 | Audit form control | Daftar semua `<select>`, input, textarea, checkbox, radio, dan input tanggal/jam yang dipakai di aplikasi (status, prioritas, mata kuliah, semester, tag, jam pengingat, dsb.) | [x]    |
| 1.2 | Token desain       | Tetapkan token warna, radius, border, bayangan, tinggi kontrol, jarak, ukuran font, durasi dan easing animasi untuk mode terang dan gelap                                      | [x]    |
| 1.3 | Keadaan komponen   | Rancang tampilan: normal, hover, fokus, terbuka, terisi, error, nonaktif, dan _loading_                                                                                        | [x]    |
| 1.4 | Rancangan visual   | Buat sketsa atau prototipe cepat (Figma atau HTML) untuk disetujui sebelum implementasi massal                                                                                 | [x]    |

**Kriteria selesai:**

- [x] Ada daftar lengkap form control yang akan diganti.
- [x] Token desain terdokumentasi dan dipakai bersama dengan komponen `Button`.

---

## TASK 2: Komponen Dropdown Select Kustom

**Prioritas:** P0

| #    | Subtask             | Detail                                                                                                                                                                   | Status |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 2.1  | Pilih fondasi       | Gunakan pustaka _headless_ yang sudah aksesibel (misalnya Radix UI Select, Headless UI Listbox, atau shadcn/ui Select) lalu beri gaya sendiri, daripada membuat dari nol | [x]    |
| 2.2  | Komponen `Select`   | Props: `value`, `onChange`, `options`, `placeholder`, `size`, `disabled`, `error`, `label`, `clearable`                                                                  | [x]    |
| 2.3  | Panel melayang      | Render lewat _portal_ agar tidak terpotong `overflow` induk dan tampil benar di dalam modal atau panel detail task                                                       | [x]    |
| 2.4  | Penempatan otomatis | Panel menyesuaikan posisi (atas/bawah) dan lebar sesuai ruang layar serta lebar trigger                                                                                  | [x]    |
| 2.5  | Animasi buka-tutup  | Terapkan animasi sesuai spesifikasi (CSS transition atau Framer Motion), termasuk rotasi chevron                                                                         | [x]    |
| 2.6  | Gaya opsi           | Highlight hover, penanda terpilih (centang animasi), dan dukungan ikon atau titik warna per opsi                                                                         | [x]    |
| 2.7  | Opsi berwarna       | Untuk status, prioritas, dan mata kuliah tampilkan titik atau lencana warna yang sama dengan warna di kanban dan kalender                                                | [x]    |
| 2.8  | Daftar panjang      | Tinggi panel dibatasi, scroll halus, dan opsi terpilih terlihat saat panel dibuka                                                                                        | [x]    |
| 2.9  | Pencarian           | Varian _combobox_ dengan kolom cari untuk daftar panjang (misalnya mata kuliah atau tag)                                                                                 | [x]    |
| 2.10 | Keadaan kosong      | Pesan "Tidak ada hasil" yang rapi saat pencarian tidak menemukan apa pun                                                                                                 | [x]    |
| 2.11 | Animasi stagger     | Opsi muncul bergantian saat panel dibuka dengan jeda kecil per opsi, dibatasi pada beberapa opsi pertama, dan dimatikan saat `prefers-reduced-motion` aktif              | [x]    |

**Kriteria selesai:**

- [x] Tidak ada lagi tampilan `<select>` bawaan browser pada fitur utama.
- [x] Panel tidak terpotong di dalam modal, panel detail, atau kolom kanban.
- [x] Animasi halus dan tidak tersendat di perangkat menengah.

---

## TASK 3: Aksesibilitas dan Interaksi

**Prioritas:** P0

| #   | Subtask         | Detail                                                                                                                                                                           | Status |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 3.1 | Keyboard        | `Enter`/`Spasi` membuka, panah atas/bawah berpindah opsi, `Home`/`End` ke awal/akhir, `Esc` menutup, `Tab` berpindah fokus, dan ketik huruf untuk melompat ke opsi (_typeahead_) | [x]    |
| 3.2 | Peran ARIA      | Atribut yang sesuai (`role="listbox"`, `aria-expanded`, `aria-selected`, `aria-activedescendant`) dan label yang terhubung                                                       | [x]    |
| 3.3 | Fokus           | Fokus kembali ke trigger setelah memilih atau menutup, dan cincin fokus tampak jelas                                                                                             | [x]    |
| 3.4 | Tutup di luar   | Klik di luar panel menutup panel tanpa mengubah nilai                                                                                                                            | [x]    |
| 3.5 | Gerak berkurang | Hormati `prefers-reduced-motion`                                                                                                                                                 | [x]    |
| 3.6 | Kontras         | Pastikan rasio kontras teks dan elemen penting memadai di mode terang dan gelap                                                                                                  | [x]    |

**Kriteria selesai:**

- [x] Seluruh interaksi dapat dilakukan hanya dengan keyboard.
- [x] Pembaca layar membacakan label, nilai terpilih, dan status buka/tutup dengan benar.

---

## TASK 4: Perilaku di Ponsel

**Prioritas:** P1

| #   | Subtask       | Detail                                                                                                                                                                                                                                          | Status |
| --- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4.1 | Target sentuh | Tinggi trigger dan opsi minimal sekitar 40–44 px                                                                                                                                                                                                | [x]    |
| 4.2 | Bottom sheet  | Di layar kecil daftar opsi tampil sebagai _bottom sheet_ (panel naik dari bawah) dengan latar redup dan pegangan di bagian atas; tutup lewat geser ke bawah, ketuk latar, atau `Esc`; animasi geser halus dan tinggi maksimal sekitar 70% layar | [x]    |
| 4.3 | Papan ketik   | Pastikan panel dan kolom cari tidak tertutup papan ketik virtual                                                                                                                                                                                | [x]    |
| 4.4 | Gulir         | Scroll di dalam panel tidak ikut menggulir halaman di belakangnya                                                                                                                                                                               | [x]    |

**Kriteria selesai:**

- [x] Dropdown nyaman dipakai dengan satu tangan di ponsel.
- [x] Tidak ada panel yang terpotong atau tertutup papan ketik.

---

## TASK 5: Form Control Lainnya

**Prioritas:** P1

| #   | Subtask                     | Detail                                                                                       | Status |
| --- | --------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| 5.1 | Input teks dan textarea     | Gaya seragam: label, placeholder, fokus beranimasi halus, pesan error                        | [x]    |
| 5.2 | Checkbox dan radio          | Kustom dengan animasi centang dan transisi warna                                             | [x]    |
| 5.3 | Switch (toggle)             | Untuk opsi aktif/nonaktif, misalnya pengaturan pengingat                                     | [x]    |
| 5.4 | ~~Pemilih tanggal dan jam~~ | Ditunda: date picker dan time picker dikerjakan sebagai task terpisah (keputusan ditetapkan) | —      |
| 5.5 | Multi-pilih                 | Pemilih banyak opsi (tag) dengan chip yang bisa dihapus                                      | [x]    |
| 5.6 | Pesan validasi              | Pesan error di bawah kontrol dengan animasi masuk yang halus dan teks Bahasa Indonesia       | [x]    |

**Kriteria selesai:**

- [x] Semua form control utama memiliki gaya, ukuran, dan animasi yang seragam.
- [x] Date picker dan time picker tidak termasuk tahap ini (dikerjakan terpisah).

---

## TASK 6: Migrasi dan Pengujian

**Prioritas:** P1

| #   | Subtask            | Detail                                                                                                                       | Status |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6.1 | Migrasi bertahap   | Ganti `<select>` di: form task (status, prioritas, mata kuliah), pengaturan pengingat, filter, dan form semester/mata kuliah | [x]    |
| 6.2 | Cek di dalam modal | Pastikan dropdown berfungsi di dalam modal preview gambar, panel detail task, dan form lain yang berupa modal                | [x]    |
| 6.3 | Uji lintas browser | Chrome, Firefox, Safari, dan ponsel (iOS dan Android)                                                                        | [x]    |
| 6.4 | Uji performa       | Pastikan animasi mulus dan tidak membuat halaman kanban lambat                                                               | [x]    |
| 6.5 | Dokumentasi        | Catat cara memakai komponen dan aturan gaya di README, serta wajibkan komponen baru memakai komponen ini                     | [x]    |

**Kriteria selesai:**

- [x] Tidak ada `<select>` bawaan yang tersisa pada halaman utama.
- [x] Lolos uji keyboard, sentuh, dan lintas browser.
