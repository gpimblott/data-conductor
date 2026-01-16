/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    // 1. Create Child Tables
    pgm.createTable('rss_connections', {
        connection_id: {
            type: 'uuid',
            notNull: true,
            primaryKey: true,
            references: '"connections"(id)',
            onDelete: 'CASCADE'
        },
        source_url: { type: 'text', notNull: true }
    });

    pgm.createTable('database_connections', {
        connection_id: {
            type: 'uuid',
            notNull: true,
            primaryKey: true,
            references: '"connections"(id)',
            onDelete: 'CASCADE'
        },
        connection_string: { type: 'text', notNull: true },
        sql_query: { type: 'text', notNull: true }
    });

    // 2. Data Migration: Move existing RSS source_urls
    pgm.sql(`
        INSERT INTO rss_connections (connection_id, source_url)
        SELECT id, source_url 
        FROM connections 
        WHERE type = 'RSS' AND source_url IS NOT NULL
    `);

    // 3. Drop column from parent
    pgm.dropColumn('connections', 'source_url');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    // 1. Add column back
    pgm.addColumn('connections', {
        source_url: { type: 'text' }
    });

    // 2. Data Migration: Move RSS source_urls back
    pgm.sql(`
        UPDATE connections
        SET source_url = rss_connections.source_url
        FROM rss_connections
        WHERE connections.id = rss_connections.connection_id
    `);

    // 3. Drop Child Tables
    pgm.dropTable('database_connections');
    pgm.dropTable('rss_connections');
};
