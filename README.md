## Base URL

```
https://komik-api-production.up.railway.app/
```

## Endpoint

### 1. Mendapatkan Daftar Komik

- **method**: GET
- **Endpoint**: `/comics`
- **Deskripsi**: Mengambil daftar komik dengan filter opsional.
- **Path Parameters**:
  - `source` (string, opsional): Situs sumber (default: `komikcast`).
  - `page` (integer, opsional): Nomor halaman (default: `1`).
  - `genres` (string, opsional): Daftar genre yang dipisahkan koma (contoh: `action,adventure`).
  - `status` (string, opsional): Status komik (contoh: `ongoing`, `completed`).
  - `type` (string, opsional): Tipe komik (contoh: `manga`, `manhwa`).
  - `orderby` (string, opsional): Urutan sortir (contoh: `update`, `popular`; default: `update`).
- **Contoh Request**:

  ```
  GET /api/comics?source=komikcast&page=2&genres=action,adventure&status=ongoing
  ```
- **Contoh Respons**:

  ```json
  [
    {
      "comicId": "naruto",
      "title": "Naruto",
      "link": "https://v1.komikcast.fit/komik/naruto/",
      "image": "https://v1.komikcast.fit/naruto.jpg",
      "type": "manga",
      "chapter": "Chapter 700",
      "rating": "9.5",
      "status": "completed"
    },
    // Komik lainnya...
  ]
  ```
- **Respons Error**:

  ```json
  {
    "error": "Gagal mengambil daftar komik"
  }
  ```

### 2. Mendapatkan Detail Komik

- **method**: GET
- **Endpoint**: `/comics/:slug`
- **Deskripsi**: Mengambil informasi detail untuk komik tertentu berdasarkan slug.
- **Path Parameters**:
  - `slug` (string, wajib): Slug komik (contoh: `naruto`).
- **Query Parameters**:
  - `source` (string, opsional): Situs sumber (default: `komikcast`).
- **Contoh Request**:

  ```
  GET /api/comics/naruto?source=komikcast
  ```
- **Contoh Respons**:

  ```json
  {
    "comicId": "naruto",
    "coverImage": "https://v1.komikcast.fit/naruto.jpg",
    "title": "Naruto",
    "nativeTitle": "ナルト",
    "genres": ["action", "adventure", "shounen"],
    "releaseYear": "1999",
    "author": "Masashi Kishimoto",
    "status": "completed",
    "type": "manga",
    "totalChapters": "700",
    "updatedOn": "2020-12-01",
    "rating": "9.5",
    "synopsis": "Naruto adalah shinobi muda dengan bakat untuk kenakalan...",
    "chapters": [
      {
        "chapterId": "naruto-chapter-1",
        "title": "Chapter 1",
        "link": "https://v1.komikcast.fit/chapter/naruto-chapter-1/",
        "releaseTime": "2020-12-01"
      },
      // Bab lainnya...
    ]
  }
  ```
- **Respons Error**:

  ```json
  {
    "error": "Komik tidak ditemukan"
  }
  ```

### 3. Mendapatkan Daftar Genre

- **method**: GET
- **Endpoint**: `/genres`
- **Deskripsi**: Mengambil daftar genre yang tersedia beserta jumlah seri.
- **Query Parameters**:
  - `source` (string, opsional): Situs sumber (default: `komikcast`).
- **Contoh Request**:

  ```
  GET /api/genres?source=komikcast
  ```
- **Contoh Respons**:

  ```json
  [
    {
      "name": "Action",
      "seriesCount": 1234,
      "link": "https://v1.komikcast.fit/genres/action/"
    },
    {
      "name": "Adventure",
      "seriesCount": 987,
      "link": "https://v1.komikcast.fit/genres/adventure/"
    },
    // Genre lainnya...
  ]
  ```
- **Respons Error**:

  ```json
  {
    "error": "Gagal mengambil daftar genre"
  }
  ```

### 4. Mendapatkan Manga Populer

- **method**: GET
- **Endpoint**: `/popular-manga`
- **Deskripsi**: Mengambil daftar peringkat manga populer.
- **Query Parameters**:
  - `source` (string, opsional): Situs sumber (default: `komikcast`).
- **Contoh Request**:

  ```
  GET /api/popular-manga?source=komikcast
  ```
- **Contoh Respons**:

  ```json
  [
    {
      "comicId": "one-piece",
      "rank": "1",
      "title": "One Piece",
      "link": "https://v1.komikcast.fit/komik/one-piece/",
      "image": "https://v1.komikcast.fit/one-piece.jpg",
      "genres": ["action", "adventure", "shounen"],
      "year": "1997"
    },
    // Manga populer lainnya...
  ]
  ```
- **Respons Error**:

  ```json
  {
    "error": "Gagal mengambil manga populer"
  }
  ```

### 5. Mendapatkan Konten Bab

- **method**: GET
- **Endpoint**: `/chapters/:chapterSlug`
- **Deskripsi**: Mengambil konten untuk bab tertentu berdasarkan slug.
- **Path Parameters**:
  - `chapterSlug` (string, wajib): Slug bab (contoh: `naruto-chapter-1`).
- **Query Parameters**:
  - `source` (string, opsional): Situs sumber (default: `komikcast`).
- **Contoh Request**:

  ```
  GET /api/chapters/naruto-chapter-1?source=komikcast
  ```
- **Contoh Respons**:

  ```json
  {
    "chapterId": "naruto-chapter-1",
    "images": [
      "https://v1.komikcast.fit/images/naruto-chapter-1/1.jpg",
      "https://v1.komikcast.fit/images/naruto-chapter-1/2.jpg"
    ],
    "previousChapter": null,
    "nextChapter": "https://v1.komikcast.fit/chapter/naruto-chapter-2/",
    "chapters": [
      {
        "chapterId": "naruto-chapter-1",
        "title": "Chapter 1",
        "url": "https://v1.komikcast.fit/chapter/naruto-chapter-1/"
      },
      // Bab lainnya...
    ]
  }
  ```
- **Respons Error**:

  ```json
  {
    "error": "Bab tidak ditemukan"
  }
  ```

### 6. Mendapatkan Komik Berdasarkan Genre

- **method**: GET
- **Endpoint**: `/comics/genre/:genre`
- **Deskripsi**: Mengambil daftar komik untuk genre tertentu.
- **Path Parameters**:
  - `genre` (string, wajib): Nama genre (contoh: `action`).
- **Query Parameters**:
  - `source` (string, opsional): Situs sumber (default: `komikcast`).
  - `page` (integer, opsional): Nomor halaman (default: `1`).
- **Contoh Request**:

  ```
  GET /api/comics/genre/action?page=1&source=komikcast
  ```
- **Contoh Respons**:

  ```json
  {
    "comics": [
      {
        "comicId": "naruto",
        "title": "Naruto",
        "link": "https://v1.komikcast.fit/komik/naruto/",
        "image": "https://v1.komikcast.fit/naruto.jpg",
        "type": "manga",
        "chapter": "Chapter 700",
        "rating": "9.5"
      },
      // Komik lainnya...
    ],
    "pagination": {
      "currentPage": 1,
      "prevPage": null,
      "nextPage": 2
    }
  }
  ```
- **Respons## 📚 Endpoint API

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
- **Query Params**: `query` (string, required).
- **Query Parameters**:
  - `source` (string, opsional): Situs sumber (default: `komikcast`).
  - `query` (string, wajib): Kata kunci pencarian (contoh: `naruto`).
- **Contoh Request**:

  ```
  GET /api/search?source=komikcast&query=naruto
  ```
- **Contoh Respons**:

  ```json
  [
    {
      "comicId": "naruto",
      "title": "Naruto",
      "link": "https://v1.komikcast.fit/komik/naruto/",
      "image": "https://v1.komikcast.fit/naruto.jpg",
      "type": "manga",
      "chapter": "Chapter 700",
      "rating": "9.5",
      "status": "completed"
    },
    // Hasil pencarian lainnya...
  ]
  ```
- **Respons Error**:

  ```json
  {
    "error": "Gagal mengambil hasil pencarian"
  }
  ```
