const fs = require('fs');
const path = require('path');

const controllersDir = 'f:/gexm/packages/server/src/controllers';

fs.readdirSync(controllersDir).forEach(file => {
    if (file.endsWith('.ts')) {
        const filePath = path.join(controllersDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        const lines = content.split('\n');
        const importTypeLines = [];
        const otherImportLines = [];
        const restLines = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (/^import type /.test(trimmed)) {
                importTypeLines.push(line.trim());
            } else if (/^import /.test(trimmed)) {
                otherImportLines.push(line.trim());
            } else {
                restLines.push(line);
            }
        });
        
        const newContent = [...importTypeLines, '', ...otherImportLines, '', ...restLines].join('\n').trim() + '\n';
        
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Sorted:', file);
    }
});

console.log('Done!');