exports.up = (pgm) => {
    pgm.addColumns('connections', {
        options: { type: 'jsonb', default: '{}' },
    });
};

exports.down = (pgm) => {
    pgm.dropColumns('connections', ['options']);
};
