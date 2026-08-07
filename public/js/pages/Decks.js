import api from '../services/api.js';
import { renderCard } from '../components/Card.js';
import { showToast } from '../components/Toast.js';
import { sortCards, getBadgeText, parseCardList } from '../utils/helpers.js';

    export const initDecksList = async () => {
        const list = document.getElementById('decks-list');
        list.className = 'deck-grid'; // Change to deck grid
        
        let editingDeckId = null;
        let deckToDelete = null;

        // Modals
        const editModal = document.getElementById('edit-deck-modal');
        const deleteModal = document.getElementById('delete-deck-modal');
        const exportModal = document.getElementById('export-deck-modal');

        const closeAllMenus = () => {
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        };
        
        document.addEventListener('click', closeAllMenus);

        const loadDecks = async () => {
            list.innerHTML = '<p>Carregando...</p>';
            const decks = await api.getDecks();
            list.innerHTML = '';
            if (decks.length === 0) {
                list.innerHTML = '<p style="grid-column: 1 / -1;">Você ainda não tem decks.</p>';
                return;
            }
            
            decks.forEach(deck => {
                const card = document.createElement('div');
                card.className = 'deck-square-card';
                if (deck.cover_image_url) {
                    card.style.backgroundImage = `url('${deck.cover_image_url}')`;
                } else {
                    // Fallback to a dark texture or color
                    card.style.backgroundColor = '#1a1a1a';
                }

                card.onclick = (e) => {
                    // Navigate if they click the card itself, not the menu button
                    if (!e.target.closest('.menu-btn') && !e.target.closest('.dropdown-menu')) {
                        window.location.href = `/deck-builder.html?id=${deck.id}`;
                    }
                };

                const overlay = document.createElement('div');
                overlay.className = 'deck-overlay';
                
                const title = document.createElement('h3');
                title.textContent = deck.name;
                
                const count = document.createElement('p');
                count.textContent = 'Clique para ver as cartas';

                const menuBtn = document.createElement('button');
                menuBtn.className = 'menu-btn';
                menuBtn.innerHTML = '⋮';
                menuBtn.title = 'Opções';

                const dropdown = document.createElement('div');
                dropdown.className = 'dropdown-menu hidden';
                
                const btnEdit = document.createElement('button');
                btnEdit.className = 'dropdown-item';
                btnEdit.textContent = '✏️ Editar';
                btnEdit.onclick = async (e) => {
                    e.stopPropagation();
                    closeAllMenus();
                    editingDeckId = deck.id;
                    document.getElementById('edit-deck-name').value = deck.name;
                    
                    const coverGrid = document.getElementById('cover-card-grid');
                    coverGrid.innerHTML = '<p>Carregando cartas...</p>';
                    editModal.style.display = 'flex';
                    
                    const details = await api.getDeckDetails(deck.id);
                    coverGrid.innerHTML = '';
                    if (details.cards.length === 0) {
                        coverGrid.innerHTML = '<p>O deck não possui cartas para escolher capa.</p>';
                    } else {
                        details.cards.forEach(c => {
                            const imgContainer = document.createElement('div');
                            imgContainer.style.position = 'relative';
                            imgContainer.style.cursor = 'pointer';
                            
                            const img = document.createElement('img');
                            img.src = c.image_url;
                            img.style.width = '100%';
                            img.style.borderRadius = '8px';
                            if (deck.cover_card_id === c.id) {
                                img.style.border = '3px solid var(--accent-color)';
                            }
                            
                            imgContainer.onclick = () => {
                                document.querySelectorAll('#cover-card-grid img').forEach(i => i.style.border = 'none');
                                img.style.border = '3px solid var(--accent-color)';
                                coverGrid.dataset.selectedCardId = c.id;
                            };
                            
                            imgContainer.appendChild(img);
                            coverGrid.appendChild(imgContainer);
                        });
                        coverGrid.dataset.selectedCardId = deck.cover_card_id || '';
                    }
                };
                
                const btnClone = document.createElement('button');
                btnClone.className = 'dropdown-item';
                btnClone.textContent = '📑 Clonar';
                btnClone.onclick = async (e) => {
                    e.stopPropagation();
                    closeAllMenus();
                    try {
                        await api.cloneDeck(deck.id);
                        loadDecks();
                    } catch(err) {
                        showToast('Erro ao clonar deck.', 'error');
                    }
                };

                const btnExport = document.createElement('button');
                btnExport.className = 'dropdown-item';
                btnExport.textContent = '📤 Exportar';
                btnExport.onclick = async (e) => {
                    e.stopPropagation();
                    closeAllMenus();
                    const details = await api.getDeckDetails(deck.id);
                    let text = '';
                    details.cards.forEach(c => {
                        text += `${c.quantity}x ${c.name}\n`;
                    });
                    document.getElementById('export-deck-text').value = text;
                    exportModal.style.display = 'flex';
                };

                const btnDelete = document.createElement('button');
                btnDelete.className = 'dropdown-item danger';
                btnDelete.textContent = '🗑️ Deletar';
                btnDelete.onclick = (e) => {
                    e.stopPropagation();
                    closeAllMenus();
                    deckToDelete = deck.id;
                    document.getElementById('delete-deck-name').textContent = deck.name;
                    deleteModal.style.display = 'flex';
                };

                dropdown.appendChild(btnEdit);
                dropdown.appendChild(btnClone);
                dropdown.appendChild(btnExport);
                dropdown.appendChild(btnDelete);

                menuBtn.onclick = (e) => {
                    e.stopPropagation();
                    const isHidden = dropdown.classList.contains('hidden');
                    closeAllMenus();
                    if (isHidden) {
                        dropdown.classList.remove('hidden');
                    }
                };

                overlay.appendChild(title);
                overlay.appendChild(count);
                card.appendChild(overlay);
                card.appendChild(menuBtn);
                card.appendChild(dropdown);
                list.appendChild(card);
            });
        };

        // Modal Listeners
        document.getElementById('btn-cancel-edit').onclick = () => editModal.style.display = 'none';
        document.getElementById('btn-save-edit').onclick = async () => {
            const newName = document.getElementById('edit-deck-name').value;
            const coverId = document.getElementById('cover-card-grid').dataset.selectedCardId;
            if (editingDeckId && newName.trim() !== '') {
                await api.updateDeck(editingDeckId, newName.trim(), coverId);
                editModal.style.display = 'none';
                loadDecks();
            }
        };

        document.getElementById('btn-cancel-delete').onclick = () => deleteModal.style.display = 'none';
        document.getElementById('btn-confirm-delete').onclick = async () => {
            if (deckToDelete) {
                await api.deleteDeck(deckToDelete);
                deleteModal.style.display = 'none';
                loadDecks();
            }
        };

        document.getElementById('btn-close-export').onclick = () => exportModal.style.display = 'none';
        document.getElementById('btn-copy-export').onclick = () => {
            const text = document.getElementById('export-deck-text').value;
            navigator.clipboard.writeText(text).then(() => {
                showToast('Lista copiada!', 'success');
            });
        };
        loadDecks();
    };
