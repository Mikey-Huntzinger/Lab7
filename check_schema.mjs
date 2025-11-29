import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: "z12itfj4c1vgopf8.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "uro6cznr04eygyhx",
    password: "oa8kjjl7zrnapey9",
    database: "go7x7xs242lpoe9s",
    connectionLimit: 10,
    waitForConnections: true
});

async function getSchema() {
    try {
        const [tables] = await pool.query("SHOW TABLES");
        for (let tableObj of tables) {
            const tableName = Object.values(tableObj)[0];
            console.log(`\nTable: ${tableName}`);
            const [columns] = await pool.query(`DESCRIBE ${tableName}`);
            console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
        }
        
        // Check if admin user exists
        const [users] = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        console.log("\nAdmin user exists:", users.length > 0);
        
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

getSchema();
