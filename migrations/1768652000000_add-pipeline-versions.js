/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('pipeline_versions', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        pipeline_id: {
            type: 'uuid',
            notNull: true,
            references: '"pipelines"',
            onDelete: 'CASCADE',
        },
        version: { type: 'integer', notNull: true },
        flow_config: { type: 'jsonb', notNull: true },
        description: { type: 'text' },
        created_at: {
            type: 'timestamp with time zone',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        created_by: { type: 'text' } // Optional: track who made the version
    });

    // Unique constraint on (pipeline_id, version)
    pgm.addConstraint('pipeline_versions', 'pipeline_versions_pipeline_id_version_key', {
        unique: ['pipeline_id', 'version'],
    });

    // Create index on pipeline_id
    pgm.createIndex('pipeline_versions', 'pipeline_id');
};

exports.down = pgm => {
    pgm.dropTable('pipeline_versions');
};
