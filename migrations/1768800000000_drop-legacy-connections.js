/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // 1. Drop specialized connection tables first (FK dependencies)
    pgm.dropTable('rss_connections', { ifExists: true });
    pgm.dropTable('database_connections', { ifExists: true });
    // If http_connections exists, drop it
    pgm.dropTable('http_connections', { ifExists: true });

    // 2. Remove dependencies from other tables BEFORE dropping connections

    // Pipelines: drop connection_id column
    pgm.dropColumn('pipelines', 'connection_id');

    // Connection Logs: drop FK constraint on connection_id
    // We want to keep the column for historical purposes (as a loose ID or null), 
    // but typically if the parent is gone, the ID is meaningless.
    // However, implementation plan said "remove FK constraint".
    // Let's drop the constraint. Finding the constraint name can be tricky if auto-generated.
    // pgm.dropConstraint('connection_logs', 'connection_logs_connection_id_fkey'); 
    // BUT node-pg-migrate usually names it `tablename_columnname_fkey`.

    // Safest way with node-pg-migrate to drop a foreign key is to re-declare the column without references? 
    // Or mostly use dropConstraint.
    // Let's assume standard naming or just ALTER COLUMN to remove reference?
    // Actually, simply dropping the TABLE 'connections' with CASCADE might be easier, 
    // but destructive to the log REFERENCING rows if ON DELETE CASCADE was set (it was SET NULL in migration).

    // In `add-connection-logs-table.js`: onDelete: 'SET NULL'
    // So if we drop `connections` table, `connection_logs.connection_id` becomes NULL automatically?
    // No, standard SQL behavior for DROP TABLE does not automatically update referencing rows unless CASCADE is used on the DROP command, 
    // which cascades the drop to the constraint.
    // Since the FK was created with ON DELETE SET NULL, deleting *rows* sets null.
    // Dropping the *table* usually requires DROP TABLE connections CASCADE, which drops the FK constraint.

    // 3. Drop connections table
    pgm.dropTable('connections', { cascade: true });
    // cascade: true will drop the foreign keys pointing to it.
};

exports.down = pgm => {
    // Irreversible data loss, but we can recreate schema
    pgm.createTable('connections', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        name: { type: 'varchar(255)', notNull: true },
        type: { type: 'varchar(50)', notNull: true },
        source_url: { type: 'text', notNull: true },
        status: { type: 'varchar(50)', default: 'IDLE' },
        last_synced_at: { type: 'timestamp with time zone' },
        created_at: { type: 'timestamp with time zone', default: pgm.func('current_timestamp') },
    });

    // Add connection_id back to pipelines (nullable)
    pgm.addColumn('pipelines', {
        connection_id: { type: 'uuid', references: '"connections"', onDelete: 'CASCADE' }
    });
};
