import api from '../services/api.js';
import { renderCard } from '../components/Card.js';
import { showToast } from '../components/Toast.js';
import { sortCards, getBadgeText, parseCardList } from '../utils/helpers.js';

    export const initCollection = async () => {
        const grid = document.getElementById('collection-grid');
        const searchInput = document.getElementById('add-card-search');
        const searchBtn = document.getElementById('btn-search-add');
        const searchResultsArea = document.getElementById('add-search-results');
        const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
        
        let selectedCollectionCards = new Set();
        let allCollectionCards = [];
        let allCollectionSelected = false;
        
        let pendingUpdates = new Map();
        const btnSaveCollection = document.getElementById('btn-save-collection');
        const updateSaveButton = () => {
            if (btnSaveCollection) {
                btnSaveCollection.style.display = pendingUpdates.size > 0 ? 'block' : 'none';
            }
        };

        if (btnSaveCollection) {
            btnSaveCollection.onclick = async () => {
                btnSaveCollection.disabled = true;
                btnSaveCollection.textContent = 'Salvando...';
                
                for (const [cardId, qty] of pendingUpdates.entries()) {
                    await api.updateCollection(cardId, qty);
                }
                
                pendingUpdates.clear();
                updateSaveButton();
                btnSaveCollection.disabled = false;
                btnSaveCollection.textContent = '💾 Salvar Alterações';
                
                showToast('Alterações salvas com sucesso!', 'success');
                loadCollection(true);
            };
        }
        
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

        let localSearchTerm = '';
        const localSearchInput = document.getElementById('collection-search-input');
        if (localSearchInput) {
            localSearchInput.oninput = (e) => {
                localSearchTerm = e.target.value.toLowerCase();
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
                showToast('Banco de dados sincronizado com sucesso!', 'success');
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
                
                for (const cardId of selectedCollectionCards) {
                    pendingUpdates.set(cardId, 0);
                    const localCard = allCollectionCards.find(c => c.id === cardId);
                    if (localCard) localCard.owned_quantity = 0;
                }
                
                selectedCollectionCards.clear();
                allCollectionSelected = false;
                if (btnSelectAll) btnSelectAll.textContent = 'Selecionar Tudo';
                updateDeleteBtn();
                updateSaveButton();
                loadCollection(false);
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

            const countEl = document.getElementById('collection-count');
            if (countEl) {
                const totalCards = allCollectionCards.reduce((sum, c) => sum + parseInt(c.owned_quantity || 1), 0);
                countEl.textContent = `Total de Cartas: ${totalCards}`;
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
            if (localSearchTerm) {
                filteredCards = filteredCards.filter(card => 
                    (card.name || '').toLowerCase().includes(localSearchTerm) ||
                    (card.type_line || '').toLowerCase().includes(localSearchTerm) ||
                    (card.oracle_text || '').toLowerCase().includes(localSearchTerm)
                );
            }

            sortCards(filteredCards, currentSortBy, currentSortDir);
            
            if (filteredCards.length === 0) {
                grid.innerHTML = '<p>Nenhuma carta encontrada com esses filtros ou a coleção está vazia.</p>';
            }

            filteredCards.forEach(card => {
                const used = parseInt(card.used_quantity || 0);
                const owned = parseInt(card.owned_quantity || 0);
                const available = owned - used;

                grid.appendChild(renderCard(card, {
                    inDeck: used > 0,
                    deckNames: card.deck_names,
                    quantity: owned,
                    selectable: true,
                    selected: selectedCollectionCards.has(card.id),
                    badgeText: getBadgeText(card, currentSortBy),
                    onSelect: (c, isChecked) => {
                        if (isChecked) selectedCollectionCards.add(c.id);
                        else selectedCollectionCards.delete(c.id);
                        updateDeleteBtn();
                    },
                    onAdd: async (c) => {
                        const newQ = owned + 1;
                        pendingUpdates.set(c.id, newQ);
                        const localCard = allCollectionCards.find(cc => cc.id === c.id);
                        if (localCard) localCard.owned_quantity = newQ;
                        updateSaveButton();
                        loadCollection(false);
                    },
                    onRemove: async (c) => {
                        if (owned > 0) {
                            const newQ = owned - 1;
                            pendingUpdates.set(c.id, newQ);
                            const localCard = allCollectionCards.find(cc => cc.id === c.id);
                            if (localCard) localCard.owned_quantity = newQ;
                            updateSaveButton();
                            loadCollection(false);
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
                searchResultsArea.appendChild(renderCard(card, {
                    customActionLabel: 'Adicionar à Coleção',
                    onCustomAction: async (c) => {
                        const existing = allCollectionCards.find(ec => ec.id === c.id);
                        let newQ;
                        if (existing) {
                            newQ = parseInt(existing.owned_quantity || 0) + 1;
                            existing.owned_quantity = newQ;
                        } else {
                            newQ = 1;
                            c.owned_quantity = newQ;
                            allCollectionCards.push(c);
                        }
                        pendingUpdates.set(c.id, newQ);
                        updateSaveButton();
                        showToast('Carta adicionada localmente! Não esqueça de salvar.', 'success');
                        loadCollection(false);
                    }
                }));
            });
        };

        // Autocomplete
        let autocompleteDebounce;
        if (searchInput && autocompleteDropdown) {
            searchInput.oninput = (e) => {
                clearTimeout(autocompleteDebounce);
                const q = e.target.value.trim();
                
                if (q.length < 3) {
                    autocompleteDropdown.classList.add('hidden');
                    return;
                }
                
                autocompleteDebounce = setTimeout(async () => {
                    autocompleteDropdown.innerHTML = '<li style="justify-content: center; color: var(--text-muted);">Buscando...</li>';
                    autocompleteDropdown.classList.remove('hidden');
                    
                    try {
                        const res = await api.searchCards(q);
                        autocompleteDropdown.innerHTML = '';
                        
                        if (!res.data || res.data.length === 0) {
                            autocompleteDropdown.innerHTML = '<li style="justify-content: center; color: var(--text-muted);">Nenhuma carta encontrada</li>';
                            return;
                        }
                        
                        // Show top 6 results
                        res.data.slice(0, 6).forEach(card => {
                            const li = document.createElement('li');
                            
                            const img = document.createElement('img');
                            img.src = card.image_url;
                            img.className = 'card-thumb';
                            
                            const text = document.createElement('span');
                            text.textContent = card.name;
                            
                            li.appendChild(img);
                            li.appendChild(text);
                            
                            li.onclick = () => {
                                autocompleteDropdown.classList.add('hidden');
                                searchInput.value = '';
                                
                                const existing = allCollectionCards.find(ec => ec.id === card.id);
                                let newQ;
                                if (existing) {
                                    newQ = parseInt(existing.owned_quantity || 0) + 1;
                                    existing.owned_quantity = newQ;
                                } else {
                                    newQ = 1;
                                    card.owned_quantity = newQ;
                                    allCollectionCards.push(card);
                                }
                                pendingUpdates.set(card.id, newQ);
                                updateSaveButton();
                                
                                searchInput.placeholder = `${card.name} adicionado(a)!`;
                                setTimeout(() => searchInput.placeholder = "Buscar carta no Scryfall...", 2000);
                                
                                loadCollection(false);
                            };
                            
                            autocompleteDropdown.appendChild(li);
                        });
                    } catch (err) {
                        autocompleteDropdown.innerHTML = '<li style="justify-content: center; color: var(--danger-color);">Erro na busca</li>';
                    }
                }, 400); // 400ms delay
            };
            
            // Hide dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
                    autocompleteDropdown.classList.add('hidden');
                }
            });
        }

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

                const parsed = parseCardList(text);
                const names = [...new Set(parsed.map(p => p.name))];
                
                try {
                    const res = await api.importCards(names);
                    if (res.data && res.data.length > 0) {
                        for (const item of parsed) {
                            const card = res.data.find(c => c.name.toLowerCase() === item.name.toLowerCase());
                            if (card) {
                                const existing = allCollectionCards.find(ec => ec.id === card.id);
                                let newQ;
                                if (existing) {
                                    newQ = parseInt(existing.owned_quantity || 0) + item.quantity;
                                    existing.owned_quantity = newQ;
                                } else {
                                    newQ = item.quantity;
                                    card.owned_quantity = newQ;
                                    allCollectionCards.push(card);
                                }
                                pendingUpdates.set(card.id, newQ);
                            }
                        }
                        updateSaveButton();
                        showToast('Cartas importadas localmente! Não esqueça de salvar.', 'success');
                        importSection.style.display = 'none';
                        importText.value = '';
                        loadCollection(false);
                    } else {
                        showToast('Nenhuma carta encontrada.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Erro ao importar cartas.', 'error');
                }
                
                btnConfirmImport.textContent = 'Importar para Coleção';
                btnConfirmImport.disabled = false;
            };
        }

        loadCollection();
    };
