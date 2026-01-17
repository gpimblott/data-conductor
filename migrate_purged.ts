
import { db } from './src/lib/db';

async function migrate() {
    try {
        console.log('Adding purged column...');
        await db.query(`
            ALTER TABLE pipeline_executions 
            ADD COLUMN IF NOT EXISTS purged BOOLEAN DEFAULT FALSE;
        `);
        console.log('Column added successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
