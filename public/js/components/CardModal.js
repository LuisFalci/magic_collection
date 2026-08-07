export const openCardModal = (card, options = {}) => {
    const { quantity = 0, onAdd, onRemove, customActionLabel, onCustomAction } = options;
    
    let overlay = document.getElementById('global-card-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-card-modal';
        overlay.className = 'card-modal-overlay';
        document.body.appendChild(overlay);
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        };
    }
    
    let currentQuantity = quantity;

    // Build internal content
    overlay.innerHTML = `
        <div class="card-modal-content">
            <button class="card-modal-close">&times;</button>
            <div class="card-modal-image">
                <img src="${card.image_url || 'https://via.placeholder.com/250x350?text=Sem+Imagem'}" alt="${card.name}">
            </div>
            <div class="card-modal-details">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <h2>${card.name}</h2>
                    <button id="btn-favorite" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: ${card.is_favorite ? 'gold' : 'gray'}; transition: transform 0.2s;" title="Favoritar">
                        ${card.is_favorite ? '⭐' : '☆'}
                    </button>
                </div>
                <div class="type-line">${card.type_line || 'Sem Tipo'}</div>
                <div class="stats">
                    <div><strong>Preço:</strong> $${(card.price || 0).toFixed(2)}</div>
                    <div><strong>Valor de Mana:</strong> ${card.cmc || 0}</div>
                    <div><strong>Raridade:</strong> ${(card.rarity || '').charAt(0).toUpperCase() + (card.rarity || '').slice(1)}</div>
                </div>
                
                <div class="card-modal-controls" id="modal-controls">
                    <!-- Dynamic controls -->
                </div>
            </div>
        </div>
    `;

    const closeBtn = overlay.querySelector('.card-modal-close');
    closeBtn.onclick = () => overlay.classList.remove('active');

    const btnFavorite = overlay.querySelector('#btn-favorite');
    if (btnFavorite) {
        let isFavorite = !!card.is_favorite;
        btnFavorite.onclick = async () => {
            isFavorite = !isFavorite;
            btnFavorite.textContent = isFavorite ? '⭐' : '☆';
            btnFavorite.style.color = isFavorite ? 'gold' : 'gray';
            btnFavorite.style.transform = 'scale(1.2)';
            setTimeout(() => btnFavorite.style.transform = 'scale(1)', 200);
            
            card.is_favorite = isFavorite; // update locally
            
            // Atualizar visualmente nas cartas renderizadas no grid
            const gridCards = document.querySelectorAll(`div.mtg-card[data-id="${card.id}"]`);
            gridCards.forEach(cDiv => {
                let favBadge = cDiv.querySelector('.favorite-badge');
                if (isFavorite) {
                    if (!favBadge) {
                        favBadge = document.createElement('div');
                        favBadge.className = 'favorite-badge';
                        favBadge.textContent = '⭐';
                        favBadge.title = 'Favorita';
                        cDiv.appendChild(favBadge);
                    }
                } else {
                    if (favBadge) {
                        favBadge.remove();
                    }
                }
            });

            try {
                const res = await fetch(`/api/cards/${card.id}/favorite`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_favorite: isFavorite })
                });
                if (!res.ok) throw new Error('Failed to update favorite status');
            } catch (err) {
                console.error(err);
            }
        };
    }

    const controlsDiv = overlay.querySelector('#modal-controls');
    
    if (onAdd && onRemove) {
        const btnMinus = document.createElement('button');
        btnMinus.className = 'btn btn-secondary btn-circle';
        btnMinus.textContent = '-';
        
        const qtySpan = document.createElement('span');
        qtySpan.className = 'quantity';
        qtySpan.textContent = currentQuantity;
        
        const btnPlus = document.createElement('button');
        btnPlus.className = 'btn btn-circle';
        btnPlus.textContent = '+';
        
        btnMinus.onclick = () => {
            if (currentQuantity > 0) {
                currentQuantity--;
                qtySpan.textContent = currentQuantity;
            }
            onRemove(card);
        };
        
        btnPlus.onclick = () => {
            currentQuantity++;
            qtySpan.textContent = currentQuantity;
            onAdd(card);
        };

        controlsDiv.appendChild(btnMinus);
        controlsDiv.appendChild(qtySpan);
        controlsDiv.appendChild(btnPlus);
    }

    if (customActionLabel && onCustomAction) {
        const btnCustom = document.createElement('button');
        btnCustom.className = 'btn';
        btnCustom.textContent = customActionLabel;
        btnCustom.onclick = () => {
            onCustomAction(card);
            overlay.classList.remove('active');
        };
        controlsDiv.appendChild(btnCustom);
    }

    // Show modal
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
};
