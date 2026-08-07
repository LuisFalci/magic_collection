const fs = require('fs');
const content = fs.readFileSync('public/js/app.js', 'utf8');

function extractMethod(name) {
    const lines = content.split('\n');
    let start = -1;
    let end = -1;
    let braces = 0;
    let inFunc = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(name + ': async () => {')) {
            start = i;
            inFunc = true;
        }
        if (inFunc) {
            braces += (lines[i].match(/\{/g) || []).length;
            braces -= (lines[i].match(/\}/g) || []).length;
            if (braces === 0 && start !== i) {
                end = i;
                break;
            }
        }
    }
    
    const extracted = lines.slice(start, end + 1);
    extracted[0] = extracted[0].replace(name + ': ', 'export const ' + name + ' = ');
    if (extracted[extracted.length - 1].endsWith(',')) {
        extracted[extracted.length - 1] = extracted[extracted.length - 1].slice(0, -1);
    }
    
    // Some internal function overrides inside the extracted block need to be aware of the new global api
    return extracted.join('\n');
}

const imports = `import api from '../services/api.js';
import { renderCard } from '../components/Card.js';
import { showToast } from '../components/Toast.js';
import { sortCards, getBadgeText, parseCardList } from '../utils/helpers.js';

`;

fs.writeFileSync('public/js/pages/Collection.js', imports + extractMethod('initCollection').replace(/app\.showToast/g, 'showToast').replace(/app\.renderCard/g, 'renderCard').replace(/app\.sortCards/g, 'sortCards').replace(/app\.getBadgeText/g, 'getBadgeText').replace(/app\.parseCardList/g, 'parseCardList'));

fs.writeFileSync('public/js/pages/Decks.js', imports + extractMethod('initDecksList').replace(/app\.showToast/g, 'showToast').replace(/app\.renderCard/g, 'renderCard').replace(/app\.sortCards/g, 'sortCards').replace(/app\.getBadgeText/g, 'getBadgeText').replace(/app\.parseCardList/g, 'parseCardList'));

fs.writeFileSync('public/js/pages/DeckBuilder.js', imports + extractMethod('initDeckBuilder').replace(/app\.showToast/g, 'showToast').replace(/app\.renderCard/g, 'renderCard').replace(/app\.sortCards/g, 'sortCards').replace(/app\.getBadgeText/g, 'getBadgeText').replace(/app\.parseCardList/g, 'parseCardList'));

fs.writeFileSync('public/js/pages/AllCards.js', imports + extractMethod('initAllCards').replace(/app\.showToast/g, 'showToast').replace(/app\.renderCard/g, 'renderCard').replace(/app\.sortCards/g, 'sortCards').replace(/app\.getBadgeText/g, 'getBadgeText').replace(/app\.parseCardList/g, 'parseCardList'));

console.log('Pages extracted');
