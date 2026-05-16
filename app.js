import express from 'express';
import { PrismaClient } from './generated/prisma/index.js';

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

/* =========================
   ГОЛОВНА
========================= */
app.get('/', async (req, res, next) => {
  try {
    const { search, sort = 'newest', page = 1 } = req.query;

    const perPage = 10;
    const pageNum = Number(page);

    const where = {};

    if (search) {
      where.title = {
        contains: search,
      };
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const total = await prisma.announcement.count({ where });

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy,
      skip: (pageNum - 1) * perPage,
      take: perPage,
    });

    const totalPages = Math.ceil(total / perPage);

    res.render('index', {
      announcements,
      search: search || '',
      sort,
      currentPage: pageNum,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   CREATE FORM
========================= */
app.get('/announcements', (req, res) => {
  res.render('new', {
    errors: {},
    data: {}
  });
});

/* =========================
   CREATE POST
========================= */
app.post('/announcements', async (req, res, next) => {
  try {
    const { title, description, price, category, contactInfo } = req.body;

    const errors = {};
    const validCategories = ['sale', 'service', 'job', 'other'];

    if (!title || title.trim().length < 5) {
      errors.title = 'Назва має бути не менше 5 символів';
    }

    if (!description || description.trim().length < 10) {
      errors.description = 'Опис має бути не менше 10 символів';
    }

    if (!contactInfo || contactInfo.trim().length < 5) {
      errors.contactInfo = 'Контакти мають бути не менше 5 символів';
    }

    if (!validCategories.includes(category)) {
      errors.category = 'Оберіть категорію';
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
      errors.price = 'Ціна має бути додатним числом';
    }

    if (Object.keys(errors).length > 0) {
      return res.render('new', {
        errors,
        data: req.body
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        contactInfo: contactInfo.trim(),
      }
    });

    res.redirect(`/announcements/${announcement.id}`);
  } catch (err) {
    next(err);
  }
});

/* =========================
   DETAIL PAGE
========================= */
app.get('/announcements/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).render('404', {
        message: 'Оголошення не знайдено'
      });
    }

    res.render('announcement', { announcement });
  } catch (err) {
    next(err);
  }
});

/* =========================
   DELETE
========================= */
app.delete('/announcements/:id', async (req, res, next) => {
  try {
    await prisma.announcement.delete({
      where: { id: Number(req.params.id) }
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* =========================
   404
========================= */
app.use((req, res) => {
  res.status(404).render('404');
});

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error');
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});