const fs = require('fs');
const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

// replace the officeapps link
content = content.replace(
  /\<a :href="\`https:\/\/view\.officeapps\.live\.com\/op\/embed\.aspx\?src=\$\{encodeURIComponent\(task\.previewUrl \|\| ''\)\}\`" target="_blank" style="text-decoration: none"\>/g,
  '<a :href="task.previewUrl" target="_blank" style="text-decoration: none">'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed officeapps link');
