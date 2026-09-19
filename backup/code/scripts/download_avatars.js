const fs = require('fs');
const readline = require('readline');
const path = require('path');

const avatarsDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

async function downloadAvatars() {
  const sqlPath = path.join(__dirname, '..', 'ref', 'payasti_wp737.sql');
  const fileStream = fs.createReadStream(sqlPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inTable = null;
  const users = new Map();
  const usermeta = new Map();
  const attachments = new Map();

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `wp8w_users`')) inTable = 'users';
    else if (line.startsWith('INSERT INTO `wp8w_usermeta`')) inTable = 'usermeta';
    else if (line.startsWith('INSERT INTO `wp8w_posts`')) inTable = 'posts';
    else if (line.startsWith('INSERT INTO `')) inTable = null;

    if (inTable === 'users') {
      const matches = line.matchAll(/\((\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'([^']*)',\s*'((?:\\'|[^'])*)',\s*(\d+),\s*'((?:\\'|[^'])*)'\)/g);
      for (const m of matches) {
        users.set(parseInt(m[1]), {
          id: parseInt(m[1]),
          login: m[2].replace(/\\'/g, "'"),
          display_name: m[10].replace(/\\'/g, "'")
        });
      }
    }

    if (inTable === 'usermeta') {
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'([a-zA-Z0-9_\-]+)',\s*'((?:\\'|[^'])*)'\)/g);
      for (const m of matches) {
        if (m[3] === 'wp8w_user_avatar') {
          usermeta.set(parseInt(m[2]), m[4].replace(/\\'/g, "'"));
        }
      }
    }

    if (inTable === 'posts') {
      const matches = line.matchAll(/\((\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'[\s\S]*?',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[\s\S]*?',\s*\d+,\s*'((?:\\'|[^'])*)',\s*\d+,\s*'attachment'/g);
      for (const m of matches) {
        attachments.set(parseInt(m[1]), m[2].replace(/\\'/g, "'"));
      }
    }
  }

  const items = [];
  for (const [uid, u] of users.entries()) {
    const metaVal = usermeta.get(uid);
    if (metaVal) {
      const attId = parseInt(metaVal.trim());
      const guid = attachments.get(attId);
      if (guid) {
        const contentUrl = guid.replace('/wp-content/uploads/', '/content/uploads/');
        const ext = path.extname(new URL(guid).pathname) || '.jpg';
        const cleanLogin = u.login.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${cleanLogin}${ext}`;
        const localPath = path.join(avatarsDir, filename);
        items.push({ uid, username: u.login, name: u.display_name, contentUrl, filename, localPath });
      }
    }
  }

  console.log(`Starting download for ${items.length} author avatars...`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    if (fs.existsSync(item.localPath) && fs.statSync(item.localPath).size > 0) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(item.contentUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(item.localPath, buffer);
        downloaded++;
        process.stdout.write(`Downloaded: ${item.filename} (${buffer.length} bytes)\n`);
      } else {
        failed++;
        console.warn(`Failed (${res.status}): ${item.contentUrl}`);
      }
    } catch (err) {
      failed++;
      console.error(`Error downloading ${item.filename}:`, err.message);
    }
  }

  console.log(`\nAvatar Download Complete!`);
  console.log(` - Total: ${items.length}`);
  console.log(` - Downloaded: ${downloaded}`);
  console.log(` - Already exists: ${skipped}`);
  console.log(` - Failed: ${failed}`);
}

downloadAvatars().catch(console.error);
