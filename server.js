const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

// For Node < 18 we would need node-fetch, but for modern Node, global fetch is available.
// If fetch is not defined, we'll try to require it just in case, but native is preferred.
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// 1. Search Scryfall and cache card
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query parameter "q" is required' });

    try {
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'MageVault/1.0',
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
             if(response.status === 404) return res.json({ data: [] });
             throw new Error(`Scryfall API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        const cards = data.data.map(card => {
            let imgUrl = '';
            if (card.image_uris && card.image_uris.normal) {
                imgUrl = card.image_uris.normal;
            } else if (card.card_faces && card.card_faces[0].image_uris) {
                imgUrl = card.card_faces[0].image_uris.normal;
            }
            return {
                id: card.id,
                name: card.name,
                image_url: imgUrl,
                cmc: card.cmc || 0,
                type_line: card.type_line || '',
                price: parseFloat(card.prices?.usd || 0),
                colors: (card.colors || []).join(','),
                released_at: card.released_at || '',
                rarity: card.rarity || ''
            };
        }).filter(c => c.image_url); // filter out cards without images for simplicity

        // Cache cards in DB asynchronously
        cards.forEach(c => {
             db.run(`INSERT INTO cards (id, name, image_url, cmc, type_line, price, colors, released_at, rarity) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET 
                     cmc=excluded.cmc, type_line=excluded.type_line, price=excluded.price, 
                     colors=excluded.colors, released_at=excluded.released_at, rarity=excluded.rarity`, 
                     [c.id, c.name, c.image_url, c.cmc, c.type_line, c.price, c.colors, c.released_at, c.rarity]);
        });

        res.json({ data: cards });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search cards' });
    }
});

// 1.5 Import list of cards
app.post('/api/import', async (req, res) => {
    const { names } = req.body;
    if (!names || !Array.isArray(names)) return res.status(400).json({ error: 'Array of names required' });

    try {
        const uniqueNames = [...new Set(names)];
        const chunks = [];
        for (let i = 0; i < uniqueNames.length; i += 75) {
            chunks.push(uniqueNames.slice(i, i + 75));
        }

        let allCards = [];

        for (const chunk of chunks) {
            const identifiers = chunk.map(name => ({ name }));
            const response = await fetch('https://api.scryfall.com/cards/collection', {
                method: 'POST',
                headers: {
                    'User-Agent': 'MageVault/1.0',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ identifiers })
            });

            if (!response.ok) {
                 if (response.status === 404) {
                     continue;
                 }
                 console.error(`Scryfall API error: ${response.status} ${response.statusText}`);
                 continue;
            }
            
            const data = await response.json();
            const cards = data.data.map(card => {
                let imgUrl = '';
                if (card.image_uris && card.image_uris.normal) {
                    imgUrl = card.image_uris.normal;
                } else if (card.card_faces && card.card_faces[0].image_uris) {
                    imgUrl = card.card_faces[0].image_uris.normal;
                }
                return {
                    id: card.id,
                    name: card.name,
                    image_url: imgUrl,
                    cmc: card.cmc || 0,
                    type_line: card.type_line || '',
                    price: parseFloat(card.prices?.usd || 0),
                    colors: (card.colors || []).join(','),
                    released_at: card.released_at || '',
                    rarity: card.rarity || ''
                };
            }).filter(c => c.image_url);

            allCards = allCards.concat(cards);
            await new Promise(r => setTimeout(r, 100)); // Rate limit protection
        }

        // Cache cards in DB asynchronously
        allCards.forEach(c => {
             db.run(`INSERT INTO cards (id, name, image_url, cmc, type_line, price, colors, released_at, rarity) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET 
                     cmc=excluded.cmc, type_line=excluded.type_line, price=excluded.price, 
                     colors=excluded.colors, released_at=excluded.released_at, rarity=excluded.rarity`, 
                     [c.id, c.name, c.image_url, c.cmc, c.type_line, c.price, c.colors, c.released_at, c.rarity]);
        });

        res.json({ data: allCards });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import cards' });
    }
});

// 1.8 Sync DB
app.post('/api/sync', (req, res) => {
    db.all('SELECT id FROM cards', [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.json({ success: true });

        const ids = rows.map(r => r.id);
        const chunks = [];
        for (let i = 0; i < ids.length; i += 75) {
            chunks.push(ids.slice(i, i + 75));
        }

        try {
            for (const chunk of chunks) {
                const identifiers = chunk.map(id => ({ id }));
                const response = await fetch('https://api.scryfall.com/cards/collection', {
                    method: 'POST',
                    headers: {
                        'User-Agent': 'MageVault/1.0',
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ identifiers })
                });

                if (response.ok) {
                    const data = await response.json();
                    const cards = data.data.map(card => ({
                        id: card.id,
                        cmc: card.cmc || 0,
                        type_line: card.type_line || '',
                        price: parseFloat(card.prices?.usd || 0),
                        colors: (card.colors || []).join(','),
                        released_at: card.released_at || '',
                        rarity: card.rarity || ''
                    }));

                    cards.forEach(c => {
                        db.run(`UPDATE cards SET cmc=?, type_line=?, price=?, colors=?, released_at=?, rarity=? WHERE id=?`, 
                               [c.cmc, c.type_line, c.price, c.colors, c.released_at, c.rarity, c.id]);
                    });
                }
                await new Promise(r => setTimeout(r, 100)); // Rate limit protection
            }
            res.json({ success: true });
        } catch (error) {
            console.error('Sync error:', error);
            res.status(500).json({ error: 'Failed to sync cards' });
        }
    });
});

// 2. Collection
app.get('/api/collection', (req, res) => {
    // Get all cards in collection, plus how many are used in decks
    const query = `
        SELECT 
            c.card_id as id, 
            cards.name, 
            cards.image_url, 
            cards.cmc,
            cards.type_line,
            cards.price,
            cards.colors,
            cards.released_at,
            cards.rarity,
            cards.is_favorite,
            c.added_at,
            c.quantity as owned_quantity,
            COALESCE(SUM(dc.quantity), 0) as used_quantity,
            GROUP_CONCAT(DISTINCT d.name) as deck_names
        FROM collection c
        JOIN cards ON c.card_id = cards.id
        LEFT JOIN deck_cards dc ON c.card_id = dc.card_id
        LEFT JOIN decks d ON dc.deck_id = d.id
        GROUP BY c.card_id
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/cards/:id/favorite', (req, res) => {
    const { is_favorite } = req.body;
    db.run('UPDATE cards SET is_favorite = ? WHERE id = ?', [is_favorite ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, is_favorite: !!is_favorite });
    });
});

app.post('/api/collection', (req, res) => {
    const { card_id, quantity } = req.body; 
    if (!card_id || quantity === undefined) return res.status(400).json({ error: 'Missing card_id or quantity' });

    if (quantity <= 0) {
        db.run('DELETE FROM collection WHERE card_id = ?', [card_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        db.run(
            `INSERT INTO collection (card_id, quantity) VALUES (?, ?) 
             ON CONFLICT(card_id) DO UPDATE SET quantity = ?`,
            [card_id, quantity, quantity],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    }
});

// 3. Decks
app.get('/api/decks', (req, res) => {
    db.all('SELECT * FROM decks', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/decks', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Deck name required' });

    db.run('INSERT INTO decks (name) VALUES (?)', [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

app.put('/api/decks/:id', (req, res) => {
    const deckId = req.params.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Deck name required' });

    db.run('UPDATE decks SET name = ? WHERE id = ?', [name, deckId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Deck not found' });
        res.json({ success: true });
    });
});

app.delete('/api/decks/:id', (req, res) => {
    const deckId = req.params.id;
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM deck_cards WHERE deck_id = ?', [deckId], err => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            db.run('DELETE FROM decks WHERE id = ?', [deckId], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                db.run('COMMIT');
                res.json({ success: true });
            });
        });
    });
});

app.get('/api/decks/:id', (req, res) => {
    const deckId = req.params.id;
    db.get('SELECT * FROM decks WHERE id = ?', [deckId], (err, deck) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!deck) return res.status(404).json({ error: 'Deck not found' });

        db.all(`
            SELECT dc.quantity, c.id, c.name, c.image_url, c.cmc, c.type_line, c.price, c.colors, c.released_at, c.rarity, c.is_favorite 
            FROM deck_cards dc 
            JOIN cards c ON dc.card_id = c.id 
            WHERE dc.deck_id = ?
        `, [deckId], (err, cards) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ deck, cards });
        });
    });
});

app.post('/api/decks/:id/cards', (req, res) => {
    const deckId = req.params.id;
    const { card_id, quantity } = req.body; 

    if (!card_id || quantity === undefined) return res.status(400).json({ error: 'Missing card_id or quantity' });

    if (quantity <= 0) {
         db.run('DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ?', [deckId, card_id], err => {
             if (err) return res.status(500).json({ error: err.message });
             res.json({ success: true });
         });
    } else {
         db.run(
            `INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES (?, ?, ?)
             ON CONFLICT(deck_id, card_id) DO UPDATE SET quantity = ?`,
            [deckId, card_id, quantity, quantity],
            err => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    }
});

app.delete('/api/decks/:id/cards/:card_id', (req, res) => {
    const deckId = req.params.id;
    const cardId = req.params.card_id;

    db.run('DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ?', [deckId, cardId], err => {
         if (err) return res.status(500).json({ error: err.message });
         res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
