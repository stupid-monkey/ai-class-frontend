const fs = require('fs');

let c = fs.readFileSync('src/views/DashboardView.vue', 'utf8');

c = c.replace(/<div style="display: flex; gap: 10px;">\s*<a :href="pptResultUrl" target="_blank" style="text-decoration: none;">\s*<el-button type="success" size="large"><el-icon style="margin-right: 4px"><Download \/><\/el-icon>\{\{ \$t\('dashboard_mod.downloadPptBtn'\) \}\}<\/el-button>\s*<\/a>\s*<\/div>\s*<\/div>/g, 
`<div style="display: flex; gap: 10px;">
                        <a :href="pptResultUrl" target="_blank" style="text-decoration: none;">
                          <el-button type="success" size="large"><el-icon style="margin-right: 4px"><Download /></el-icon>{{ $t('dashboard_mod.downloadPptBtn') }}</el-button>
                        </a>
                      </div>
                      <div v-if="pptCredits && pptCredits.deducted !== null && pptCredits.deducted !== undefined" style="margin-top: 10px; padding-top: 10px; border-top: 1px dotted #ccc;">
                        <el-tag type="info" size="small">Credits Deducted: {{ pptCredits.deducted }}</el-tag>
                        <el-tag v-if="pptCredits.remaining !== null && pptCredits.remaining !== undefined" type="success" size="small" style="margin-left: 10px;">Credits Remaining: {{ pptCredits.remaining }}</el-tag>
                      </div>
                    </div>`);

const genPPTStart = c.indexOf('const generatePPT = async () => {');
const viewPPTResultStart = c.indexOf('const viewPPTResult =', genPPTStart) > -1 ? c.indexOf('const viewPPTResult =', genPPTStart) : c.indexOf('const pollPPTTaskStatus =', genPPTStart);

const newGenPPT = `const generatePPT = async () => {
  if (!pptOutline.value) {
    ElMessage.warning('Please generate an outline first.')
    return
  }
  if (!pptForm.topic.trim()) {
    ElMessage.warning('Please enter PPT topic')
    return
  }
  
  pptLoading.value = true
  pptResultUrl.value = ''
  pptPreviewUrl.value = ''
  pptTaskStatus.value = ''
  try {
    console.log('【调试】第二步：创建 PPT 任务 (Engine: ' + pptForm.engine + ')')
    const formData = new FormData()
    formData.append('prompt', "主题：" + pptForm.topic + "\\n要求：" + pptOutline.value)
    formData.append('pages', pptForm.pages.toString())
    if (pptForm.style) {
      formData.append('style', pptForm.style)
    }

    let taskResponse;
    if (pptForm.engine === 'gamma') {
      taskResponse = await createGammaPPTTaskApi(formData) as any;
    } else {
      taskResponse = await createPPTTaskApi(formData) as any;
    }

    console.log('【调试】创建任务响应:', taskResponse)
    
    if (taskResponse.code !== 0) {
      ElMessage.error(taskResponse.message || 'Failed to create PPT task')
      return
    }
    
    const taskData = taskResponse.data
    pptTaskId.value = taskData.recordId
    pptTaskStatus.value = taskData.status
    if (taskData.credits) {
      pptCredits.value = taskData.credits;
    }

    ElMessage.success('Task submitted. Waiting for generation...')
    pollPPTTaskStatus()
    
  } catch (error: any) {
    console.error('【出错】生成 PPT 异常:', error)
    ElMessage.error('Failed to generate PPT: ' + error.message)
    pptTaskStatus.value = 'FAILED'
  } finally {
    pptLoading.value = false
  }
}

`;

c = c.substring(0, genPPTStart) + newGenPPT + c.substring(viewPPTResultStart);

// Let's modify the polling
c = c.replace(/pptTaskStatus\.value = data\.status/g, "pptTaskStatus.value = data.status\n            if (data.credits) { pptCredits.value = data.credits }");

fs.writeFileSync('src/views/DashboardView.vue', c);
console.log('Done!');
