
import { db } from '@/lib/db';

async function checkOutputs() {
    try {
        const { rows } = await db.query(`
            SELECT id, outputs 
            FROM pipeline_executions 
            WHERE outputs IS NOT NULL 
            LIMIT 10
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkOutputs();
