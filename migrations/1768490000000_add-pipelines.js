/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('pipelines', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        connection_id: { type: 'uuid', notNull: true, references: '"connections"', onDelete: 'CASCADE' },
        name: { type: 'text', notNull: true },
        flow_config: { type: 'jsonb', notNull: true, default: '{}' },
        is_active: { type: 'boolean', default: true },
        created_at: { type: 'timestamp with time zone', default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp with time zone', default: pgm.func('current_timestamp') },
    });

    pgm.createIndex('pipelines', 'connection_id');

    pgm.createTable('pipeline_executions', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        pipeline_id: { type: 'uuid', notNull: true, references: '"pipelines"', onDelete: 'CASCADE' },
        status: { type: 'varchar(50)', notNull: true }, // PENDING, RUNNING, COMPLETED, FAILED
        logs: { type: 'jsonb', default: '[]' },
        started_at: { type: 'timestamp with time zone', default: pgm.func('current_timestamp') },
        completed_at: { type: 'timestamp with time zone' },
    });

    pgm.createIndex('pipeline_executions', 'pipeline_id');
};

exports.down = pgm => {
    pgm.dropTable('pipeline_executions');
    pgm.dropTable('pipelines');
};
