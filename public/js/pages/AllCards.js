import api from '../services/api.js';
import { renderCard } from '../components/Card.js';
import { showToast } from '../components/Toast.js';
import { sortCards, getBadgeText, parseCardList } from '../utils/helpers.js';

    export const initAllCards = async () => {
        const grid = document.getElementById('all-cards-grid');
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');
        const pageIndicator = document.getElementById('page-indicator');
        const btnImportBulk = document.getElementById('btn-import-bulk');
        const searchInput = document.getElementById('all-cards-search-input');
        
        let currentPage = 1;
        const limit = 50;
        let searchQuery = '';
        let debounceTimeout;

        const loadPage = async (page) => {
            grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Buscando cartas...</p>';
            btnPrev.disabled = true;
            btnNext.disabled = true;
            
            try {
                const res = await api.getAllCards(page, limit, searchQuery);
                grid.innerHTML = '';
                
                if (!res.data || res.data.length === 0) {
                    grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Nenhuma carta encontrada.</p>';
                    pageIndicator.textContent = `Página ${page}`;
                    return;
                }
                
                res.data.forEach(card => {
                    grid.appendChild(renderCard(card, {
                        customActionLabel: 'Adicionar à Coleção',
                        onCustomAction: async (c) => {
                            const resColl = await api.getCollection();
                            const existing = resColl.data.find(ec => ec.id === c.id);
                            const newQ = (existing ? existing.owned_quantity : 0) + 1;
                            await api.updateCollection(c.id, newQ);
                            showToast(`${c.name} adicionado(a) à sua coleção!`, 'success');
                        }
                    }));
                });
                
                currentPage = res.page;
                pageIndicator.textContent = `Página ${currentPage} (de ${Math.ceil(res.total / limit)})`;
                
                btnPrev.disabled = currentPage <= 1;
                btnNext.disabled = currentPage >= Math.ceil(res.total / limit);
            } catch (err) {
                grid.innerHTML = '<p style="color: var(--danger-color); grid-column: 1 / -1;">Erro ao carregar cartas.</p>';
            }
        };

        btnPrev.onclick = () => { if (currentPage > 1) loadPage(currentPage - 1); };
        btnNext.onclick = () => loadPage(currentPage + 1);

        if (searchInput) {
            searchInput.oninput = (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    searchQuery = e.target.value.trim();
                    loadPage(1);
                }, 500);
            };
        }

        if (btnImportBulk) {
            btnImportBulk.onclick = async () => {
                const confirmed = confirm("Isso irá baixar a base completa do Scryfall (Oracle Cards) e inserir no banco de dados. O processo roda no background e o banco estará atualizado em alguns minutos. Deseja prosseguir?");
                if (confirmed) {
                    try {
                        const res = await api.importBulk();
                        showToast(res.message, 'success');
                    } catch (err) {
                        showToast('Erro ao iniciar a importação em lote.', 'error');
                    }
                }
            };
        }

        loadPage(1);
    }