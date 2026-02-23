// Usage: node reset-password.js <user-email> <new-password>
// Example: node reset-password.js test@gmail.com N!12345678

const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Default to ~/.n8n/database.sqlite (where n8n dev mode stores data)
const defaultDb = path.join(os.homedir(), '.n8n', 'database.sqlite');

async function main() {
  const args = process.argv.slice(2);
  let dbPath = defaultDb;
  // Support --db flag
  const dbIdx = args.indexOf('--db');
  if (dbIdx !== -1 && args[dbIdx + 1]) {
    dbPath = args.splice(dbIdx, 2)[1];
  }
  const [email, newPassword] = args;
  if (!email || !newPassword) {
    console.error('Usage: node reset-password.js <email> <password> [--db <path>]');
    process.exit(1);
  }
  console.log('Using database:', dbPath);

  const hash = await bcrypt.hash(newPassword, 10);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Could not open database:', err.message);
      process.exit(1);
    }
  });

  // Enable WAL mode and set busy timeout to handle locked DB
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA busy_timeout=5000');

  db.get('SELECT id, email FROM user WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('Query error:', err.message);
      db.close();
      process.exit(1);
    }
    if (!row) {
      console.error('User not found:', email);
      db.close();
      process.exit(1);
    }

    db.run('UPDATE user SET password = ? WHERE email = ?', [hash, email], function (err2) {
      if (err2) {
        console.error('Update error:', err2.message);
        db.close();
        process.exit(1);
      }
      console.log('Password updated successfully for', email);
      db.close();
    });
  });
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
