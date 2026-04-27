const fs = require('fs');

let c = fs.readFileSync('src/views/DashboardView.vue', 'utf8');

// 1. Replace Template inputs & buttons
const startTmpl = c.indexOf(`                    <el-button 
                      type="primary" 
                      size="large" 
                      style="width: 100%; margin-top: 10px;"
                      @click="generatePPT"
                      :loading="pptLoading"
                      :disabled="pptLoading"
                    >`);
if (startTmpl === -1) { console.error("Could not find start template button"); }
const endTmpl = c.indexOf('</el-button>', startTmpl) + '</el-button>'.length;

const newBtnsHTML = `
                    <el-form-item label="Engine" style="margin-top: 15px;">
                      <el-radio-group v-model="pptForm.engine">
                        <el-radio label="xunfei">Xunfei</el-radio>
                        <el-radio label="gamma">Gamma</el-radio>
                      </el-radio-group>
                    </el-form-item>
                    <el-form-item label="Outline" v-if="pptOutline && pptTaskStatus === 'OUTLINE_GENERATED'">
                      <p style="font-size: 12px; color: #909399; margin-bottom: 5px;">Review and edit generated outline before generation:</p>
                      <el-input type="textarea" :rows="8" v-model="pptOutline" placeholder="Your review..." />
                    </el-form-item>
                    <el-button 
                      type="primary" 
                      size="large" 
                      style="width: 100%; margin-top: 10px;"
                      @click="generatePPTOutline"
                      :loading="generatingOutline"
                      :disabled="generatingOutline || pptLoading"
                    >
                      {{ generatingOutline ? '⏳ Generating Outline...' : '1. Generate Outline' }}
                    </el-button>
                    <el-button 
                      v-if="pptTaskStatus === 'OUTLINE_GENERATED'"
                      type="success" 
                      size="large" 
                      style="width: 100%; margin-top: 10px;"
                      @click="generatePPT"
                      :loading="pptLoading"
                      :disabled="pptLoading"
                    >
                      {{ pptLoading ? '⏳ ' + $t('dashboard_mod.generating') : '2. ' + $t('dashboard_mod.generatePptBtn') }}
                    </el-button>`;

c = c.substring(0, startTmpl) + newBtnsHTML + c.substring(endTmpl);

// 2. Replace Credits View
const btnDlStart = c.indexOf(`<a :href="pptResultUrl" target="_blank" style="text-decoration: none;">`);
const btnDlEnd = c.indexOf(`</div>`, btnDlStart);
const btnDlEndDiv = c.indexOf(`</div>`, btnDlEnd + 6) + 6;

const newCreditsHTML = `<a :href="pptResultUrl" target="_blank" style="text-decoration: none;">
                          <el-button type="success" size="large"><el-icon style="margin-right: 4px"><Download /></el-icon>{{ $t('dashboard_mod.downloadPptBtn') }}</el-button>
                        </a>
                      </div>
                      <div v-if="pptCredits && pptCredits.deducted !== null && pptCredits.deducted !== undefined" style="margin-top: 10px; padding-top: 10px; border-top: 1px dotted #ccc;">
                        <el-tag type="info" size="small">Credits Deducted: {{ pptCredits.deducted }}</el-tag>
                        <el-tag v-if="pptCredits.remaining !== null && pptCredits.remaining !== undefined" type="success" size="small" style="margin-left: 10px;">Credits Remaining: {{ pptCredits.remaining }}</el-tag>
                      </div>
                    </div>`;

c = c.substring(0, btnDlStart) + newCreditsHTML + c.substring(btnDlEndDiv);

// 3. Replace Function generatePPT (The block parsed correctly previously)

const fnStart = c.indexOf('const generatePPT = async () => {');
let balance = 0; let foundFirst = false; let fnEnd = fnStart;
for(let i=fnStart; i<c.length; i++){ 
  if(c[i]==='{') { balance++; foundFirst = true; } 
  if(c[i]==='}') { balance--; } 
  if(foundFirst && balance === 0) { fnEnd = i + 1; break; } 
}

const newGenFn = `const generatePPT = async () => {
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
    formData.append('prompt', "主题：" + pptForm.topic + "\\r\\n大纲要求：" + pptOutline.value)
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

    console.log('【调试】PPT 任务创建响应:', taskResponse)
    
    if (taskResponse.code !== 0) {
      ElMessage.error(taskResponse.message || 'Failed to create PPT task')
      return
    }
    
    const taskData = taskResponse.data
    pptTaskId.value = taskData.recordId
    pptTaskStatus.value = taskData.status
    if (taskData.credits) { pptCredits.value = taskData.credits }
    
    console.log('【调试】PPT task created，ID:', pptTaskId.value, 'Status:', taskData.status)
    ElMessage.success(\`PPT task created (ID: \${pptTaskId.value})，Status: \${taskData.status}\`)
    
    if (pptTaskId.value) {
      let pollCount = 0
      const maxPolls = 60
      const pollInterval = setInterval(async () => {
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          ElMessage.warning('PPT generation timed out')
          return
        }
        try {
          const statusResponse = await getPPTTaskByIdApi(pptTaskId.value) as any
          if (statusResponse.code === 0) {
            const status = statusResponse.data.status
            pptTaskStatus.value = status
            if (statusResponse.data.credits) { pptCredits.value = statusResponse.data.credits }
            
            if (status === 'SUCCESS') {
              clearInterval(pollInterval)
              pptLoading.value = false
              
              const data = statusResponse.data;
              pptResultUrl.value = data.resultFileUrl || data.downloadUrl
              pptPreviewUrl.value = data.remoteDownloadUrl || data.downloadUrl || data.resultFileUrl
              
              ElMessage.success('PPT Generation complete!')
            } else if (status === 'FAILED' || status === 'RESULT_SYNC_FAILED') {
              clearInterval(pollInterval)
              pptLoading.value = false
              ElMessage.error(\`Task Failed: \${statusResponse.data.errorMessage || 'Unknown Error'}\`)
            } else {
              pollCount++
            }
          }
        } catch (pollErr) {
          console.error('Poll failed:', pollErr)
          pollCount++
        }
      }, 5000)
    }
  } catch (error) {
    console.error('【出错】生成 PPT 异常:', error)
    ElMessage.error('Failed to start task: ' + (error.message || error))
    pptTaskStatus.value = 'FAILED'
    pptLoading.value = false
  }
}`;

c = c.substring(0, fnStart) + newGenFn + c.substring(fnEnd);

fs.writeFileSync('src/views/DashboardView.vue', c);
console.log('Final fix applied');
