const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'safewalk_admin'
    });

    // Generate a fresh hash
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);

    // Update the database
    await conn.query('UPDATE admins SET password = ? WHERE email = ?', [hash, 'admin@safewalk.com']);
    console.log('✅ Password updated in database');

    // Verify
    const [rows] = await conn.query('SELECT email, password FROM admins WHERE email = ?', ['admin@safewalk.com']);
    const storedHash = rows[0].password;
    console.log('Stored hash:', storedHash);

    // Test the stored hash
    const matches = await bcrypt.compare(password, storedHash);
    console.log('Password verification:', matches ? '✅ PASS' : '❌ FAIL');

    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
