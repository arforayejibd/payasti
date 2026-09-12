const fs = require('fs');
const readline = require('readline');
const db = require('../config/database');

async function migrateAvatars() {
  console.log('Reading payasti_wp737.sql to find attachment URLs...');
  const fileStream = fs.createReadStream('ref/payasti_wp737.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  // Get list of all numeric avatar IDs we need
  const users = db.prepare("SELECT id, avatar FROM users WHERE avatar GLOB '[0-9]*'").all();
  const avatarMap = new Map(); // attachment_id -> [user_ids]
  users.forEach(u => {
    const aid = u.avatar;
    if (!avatarMap.has(aid)) avatarMap.set(aid, []);
    avatarMap.get(aid).push(u.id);
  });
  console.log(`Found ${users.length} users with numeric avatar IDs (unique IDs: ${avatarMap.size})`);

  let matched = 0;
  const updateStmt = db.prepare('UPDATE users SET avatar = ? WHERE id = ?');

  const insertUpdateTransaction = db.transaction((updates) => {
    for (const { url, userId } of updates) {
      updateStmt.run(url, userId);
    }
  });

  const updates = [];

  for await (const line of rl) {
    if (!line.includes("'attachment'") && !line.includes('wp-content/uploads')) continue;

    // Pattern in wp_posts INSERT: (ID, post_author, ..., guid, ..., 'attachment', ...)
    // guid is typically 'https://payasti.com/wp-content/uploads/...'
    for (const [aid, userIds] of avatarMap.entries()) {
      // Look for (aid,
      const pattern = new RegExp(`\\(${aid},\\d+,'[^']*','[^']*','[^']*','[^']*','[^']*','inherit','[^']*','[^']*','[^']*','[^']*','[^']*','[^']*','[^']*','[^']*','[^']*',\\d+,'(https?://[^']+)'`);
      const m = line.match(pattern);
      if (m && m[1]) {
        const url = m[1];
        userIds.forEach(uid => updates.push({ url, userId: uid }));
        matched++;
        avatarMap.delete(aid);
      }
    }

    if (avatarMap.size === 0) break;
  }

  console.log(`Matched ${updates.length} avatars directly via wp_posts.`);

  // If there are still unmatched, try regex matching on the line for aid and image url
  if (avatarMap.size > 0) {
    console.log(`Remaining unmatched: ${avatarMap.size}. Doing broader scan...`);
    const fileStream2 = fs.createReadStream('ref/payasti_wp737.sql');
    const rl2 = readline.createInterface({ input: fileStream2, crlfDelay: Infinity });

    for await (const line of rl2) {
      if (!line.includes('wp-content/uploads')) continue;

      for (const [aid, userIds] of Array.from(avatarMap.entries())) {
        if (line.includes(`(${aid},`)) {
          const urlMatch = line.match(new RegExp(`\\(${aid},[\\s\\S]*?'(https?://payasti\\.com/wp-content/uploads/[^']+\\.(?:jpg|jpeg|png|webp))'`));
          if (urlMatch && urlMatch[1]) {
            userIds.forEach(uid => updates.push({ url: urlMatch[1], userId: uid }));
            avatarMap.delete(aid);
          }
        }
      }
      if (avatarMap.size === 0) break;
    }
  }

  insertUpdateTransaction(updates);
  console.log(`Successfully updated ${updates.length} user avatar URLs in database!`);
  
  // Also check remaining
  const remaining = db.prepare("SELECT id, display_name, avatar FROM users WHERE avatar GLOB '[0-9]*'").all();
  console.log(`Remaining users with numeric avatars: ${remaining.length}`);
}

migrateAvatars().catch(console.error);
