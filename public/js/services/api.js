const API_BASE = '/api';

const api = {
    searchCards: async (query) => {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        return res.json();
    },
    
    getCollection: async () => {
        const res = await fetch(`${API_BASE}/collection`);
        return res.json();
    },
    
    importCards: async (names) => {
        const res = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names })
        });
        return res.json();
    },

    syncDatabase: async () => {
        const res = await fetch(`${API_BASE}/sync`, { method: 'POST' });
        return res.json();
    },
    
    updateCollection: async (card_id, quantity) => {
        const res = await fetch(`${API_BASE}/collection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id, quantity })
        });
        return res.json();
    },
    
    getDecks: async () => {
        const res = await fetch(`${API_BASE}/decks`);
        return res.json();
    },
    
    createDeck: async (name) => {
        const res = await fetch(`${API_BASE}/decks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return res.json();
    },

    updateDeck: async (id, name, cover_card_id) => {
        const res = await fetch(`${API_BASE}/decks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, cover_card_id })
        });
        return res.json();
    },

    cloneDeck: async (id) => {
        const res = await fetch(`${API_BASE}/decks/${id}/clone`, {
            method: 'POST'
        });
        return res.json();
    },

    deleteDeck: async (id) => {
        const res = await fetch(`${API_BASE}/decks/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },
    
    getDeckDetails: async (id) => {
        const res = await fetch(`${API_BASE}/decks/${id}`);
        return res.json();
    },
    
    updateDeckCard: async (deckId, card_id, quantity) => {
        const res = await fetch(`${API_BASE}/decks/${deckId}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id, quantity })
        });
        return res.json();
    },
    
    getAllCards: async (page = 1, limit = 50, q = '') => {
        const res = await fetch(`${API_BASE}/all-cards?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`);
        return res.json();
    },
    
    importBulk: async () => {
        const res = await fetch(`${API_BASE}/import-bulk`, { method: 'POST' });
        return res.json();
    }
};

export default api;
