const fs = require('fs');
const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

// Inject the getPptPreviewUrl method near the end of script setup
const methodInjection = `

const getPptPreviewUrl = (url?: string) => {
  if (!url) return '';
  if (url.includes('gamma.app') || url.includes('officeapps.live.com')) return url;
  
  let targetUrl = url;
  if (url.startsWith('/')) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? 'https://cekl.d9lab.net' : window.location.origin;
    targetUrl = base + url;
  } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
    targetUrl = url.replace(/http:\\/\\/(localhost|127\\.0\\.0\\.1):\\d+/, 'https://cekl.d9lab.net');
  }
  
  return \`https://view.officeapps.live.com/op/embed.aspx?src=\${encodeURIComponent(targetUrl)}\`;
}

</script>`;

content = content.replace('</script>', methodInjection);

// Fix the a tag
const oldTag = `<a :href="task.previewUrl" target="_blank" style="text-decoration: none">`;
const newTag = `<a :href="getPptPreviewUrl(task.previewUrl)" target="_blank" style="text-decoration: none">`;
content = content.replace(oldTag, newTag);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('officeapps logic restored and improved.');
