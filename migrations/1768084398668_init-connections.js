/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Create table only if it doesn't exist to be safe during transition
    pgm.createTable('connections', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        name: { type: 'varchar(255)', notNull: true },
        type: { type: 'varchar(50)', notNull: true },
        source_url: { type: 'text', notNull: true },
        status: { type: 'varchar(50)', default: 'IDLE' },
        last_synced_at: { type: 'timestamp with time zone' },
        created_at: { type: 'timestamp with time zone', default: pgm.func('current_timestamp') },
    }, {
        ifNotExists: true
    });

    // Seed initial data if table is empty
    pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM connections) THEN
        INSERT INTO connections (name, type, source_url, status)
        VALUES 
          ('TechCrunch RSS', 'RSS', 'https://techcrunch.com/feed', 'ACTIVE'),
          ('BBC News World', 'RSS', 'http://feeds.bbci.co.uk/news/world/rss.xml', 'IDLE');
      END IF;
    END
    $$;
  `);
};

exports.down = pgm => {
    pgm.dropTable('connections');
};
