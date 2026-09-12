const db = require('../config/database');

const booksData = [
  {
    id: 1,
    title: 'বিম্বিত বিরহ পদাবলী',
    slug: 'bimbit-birh-pdabli',
    author_name: 'রহমান মুকুল',
    cover_image: 'https://payasti.com/content/uploads/2026/04/Bimbito-Cover.png',
    regular_price: '৩৯০ টাকা',
    discounted_price: '২৭১ টাকা',
    order_url: 'https://payastiprokashon.com.bd/books/bimbit-birh-pdabli'
  },
  {
    id: 2,
    title: 'মহাবিশ্ব জরায়ুর ভেতর',
    slug: 'mohabiswa-jorayur-bhetor',
    author_name: 'আমিনা শেলী',
    cover_image: 'https://payasti.com/content/uploads/2026/04/%E0%A6%AE%E0%A6%B9%E0%A6%BE%E0%A6%AC%E0%A6%BF%E0%A6%B6%E0%A7%8D%E0%A6%AC-%E0%A6%9C%E0%A6%B0%E0%A6%BE%E0%A7%9F%E0%A7%81%E0%A6%B0-%E0%A6%AD%E0%A7%87%E0%A6%A4%E0%A6%B0.jpg',
    regular_price: '১৭০ টাকা',
    discounted_price: '১১৯ টাকা',
    order_url: 'https://payastiprokashon.com.bd/books/Mohabiswa%20Jorayur%20Bhetor'
  },
  {
    id: 3,
    title: 'ভুল নিশানার তীরন্দাজ',
    slug: 'vul-nisanar-tirondaj',
    author_name: 'রহমান মুকুল',
    cover_image: 'https://payasti.com/content/uploads/2025/11/Vul-nisanar-trondaz.jpg',
    regular_price: '৩৯০ টাকা',
    discounted_price: '৩০০ টাকা',
    order_url: 'https://payastiprokashon.com.bd/books'
  },
  {
    id: 4,
    title: 'দাহকাল',
    slug: 'dahokal',
    author_name: 'আতিকুর ফরায়েজী',
    cover_image: 'https://payasti.com/content/uploads/2025/11/539598060-24390473680594513-3391378367636750143-n.jpg',
    regular_price: '৩৯০ টাকা',
    discounted_price: '২৭১ টাকা',
    order_url: 'https://payastiprokashon.com.bd/books/dahokal'
  },
  {
    id: 5,
    title: 'সহবাস টিফিন',
    slug: 'shohobash-tiffin',
    author_name: 'আমিনা শেলী',
    cover_image: 'https://payasti.com/content/uploads/2025/11/shohohash-tiffin-cover-300x500-1.jpg',
    regular_price: '১৭০ টাকা',
    discounted_price: '১১৮ টাকা',
    order_url: 'https://payastiprokashon.com.bd/books/shohobash-tiffin'
  },
  {
    id: 6,
    title: 'ইগল্প কমিক্স',
    slug: 'egolpo-comics',
    author_name: 'মোঃ মাহফুজুর রহমান',
    cover_image: 'https://payasti.com/content/uploads/2025/11/screenshot-2025-08-26-225615-300x500-1.png',
    regular_price: '১৭০ টাকা',
    discounted_price: '১৪৪ টাকা',
    order_url: 'https://www.rokomari.com/book/498452/egolpo-comics'
  },
  {
    id: 7,
    title: 'কিছু কথা',
    slug: 'kichu-kotha',
    author_name: 'মো. হাবিবুর রহমান মজুমদার',
    cover_image: 'https://payasti.com/content/uploads/2025/11/mojumdar-cover-300x500-1.png',
    regular_price: '২৯৫ টাকা',
    discounted_price: '৩৯০ টাকা',
    order_url: 'https://www.rokomari.com/book/471386/kichu-kotha'
  },
  {
    id: 8,
    title: 'বিজ্ঞানীদের গল্প যাঁরা সভ্যতার আলো জ্বেলেছিলেন',
    slug: 'bigganider-golpo-zara-sovvotar-alo-jelechilen',
    author_name: 'মোছাঃ আফরোজা খাতুন',
    cover_image: 'https://payasti.com/content/uploads/2025/11/3b401af2-8491-48e1-a2ce-4899d1356f04-300x500-1.jpeg',
    regular_price: '৩৯০ টাকা',
    discounted_price: '১১৮ টাকা',
    order_url: 'https://www.rokomari.com/book/467504/bigganider-golpo-zara-sovvotar-alo-jelechilen'
  },
  {
    id: 9,
    title: 'দেশটা কারও বাপের না',
    slug: 'deshta-karor-baper-na',
    author_name: 'আব্দুর রহমান',
    cover_image: 'https://payasti.com/content/uploads/2025/11/deshta-karor-baper-na-300x500-1.jpeg',
    regular_price: '১৭০ টাকা',
    discounted_price: '১০১ টাকা',
    order_url: 'https://www.rokomari.com/book/446476/deshta-karor-baper-na'
  },
  {
    id: 10,
    title: 'হেমলকের ঘ্রাণ',
    slug: 'hemolker-ghran',
    author_name: 'মোস্তাফিজ ফরায়েজী',
    cover_image: 'https://payasti.com/content/uploads/2025/11/hemloker-gran-300x500-1.png',
    regular_price: '৪০০ টাকা',
    discounted_price: '১৭৬ টাকা',
    order_url: 'https://www.rokomari.com/book/455275/hemolker-ghran'
  },
  {
    id: 11,
    title: 'যে মন্দিরে পতিতারা রানি',
    slug: 'je-mondire-potitara-rani',
    author_name: 'পিন্টু রহমান',
    cover_image: 'https://payasti.com/content/uploads/2025/11/je-mondire-potitara-rani-300x500-1.jpeg',
    regular_price: '১৭০ টাকা',
    discounted_price: '১১৯ টাকা',
    order_url: 'https://payastiprokashon.com.bd/books/je-mondire-potitara-rani'
  },
  {
    id: 12,
    title: 'অতল জলের গভীরতা',
    slug: 'otol-joler-gobhirota',
    author_name: 'আতিকুর ফরায়েজী',
    cover_image: 'https://payasti.com/content/uploads/2025/11/otol-joner-gobhirata-300x500-1.png',
    regular_price: '৩৯০ টাকা',
    discounted_price: '১১৮ টাকা',
    order_url: 'https://www.rokomari.com/book/446470/otol-joler-gobhirota'
  }
];

const updateStmt = db.prepare(`
  UPDATE books 
  SET title = ?, slug = ?, author_name = ?, cover_image = ?, regular_price = ?, discounted_price = ?, order_url = ?
  WHERE id = ?
`);

for (const b of booksData) {
  updateStmt.run(b.title, b.slug, b.author_name, b.cover_image, b.regular_price, b.discounted_price, b.order_url, b.id);
}

console.log('Successfully synchronized 12 books with live website data!');
