const fs = require('fs');
let content = fs.readFileSync('public/js/app.js', 'utf8');

content = content.replace(/alert\('Alterações salvas com sucesso!'\);/g, "app.showToast('Alterações salvas com sucesso!', 'success');");
content = content.replace(/alert\('Banco de dados sincronizado com sucesso!'\);/g, "app.showToast('Banco de dados sincronizado com sucesso!', 'success');");
content = content.replace(/alert\('Carta adicionada localmente! Não esqueça de salvar.'\);/g, "app.showToast('Carta adicionada localmente! Não esqueça de salvar.', 'success');");
content = content.replace(/alert\('Cartas importadas localmente! Não esqueça de salvar.'\);/g, "app.showToast('Cartas importadas localmente! Não esqueça de salvar.', 'success');");
content = content.replace(/alert\('Nenhuma carta encontrada.'\);/g, "app.showToast('Nenhuma carta encontrada.', 'error');");
content = content.replace(/alert\('Erro ao importar cartas.'\);/g, "app.showToast('Erro ao importar cartas.', 'error');");
content = content.replace(/alert\('Erro ao clonar deck.'\);/g, "app.showToast('Erro ao clonar deck.', 'error');");
content = content.replace(/alert\('Lista copiada!'\);/g, "app.showToast('Lista copiada!', 'success');");
content = content.replace(/alert\('Erro ao carregar deck'\);/g, "app.showToast('Erro ao carregar deck', 'error');");
content = content.replace(/alert\('Crie ou selecione um deck primeiro.'\);/g, "app.showToast('Crie ou selecione um deck primeiro.', 'error');");
content = content.replace(/alert\('Importação concluída!'\);/g, "app.showToast('Importação concluída!', 'success');");
content = content.replace(/alert\(`\$\{c\.name\} adicionado\(a\) à sua coleção!`\);/g, "app.showToast(`${c.name} adicionado(a) à sua coleção!`, 'success');");
content = content.replace(/alert\(res\.message\);/g, "app.showToast(res.message, 'success');");
content = content.replace(/alert\("Erro ao iniciar a importação em lote\."\);/g, "app.showToast('Erro ao iniciar a importação em lote.', 'error');");

// Catch remaining
content = content.replace(/alert\((.*?)\)/g, "app.showToast($1)");

fs.writeFileSync('public/js/app.js', content);
console.log('Done');
