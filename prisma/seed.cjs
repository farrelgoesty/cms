const bcrypt = require("bcrypt");
const { PrismaClient, CommentStatus, PostStatus, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

const demoMediaPath = "/uploads/2026/05/10dbd22d-5644-4174-ab95-d055485e73be.webp";
const demoThumbPath = "/uploads/2026/05/10dbd22d-5644-4174-ab95-d055485e73be-thumb.webp";

const demoCategories = [
  { name: "SEO", slug: "seo" },
  { name: "Content Strategy", slug: "content-strategy" },
  { name: "Design System", slug: "design-system" },
  { name: "Performance", slug: "performance" },
  { name: "Analytics", slug: "analytics" },
  { name: "Development", slug: "development" }
];

const demoTags = [
  { name: "On-page SEO", slug: "on-page-seo" },
  { name: "Keyword Research", slug: "keyword-research" },
  { name: "Internal Linking", slug: "internal-linking" },
  { name: "Core Web Vitals", slug: "core-web-vitals" },
  { name: "Content Cluster", slug: "content-cluster" },
  { name: "UX Writing", slug: "ux-writing" },
  { name: "Schema Markup", slug: "schema-markup" },
  { name: "Prisma", slug: "prisma" }
];

const demoPosts = [
  {
    title: "Panduan SEO On-Page untuk CMS Blog yang Baru Diisi",
    slug: "panduan-seo-on-page-untuk-cms-blog-yang-baru-diisi",
    subheadline: "Struktur sederhana untuk membangun artikel SEO yang rapi, enak dibaca, dan siap ranking.",
    excerpt:
      "Contoh artikel utama untuk homepage, dibuat dengan struktur heading, kata kunci natural, dan copy yang jelas agar mudah dibaca sekaligus ramah mesin pencari.",
    content:
      "<p>Jika Anda baru mengisi CMS blog, langkah paling cepat untuk melihat hasil yang bagus adalah menyiapkan artikel yang punya struktur rapi, judul yang spesifik, dan deskripsi yang relevan.</p><p>Artikel ini memakai pendekatan <strong>SEO on-page</strong> sederhana: satu topik utama, subtopik yang saling mendukung, dan ajakan baca yang jelas. Hasilnya, halaman terlihat penuh, profesional, dan lebih siap untuk diindeks.</p><h2>Fokus utama</h2><ul><li>Gunakan satu keyword utama di judul dan paragraf pembuka</li><li>Tambahkan heading yang menjelaskan isi dengan jelas</li><li>Isi meta description dengan ringkasan yang natural</li><li>Pastikan internal link mengarah ke artikel terkait</li></ul><h2>Contoh susunan yang baik</h2><p>Mulai dengan pembuka yang menjawab kebutuhan pembaca, lanjutkan dengan penjelasan praktis, lalu tutup dengan ringkasan yang mudah dipahami. Pola seperti ini cocok untuk blog company, portal berita, maupun konten edukasi.</p><p>Dengan isi seperti ini, halaman depan langsung terasa hidup, dan admin panel juga lebih meyakinkan saat Anda membuka daftar artikel.</p>",
    seoTitle: "Panduan SEO On-Page untuk CMS Blog",
    seoDescription:
      "Artikel demo SEO on-page dengan struktur heading, internal link, dan copy natural untuk mengisi homepage CMS blog.",
    status: PostStatus.PUBLISHED,
    publishedAt: new Date("2026-05-01T08:00:00.000Z"),
    readingTime: 4,
    categories: ["seo", "content-strategy"],
    tags: ["on-page-seo", "keyword-research", "schema-markup", "internal-linking"],
    faqItems: [
      {
        question: "Apa fokus utama artikel on-page ini?",
        answer: "Fokusnya adalah struktur heading yang rapi, internal link yang relevan, dan copy yang natural."
      },
      {
        question: "Apakah artikel ini cocok untuk blog baru?",
        answer: "Cocok, karena metodenya sederhana dan langsung bisa dipakai pada CMS yang baru diisi konten."
      }
    ]
  },
  {
    title: "Cara Membuat Struktur Kategori dan Tag yang Rapi",
    slug: "cara-membuat-struktur-kategori-dan-tag-yang-rapi",
    subheadline: "Kategori untuk topik besar, tag untuk detail, dan internal link untuk menghubungkan artikel terkait.",
    excerpt:
      "Kategori dan tag yang konsisten membantu navigasi, memperjelas topik, dan mendukung struktur situs yang lebih mudah dipahami mesin pencari.",
    content:
      "<p>Struktur kategori yang baik membuat pembaca lebih cepat menemukan topik yang relevan. Tag kemudian dipakai untuk menghubungkan artikel yang masih satu tema, tanpa membuat arsip menjadi terlalu sempit.</p><h2>Prinsip sederhana</h2><ul><li>Gunakan kategori untuk topik besar</li><li>Gunakan tag untuk detail, istilah, atau teknik</li><li>Jangan membuat tag terlalu banyak dan mirip</li><li>Jaga nama kategori tetap singkat dan konsisten</li></ul><p>Contoh implementasi seperti ini membuat arsip kategori dan tag terlihat lebih matang. Halaman juga jadi lebih baik untuk SEO karena hubungan antar konten mudah dibaca.</p>",
    seoTitle: "Struktur kategori dan tag untuk SEO",
    seoDescription:
      "Contoh konten demo tentang cara menyusun kategori dan tag agar blog lebih rapi, mudah dinavigasi, dan SEO friendly.",
    status: PostStatus.PUBLISHED,
    publishedAt: new Date("2026-04-28T08:00:00.000Z"),
    readingTime: 4,
    categories: ["content-strategy", "seo"],
    tags: ["content-cluster", "internal-linking", "ux-writing"]
  },
  {
    title: "Optimasi Kecepatan Halaman untuk Blog Modern",
    slug: "optimasi-kecepatan-halaman-untuk-blog-modern",
    subheadline: "Halaman cepat memberi pengalaman baca lebih baik dan membantu performa SEO teknis.",
    excerpt:
      "Halaman yang cepat biasanya punya gambar yang ringan, layout yang stabil, dan komponen yang tidak memaksa browser bekerja terlalu berat.",
    content:
      "<p>Kecepatan halaman adalah faktor penting yang memengaruhi pengalaman pengguna dan performa organik. Blog yang lambat terlihat kurang profesional, meski isi artikelnya bagus.</p><h2>Hal yang paling berdampak</h2><ol><li>Kompres gambar sebelum diunggah</li><li>Gunakan ukuran media yang sesuai kebutuhan tampilan</li><li>Hindari script yang tidak perlu pada halaman publik</li><li>Pastikan layout stabil saat konten dimuat</li></ol><p>Di CMS seperti ini, halaman yang ringan membuat pembaca lebih lama bertahan. Itu membantu performa konten dan mengurangi bounce yang tidak perlu.</p>",
    seoTitle: "Optimasi kecepatan halaman blog modern",
    seoDescription:
      "Artikel demo tentang optimasi performa, gambar, dan stabilitas layout untuk blog modern yang SEO friendly.",
    status: PostStatus.PUBLISHED,
    publishedAt: new Date("2026-04-24T08:00:00.000Z"),
    readingTime: 5,
    categories: ["performance", "development"],
    tags: ["core-web-vitals", "prisma", "schema-markup"]
  },
  {
    title: "Checklist Konten Evergreen untuk Traffic Organik",
    slug: "checklist-konten-evergreen-untuk-traffic-organik",
    subheadline: "Konten evergreen membantu trafik tetap stabil karena topiknya relevan lebih lama.",
    excerpt:
      "Konten evergreen memberi nilai jangka panjang karena tetap relevan, terus bisa diperbarui, dan biasanya lebih stabil mendatangkan traffic.",
    content:
      "<p>Konten evergreen adalah jenis artikel yang tidak cepat usang. Topiknya cenderung bertahan lama dan bisa terus dioptimasi tanpa harus ditulis ulang dari nol.</p><h2>Checklist sebelum publish</h2><ul><li>Pastikan topik memang dicari secara konsisten</li><li>Tambahkan contoh praktis yang mudah diterapkan</li><li>Buat intro yang menjelaskan manfaat artikel</li><li>Siapkan bagian pembaruan saat data berubah</li></ul><p>Dengan pendekatan ini, artikel demo Anda tidak hanya terlihat penuh, tetapi juga terasa seperti konten yang sengaja disusun untuk jangka panjang.</p>",
    seoTitle: "Checklist konten evergreen untuk traffic organik",
    seoDescription:
      "Artikel demo tentang cara membuat konten evergreen yang relevan, mudah diperbarui, dan mendukung traffic organik.",
    status: PostStatus.PUBLISHED,
    publishedAt: new Date("2026-04-19T08:00:00.000Z"),
    readingTime: 4,
    categories: ["content-strategy", "analytics"],
    tags: ["keyword-research", "content-cluster", "internal-linking"],
    faqItems: [
      {
        question: "Apa yang membuat konten evergreen efektif?",
        answer: "Topiknya tetap dicari dalam jangka panjang dan mudah diperbarui saat ada data baru."
      },
      {
        question: "Seberapa sering konten evergreen perlu direvisi?",
        answer: "Perlu dicek berkala, terutama jika ada perubahan data, statistik, atau praktik terbaik."
      }
    ]
  },
  {
    title: "Strategi Internal Linking untuk Topik yang Saling Terhubung",
    slug: "strategi-internal-linking-untuk-topik-yang-saling-terhubung",
    subheadline: "Internal linking memperkuat konteks antar artikel dan memudahkan pembaca melanjutkan navigasi.",
    excerpt:
      "Internal linking membantu pembaca bergerak ke artikel lain yang relevan sekaligus memperkuat konteks topik di mata mesin pencari.",
    content:
      "<p>Internal linking sering dianggap detail kecil, padahal dampaknya besar. Link yang tepat membuat pembaca menemukan halaman terkait dan membantu mesin pencari memahami hubungan antar konten.</p><h2>Cara menyusun link</h2><ul><li>Hubungkan artikel pilar dengan artikel pendukung</li><li>Gunakan anchor text yang deskriptif</li><li>Jangan mengulang link yang sama terlalu sering</li><li>Tempatkan link di bagian yang memang relevan</li></ul><p>Struktur seperti ini sangat cocok untuk CMS blog yang ingin terlihat matang sejak data demo pertama kali dimasukkan.</p>",
    seoTitle: "Strategi internal linking yang efektif",
    seoDescription:
      "Contoh artikel demo yang menjelaskan internal linking, anchor text, dan hubungan antar topik untuk SEO.",
    status: PostStatus.PUBLISHED,
    publishedAt: new Date("2026-04-14T08:00:00.000Z"),
    readingTime: 4,
    categories: ["seo", "content-strategy"],
    tags: ["internal-linking", "on-page-seo", "content-cluster"]
  },
  {
    title: "Panduan Desain Admin yang Nyaman untuk Tim Konten",
    slug: "panduan-desain-admin-yang-nyaman-untuk-tim-konten",
    subheadline: "Admin yang nyaman mempercepat penulisan, upload media, dan pengecekan status konten.",
    excerpt:
      "Admin yang nyaman tidak hanya enak dilihat, tetapi juga mempercepat kerja editor saat menulis, mengatur media, dan memeriksa status artikel.",
    content:
      "<p>Desain admin yang baik membantu tim konten bekerja lebih cepat. Prioritas utamanya adalah keterbacaan, alur aksi yang jelas, dan komponen yang tidak berlebihan.</p><h2>Yang perlu dijaga</h2><ul><li>Menu mudah dipahami</li><li>Form penulisan tidak terlalu padat</li><li>Status artikel terlihat jelas</li><li>Preview konten membantu sebelum publish</li></ul><p>Contoh data seperti ini membuat dashboard dan daftar post terlihat penuh, bukan kosong, sehingga hasil implementasi lebih mudah dievaluasi.</p>",
    seoTitle: "Desain admin yang nyaman untuk tim konten",
    seoDescription:
      "Artikel demo tentang desain admin yang nyaman, alur kerja editorial, dan struktur panel yang mendukung produktivitas.",
    status: PostStatus.PUBLISHED,
    publishedAt: new Date("2026-04-09T08:00:00.000Z"),
    readingTime: 4,
    categories: ["design-system", "development"],
    tags: ["ux-writing", "prisma", "schema-markup"]
  },
  {
    title: "Draft: ide konten landing page SEO baru",
    slug: "draft-ide-konten-landing-page-seo-baru",
    subheadline: "Contoh draft yang belum publish untuk menguji alur editorial di admin panel.",
    excerpt:
      "Draft ini sengaja dibiarkan belum terbit supaya status draft tetap terlihat jelas di admin panel.",
    content:
      "<p>Ini contoh draft untuk menguji tampilan artikel yang belum publish.</p><p>Isi draft tetap singkat agar perbedaan antara draft dan published mudah terlihat pada dashboard.</p>",
    seoTitle: "Draft ide konten landing page SEO",
    seoDescription: "Contoh artikel draft untuk panel admin dan workflow editorial.",
    status: PostStatus.DRAFT,
    publishedAt: null,
    readingTime: 2,
    categories: ["seo"],
    tags: ["keyword-research", "ux-writing"]
  }
];

async function ensureCategory(data) {
  return prisma.category.upsert({
    where: { slug: data.slug },
    update: { name: data.name },
    create: data
  });
}

async function ensureTag(data) {
  return prisma.tag.upsert({
    where: { slug: data.slug },
    update: { name: data.name },
    create: data
  });
}

async function ensurePost(authorId, post, categoryIds, tagIds) {
  const existing = await prisma.post.findUnique({
    where: { slug: post.slug },
    select: { id: true }
  });

  const payload = {
    title: post.title,
    slug: post.slug,
    subheadline: post.subheadline,
    excerpt: post.excerpt,
    faqItems: post.faqItems || [],
    content: post.content,
    featuredImage: demoMediaPath,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    status: post.status,
    publishedAt: post.status === PostStatus.PUBLISHED ? post.publishedAt : null,
    readingTime: post.readingTime,
    author: { connect: { id: authorId } }
  };

  if (!existing) {
    return prisma.post.create({
      data: {
        ...payload,
        postCategories: {
          create: categoryIds.map((categoryId) => ({
            category: { connect: { id: categoryId } }
          }))
        },
        postTags: {
          create: tagIds.map((tagId) => ({
            tag: { connect: { id: tagId } }
          }))
        }
      }
    });
  }

  return prisma.post.update({
    where: { slug: post.slug },
    data: {
      ...payload,
      postCategories: {
        deleteMany: {},
        create: categoryIds.map((categoryId) => ({
          category: { connect: { id: categoryId } }
        }))
      },
      postTags: {
        deleteMany: {},
        create: tagIds.map((tagId) => ({
          tag: { connect: { id: tagId } }
        }))
      }
    }
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@cms.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

  const hashed = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Administrator",
      password: hashed,
      role: UserRole.ADMIN
    },
    create: {
      name: "Administrator",
      email: adminEmail,
      password: hashed,
      role: UserRole.ADMIN
    }
  });

  const categories = await Promise.all(demoCategories.map(ensureCategory));
  const tags = await Promise.all(demoTags.map(ensureTag));
  const categoryMap = new Map(categories.map((item) => [item.slug, item.id]));
  const tagMap = new Map(tags.map((item) => [item.slug, item.id]));

  const posts = await Promise.all(
    demoPosts.map((post) =>
      ensurePost(
        admin.id,
        post,
        post.categories.map((slug) => categoryMap.get(slug)).filter(Boolean),
        post.tags.map((slug) => tagMap.get(slug)).filter(Boolean)
      )
    )
  );

  await prisma.comment.deleteMany({
    where: {
      post: {
        slug: {
          in: demoPosts.map((item) => item.slug)
        }
      }
    }
  });

  const publishedPosts = posts.filter((post) => post.status === PostStatus.PUBLISHED);
  const commentSeeds = publishedPosts.flatMap((post, index) => [
    {
      postId: post.id,
      name: index % 2 === 0 ? "Rina" : "Dimas",
      email: index % 2 === 0 ? "rina@example.com" : "dimas@example.com",
      content: "Strukturnya rapi dan artikelnya enak dibaca.",
      status: CommentStatus.APPROVED
    },
    {
      postId: post.id,
      name: index % 2 === 0 ? "Maya" : "Andi",
      email: index % 2 === 0 ? "maya@example.com" : "andi@example.com",
      content: "Contoh komentar demo ini membantu halaman terlihat hidup.",
      status: CommentStatus.PENDING
    }
  ]);

  await prisma.comment.createMany({
    data: commentSeeds.map((item) => ({
      postId: item.postId,
      name: item.name,
      email: item.email,
      content: item.content,
      status: item.status
    }))
  });

  await prisma.media.upsert({
    where: { id: "seed-media-placeholder" },
    update: {
      fileName: "cms-demo.webp",
      filePath: demoMediaPath,
      thumbnailPath: demoThumbPath,
      mimeType: "image/webp",
      fileSize: 102768,
      altText: "CMS demo image",
      uploadedById: admin.id
    },
    create: {
      id: "seed-media-placeholder",
      fileName: "cms-demo.webp",
      filePath: demoMediaPath,
      thumbnailPath: demoThumbPath,
      mimeType: "image/webp",
      fileSize: 102768,
      altText: "CMS demo image",
      uploadedById: admin.id
    }
  });

  console.log(`Seeded demo content for ${process.env.NODE_ENV || "development"} as ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
