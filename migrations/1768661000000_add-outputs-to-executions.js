
/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('pipeline_executions', {
        outputs: { type: 'jsonb' }, // Store output metadata/filepaths
    });
};

exports.down = pgm => {
    pgm.dropColumns('pipeline_executions', ['outputs']);
};
