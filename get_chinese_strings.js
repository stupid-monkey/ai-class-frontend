@
const fs = require('fs');

const files = [
  'D:/AiClass/Ai-Class/src/views/DashboardView.vue',
  'D:/AiClass/Ai-Class/src/views/TeacherGradingView.vue'
];

let allMatches = new Set();
let messageMatches = new Set();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Find all ElMessage calls
  const elMatches = content.match(/ElMessage\.([a-z]+)\(([^)]+)\)/g);
  if (elMatches) {
    elMatches.forEach(m => messageMatches.add(m));
  }
  // Find other Chinese strings in TeacherGradingView.vue
  if (file.includes('TeacherGradingView.vue')) {
    const zhMatches = content.match(/[\u4e00-\u9fa5]+/g);
    if (zhMatches) {
      zhMatches.forEach(m => allMatches.add(m));
    }
  }
});

console.log('ElMessages:');
console.log(Array.from(messageMatches).join('\n'));

console.log('\nChinese words in TeacherGradingView:');
console.log(Array.from(allMatches).join(' | '));
@
