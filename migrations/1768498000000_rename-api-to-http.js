exports.up = (pgm) => {
    pgm.sql("UPDATE connections SET type = 'HTTP' WHERE type = 'API';");
};

exports.down = (pgm) => {
    pgm.sql("UPDATE connections SET type = 'API' WHERE type = 'HTTP';");
};
