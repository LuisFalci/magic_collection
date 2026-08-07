import { openCardModal } from './CardModal.js';

export const renderCard = (card, options = {}) => {
    const { inDeck, deckNames, quantity, onAdd, onRemove, customActionLabel, onCustomAction, selectable, selected, onSelect } = options;
    
    const cardDiv = document.createElement('div');
    cardDiv.className = `mtg-card ${inDeck ? 'in-deck' : ''} ${selected ? 'selected' : ''}`;
    cardDiv.setAttribute('data-id', card.id);
    
    if (selectable) {
        cardDiv.style.cursor = 'pointer';
        cardDiv.onclick = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                const isSelected = cardDiv.classList.contains('selected');
                if (isSelected) {
                    cardDiv.classList.remove('selected');
                    if (onSelect) onSelect(card, false);
                } else {
                    cardDiv.classList.add('selected');
                    if (onSelect) onSelect(card, true);
                }
            } else {
                openCardModal(card, options);
            }
        };
    } else {
        cardDiv.style.cursor = 'pointer';
        cardDiv.onclick = () => openCardModal(card, options);
    }

    if (options.draggable) {
        cardDiv.setAttribute('draggable', 'true');
        cardDiv.ondragstart = (e) => {
            const dataToTransfer = { ...card };
            if (options.isFromDeck) dataToTransfer.isFromDeck = true;
            e.dataTransfer.setData('text/plain', JSON.stringify(dataToTransfer));
            e.dataTransfer.effectAllowed = 'copyMove';
        };
    }

    if (options.badgeText) {
        const extraBadge = document.createElement('div');
        extraBadge.className = 'extra-badge';
        extraBadge.textContent = options.badgeText;
        cardDiv.appendChild(extraBadge);
    }

    const img = document.createElement('img');
    img.src = card.image_url || 'https://via.placeholder.com/250x350?text=Sem+Imagem';
    img.alt = card.name;

    cardDiv.appendChild(img);

    if (options.missing) {
        img.style.filter = 'grayscale(1) opacity(0.7)';
        const missingOverlay = document.createElement('div');
        missingOverlay.textContent = 'FALTANTE';
        missingOverlay.style.position = 'absolute';
        missingOverlay.style.top = '50%';
        missingOverlay.style.left = '50%';
        missingOverlay.style.transform = 'translate(-50%, -50%) rotate(-15deg)';
        missingOverlay.style.color = '#ef4444';
        missingOverlay.style.fontSize = '1.5rem';
        missingOverlay.style.fontWeight = 'bold';
        missingOverlay.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)';
        missingOverlay.style.pointerEvents = 'none';
        missingOverlay.style.zIndex = '5';
        missingOverlay.style.width = '100%';
        missingOverlay.style.textAlign = 'center';
        cardDiv.appendChild(missingOverlay);
    }

    if (deckNames) {
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'deck-badge-container';
        deckNames.split(',').forEach(d => {
            const badge = document.createElement('span');
            badge.className = 'deck-badge';
            badge.textContent = d;
            badgeContainer.appendChild(badge);
        });
        cardDiv.appendChild(badgeContainer);
    }

    if (card.is_favorite) {
        const favBadge = document.createElement('div');
        favBadge.className = 'favorite-badge';
        favBadge.textContent = '⭐';
        favBadge.title = 'Favorita';
        cardDiv.appendChild(favBadge);
    }

    if (quantity !== undefined) {
        const qBadge = document.createElement('div');
        qBadge.className = `quantity-badge ${quantity < 0 ? 'warning' : ''}`;
        qBadge.textContent = quantity;
        cardDiv.appendChild(qBadge);
    }

    return cardDiv;
};
