/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.createTable('connection_logs', {
        id: {
            type: 'uuid',
            default: pgm.func('gen_random_uuid()'),
            notNull: true,
            primaryKey: true
        },
        connection_id: {
            type: 'uuid',
            notNull: false,
            references: '"connections"',
            onDelete: 'SET NULL'
        },
        connection_name: {
            type: 'text',
            notNull: true
        },
        event_type: {
            type: 'text',
            notNull: true // 'CREATE', 'UPDATE', 'DELETE', 'SYNC'
        },
        status: {
            type: 'text',
            notNull: true // 'SUCCESS', 'FAILURE', 'INFO'
        },
        message: {
            type: 'text',
            notNull: true
        },
        details: {
            type: 'jsonb',
            notNull: false
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });

    pgm.createIndex('connection_logs', 'connection_id');
    pgm.createIndex('connection_logs', 'created_at');
};

exports.down = (pgm) => {
    pgm.dropTable('connection_logs');
};
