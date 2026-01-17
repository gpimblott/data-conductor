
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Fetch all pipelines with connections + join child tables for data
        const res = await client.query(`
            SELECT 
                p.id as pipeline_id, 
                p.flow_config, 
                p.connection_id,
                c.id as conn_id,
                c.name as conn_name,
                c.type as conn_type,
                c.options as conn_options,
                rss.source_url as rss_url,
                db.connection_string as db_str,
                db.sql_query as db_sql,
                db.username as db_user,
                db.password as db_pass
            FROM pipelines p
            JOIN connections c ON p.connection_id = c.id
            LEFT JOIN rss_connections rss ON c.id = rss.connection_id
            LEFT JOIN database_connections db ON c.id = db.connection_id
            WHERE p.connection_id IS NOT NULL
        `);

        console.log(`Found ${res.rows.length} pipelines to migrate.`);

        for (const row of res.rows) {
            const {
                pipeline_id, flow_config, conn_type, conn_name, conn_options,
                rss_url, db_str, db_sql, db_user, db_pass
            } = row;

            // Construct embedded config based on type
            let embeddedConfig = {};

            if (conn_type === 'RSS') {
                embeddedConfig = {
                    url: rss_url,
                    ...(conn_options || {})
                };
            } else if (['POSTGRES', 'MYSQL'].includes(conn_type) || conn_type === 'DATABASE') {
                // Handling potentially generic DB or specific types
                embeddedConfig = {
                    connectionString: db_str,
                    query: db_sql,
                    username: db_user,
                    password: db_pass,
                    ...(conn_options || {})
                };
            } else {
                // Fallback for types that might not have specialized tables yet or generic
                // If the type is HTTP or API, check if it uses source_url column?
                // Wait, 'API' was renamed to 'HTTP' in migration 1768498000000_rename-api-to-http.js
                // Did that migration move data?
                // Let's assume generic options or handle if missing.
                console.warn(`Unknown connection type ${conn_type} for pipeline ${pipeline_id}. Using options only.`);
                embeddedConfig = {
                    ...(conn_options || {})
                };
            }

            // 2. Find Source Node
            let nodes = flow_config.nodes || [];
            let sourceNode = nodes.find(n => n.type === 'source');
            let updated = false;

            if (sourceNode) {
                sourceNode.data = {
                    ...sourceNode.data,
                    name: conn_name,
                    connectionType: conn_type,
                    connectionConfig: embeddedConfig,
                    // Mark as embedded
                    isEmbedded: true
                };
                updated = true;
            } else {
                console.warn(`Pipeline ${pipeline_id} has no source node.`);
            }

            // 3. Update Pipeline
            if (updated) {
                await client.query(`
                    UPDATE pipelines 
                    SET flow_config = $1, 
                        description = COALESCE(description, 'Migrated from connection: ' || $2)
                    WHERE id = $3
                `, [JSON.stringify(flow_config), conn_name, pipeline_id]);
                console.log(`Migrated pipeline ${pipeline_id} (Connection: ${conn_name})`);
            }
        }

        console.log('Data migration completed.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
