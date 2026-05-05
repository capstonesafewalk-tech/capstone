const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  try {
    // Connect to MySQL without specifying database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    // Read and execute the database.sql file
    const sql = fs.readFileSync('./database.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (e) {
        // Ignore "database already exists" errors
        if (!e.message.includes('already exists')) {
          console.error('Error executing:', statement.substring(0, 50), e.message);
        }
      }
    }

    console.log('✅ Database setup completed!');
    await connection.end();
  } catch (error) {
    console.error('❌ Setup Error:', error.message);
    process.exit(1);
  }
})();
