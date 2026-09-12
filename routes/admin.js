const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const db = require('../config/database');

// Require admin or editor role
router.use(requireRole(['admin', 'editor']));

// Global admin metrics middleware
router.use((req, res, next) => {
  try {
    res.locals.adminPendingCount = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'pending'").get().total;
    res.locals.adminCommentsCount = db.prepare("SELECT COUNT(*) AS total FROM comments WHERE status = 'pending'").get().total;
  } catch (err) {
    res.locals.adminPendingCount = 0;
    res.locals.adminCommentsCount = 0;
  }
  next();
});

// 1. Dashboard
router.get('/', adminController.getDashboard);

// 2. Posts & Submenus
router.get('/posts', adminController.getAllPosts);
router.get('/posts/new', adminController.getNewPost);
router.post('/posts/new', upload.single('featured_image'), adminController.postNewPost);
router.get('/posts/:id/edit', adminController.getEditPost);
router.post('/posts/:id/edit', upload.single('featured_image'), adminController.postEditPost);
router.post('/posts/:id/delete', adminController.deletePost);

router.get('/pending', adminController.getPendingPosts);
router.post('/post/:id/approve', adminController.approvePost);
router.post('/post/:id/reject', adminController.rejectPost);

router.get('/categories', adminController.getCategories);
router.post('/categories/add', adminController.postAddCategory);
router.post('/categories/:id/delete', adminController.deleteCategory);

router.get('/tags', adminController.getTags);
router.post('/tags/add', adminController.postAddTag);
router.post('/tags/:id/delete', adminController.deleteTag);

// 3. Media
router.get('/media', adminController.getMedia);
router.post('/media/upload', upload.single('media_file'), adminController.postUploadMedia);
router.post('/media/delete', adminController.deleteMedia);

// 4. Comments
router.get('/comments', adminController.getComments);
router.post('/comments/:id/approve', adminController.approveComment);
router.post('/comments/:id/delete', adminController.deleteComment);

// 5. Books
router.get('/books', adminController.getManageBooks);
router.post('/books/add', upload.single('cover_image'), adminController.postAddBook);
router.post('/books/:id/delete', adminController.deleteBook);

// 6. Users
router.get('/users', adminController.getUsers);
router.get('/users/new', adminController.getNewUser);
router.post('/users/new', upload.single('avatar'), adminController.postNewUser);
router.get('/users/:id/edit', adminController.getEditUser);
router.post('/users/:id/edit', upload.single('avatar'), adminController.postEditUser);
router.post('/users/:id/delete', adminController.deleteUser);

// 7. Settings
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.postSettings);

module.exports = router;
