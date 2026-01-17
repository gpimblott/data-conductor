
/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('pipelines', {
        schedule: { type: 'varchar(100)', notNull: false }, // Cron expression or interval
    });
};

exports.down = pgm => {
    pgm.dropColumns('pipelines', ['schedule']);
};
