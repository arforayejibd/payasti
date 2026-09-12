const express = require('express');
const router = express.Router();
const authorDashboardController = require('../controllers/authorDashboardController');
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

module.exports = router;
