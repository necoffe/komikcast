## Base URL

```
https://komikaze-api.vercel.app/
```
*(Ganti dengan URL Vercel project Anda setelah deploy)*

## 📚 Endpoint API

### 1. Daftar Komik
Mengambil daftar komik dengan filter.
- **URL**: `GET /api/comics`
- **Query Params**:
  - `page` (number): Halaman ke berapa (default: 1)
  - `genres` (string): Filter genre, dipisahkan koma (ex: action,adventure)
  - `status` (string): Filter status (Ongoing, Completed)
  - `type` (string): Filter tipe (Manga, Manhwa, Manhua)
  - `orderby` (string): Urutkan berdasarkan (update, popular, title)
  - `source` (string): Sumber scraper (default: komikcast)

### 2. Detail Komik
Mengambil detail informasi komik berdasarkan slug.
- **URL**: `GET /api/comics/:slug`
- **Params**: `slug` (ex: one-piece)

### 3. Konten Chapter
Mengambil gambar-gambar chapter. **(Menggunakan Puppeteer)**
- **URL**: `GET /api/chapters/:seriesSlug/:chapterSlug`
- **Params**:
  - `seriesSlug`: Slug dari komik (ex: one-piece)
  - `chapterSlug`: Slug/Nomor chapter (ex: 1174)

### 4. Daftar Genre
Mengambil daftar semua genre yang tersedia.
- **URL**: `GET /api/genres`

### 5. Komik Berdasarkan Genre
Mengambil daftar komik spesifik untuk satu genre.
- **URL**: `GET /api/genres/:genre`
- **Params**: `genre` (ex: action)
- **Query Params**: `page` (number)

### 6. Manga Populer
Mengambil daftar manga populer saat ini.
- **URL**: `GET /api/popular-manga`

### 7. Pencarian (Search)
Mencari komik berdasarkan kata kunci.
- **URL**: `GET /api/search`
- **Query Params**: `query` (string, required)
