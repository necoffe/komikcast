# Komikaze API

API scraper untuk Komikcast dan Shinigami.

## Base URL

```
https://zuruideso.vercel.app
```

## 📚 Endpoint API

> **Penting:** Tambahkan `?source=shinigami` untuk menggunakan sumber Shinigami.
> Default source adalah `komikcast`.

---

### 1. Daftar Komik
Mengambil daftar komik dengan filter.
- **URL**: `GET /api/comics`
- **Query Params**:
  - `page` (number): Halaman ke berapa (default: 1)
  - `genres` (string): Filter genre, dipisahkan koma (ex: action,adventure)
  - `status` (string): Filter status (Ongoing, Completed)
  - `type` (string): Filter tipe (Manga, Manhwa, Manhua)
  - `orderby` (string): Urutkan berdasarkan (update, popular, title)
  - `source` (string): Sumber scraper (`komikcast` / `shinigami`)

### 2. Detail Komik
Mengambil detail informasi komik berdasarkan slug.
- **URL**: `GET /api/comics/:slug`
- **Params**: `slug` (ex: one-piece)
- **Query Params**: `source` (string)

### 3. Konten Chapter
Mengambil gambar-gambar chapter.
- **URL**: `GET /api/chapters/:seriesSlug/:chapterSlug`
- **Params**:
  - `seriesSlug`: Slug dari komik (ex: one-piece)
  - `chapterSlug`: Slug/ID chapter (ex: 1174 atau UUID)
- **Query Params**: `source` (string)

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

---

## 🔴 Shinigami Endpoints

Semua endpoint di atas bisa digunakan dengan `?source=shinigami`.

### Contoh Lengkap

#### Daftar Komik
```
GET /api/comics?source=shinigami
GET /api/comics?source=shinigami&page=2
```

#### Detail Komik
```
GET /api/comics/genius-blacksmiths-game?source=shinigami
```

#### Gambar Chapter
```
GET /api/chapters/genius-blacksmiths-game/1ec14753-e8e6-47e7-b2c6-29af76a51f91?source=shinigami
```

### Alur Penggunaan (Flow)

```
1. GET /api/comics?source=shinigami
   → Dapat daftar komik (comicId: "genius-blacksmiths-game")

2. GET /api/comics/genius-blacksmiths-game?source=shinigami
   → Dapat detail + daftar chapter (chapterId: "1ec14753-...")

3. GET /api/chapters/genius-blacksmiths-game/1ec14753-...?source=shinigami
   → Dapat array gambar chapter + prev/next chapter ID
```

### Contoh Response Chapter

```json
{
  "data": {
    "chapter": {
      "chapterId": "1ec14753-e8e6-47e7-b2c6-29af76a51f91",
      "seriesId": "genius-blacksmiths-game",
      "title": "Chapter 41",
      "images": [
        "https://assets.shngm.id/chapter/manga_.../000-5b8d43.jpg",
        "https://assets.shngm.id/chapter/manga_.../01-dfa515.jpg"
      ],
      "nextChapter": null,
      "previousChapter": "dcfb90e9-4e8e-4dfc-950d-b024525c3283"
    },
    "source": "shinigami"
  }
}
```

---

## ⚙️ Setup

```bash
npm install
npm start
```

### Environment Variables
| Variable | Keterangan |
|---|---|
| `PORT` | Port server (default: 8080) |
| `KOMIKCAST_EMAIL` | Email login Komikcast |
| `KOMIKCAST_PASSWORD` | Password login Komikcast |
