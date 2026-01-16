exports.up = (pgm) => {
    pgm.addColumns('connections', {
        last_sync_size: { type: 'bigint', default: 0 }
    });
};

exports.down = (pgm) => {
    pgm.dropColumns('connections', ['last_sync_size']);
};
