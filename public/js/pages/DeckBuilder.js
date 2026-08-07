import api from '../services/api.js';
import { renderCard } from '../components/Card.js';
import { showToast } from '../components/Toast.js';
import { sortCards, getBadgeText, parseCardList } from '../utils/helpers.js';

    export const initDeckBuilder = async () => {
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
                await refreshDeckCards();
            };
        }

        const refreshDeckCards = async () => {
            if (!currentDeck) return;
            const res = await api.getDeckDetails(currentDeck.id);
            if (!res.error) {
                deckCards = res.cards;
                renderDeckCards();
            }
        };

        const renderDeckCards = () => {
            const grid = document.getElementById('deck-cards');
            grid.innerHTML = '';
            
            if (deckCards.length === 0) {
                if (btnSelectAllDeck) btnSelectAllDeck.style.display = 'none';
            } else {
                if (btnSelectAllDeck) btnSelectAllDeck.style.display = 'block';
            }

            const countEl = document.getElementById('deck-count');
            if (countEl) {
                const totalDeckCards = deckCards.reduce((sum, c) => sum + parseInt(c.quantity || 1), 0);
                countEl.textContent = `Total de Cartas: ${totalDeckCards}`;
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

            sortCards(filteredDeckCards, deckSortBy, deckSortDir);

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
                e.stopPropagation();
                dropZone.style.boxShadow = 'none';
                try {
                    const cardData = e.dataTransfer.getData('text/plain');
                    if (cardData) {
                        const c = JSON.parse(cardData);
                        if (!currentDeck) return;
                        const existing = deckCards.find(dc => dc.id === c.id);
                        const currentQ = existing ? existing.quantity : 0;
                        await api.updateDeckCard(currentDeck.id, c.id, currentQ + 1);
                        await refreshDeckCards();
                    }
                } catch (err) {
                    console.error("Drop error", err);
                }
            };

            filteredDeckCards.forEach(card => {
                grid.appendChild(renderCard(card, {
                    draggable: true,
                    isFromDeck: true,
                    missing: card.owned_quantity < card.quantity,
                    quantity: card.quantity,
                    selectable: true,
                    selected: selectedDeckCards.has(card.id),
                    badgeText: getBadgeText(card, deckSortBy),
                    onSelect: (c, isChecked) => {
                        if (isChecked) selectedDeckCards.add(c.id);
                        else selectedDeckCards.delete(c.id);
                        updateDeckDeleteBtn();
                    },
                    onAdd: async (c) => {
                        const newQ = c.quantity + 1;
                        await api.updateDeckCard(currentDeck.id, c.id, newQ);
                        await refreshDeckCards();
                    },
                    onRemove: async (c) => {
                        const newQ = c.quantity - 1;
                        await api.updateDeckCard(currentDeck.id, c.id, newQ);
                        await refreshDeckCards();
                    }
                }));
            });
        };

        const loadDeck = async (id) => {
            const res = await api.getDeckDetails(id);
            if (res.error) {
                showToast('Erro ao carregar deck', 'error');
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
                sortCards(colRes, 'name', 'asc');
                colRes.forEach(card => {
                    resArea.appendChild(renderCard(card, {
                        draggable: true,
                        inDeck: parseInt(card.used_quantity || 0) > 0,
                        deckNames: card.deck_names,
                        customActionLabel: 'Adicionar ao Deck',
                        onCustomAction: async (c) => {
                            if (!currentDeck) return;
                            const existing = deckCards.find(dc => dc.id === c.id);
                            const currentQ = existing ? existing.quantity : 0;
                            await api.updateDeckCard(currentDeck.id, c.id, currentQ + 1);
                            await refreshDeckCards();
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
                    sortCards(colRes, 'name', 'asc');
                    colRes.forEach(card => {
                        resArea.appendChild(renderCard(card, {
                            draggable: true,
                            inDeck: parseInt(card.used_quantity || 0) > 0,
                            deckNames: card.deck_names,
                            customActionLabel: 'Adicionar ao Deck',
                            onCustomAction: async (c) => {
                                if (!currentDeck) return;
                                const existing = deckCards.find(dc => dc.id === c.id);
                                const currentQ = existing ? existing.quantity : 0;
                                await api.updateDeckCard(currentDeck.id, c.id, currentQ + 1);
                                await refreshDeckCards();
                            }
                        }));
                    });
                }
                return;
            }
            
            resArea.innerHTML = '<p>Buscando...</p>';
            
            const res = await api.searchCards(q);
            const currentCollection = await api.getCollection();
            resArea.innerHTML = '';
            
            if (!res.data || res.data.length === 0) {
                resArea.innerHTML = '<p>Nenhuma carta encontrada.</p>';
                return;
            }
            
            res.data.forEach(card => {
                const colCard = currentCollection.find(c => c.id === card.id);
                resArea.appendChild(renderCard(card, {
                    draggable: true,
                    inDeck: colCard ? parseInt(colCard.used_quantity || 0) > 0 : false,
                    deckNames: colCard ? colCard.deck_names : null,
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
                    showToast('Crie ou selecione um deck primeiro.', 'error');
                    return;
                }

                const text = importText.value;
                if (!text.trim()) return;
                
                btnConfirmImport.textContent = 'Importando...';
                btnConfirmImport.disabled = true;

                const parsed = parseCardList(text);
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
                            }
                        }
                        showToast('Importação concluída!', 'success');
                        importSection.style.display = 'none';
                        importText.value = '';
                        await refreshDeckCards();
                    } else {
                        showToast('Nenhuma carta encontrada.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Erro ao importar cartas.', 'error');
                }
                
                btnConfirmImport.textContent = 'Importar para Deck';
                btnConfirmImport.disabled = false;
            };
        }

        // Setup drop zone outside deck area to remove cards
        document.body.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };
        
        document.body.ondrop = async (e) => {
            e.preventDefault();
            try {
                const cardData = e.dataTransfer.getData('text/plain');
                if (cardData) {
                    const c = JSON.parse(cardData);
                    if (c.isFromDeck && currentDeck) {
                        const existing = deckCards.find(dc => dc.id === c.id);
                        if (existing) {
                            const newQ = existing.quantity - 1;
                            await api.updateDeckCard(currentDeck.id, c.id, newQ);
                            await refreshDeckCards();
                        }
                    }
                }
            } catch (err) {
                console.error("Drop outside error", err);
            }
        };
    };
