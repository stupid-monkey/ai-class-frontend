const fs = require('fs');

let file = fs.readFileSync('src/views/DashboardView.vue', 'utf-8');

const replacements = {
  '⏳ 生成大纲中...': '⏳ Generating Outline...',
  '📝 构思大纲': '📝 Generate PPT Outline',
  '您的 PPT 生成成功！': 'PPT generation successful!',
  'PPT文件已准备就绪。由于网络安全限制，内网生成的文件可能无法直接被外部服务预览解析；如果下方预览框由于设备分辨率原因显示空白或尺寸受挤压，请直接点击“下载 PPT”按钮。': 'Your PPT is ready. Due to network restrictions, intranet files may not be previewable by external services. If the preview box below is blank or misaligned, please click the \\"Download PPT\\" button to view it locally.',
  '>下载 PPT<': '>Download PPT<',
  '本次消耗积分资源:': 'Credits Deducted:',
  '剩余积分资源:': 'Credits Remaining:',
  '自动构思内容大纲': 'PPT Outline',
  '可在大纲阶段调整结构，完成无误后再确认生成 PPT': 'Editable outline before Generation',
  '在上一步大纲构思的基础上，可以在这里对内容架构进行调整，后续内容会基于此大纲最终为您生成完整的 PPT...': 'Review and modify your outline here before generating the final PPT...',
  '上传文件以辅助参考(可选)': 'Upload Reference Document',
  '上传文件以辅助参考': 'Upload Reference Document',
  '参考附件 (可选)': 'Upload Reference (Optional)',
  'AI Engine (模型)': 'AI Engine',
  'Xunfei (Fast)': 'Xunfei (Fast)',
  'Gamma (Smart)': 'Gamma (Smart)',
  '🗑️ Reset Outline': '🗑️ Reset Outline',
  '🚀 Generate Final PPT': '🚀 Generate Final PPT'
};

for (const [zh, en] of Object.entries(replacements)) {
  file = file.split(zh).join(en);
}

fs.writeFileSync('src/views/DashboardView.vue', file);
console.log('Reverted template texts to English.');
