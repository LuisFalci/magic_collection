import { initCollection } from './pages/Collection.js';
import { initDecksList } from './pages/Decks.js';
import { initDeckBuilder } from './pages/DeckBuilder.js';
import { initAllCards } from './pages/AllCards.js';

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path === '/' || path === '/collection.html' || path.endsWith('collection.html')) {
        initCollection();
    } else if (path === '/decks.html' || path.endsWith('decks.html')) {
        initDecksList();
    } else if (path === '/deck-builder.html' || path.endsWith('deck-builder.html')) {
        initDeckBuilder();
    } else if (path === '/all-cards.html' || path.endsWith('all-cards.html')) {
        initAllCards();
    }
});
