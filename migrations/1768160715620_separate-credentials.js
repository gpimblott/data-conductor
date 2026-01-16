/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('database_connections', {
        username: { type: 'text' },
        password: { type: 'text' },
    });
};

exports.down = pgm => {
    pgm.dropColumns('database_connections', ['username', 'password']);
};
