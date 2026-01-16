
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/data_expert',
});

async function run() {
    try {
        const res = await pool.query("SELECT id, name FROM connections WHERE name ILIKE '%BBC%'");
        if (res.rows.length === 0) {
            console.log("No BBC connection found.");
            return;
        }
        const conn = res.rows[0];
        console.log(`Found Connection: ${conn.name} (${conn.id})`);

        const logs = await pool.query(`
            SELECT event_type, status, created_at, message 
            FROM connection_logs 
            WHERE connection_id = $1 AND event_type = 'SYNC'
            ORDER BY created_at DESC 
            LIMIT 10
        `, [conn.id]);

        console.log("Last 10 SYNC Logs (Newest First):");
        logs.rows.forEach((log, i) => {
            console.log(`${i}. [${log.created_at.toISOString()}] ${log.status} - ${log.message}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
