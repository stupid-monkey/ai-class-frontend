const fs = require('fs');

const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace preview buttons to disable or hide if allowPreview === false
content = content.replace(
  /@click="previewFile\(row\)"/g,
  `@click="previewFile(row)"
                      v-if="row.allowPreview !== false"`
);

// Make sure download buttons are hidden if allowDownload === false
// Wait, we can just replace @click="downloadFile(row)" to have v-if="row.allowDownload !== false" if it doesn't have it
let newContent = "";
let parts = content.split('@click="downloadFile(row)"');
for (let i = 0; i < parts.length - 1; i++) {
  newContent += parts[i] + '@click="downloadFile(row)"';
  // Check if the next part already has allowDownload
  if (!parts[i+1].includes('allowDownload')) {
    newContent += '\n                      v-if="row.allowDownload !== false"';
  }
}
newContent += parts[parts.length - 1];
content = newContent;

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Buttons updated.');
