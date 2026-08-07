const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'magic_collection.sqlite');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image_url TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS collection (
        card_id TEXT PRIMARY KEY,
        quantity INTEGER DEFAULT 0,
        FOREIGN KEY (card_id) REFERENCES cards (id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS deck_cards (
        deck_id INTEGER,
        card_id TEXT,
        quantity INTEGER DEFAULT 0,
        PRIMARY KEY (deck_id, card_id),
        FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES cards (id)
      )
    `);

    const columns = [
      { table: 'cards', def: 'cmc REAL' },
      { table: 'cards', def: 'type_line TEXT' },
      { table: 'cards', def: 'price REAL' },
      { table: 'cards', def: 'colors TEXT' },
      { table: 'cards', def: 'released_at TEXT' },
      { table: 'cards', def: 'rarity TEXT' },
      { table: 'cards', def: 'is_favorite BOOLEAN DEFAULT 0' },
      { table: 'cards', def: 'oracle_text TEXT' },
      { table: 'collection', def: 'added_at DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { table: 'decks', def: 'cover_card_id TEXT' }
    ];

    columns.forEach(col => {
      db.run(`ALTER TABLE ${col.table} ADD COLUMN ${col.def}`, (err) => {
        // Ignorar erros de coluna já existente
      });
    });
  });
};

initDb();

module.exports = db;
