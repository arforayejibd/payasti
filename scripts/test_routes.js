const http = require('http');

const routes = [
  '/',
  '/authors',
  '/category/goddya',
  '/books',
  '/sitemap.xml',
  '/robots.txt',
  '/spelling-rules',
  '/terms',
  '/login',
  '/register',
  '/api/search?q=%E0%A6%95%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A6%BE'
];

async function testAll() {
  console.log('Testing routes...');
  for (const r of routes) {
    await new Promise((resolve) => {
      http.get(`http://localhost:3000${r}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`[${res.statusCode}] ${r} (${body.length} bytes)`);
          resolve();
        });
      }).on('error', (err) => {
        console.error(`Error on ${r}:`, err.message);
        resolve();
      });
    });
  }
}

testAll();
