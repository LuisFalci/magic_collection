const app = {
    // --- Helper to sort cards ---
    sortCards: (cards, sortBy, sortDir) => {
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
    },

    getBadgeText: (card, sortBy) => {
        if (sortBy === 'price') return `$${(card.price || 0).toFixed(2)}`;
        if (sortBy === 'cmc') return `MV ${card.cmc || 0}`;
        if (sortBy === 'released_at') return (card.released_at || '').substring(0,4);
        if (sortBy === 'type_line') return (card.type_line || '').split('—')[0].trim();
        if (sortBy === 'colors') return card.colors || 'C';
        if (sortBy === 'rarity') return (card.rarity || '').charAt(0).toUpperCase() + (card.rarity || '').slice(1);
        return null;
    },

    // --- Helper to render a card ---
    renderCard: (card, options = {}) => {
        const { inDeck, deckNames, quantity, onAdd, onRemove, customActionLabel, onCustomAction, selectable, selected, onSelect } = options;
        
        const cardDiv = document.createElement('div');
        cardDiv.className = `mtg-card ${inDeck ? 'in-deck' : ''} ${selected ? 'selected' : ''}`;
        
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
                    app.openCardModal(card, options);
                }
            };
        } else {
            cardDiv.style.cursor = 'pointer';
            cardDiv.onclick = () => app.openCardModal(card, options);
        }

        if (options.draggable) {
            cardDiv.setAttribute('draggable', 'true');
            cardDiv.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify(card));
                e.dataTransfer.effectAllowed = 'copy';
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

        if (quantity !== undefined) {
            const qBadge = document.createElement('div');
            qBadge.className = `quantity-badge ${quantity < 0 ? 'warning' : ''}`;
            qBadge.textContent = quantity;
            cardDiv.appendChild(qBadge);
        }

        return cardDiv;
    },

    openCardModal: (card, options) => {
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
        
        // Render add/remove controls if they exist (usually for collection or deck)
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
    },

    // --- Helper to parse card list text ---
    parseCardList: (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        return lines.map(line => {
            const match = line.match(/^(?:(\d+)x?\s+)?(.+)$/i);
            if (match) {
                return { name: match[2], quantity: parseInt(match[1] || '1', 10) };
            }
            return { name: line, quantity: 1 };
        });
    },

    // --- Collection View ---
    initCollection: async () => {
        const grid = document.getElementById('collection-grid');
        const searchInput = document.getElementById('add-card-search');
        const searchBtn = document.getElementById('btn-search-add');
        const searchResultsArea = document.getElementById('add-search-results');
        
        let selectedCollectionCards = new Set();
        let allCollectionCards = [];
        let allCollectionSelected = false;
        
        const btnDeleteSelected = document.getElementById('btn-delete-selected');
        const btnSelectAll = document.getElementById('btn-select-all');
        const sortSelect = document.getElementById('sort-select');
        const sortDirBtn = document.getElementById('btn-sort-dir');
        const btnSyncDb = document.getElementById('btn-sync-db');
        const gridColumnsSelect = document.getElementById('grid-columns-select');
        
        const btnToggleFilters = document.getElementById('btn-toggle-filters');
        const filtersSection = document.getElementById('filters-section');
        const btnApplyFilters = document.getElementById('btn-apply-filters');
        const btnClearFilters = document.getElementById('btn-clear-filters');

        let currentSortBy = 'name';
        let currentSortDir = 'asc';
        let activeTypeFilters = [];
        let filterFavorites = false;

        if (gridColumnsSelect) {
            gridColumnsSelect.onchange = () => {
                const val = gridColumnsSelect.value;
                if (val === 'auto') {
                    grid.style.gridTemplateColumns = ''; // reset to CSS default
                } else {
                    grid.style.gridTemplateColumns = `repeat(${val}, 1fr)`;
                }
            };
        }

        if (btnToggleFilters) {
            btnToggleFilters.onclick = () => {
                filtersSection.style.display = filtersSection.style.display === 'none' ? 'block' : 'none';
            };
        }

        if (btnApplyFilters) {
            btnApplyFilters.onclick = () => {
                const checkboxes = document.querySelectorAll('.type-filter:checked');
                activeTypeFilters = Array.from(checkboxes).map(cb => cb.value);
                const favCheckbox = document.getElementById('filter-favorites');
                if (favCheckbox) filterFavorites = favCheckbox.checked;
                filtersSection.style.display = 'none';
                loadCollection(false);
            };
        }

        if (btnClearFilters) {
            btnClearFilters.onclick = () => {
                document.querySelectorAll('.type-filter').forEach(cb => cb.checked = false);
                const favCheckbox = document.getElementById('filter-favorites');
                if (favCheckbox) favCheckbox.checked = false;
                activeTypeFilters = [];
                filterFavorites = false;
                filtersSection.style.display = 'none';
                loadCollection(false);
            };
        }

        if (sortSelect) {
            sortSelect.onchange = () => { currentSortBy = sortSelect.value; loadCollection(false); };
            sortDirBtn.onclick = () => { 
                currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc'; 
                sortDirBtn.textContent = currentSortDir === 'asc' ? '↑' : '↓';
                loadCollection(false); 
            };
        }

        if (btnSyncDb) {
            btnSyncDb.onclick = async () => {
                btnSyncDb.disabled = true;
                btnSyncDb.textContent = 'Sincronizando...';
                await api.syncDatabase();
                btnSyncDb.disabled = false;
                btnSyncDb.textContent = '🔄 Sincronizar';
                alert('Banco de dados sincronizado com sucesso!');
                loadCollection();
            };
        }
        
        const updateDeleteBtn = () => {
            if (!btnDeleteSelected) return;
            if (selectedCollectionCards.size > 0) {
                btnDeleteSelected.style.display = 'block';
                btnDeleteSelected.textContent = `Deletar Selecionadas (${selectedCollectionCards.size})`;
            } else {
                btnDeleteSelected.style.display = 'none';
            }
        };

        if (btnSelectAll) {
            btnSelectAll.onclick = () => {
                if (allCollectionSelected) {
                    selectedCollectionCards.clear();
                    allCollectionSelected = false;
                    btnSelectAll.textContent = 'Selecionar Tudo';
                } else {
                    allCollectionCards.forEach(c => selectedCollectionCards.add(c.id));
                    allCollectionSelected = true;
                    btnSelectAll.textContent = 'Desmarcar Tudo';
                }
                updateDeleteBtn();
                loadCollection(false);
            };
        }

        if (btnDeleteSelected) {
            btnDeleteSelected.onclick = async () => {
                if (!confirm(`Tem certeza que deseja remover ${selectedCollectionCards.size} carta(s) da coleção?`)) return;
                
                btnDeleteSelected.disabled = true;
                btnDeleteSelected.textContent = 'Deletando...';
                
                for (const cardId of selectedCollectionCards) {
                    await api.updateCollection(cardId, 0);
                }
                
                selectedCollectionCards.clear();
                allCollectionSelected = false;
                if (btnSelectAll) btnSelectAll.textContent = 'Selecionar Tudo';
                updateDeleteBtn();
                btnDeleteSelected.disabled = false;
                loadCollection();
            };
        }

        const loadCollection = async (fetchData = true) => {
            if (fetchData) {
                grid.innerHTML = '<p>Carregando...</p>';
                allCollectionCards = await api.getCollection();
            }
            grid.innerHTML = '';
            
            if (allCollectionCards.length === 0) {
                if (btnSelectAll) btnSelectAll.style.display = 'none';
            } else {
                if (btnSelectAll) btnSelectAll.style.display = 'block';
            }
            
            let filteredCards = allCollectionCards;
            if (activeTypeFilters.length > 0) {
                filteredCards = filteredCards.filter(card => {
                    const typeLine = card.type_line || '';
                    return activeTypeFilters.some(t => typeLine.includes(t));
                });
            }
            if (filterFavorites) {
                filteredCards = filteredCards.filter(card => card.is_favorite);
            }

            app.sortCards(filteredCards, currentSortBy, currentSortDir);
            
            if (filteredCards.length === 0) {
                grid.innerHTML = '<p>Nenhuma carta encontrada com esses filtros ou a coleção está vazia.</p>';
            }

            filteredCards.forEach(card => {
                const used = parseInt(card.used_quantity || 0);
                const owned = parseInt(card.owned_quantity || 0);
                const available = owned - used;

                grid.appendChild(app.renderCard(card, {
                    inDeck: used > 0,
                    deckNames: card.deck_names,
                    quantity: owned,
                    selectable: true,
                    selected: selectedCollectionCards.has(card.id),
                    badgeText: app.getBadgeText(card, currentSortBy),
                    onSelect: (c, isChecked) => {
                        if (isChecked) selectedCollectionCards.add(c.id);
                        else selectedCollectionCards.delete(c.id);
                        updateDeleteBtn();
                    },
                    onAdd: async (c) => {
                        await api.updateCollection(c.id, owned + 1);
                        loadCollection();
                    },
                    onRemove: async (c) => {
                        if (owned > 0) {
                            await api.updateCollection(c.id, owned - 1);
                            loadCollection();
                        }
                    }
                }));
            });
        };

        searchBtn.onclick = async () => {
            const q = searchInput.value;
            if (!q) return;
            searchResultsArea.style.display = 'grid';
            searchResultsArea.innerHTML = '<p>Buscando...</p>';
            const res = await api.searchCards(q);
            searchResultsArea.innerHTML = '';
            if (!res.data || res.data.length === 0) {
                searchResultsArea.innerHTML = '<p>Nenhuma carta encontrada.</p>';
                return;
            }
            res.data.forEach(card => {
                searchResultsArea.appendChild(app.renderCard(card, {
                    customActionLabel: 'Adicionar à Coleção',
                    onCustomAction: async (c) => {
                        // find if we already have it to increment
                        const collection = await api.getCollection();
                        const existing = collection.find(ec => ec.id === c.id);
                        const currentQ = existing ? existing.owned_quantity : 0;
                        await api.updateCollection(c.id, currentQ + 1);
                        alert('Carta adicionada!');
                        loadCollection();
                    }
                }));
            });
        };

        const btnToggleImport = document.getElementById('btn-toggle-import');
        const importSection = document.getElementById('import-section');
        const btnCancelImport = document.getElementById('btn-cancel-import');
        const btnConfirmImport = document.getElementById('btn-confirm-import');
        const importText = document.getElementById('import-list-text');

        if (btnToggleImport) {
            btnToggleImport.onclick = () => importSection.style.display = 'block';
            btnCancelImport.onclick = () => { importSection.style.display = 'none'; importText.value = ''; };
            
            btnConfirmImport.onclick = async () => {
                const text = importText.value;
                if (!text.trim()) return;
                
                btnConfirmImport.textContent = 'Importando...';
                btnConfirmImport.disabled = true;

                const parsed = app.parseCardList(text);
                const names = [...new Set(parsed.map(p => p.name))];
                
                try {
                    const res = await api.importCards(names);
                    if (res.data && res.data.length > 0) {
                        const collection = await api.getCollection();
                        for (const item of parsed) {
                            const card = res.data.find(c => c.name.toLowerCase() === item.name.toLowerCase());
                            if (card) {
                                const existing = collection.find(ec => ec.id === card.id);
                                const currentQ = existing ? existing.owned_quantity : 0;
                                await api.updateCollection(card.id, currentQ + item.quantity);
                            }
                        }
                        alert('Importação concluída!');
                        importSection.style.display = 'none';
                        importText.value = '';
                        loadCollection();
                    } else {
                        alert('Nenhuma carta encontrada.');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Erro ao importar cartas.');
                }
                
                btnConfirmImport.textContent = 'Importar para Coleção';
                btnConfirmImport.disabled = false;
            };
        }

        loadCollection();
    },

    // --- Decks List View ---
    initDecksList: async () => {
        const list = document.getElementById('decks-list');
        const loadDecks = async () => {
            list.innerHTML = '<p>Carregando...</p>';
            const decks = await api.getDecks();
            list.innerHTML = '';
            if (decks.length === 0) {
                list.innerHTML = '<p>Você ainda não tem decks.</p>';
                return;
            }
            decks.forEach(deck => {
                const item = document.createElement('div');
                item.className = 'deck-item';
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                
                const link = document.createElement('a');
                link.href = `/deck-builder.html?id=${deck.id}`;
                link.className = 'deck-item-title';
                link.style.flex = '1';
                link.style.textDecoration = 'none';
                link.style.color = 'var(--text-main)';
                link.textContent = deck.name;
                
                const actions = document.createElement('div');
                actions.style.display = 'flex';
                actions.style.gap = '0.5rem';
                
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn';
                btnEdit.style.padding = '0.5rem 1rem';
                btnEdit.style.fontSize = '0.9rem';
                btnEdit.textContent = 'Editar Nome';
                btnEdit.onclick = async (e) => {
                    e.preventDefault();
                    const newName = prompt('Digite o novo nome do deck:', deck.name);
                    if (newName && newName.trim() !== '' && newName !== deck.name) {
                        try {
                            await api.updateDeck(deck.id, newName.trim());
                            loadDecks();
                        } catch (err) {
                            alert('Erro ao atualizar o deck.');
                        }
                    }
                };
                
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn btn-danger';
                btnDelete.style.padding = '0.5rem 1rem';
                btnDelete.style.fontSize = '0.9rem';
                btnDelete.style.background = 'var(--accent-red, #ef4444)';
                btnDelete.textContent = 'Deletar';
                btnDelete.onclick = async (e) => {
                    e.preventDefault();
                    if (confirm(`Tem certeza que deseja deletar o deck "${deck.name}"?`)) {
                        try {
                            await api.deleteDeck(deck.id);
                            loadDecks();
                        } catch (err) {
                            alert('Erro ao deletar o deck.');
                        }
                    }
                };
                
                actions.appendChild(btnEdit);
                actions.appendChild(btnDelete);
                
                item.appendChild(link);
                item.appendChild(actions);
                list.appendChild(item);
            });
        };
        loadDecks();
    },

    // --- Deck Builder View ---
    initDeckBuilder: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const deckId = urlParams.get('id');

        const setupPanel = document.getElementById('setup-panel');
        const builderPanel = document.getElementById('builder-panel');
        const deckLayout = document.getElementById('deck-builder-layout');
        const deckSidebar = document.getElementById('deck-sidebar');
        const deckMainArea = document.getElementById('deck-main-area');
        
        const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
        const btnShowSidebar = document.getElementById('btn-show-sidebar');
        
        let isSidebarRetracted = false;
        if (btnToggleSidebar && deckLayout) {
            btnToggleSidebar.onclick = () => {
                isSidebarRetracted = !isSidebarRetracted;
                if (isSidebarRetracted) {
                    deckLayout.style.gridTemplateColumns = '1fr 3fr';
                    btnToggleSidebar.textContent = '→ Expandir';
                    btnToggleSidebar.title = 'Expandir Painel Lateral';
                } else {
                    deckLayout.style.gridTemplateColumns = '1fr 1fr';
                    btnToggleSidebar.textContent = '← Retrair';
                    btnToggleSidebar.title = 'Retrair Painel Lateral';
                }
            };
        }

        const gridColsSidebar = document.getElementById('grid-columns-select-sidebar');
        if (gridColsSidebar) {
            gridColsSidebar.onchange = () => {
                const resArea = document.getElementById('search-results');
                const val = gridColsSidebar.value;
                if (val === 'auto') {
                    resArea.style.gridTemplateColumns = '';
                } else {
                    resArea.style.gridTemplateColumns = `repeat(${val}, 1fr)`;
                }
            };
        }
        
        let currentDeck = null;
        let deckCards = []; // array of {id, name, image_url, quantity}

        let selectedDeckCards = new Set();
        let allDeckSelected = false;
        const btnDeleteDeckSelected = document.getElementById('btn-delete-deck-selected');
        const btnSelectAllDeck = document.getElementById('btn-select-all-deck');
        
        const sortSelectDeck = document.getElementById('sort-select-deck');
        const sortDirBtnDeck = document.getElementById('btn-sort-dir-deck');
        const gridColumnsSelectDeck = document.getElementById('grid-columns-select-deck');

        const btnToggleFiltersDeck = document.getElementById('btn-toggle-filters-deck');
        const filtersSectionDeck = document.getElementById('filters-section-deck');
        const btnApplyFiltersDeck = document.getElementById('btn-apply-filters-deck');
        const btnClearFiltersDeck = document.getElementById('btn-clear-filters-deck');

        let deckSortBy = 'name';
        let deckSortDir = 'asc';
        let activeTypeFiltersDeck = [];
        let filterFavoritesDeck = false;

        if (gridColumnsSelectDeck) {
            gridColumnsSelectDeck.onchange = () => {
                const val = gridColumnsSelectDeck.value;
                if (val === 'auto') {
                    grid.style.gridTemplateColumns = '';
                } else {
                    grid.style.gridTemplateColumns = `repeat(${val}, 1fr)`;
                }
            };
        }

        if (btnToggleFiltersDeck) {
            btnToggleFiltersDeck.onclick = () => {
                filtersSectionDeck.style.display = filtersSectionDeck.style.display === 'none' ? 'block' : 'none';
            };
        }

        if (btnApplyFiltersDeck) {
            btnApplyFiltersDeck.onclick = () => {
                const checkboxes = document.querySelectorAll('.type-filter-deck:checked');
                activeTypeFiltersDeck = Array.from(checkboxes).map(cb => cb.value);
                const favCheckbox = document.getElementById('filter-favorites-deck');
                if (favCheckbox) filterFavoritesDeck = favCheckbox.checked;
                filtersSectionDeck.style.display = 'none';
                renderDeckCards();
            };
        }

        if (btnClearFiltersDeck) {
            btnClearFiltersDeck.onclick = () => {
                document.querySelectorAll('.type-filter-deck').forEach(cb => cb.checked = false);
                const favCheckbox = document.getElementById('filter-favorites-deck');
                if (favCheckbox) favCheckbox.checked = false;
                activeTypeFiltersDeck = [];
                filterFavoritesDeck = false;
                filtersSectionDeck.style.display = 'none';
                renderDeckCards();
            };
        }

        if (sortSelectDeck) {
            sortSelectDeck.onchange = () => { deckSortBy = sortSelectDeck.value; renderDeckCards(); };
            sortDirBtnDeck.onclick = () => { 
                deckSortDir = deckSortDir === 'asc' ? 'desc' : 'asc'; 
                sortDirBtnDeck.textContent = deckSortDir === 'asc' ? '↑' : '↓';
                renderDeckCards(); 
            };
        }

        const updateDeckDeleteBtn = () => {
            if (!btnDeleteDeckSelected) return;
            if (selectedDeckCards.size > 0) {
                btnDeleteDeckSelected.style.display = 'block';
                btnDeleteDeckSelected.textContent = `Remover Selecionadas (${selectedDeckCards.size})`;
            } else {
                btnDeleteDeckSelected.style.display = 'none';
            }
        };

        if (btnSelectAllDeck) {
            btnSelectAllDeck.onclick = () => {
                if (allDeckSelected) {
                    selectedDeckCards.clear();
                    allDeckSelected = false;
                    btnSelectAllDeck.textContent = 'Selecionar Tudo';
                } else {
                    deckCards.forEach(c => selectedDeckCards.add(c.id));
                    allDeckSelected = true;
                    btnSelectAllDeck.textContent = 'Desmarcar Tudo';
                }
                updateDeckDeleteBtn();
                renderDeckCards();
            };
        }

        if (btnDeleteDeckSelected) {
            btnDeleteDeckSelected.onclick = async () => {
                if (!confirm(`Remover ${selectedDeckCards.size} carta(s) do deck?`)) return;
                
                btnDeleteDeckSelected.disabled = true;
                btnDeleteDeckSelected.textContent = 'Removendo...';
                for (const cardId of selectedDeckCards) {
                    await api.updateDeckCard(currentDeck.id, cardId, 0);
                }
                
                selectedDeckCards.clear();
                allDeckSelected = false;
                if (btnSelectAllDeck) btnSelectAllDeck.textContent = 'Selecionar Tudo';
                updateDeckDeleteBtn();
                btnDeleteDeckSelected.disabled = false;
                loadDeck(currentDeck.id);
            };
        }

        const renderDeckCards = () => {
            const grid = document.getElementById('deck-cards');
            grid.innerHTML = '';
            
            if (deckCards.length === 0) {
                if (btnSelectAllDeck) btnSelectAllDeck.style.display = 'none';
            } else {
                if (btnSelectAllDeck) btnSelectAllDeck.style.display = 'block';
            }

            let filteredDeckCards = deckCards;
            if (activeTypeFiltersDeck.length > 0) {
                filteredDeckCards = filteredDeckCards.filter(card => {
                    const typeLine = card.type_line || '';
                    return activeTypeFiltersDeck.some(t => typeLine.includes(t));
                });
            }
            if (filterFavoritesDeck) {
                filteredDeckCards = filteredDeckCards.filter(card => card.is_favorite);
            }

            app.sortCards(filteredDeckCards, deckSortBy, deckSortDir);

            if (filteredDeckCards.length === 0) {
                grid.innerHTML = '<p style="padding:1rem;">Arraste cartas da busca para cá, ou o deck está vazio com esses filtros.</p>';
            }

            // Setup drop zone on the whole panel
            const dropZone = document.getElementById('deck-main-area');
            dropZone.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                dropZone.style.boxShadow = 'inset 0 0 20px rgba(255, 215, 0, 0.3)'; // subtle gold highlight
            };
            dropZone.ondragleave = (e) => {
                e.preventDefault();
                dropZone.style.boxShadow = 'none';
            };
            dropZone.ondrop = async (e) => {
                e.preventDefault();
                dropZone.style.boxShadow = 'none';
                try {
                    const cardData = e.dataTransfer.getData('text/plain');
                    if (cardData) {
                        const c = JSON.parse(cardData);
                        if (!currentDeck) return;
                        const existing = deckCards.find(dc => dc.id === c.id);
                        const currentQ = existing ? existing.quantity : 0;
                        await api.updateDeckCard(currentDeck.id, c.id, currentQ + 1);
                        if (existing) {
                            existing.quantity++;
                        } else {
                            deckCards.push({ ...c, quantity: 1 });
                        }
                        renderDeckCards();
                    }
                } catch (err) {
                    console.error("Drop error", err);
                }
            };

            filteredDeckCards.forEach(card => {
                grid.appendChild(app.renderCard(card, {
                    quantity: card.quantity,
                    selectable: true,
                    selected: selectedDeckCards.has(card.id),
                    badgeText: app.getBadgeText(card, deckSortBy),
                    onSelect: (c, isChecked) => {
                        if (isChecked) selectedDeckCards.add(c.id);
                        else selectedDeckCards.delete(c.id);
                        updateDeckDeleteBtn();
                    },
                    onAdd: async (c) => {
                        const newQ = c.quantity + 1;
                        await api.updateDeckCard(currentDeck.id, c.id, newQ);
                        c.quantity = newQ;
                        renderDeckCards();
                    },
                    onRemove: async (c) => {
                        const newQ = c.quantity - 1;
                        await api.updateDeckCard(currentDeck.id, c.id, newQ);
                        if (newQ <= 0) {
                            deckCards = deckCards.filter(dc => dc.id !== c.id);
                        } else {
                            c.quantity = newQ;
                        }
                        renderDeckCards();
                    }
                }));
            });
        };

        const loadDeck = async (id) => {
            const res = await api.getDeckDetails(id);
            if (res.error) {
                alert('Erro ao carregar deck');
                return;
            }
            currentDeck = res.deck;
            deckCards = res.cards;
            document.getElementById('builder-deck-name').textContent = currentDeck.name;
            setupPanel.style.display = 'none';
            builderPanel.style.display = 'block';
            renderDeckCards();

            // Load collection by default on the left sidebar
            const resArea = document.getElementById('search-results');
            resArea.innerHTML = '<p style="padding:1rem;">Carregando sua coleção...</p>';
            const colRes = await api.getCollection();
            resArea.innerHTML = '';
            if (colRes && colRes.length > 0) {
                // sort alphabetically by default
                app.sortCards(colRes, 'name', 'asc');
                colRes.forEach(card => {
                    resArea.appendChild(app.renderCard(card, {
                        draggable: true,
                        customActionLabel: 'Adicionar ao Deck',
                        onCustomAction: async (c) => {
                            if (!currentDeck) return;
                            const existing = deckCards.find(dc => dc.id === c.id);
                            const currentQ = existing ? existing.quantity : 0;
                            await api.updateDeckCard(currentDeck.id, c.id, currentQ + 1);
                            if (existing) {
                                existing.quantity++;
                            } else {
                                deckCards.push({ ...c, quantity: 1 });
                            }
                            renderDeckCards();
                        }
                    }));
                });
            } else {
                resArea.innerHTML = '<p style="padding:1rem;">Sua coleção está vazia. Use a busca acima para adicionar cartas do Scryfall.</p>';
            }
        };

        if (deckId) {
            loadDeck(deckId);
        }

        document.getElementById('btn-create-deck').onclick = async () => {
            const name = document.getElementById('deck-name').value;
            if (!name) return;
            const res = await api.createDeck(name);
            if (res.id) {
                window.history.pushState({}, '', `/deck-builder.html?id=${res.id}`);
                loadDeck(res.id);
            }
        };

        document.getElementById('btn-search').onclick = async () => {
            const resArea = document.getElementById('search-results');
            const q = document.getElementById('card-search-input').value;
            if (!q) {
                // If search is empty, reload collection
                resArea.innerHTML = '<p style="padding:1rem;">Carregando sua coleção...</p>';
                const colRes = await api.getCollection();
                resArea.innerHTML = '';
                if (colRes && colRes.length > 0) {
                    app.sortCards(colRes, 'name', 'asc');
                    colRes.forEach(card => {
                        resArea.appendChild(app.renderCard(card, {
                            draggable: true,
                            customActionLabel: 'Adicionar ao Deck',
                            onCustomAction: async (c) => {
                                if (!currentDeck) return;
                                const existing = deckCards.find(dc => dc.id === c.id);
                                const currentQ = existing ? existing.quantity : 0;
                                await api.updateDeckCard(currentDeck.id, c.id, currentQ + 1);
                                if (existing) {
                                    existing.quantity++;
                                } else {
                                    deckCards.push({ ...c, quantity: 1 });
                                }
                                renderDeckCards();
                            }
                        }));
                    });
                }
                return;
            }
            
            resArea.innerHTML = '<p>Buscando...</p>';
            
            const res = await api.searchCards(q);
            resArea.innerHTML = '';
            
            if (!res.data || res.data.length === 0) {
                resArea.innerHTML = '<p>Nenhuma carta encontrada.</p>';
                return;
            }
            
            res.data.forEach(card => {
                resArea.appendChild(app.renderCard(card, {
                    draggable: true,
                    customActionLabel: 'Adicionar ao Deck',
                    onCustomAction: async (c) => {
                        if (!currentDeck) return;
                        const existing = deckCards.find(dc => dc.id === c.id);
                        const currentQ = existing ? existing.quantity : 0;
                        await api.updateDeckCard(currentDeck.id, c.id, currentQ + 1);
                        if (existing) {
                            existing.quantity++;
                        } else {
                            deckCards.push({ ...c, quantity: 1 });
                        }
                        renderDeckCards();
                    }
                }));
            });
        };

        const btnToggleImport = document.getElementById('btn-toggle-import');
        const importSection = document.getElementById('import-section');
        const btnCancelImport = document.getElementById('btn-cancel-import');
        const btnConfirmImport = document.getElementById('btn-confirm-import');
        const importText = document.getElementById('import-list-text');

        if (btnToggleImport) {
            btnToggleImport.onclick = () => importSection.style.display = 'block';
            btnCancelImport.onclick = () => { importSection.style.display = 'none'; importText.value = ''; };
            
            btnConfirmImport.onclick = async () => {
                if (!currentDeck) {
                    alert('Crie ou selecione um deck primeiro.');
                    return;
                }

                const text = importText.value;
                if (!text.trim()) return;
                
                btnConfirmImport.textContent = 'Importando...';
                btnConfirmImport.disabled = true;

                const parsed = app.parseCardList(text);
                const names = [...new Set(parsed.map(p => p.name))];
                
                try {
                    const res = await api.importCards(names);
                    if (res.data && res.data.length > 0) {
                        for (const item of parsed) {
                            const card = res.data.find(c => c.name.toLowerCase() === item.name.toLowerCase());
                            if (card) {
                                const existing = deckCards.find(dc => dc.id === card.id);
                                const currentQ = existing ? existing.quantity : 0;
                                const newQ = currentQ + item.quantity;
                                await api.updateDeckCard(currentDeck.id, card.id, newQ);
                                if (existing) {
                                    existing.quantity = newQ;
                                } else {
                                    deckCards.push({ ...card, quantity: newQ });
                                }
                            }
                        }
                        alert('Importação concluída!');
                        importSection.style.display = 'none';
                        importText.value = '';
                        renderDeckCards();
                    } else {
                        alert('Nenhuma carta encontrada.');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Erro ao importar cartas.');
                }
                
                btnConfirmImport.textContent = 'Importar para Deck';
                btnConfirmImport.disabled = false;
            };
        }
    }
};

window.app = app;
