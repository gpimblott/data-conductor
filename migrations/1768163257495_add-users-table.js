exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.createTable('users', {
        id: {
            type: 'uuid',
            default: pgm.func('gen_random_uuid()'),
            notNull: true,
            primaryKey: true
        },
        email: {
            type: 'text',
            notNull: true,
            unique: true
        },
        password: {
            type: 'text',
            notNull: true
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });
};

exports.down = (pgm) => {
    pgm.dropTable('users');
};
