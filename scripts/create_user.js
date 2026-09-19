const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createOrUpdateUser() {
  const username = 'mrforayeji';
  const email = 'mrforayeji@sera10.com';
  const plainPassword = 'password123'; // Standard temporary strong password
  const displayName = 'এম আর ফরায়েজী';
  const role = 'admin';

  const hashedPassword = bcrypt.hashSync(plainPassword, 10);

  try {
    const existing = await db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      console.log(`User ${username} already exists (ID: ${existing.id}). Updating password & admin role...`);
      await db.prepare('UPDATE users SET password = ?, role = ?, status = ?, email_verified = 1, is_approved = 1 WHERE id = ?').run(
        hashedPassword,
        role,
        'active',
        existing.id
      );
      console.log(`✅ User ${username} successfully updated with password: ${plainPassword}`);
    } else {
      const res = await db.prepare(`
        INSERT INTO users (username, email, password, display_name, nicename, role, status, email_verified, is_approved, registered_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 1, 1, NOW())
      `).run(username, email, hashedPassword, displayName, username, role);
      console.log(`✅ User ${username} created with ID: ${res.lastInsertRowid || res.insertId}, password: ${plainPassword}`);
    }
  } catch (err) {
    console.error('Error creating user locally:', err);
  } finally {
    process.exit(0);
  }
}

createOrUpdateUser();
