const { DB } = require('../../src/database/database.js');

async function resetDb() {
  const conn = await DB._getConnection(true); // uses configured test DB
  try {
    // Order matters if you have foreign keys
    await conn.execute('DELETE FROM auth');
    await conn.execute('DELETE FROM userRole');
    await conn.execute('DELETE FROM user');
    await conn.execute('DELETE FROM store');
    await conn.execute('DELETE FROM franchise');
    await conn.execute('DELETE FROM orderItem')
  } finally {
    await conn.end();
  }
}

module.exports = { resetDb };
