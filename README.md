# StoryNest Backend

Secure Admin CRUD API untuk platform StoryNest — Node.js + Express + Supabase.

## Project Structure

```
storynest-backend/
├── server.js                     # Entry point
├── .env.example                  # Template environment variables
├── routes/
│   └── admin.js                  # Definisi endpoint admin
├── controllers/
│   └── adminController.js        # Business logic (GET, POST, PUT, DELETE)
├── services/
│   ├── pdfService.js             # Ekstraksi cover dari PDF (pdf2pic)
│   └── storageService.js         # Upload/delete Supabase Storage
├── middleware/
│   ├── isAdmin.js                # JWT validation + is_admin check
│   └── upload.js                 # Multer — PDF only, 50MB limit
├── validators/
│   └── bookValidator.js          # Zod schemas untuk input validation
├── lib/
│   └── supabase.js               # Supabase client (service role)
└── supabase/
    └── migrations/001_init.sql   # SQL setup untuk Supabase
```

## Setup

### 1. Install dependencies

```bash
npm install
```

> **Catatan:** `pdf2pic` membutuhkan `graphicsmagick` dan `ghostscript` terinstall di sistem.
> 
> **Ubuntu/Debian:**
> ```bash
> sudo apt-get install -y graphicsmagick ghostscript
> ```
> **macOS:**
> ```bash
> brew install graphicsmagick ghostscript
> ```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Jalankan SQL migration di **SQL Editor** Supabase:
   ```
   supabase/migrations/001_init.sql
   ```
3. Buat dua Storage bucket di Dashboard → Storage:
   - `books-pdf` (Private)
   - `books-cover` (Public)
4. Copy **Project URL** dan **Service Role Key** dari Settings → API

### 3. Environment variables

```bash
cp .env.example .env
# Edit .env dengan kredensial Supabase kamu
```

### 4. Jalankan server

```bash
# Development
npm run dev

# Production
npm start
```

---

## API Endpoints

Semua endpoint membutuhkan header:
```
Authorization: Bearer <JWT_TOKEN>
```
Token harus milik user dengan `is_admin: true` di tabel `profiles`.

### GET /admin/books
Ambil semua buku.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Buku Bagus",
      "author": "Penulis",
      "cover_url": "https://...",
      "pdf_url": "https://...",
      ...
    }
  ]
}
```

### POST /admin/books
Upload buku baru. **Gunakan `multipart/form-data`.**

| Field        | Type   | Required | Keterangan              |
|--------------|--------|----------|-------------------------|
| file         | File   | ✅       | File PDF buku           |
| title        | string | ✅       |                         |
| author       | string | ✅       |                         |
| category     | string | ✅       |                         |
| price        | number | ✅       | Dalam IDR               |
| age_min      | number | ✅       | 0–18                    |
| age_max      | number | ✅       | 0–18, >= age_min        |
| description  | string | ❌       |                         |
| is_published | bool   | ❌       | Default: false          |

### PUT /admin/books/:id
Update buku. Semua field opsional. Jika `file` disertakan, PDF lama dihapus dan cover diekstrak ulang.

### DELETE /admin/books/:id
Hapus buku + cleanup file PDF & cover di Storage.

---

## Security Features

- ✅ JWT validation via Supabase Auth
- ✅ `is_admin` check di database
- ✅ File type validation (PDF only)
- ✅ File size limit (50MB)
- ✅ Input validation dengan Zod
- ✅ Helmet.js untuk HTTP security headers
- ✅ Rollback storage jika DB insert gagal
- ✅ Cleanup temp files setelah setiap request
