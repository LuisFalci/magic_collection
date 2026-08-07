const fs = require('fs');
const files = ['public/index.html', 'public/collection.html', 'public/decks.html', 'public/deck-builder.html', 'public/all-cards.html'];

files.forEach(file => {
    if(fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/<script src="\/js\/api\.js"><\/script>\r?\n?/g, '');
        content = content.replace(/<script src="\/js\/app\.js"><\/script>\r?\n?/g, '');
        
        // Add new script tag before </body>
        if (!content.includes('<script type="module" src="/js/main.js"></script>')) {
            content = content.replace(/<\/body>/, '    <script type="module" src="/js/main.js"></script>\n</body>');
        }
        
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
