const fs = require('fs');
const path = require('path');

const directories = ['C:\\streamit\\app', 'C:\\streamit\\components'];
const extensions = ['.tsx', '.ts', '.css'];

const replacements = [
    { search: /bg-orange-500/g, replace: 'bg-[#E50914]' },
    { search: /hover:bg-orange-600/g, replace: 'hover:bg-[#b80710]' },
    { search: /text-orange-500/g, replace: 'text-[#E50914]' },
    { search: /text-orange-400/g, replace: 'text-[#E50914]' },
    { search: /border-orange-500/g, replace: 'border-[#E50914]' },
    { search: /border-orange-400/g, replace: 'border-[#E50914]' },
    { search: /ring-orange-500/g, replace: 'ring-[#E50914]' },
    { search: /from-orange-500/g, replace: 'from-[#E50914]' },
    { search: /to-orange-500/g, replace: 'to-[#E50914]' },
    { search: /via-orange-500/g, replace: 'via-[#E50914]' },
    { search: /#f97316/gi, replace: '#E50914' },
    { search: /bg-orange-600\/20/g, replace: 'bg-[#E50914]/20' },
    { search: /border-orange-500\/30/g, replace: 'border-[#E50914]/30' }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (extensions.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            for (const { search, replace } of replacements) {
                content = content.replace(search, replace);
            }
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

for (const dir of directories) {
    processDirectory(dir);
}
console.log('Color replacement complete.');
