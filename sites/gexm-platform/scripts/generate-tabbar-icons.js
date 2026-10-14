const fs = require('fs');
const path = require('path');

const icons = {
  home: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{color}"><path d="M12 3l9 8h-3v10h-4v-6h-4v6H6V11H3z"/></svg>',
  category: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{color}"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/></svg>',
  cart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{color}"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
  profile: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="{color}"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
};

const normalColor = '#999999';
const selectedColor = '#FF6B35';
const outDir = path.resolve(__dirname, '..', 'packages/app/src/static/tabbar');

Object.keys(icons).forEach(name => {
  const normalSvg = icons[name].replace('{color}', normalColor);
  fs.writeFileSync(path.join(outDir, name + '.svg'), normalSvg);
  const selectedSvg = icons[name].replace('{color}', selectedColor);
  fs.writeFileSync(path.join(outDir, name + '-active.svg'), selectedSvg);
  console.log('Generated:', name + '.svg,', name + '-active.svg');
});

console.log('All tabBar icons generated successfully!');
