# Workflow — CMS Blog (Node.js + Express + EJS + Tailwind)

> Dokumentasi workflow CMS Blog modern
> Stack:

* Backend: Node.js + Express + TypeScript
* Frontend: EJS + Tailwind CSS
* Database: PostgreSQL
* ORM: Prisma
* Upload: Multer + Sharp
* Auth: JWT
* Validation: Zod

---

# Struktur Sistem

```txt
Admin CMS (EJS + Tailwind)
        │
        ▼
Express.js API + Server
        │
        ▼
PostgreSQL Database
        │
        ▼
Uploads / Cloudinary
```

---

# Daftar Workflow

1. Autentikasi Admin
2. Dashboard Admin
3. CRUD Artikel
4. Media Library
5. Kategori & Tag
6. Komentar
7. Blog Public
8. Search & SEO
9. Database Schema

---

# 1. Autentikasi Admin

## Workflow Login

```txt
Admin buka /admin/login
      │
      ▼
Input email + password
      │
      ▼
POST /admin/login
      │
      ▼
Validasi Zod
      │
      ├── Gagal
      │     ▼
      │  Return error validation
      │
      └── OK
            │
            ▼
      Cari admin di database
            │
            ├── Tidak ditemukan
            │      ▼
            │   Unauthorized
            │
            └── Ditemukan
                  │
                  ▼
            bcrypt.compare()
                  │
                  ├── Password salah
                  │
                  └── Password benar
                        │
                        ▼
                  Generate JWT
                        │
                        ▼
                  Simpan token di cookie
                        │
                        ▼
                  Redirect /admin/dashboard
```

---

# 2. Dashboard Admin

## Workflow Dashboard

```txt
Admin masuk dashboard
      │
      ▼
GET /admin/dashboard
      │
      ▼
Query statistik:
  ├── Total artikel
  ├── Total komentar
  ├── Total views
  ├── Draft artikel
  └── Artikel terbaru
      │
      ▼
Render dashboard EJS + Tailwind
```

---

# 3. CRUD Artikel

## Workflow Buat Artikel

```txt
Admin klik "Tambah Artikel"
      │
      ▼
Form artikel:
  ├── Judul
  ├── Slug
  ├── Konten
  ├── Thumbnail
  ├── Kategori
  ├── Tag
  ├── Meta SEO
  └── Status
      │
      ▼
POST /admin/posts
      │
      ▼
Validasi data
      │
      ├── Error
      │
      └── Success
            │
            ▼
      Generate slug otomatis
            │
            ▼
      Simpan ke database
            │
            ▼
      Redirect ke daftar artikel
```

## Workflow Edit Artikel

```txt
Admin buka artikel
      │
      ▼
GET /admin/posts/:id/edit
      │
      ▼
Data diisi otomatis
      │
      ▼
Admin update artikel
      │
      ▼
PUT /admin/posts/:id
      │
      ▼
Update database
      │
      ▼
updatedAt otomatis berubah
```

## Workflow Publish Artikel

```txt
Status awal: DRAFT
      │
      ▼
Admin klik Publish
      │
      ▼
PATCH /admin/posts/:id/publish
      │
      ▼
Status:
DRAFT → PUBLISHED
      │
      ▼
publishedAt = now()
      │
      ▼
Artikel tampil di blog publik
```

## Workflow Hapus Artikel

```txt
Admin klik delete
      │
      ▼
DELETE /admin/posts/:id
      │
      ▼
Hapus:
  ├── relasi kategori
  ├── relasi tag
  ├── komentar
  └── meta SEO
      │
      ▼
Artikel terhapus
```

---

# 4. Media Library

## Workflow Upload Gambar

```txt
Admin upload gambar
      │
      ▼
POST /admin/media/upload
      │
      ▼
Multer menerima file
      │
      ▼
Validasi:
  ├── jpg
  ├── png
  ├── webp
  └── max 5MB
      │
      ▼
Sharp resize:
  ├── thumbnail
  ├── medium
  └── original
      │
      ▼
Simpan /uploads
      │
      ▼
Simpan data media ke database
      │
      ▼
Return URL gambar
```

---

# 5. Kategori & Tag

## Workflow Kategori

```txt
Admin tambah kategori
      │
      ▼
POST /admin/categories
      │
      ▼
Generate slug
      │
      ▼
Simpan database
```

---

# 6. Komentar

## Workflow Komentar Pengunjung

```txt
Pengunjung isi komentar
      │
      ▼
POST /comments
      │
      ▼
Validasi input
      │
      ▼
Simpan status PENDING
      │
      ▼
Admin moderasi komentar
```

## Workflow Moderasi

```txt
Admin buka komentar
      │
      ▼
Approve / Spam / Delete
      │
      ▼
PATCH /admin/comments/:id
```

---

# 7. Blog Public

## Workflow Homepage

```txt
Pengunjung buka /
      │
      ▼
GET artikel published
      │
      ▼
Pagination 10 artikel
      │
      ▼
Render halaman blog
```

## Workflow Detail Artikel

```txt
GET /posts/:slug
      │
      ▼
Query:
  ├── artikel
  ├── kategori
  ├── tags
  ├── komentar approved
  └── related posts
      │
      ▼
Render detail artikel
```

---

# 8. Search & SEO

## Workflow Search

```txt
GET /search?q=nodejs
      │
      ▼
Cari:
  ├── title
  ├── excerpt
  └── content
      │
      ▼
Render hasil pencarian
```

## Workflow SEO

```txt
Saat publish artikel:
  ├── generate slug
  ├── update sitemap.xml
  ├── meta title
  ├── meta description
  └── open graph image
```

---

# Database PostgreSQL

## users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## posts

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT',
  seo_title VARCHAR(255),
  seo_description TEXT,
  view_count INT DEFAULT 0,
  published_at TIMESTAMP,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## post_categories

```sql
CREATE TABLE post_categories (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id, category_id)
);
```

---

## tags

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL
);
```

---

## post_tags

```sql
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id, tag_id)
);
```

---

## comments

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## media

```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255),
  file_path TEXT,
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# Struktur Folder Project

```bash
src/
├── controllers/
├── routes/
├── middlewares/
├── services/
├── repositories/
├── validations/
├── utils/
├── views/
│   ├── admin/
│   └── blog/
├── public/
│   ├── css/
│   ├── js/
│   └── uploads/
├── prisma/
├── types/
└── app.ts
```

---

# Tech Final

## Backend

* Node.js
* Express.js
* TypeScript
* Prisma ORM
* PostgreSQL

## Frontend

* EJS
* Tailwind CSS
* Alpine.js (optional)

## Upload

* Multer
* Sharp

## Security

* Helmet
* CSRF
* Rate Limit
* JWT Auth

---

# Fitur Modern Recommended

* Dark mode admin
* Auto slug
* Draft autosave
* Rich text editor
* Media library
* SEO manager
* Sitemap generator
* Related articles
* Reading time
* View counter
* Analytics dashboard
