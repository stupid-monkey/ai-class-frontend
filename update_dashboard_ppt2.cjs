const fs = require('fs');

const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

// Update PPTTask
content = content.replace(
  'previewUrl?: string\n    credits?:',
  'previewUrl?: string\n    personalResourceId?: number\n    credits?:'
);

// Update pollTask handling
let occurrences = content.split('task.downloadUrl = data.downloadUrl || data.fileUrl;');
if (occurrences.length > 1) {
  content = occurrences.join('task.downloadUrl = data.downloadUrl || data.fileUrl;\n              task.personalResourceId = data.personalResourceId;');
}

// Create handlePptPreview
const methodInjection = `
const handlePptPreview = async (task: PPTTask) => {
  if (task.personalResourceId) {
    try {
      const res = await getTeacherPreviewUrlApi(task.personalResourceId) as any;
      if (res.code === 0 && res.data) {
        window.open(res.data, '_blank');
      } else {
        ElMessage.warning(res.message || 'Preview not supported for this file.');
      }
    } catch (e) {
      ElMessage.error('Failed to get preview URL.');
    }
    return;
  }
  
  if (task.previewUrl && (task.previewUrl.includes('gamma.app') || task.previewUrl.includes('officeapps.live.com'))) {
    window.open(task.previewUrl, '_blank');
    return;
  }
  
  if (task.downloadUrl || task.previewUrl) {
    const url = getPptPreviewUrl(task.previewUrl || task.downloadUrl);
    if (url) {
      window.open(url, '_blank');
    }
  }
}
</script>`;

if (!content.includes('const handlePptPreview = async')) {
    content = content.replace('</script>', methodInjection);
}

const oldTagRegex = /<a :href="getPptPreviewUrl\(task\.previewUrl\)" target="_blank" style="text-decoration: none">\s*<el-button v-if="task\.previewUrl" size="small" type="info">Preview<\/el-button>\s*<\/a>/g;

content = content.replace(oldTagRegex, '<el-button v-if="task.previewUrl || task.personalResourceId" size="small" type="info" @click="handlePptPreview(task)">Preview</el-button>');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Update PPT preview logic.');
