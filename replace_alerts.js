@
const fs = require('fs');
const path = require('path');
const dict = require('./dict.js');

const keys = Object.keys(dict).sort((a,b) => b.length - a.length);

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Let's replace Chinese texts inside ElMessage strings
  // We can just find all Chinese texts and if they match our dict, replace them.
  // Actually, we can just replace exactly the literal Chinese strings in the files!
  
  keys.forEach(k => {
    // Escape regex characters
    const safeK = k.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    content = content.replace(new RegExp(safeK, 'g'), dict[k]);
  });

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) processDir(full);
    else if (full.endsWith('.vue') || full.endsWith('.ts') || full.endsWith('.js')) {
      processFile(full);
    }
  });
}

processDir('D:/AiClass/Ai-Class/src/views');
processDir('D:/AiClass/Ai-Class/src/api');
processDir('D:/AiClass/Ai-Class/src/utils');

@
