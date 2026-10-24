const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'safewalk_admin'
    });
    
    const correctHash = '$2a$10$vagc.o2DVZ8MoRLxXLYkh.x4Yq/IRuWhzhmPR0uYC09VbFzkaj6Zu';
    
    await connection.query(
      'UPDATE admins SET password = ? WHERE email = ?',
      [correctHash, 'admin@safewalk.com']
    );
    
    console.log('✅ Password hash updated successfully!');
    
    const [rows] = await connection.query(
      'SELECT email, password FROM admins WHERE email = ?',
      ['admin@safewalk.com']
    );
    
    console.log('Verified - Email:', rows[0].email);
    console.log('Verified - Password Hash:', rows[0].password);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
