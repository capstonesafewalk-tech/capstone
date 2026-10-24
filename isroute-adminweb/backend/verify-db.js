const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });
    const [databases] = await connection.query('SHOW DATABASES LIKE ?', ['safewalk_admin']);
    if (databases.length > 0) {
      console.log('✅ Database exists');
      const [tables] = await connection.query('SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', ['safewalk_admin']);
      console.log('✅ Tables in database:', tables.length);
    } else {
      console.log('❌ Database not found');
    }
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
