
const fs = require('fs');
let content = fs.readFileSync('src/views/DashboardView.vue', 'utf8');

const sStart = \// PPT 生成
const pptForm = reactive({
  engine: 'xunfei',
  topic: '',
  pages: 10,
  style: 'simple'
})\;

if(content.includes(sStart)) {
    content = content.replace(sStart, \// PPT 生成
const pptForm = reactive({
  engine: 'xunfei',
  topic: '',
  pages: 10,
  style: 'simple',
  fileList: [] as any[]
})

const handlePptFileChange = (file) => {
  pptForm.fileList = [file];
}\);
    fs.writeFileSync('src/views/DashboardView.vue', content);
    console.log('patched form state');
} else {
    console.log('fail');
}

