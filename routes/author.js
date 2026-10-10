const express = require('express');
const router = express.Router();
const authorDashboardController = require('../controllers/authorDashboardController');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Author Dashboard
router.get('/dashboard', requireAuth, authorDashboardController.getDashboard);

// Submit New Post
router.get('/new-post', requireAuth, authorDashboardController.getNewPostPage);
router.post('/new-post', requireAuth, upload.single('featured_image'), authorDashboardController.postNewPost);

// My Posts List
router.get('/my-posts', requireAuth, authorDashboardController.getMyPosts);

// Profile
router.get('/profile', requireAuth, authorDashboardController.getProfilePage);
router.post('/profile', requireAuth, upload.single('avatar'), authorDashboardController.postProfile);

// Switch back to Admin
router.get('/switch-back', authController.switchBackToAdmin);
router.post('/switch-back', authController.switchBackToAdmin);

module.exports = router;
