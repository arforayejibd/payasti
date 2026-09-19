const http = require('http');
const app = require('../server');

const routes = [
  '/',
  '/category/sera-10-lists',
  '/category/tech',
  '/category/books',
  '/category/beauty-and-personal-care',
  '/post/top-10-smartwatches-in-bangladesh',
  '/post/10-best-rice-cookers-in-bangladesh',
  '/sitemap.xml',
  '/robots.txt',
  '/api/search?q=smartwatch'
];

async function runTests() {
  const server = app.listen(3099, async () => {
    console.log('🧪 Test server listening on http://localhost:3099');
    console.log('Running route tests...\n');

    let allPassed = true;

    for (const r of routes) {
      await new Promise((resolve) => {
        const encodedUrl = encodeURI(`http://localhost:3099${r}`);
        http.get(encodedUrl, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            const status = res.statusCode;
            const ok = status >= 200 && status < 400;
            console.log(`[${status}] ${r} (${body.length} bytes) ${ok ? '✅' : '❌'}`);
            if (!ok) allPassed = false;
            resolve();
          });
        }).on('error', (err) => {
          console.error(`❌ Error on ${r}:`, err.message);
          allPassed = false;
          resolve();
        });
      });
    }

    server.close(() => {
      console.log(`\n=============================================`);
      console.log(allPassed ? '🎉 ALL ROUTE TESTS PASSED!' : '⚠️ SOME ROUTES FAILED');
      console.log(`=============================================`);
      process.exit(allPassed ? 0 : 1);
    });
  });
}

runTests().catch(console.error);
