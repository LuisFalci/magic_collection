# MageVault - Wiki do Desenvolvedor

Bem-vindo à documentação oficial do MageVault. Este projeto foi estruturado para ser escalável, modular e seguir as melhores práticas de Clean Code utilizando apenas **Vanilla JavaScript** (ES Modules).

## 📁 Estrutura de Pastas

Toda a lógica do frontend vive em `/public/js/`. Para garantir componentização, ela é dividida da seguinte forma:

```
public/
  css/
    styles.css         # Variáveis globais, Glassmorphism, animações e responsividade.
  js/
    components/        # Componentes UI independentes e reutilizáveis.
      Card.js          # Gera o DOM de uma carta do Magic.
      CardModal.js     # Controla o Modal (Overlay) das cartas.
      Toast.js         # Sistema de notificações modernas.
    pages/             # Controladores das telas (A inteligência das Views).
      AllCards.js      # Lógica da tela de Sincronização Scryfall.
      Collection.js    # Lógica da tela da Minha Coleção.
      DeckBuilder.js   # Lógica do criador/editor de Decks.
      Decks.js         # Lógica da listagem de Decks criados.
    services/          # Camada de comunicação com o Backend.
      api.js           # Funções assíncronas (fetch) para todos os endpoints.
    utils/             # Helpers e formatadores genéricos.
      helpers.js       # sortCards, getBadgeText e parser de lista de cartas.
    main.js            # Ponto de Entrada (Router) - Detecta a URL e chama o JS da página correta.
```

## 🧩 Trabalhando com Componentes

Não usamos React ou Vue. Portanto, criar um componente significa criar uma função que retorna um elemento DOM ou que gerencia um comportamento.

**Exemplo: Utilizando Toasts ao invés de `alert()`**
Nunca utilize `alert()`. Sempre importe e use a função `showToast`:

```javascript
import { showToast } from '../components/Toast.js';

// Sucesso (verde)
showToast('Carta salva com sucesso!', 'success');

// Erro (vermelho)
showToast('Falha na conexão.', 'error');
```

**Exemplo: Renderizando uma Carta**
```javascript
import { renderCard } from '../components/Card.js';

const minhaCarta = { id: '123', name: 'Black Lotus', image_url: '...' };
const divDaCarta = renderCard(minhaCarta, { 
    selectable: true, 
    quantity: 4 
});
document.getElementById('grid').appendChild(divDaCarta);
```

## 🔗 Roteamento Simples (main.js)
O arquivo `main.js` é injetado no final do `<body>` de todos os arquivos HTML (`<script type="module" src="/js/main.js"></script>`).

Ele verifica o `window.location.pathname` e invoca apenas a função `init()` correspondente da página que o usuário abriu. Se você criar uma nova tela (ex: `trade.html`), lembre-se de:
1. Criar `public/js/pages/Trade.js` exportando uma função `initTrade`.
2. Adicionar o import e o `if` dentro de `main.js`.

## 📡 Backend (Express & SQLite)
O backend continua no arquivo central `server.js` na raiz do projeto. Ele serve as páginas estáticas, cria a API REST (`/api/...`) e lê/escreve diretamente no arquivo de banco de dados SQLite (`database.sqlite`).
