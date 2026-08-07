export const sortCards = (cards, sortBy, sortDir) => {
    return cards.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        if (sortBy === 'price') {
            valA = parseFloat(valA || 0);
            valB = parseFloat(valB || 0);
        } else if (sortBy === 'cmc') {
            valA = parseFloat(valA || 0);
            valB = parseFloat(valB || 0);
        } else if (sortBy === 'added_at' || sortBy === 'released_at') {
            valA = new Date(valA || 0).getTime();
            valB = new Date(valB || 0).getTime();
        } else {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
};

export const getBadgeText = (card, sortBy) => {
    if (sortBy === 'price') return `$${(card.price || 0).toFixed(2)}`;
    if (sortBy === 'cmc') return `MV ${card.cmc || 0}`;
    if (sortBy === 'released_at') return (card.released_at || '').substring(0,4);
    if (sortBy === 'type_line') return (card.type_line || '').split('—')[0].trim();
    if (sortBy === 'colors') return card.colors || 'C';
    if (sortBy === 'rarity') return (card.rarity || '').charAt(0).toUpperCase() + (card.rarity || '').slice(1);
    return null;
};

export const parseCardList = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    return lines.map(line => {
        const match = line.match(/^(?:(\d+)x?\s+)?(.+)$/i);
        if (match) {
            return { name: match[2], quantity: parseInt(match[1] || '1', 10) };
        }
        return { name: line, quantity: 1 };
    });
};
