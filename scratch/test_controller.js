const postController = require('../controllers/postController');

const req = {
  params: { slug: 'goddya' },
  query: {}
};

const res = {
  render: (view, data) => {
    console.log('View rendered:', view);
    console.log('Category:', data.category.name);
    console.log('Posts count:', data.posts.length);
    console.log('Pagination:', data.pagination);
    console.log('Subcategories:', data.subcategories);
  }
};

postController.getCategoryPage(req, res);
