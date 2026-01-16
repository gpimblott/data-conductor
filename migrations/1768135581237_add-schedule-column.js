exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('connections', {
        schedule: { type: 'varchar(100)', notNull: false },
    });
};

exports.down = pgm => {
    pgm.dropColumns('connections', ['schedule']);
};
