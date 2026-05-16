# StoryNest Backend

REST API for **StoryNest** — a children's digital book platform. Built with Node.js, Express, and Supabase (Auth, Postgres, Storage).

Handles user authentication, book catalog with paywall logic, subscriptions and purchases, and admin book management (PDF + cover upload, CRUD).

## Features

- **Auth** — login and signup via Supabase Auth
- **Catalog** — book list and details with `is_locked` based on subscription or purchase
- **Payments** — subscribe (monthly/yearly) and one-off book purchase (mock; no payment gateway yet)
- **Admin** — full book CRUD with PDF upload, cover image upload, and Supabase Storage

## Project structure

```
storynest-backend/
├── server.js                     # Entry point & route mounting
├── .env.example                  # Environment variable template
├── routes/
│   ├── admin.js                  # Admin book CRUD
│   ├── auth.js                   # Login & signup
│   ├── book.js                   # User-facing catalog
│   └── payment.js                # Subscribe & purchase
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── bookController.js
│   └── paymentController.js
├── middleware/
│   ├── isAdmin.js                # JWT + is_admin check (admin routes)
│   ├── authMiddleware.js         # JWT + profile (user routes)
│   └── upload.js                 # Multer — PDF + cover image, 50MB limit
├── services/
│   ├── pdfService.js             # PDF helper service
│   └── storageService.js         # Supabase Storage upload/delete/URLs
├── validators/
│   └── bookValidator.js          # Zod schemas for book metadata
├── lib/
│   └── supabase.js               # Supabase client (service role)
└── supabase/
    └── migrations/001_init.sql   # Base schema (see setup for extra tables)
```

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- **pdf2pic** system dependencies (only needed if PDF cover extraction is used):
  - **macOS:** `brew install graphicsmagick ghostscript`
  - **Ubuntu/Debian:** `sudo apt-get install -y graphicsmagick ghostscript`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the base migration in **SQL Editor**:
   ```
   supabase/migrations/001_init.sql
   ```
3. Run the **additional schema** required by auth, payments, and the catalog (not in `001_init.sql`):

```sql
-- Subscription fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_until TIMESTAMPTZ;

-- Purchased books per user
CREATE TABLE IF NOT EXISTS public.user_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);
```

4. Create Storage buckets (Dashboard → Storage, or via SQL in the migration file):
   - `books-pdf` — **private**
   - `books-cover` — **public**

5. Copy **Project URL** and **Service role key** from **Settings → API**.

### 3. Environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only; never expose to clients) |
| `SUPABASE_PDF_BUCKET` | PDF bucket name (default: `books-pdf`) |
| `SUPABASE_COVER_BUCKET` | Cover bucket name (default: `books-cover`) |
| `PORT` | HTTP port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |

### 4. Run the server

```bash
# Development (nodemon)
npm run dev

# Production
npm start
```

Health check: `GET /` → `{ "status": "StoryNest API is running" }`

---

## Authentication

Most routes require:

```http
Authorization: Bearer <access_token>
```

Obtain a token from `POST /auth/login`. Admin routes additionally require `is_admin: true` on the user's `profiles` row.

---

## API reference

### Auth

No `Authorization` header required.

#### `POST /auth/login`

**Body (JSON):**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |

**Response (200):**

```json
{
  "message": "Login berhasil",
  "token": "<jwt_access_token>",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "is_admin": false
  }
}
```

#### `POST /auth/signup`

**Body (JSON):**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |

Creates a Supabase Auth user and a `profiles` row with `is_admin: false`.

**Response (201):**

```json
{
  "message": "Registrasi berhasil. Silakan cek email untuk verifikasi jika diperlukan.",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

### Books (catalog)

Requires `Authorization: Bearer <token>`.

#### `GET /book/list`

Returns all books with paywall flags. A book is **unlocked** (`is_locked: false`) when the user has an active subscription **or** has purchased that book.

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "...",
      "author": "...",
      "category": "...",
      "price": 50000,
      "cover_url": "https://...",
      "is_locked": true
    }
  ]
}
```

#### `GET /book/:id`

Single book with the same `is_locked` logic.

**Response (200):** `{ "data": { ... } }`  
**Response (404):** `{ "error": "Buku Tidak Ditemukan" }`

---

### Payment

Requires `Authorization: Bearer <token>`.

> **Note:** These endpoints update the database directly. There is no external payment provider integration yet.

#### `POST /payment/subscribe`

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plan` | string | yes | `"monthly"` (30 days) or `"yearly"` (365 days) |

Sets `profiles.is_subscribed` and `profiles.subscription_until`.

**Response (200):**

```json
{
  "message": "Subscribe monthly berhasil!",
  "plan": "monthly",
  "expires_at": "2026-06-15T..."
}
```

#### `POST /payment/purchase`

**Body (JSON):**

| Field | Type | Required |
|-------|------|----------|
| `bookId` | uuid | yes |

Adds a row to `user_library` for the authenticated user.

**Response (200):** `{ "message": "Payment Success!" }`

---

### Admin

Requires `Authorization: Bearer <token>` and `profiles.is_admin = true`.

#### `GET /admin/books`

List all books (including unpublished) with signed PDF URLs and public cover URLs.

**Response (200):** `{ "data": [ ... ] }`

#### `POST /admin/books`

Create a book. Use **`multipart/form-data`** and send two upload fields:

- `file` — the book PDF file. Accepted format: `.pdf`.
- `cover_file` — the book cover image. Accepted formats: `.jpg`, `.jpeg`, `.png`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | |
| `author` | string | yes | |
| `category` | string | yes | |
| `price` | number | yes | IDR |
| `age_min` | number | yes | 0–18 |
| `age_max` | number | yes | 0–18, ≥ `age_min` |
| `description` | string | no | |
| `is_published` | boolean | no | default: `false` |
| `file` | File | yes | PDF only, max 50MB |
| `cover_file` | File | yes | JPG/PNG only, max 50MB |

Both files are uploaded to Supabase Storage. The PDF is stored in the `books-pdf` bucket, while the cover image is stored in the `books-cover` bucket.

**Example request:**

```bash
curl -X POST http://localhost:3000/admin/books \
  -H "Authorization: Bearer <admin_access_token>" \
  -F "title=The Little Explorer" \
  -F "author=StoryNest" \
  -F "category=Adventure" \
  -F "price=50000" \
  -F "age_min=4" \
  -F "age_max=8" \
  -F "description=A short adventure story for children." \
  -F "is_published=true" \
  -F "file=@/path/to/book.pdf;type=application/pdf" \
  -F "cover_file=@/path/to/cover.png;type=image/png"
```

#### `PUT /admin/books/:id`

Update metadata and/or replace the PDF. All fields optional. If `file` is sent, the old PDF and cover are replaced.

Accepts `multipart/form-data` or JSON (without file).

#### `DELETE /admin/books/:id`

Deletes the book row and removes PDF and cover files from Storage.

---

## Security

- Helmet for HTTP security headers
- CORS enabled
- Admin: JWT validated via Supabase Auth + `is_admin` check
- User routes: Bearer token decoded and profile loaded from `profiles`
- Book metadata validated with Zod
- Uploads restricted to PDF for `file` and JPG/PNG for `cover_file`, 50MB max
- Storage rollback on failed DB writes; temp files cleaned after requests

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm start` | Start production server |
