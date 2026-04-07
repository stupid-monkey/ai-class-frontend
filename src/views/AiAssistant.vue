<template>
  <div class="ai-assistant-container">
    <el-card class="main-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">✨ AI 智慧课堂助手</span>
          <span class="subtitle">让 AI 成为你的得力助教与学习伙伴</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="ai-tabs">
        
        <el-tab-pane label="💬 AI 问答" name="qa">
          <div class="qa-container">
            <div ref="chatWindowRef" class="chat-window">
              <div 
                v-for="(msg, index) in chatList" 
                :key="index" 
                :class="['chat-msg', msg.role === 'user' ? 'user' : 'ai']"
              >
                <div class="avatar">{{ msg.role === 'user' ? '我' : 'AI' }}</div>
                <div class="msg-bubble">{{ msg.content }}</div>
              </div>
            </div>
            <div class="input-area">
              <el-input 
                v-model="inputMsg" 
                placeholder="向 AI 提问任何关于课程、知识点的问题..." 
                size="large"
                @keyup.enter="!chatLoading && sendMessage()"
                :disabled="chatLoading"
              >
                <template #append>
                  <el-button 
                    type="primary" 
                    @click="sendMessage"
                    :loading="chatLoading"
                    :disabled="chatLoading"
                  >
                    {{ chatLoading ? '思考中...' : '发送' }} <el-icon class="el-icon--right"><Position /></el-icon>
                  </el-button>
                </template>
              </el-input>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="📊 PPT 生成" name="ppt">
          <div class="tool-container">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form label-position="top">
                  <el-form-item label="PPT 主题/大纲">
                    <el-input 
                      v-model="pptForm.topic" 
                      type="textarea" 
                      :rows="4" 
                      placeholder="请输入你要生成的 PPT 主题，例如：高中物理《牛顿第二定律》教学课件..." 
                    />
                  </el-form-item>
                  <el-form-item label="期望页数">
                    <el-slider v-model="pptForm.pages" :min="5" :max="30" show-input />
                  </el-form-item>
                  <el-form-item label="设计风格">
                    <el-select v-model="pptForm.style" placeholder="选择风格">
                      <el-option label="学术简约" value="simple" />
                      <el-option label="活泼卡通" value="cartoon" />
                      <el-option label="科技炫酷" value="tech" />
                    </el-select>
                  </el-form-item>
                  <el-button 
                    type="primary" 
                    class="full-width-btn" 
                    size="large"
                    @click="generatePPT"
                    :loading="pptLoading"
                    :disabled="pptLoading"
                  >
                    {{ pptLoading ? '⏳ 正在生成中...' : '🚀 一键生成 PPT' }}
                  </el-button>
                </el-form>
              </el-col>
              <el-col :span="16">
                <!-- 生成成功结果展示 -->
                <div v-if="pptResultUrl" class="preview-area" style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e1f3d8; height: 100%; display: flex; flex-direction: column;">
                  <div style="margin-bottom: 10px; color: #67C23A; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                    <span>🎉 PPT 生成成功！</span>
                    <a :href="pptResultUrl" target="_blank" style="text-decoration: none;">
                      <el-button type="success" size="small">⬇️ 下载 PPT</el-button>
                    </a>
                  </div>
                  <!-- 使用微软 Office Online 预览 -->
                  <iframe :src="`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(pptResultUrl)}`" width="100%" style="flex-grow: 1; border: 1px solid #dcdfe6; min-height: 500px;" frameborder="0"></iframe>
                </div>

                <!-- 处理中状态 -->
                <div v-else-if="pptTaskStatus === 'PROCESSING' || pptTaskStatus === 'SUBMITTED'" class="preview-area" style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 400px;">
                  <el-result icon="info" title="PPT 生成状态">
                     <template #sub-title>
                        <div style="display:flex; flex-direction: column; align-items: center; gap: 10px;">
                           <el-icon class="is-loading" :size="30"><Loading /></el-icon>
                           <span>{{ pptTaskStatus === 'PROCESSING' ? 'AI 正在分析大纲构思页面 (这可能需要几分钟)...' : '任务已推送到远端生成队列，请耐心等待...' }}</span>
                        </div>
                     </template>
                  </el-result>
                </div>

                <!-- 大纲展示 -->
                <div v-else-if="pptOutline" class="preview-area" style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #dcdfe6; overflow-y: auto;">
                  <div style="margin-bottom: 10px; color: #409EFF; font-weight: bold;">📄 PPT 大纲预览 ({{ pptPagesCount }} 页)</div>
                  <el-text style="white-space: pre-wrap;">{{ pptOutline }}</el-text>
                </div>
                
                <div v-else class="preview-area">
                  <el-empty description="暂无预览，请先在左侧输入信息并生成" />
                </div>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <el-tab-pane label="📝 课堂作业" name="homework">
          <div class="tool-container">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form label-position="top">
                  <el-form-item label="考察知识点">
                    <el-input 
                      v-model="hwForm.knowledge" 
                      type="textarea" 
                      :rows="3" 
                      placeholder="例如：唐诗三百首、李白生平、浪漫主义..." 
                    />
                  </el-form-item>
                  <el-form-item label="题目难度">
                    <el-radio-group v-model="hwForm.difficulty">
                      <el-radio-button label="easy">简单</el-radio-button>
                      <el-radio-button label="medium">中等</el-radio-button>
                      <el-radio-button label="hard">困难</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item label="题型包含">
                    <el-checkbox-group v-model="hwForm.types">
                      <el-checkbox label="choice">选择题</el-checkbox>
                      <el-checkbox label="judge">判断题</el-checkbox>
                    </el-checkbox-group>
                  </el-form-item>
                  <el-form-item label="题目数量">
                    <el-input-number 
                      v-model="hwForm.questionCount" 
                      :min="1" 
                      :max="20" 
                    />
                  </el-form-item>
                  <el-button 
                    type="success" 
                    class="full-width-btn" 
                    size="large"
                    @click="generateHomework"
                    :loading="hwLoading"
                    :disabled="hwLoading"
                  >
                    {{ hwLoading ? `⏳ 正在处理 (${hwLoadingTime}s)` : '💡 智能出题' }}
                  </el-button>
                </el-form>
              </el-col>
              <el-col :span="16">
                <el-card shadow="hover" class="hw-preview-card">
                  <template #header>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span>生成的作业预览 ({{ hwGeneratedQuestions.length }} 题)</span>
                      <el-button 
                        type="primary" 
                        @click="publishHomework"
                        :loading="hwPublishing"
                        :disabled="hwGeneratedQuestions.length === 0 || hwPublishing"
                      >
                        {{ hwPublishing ? '发布中...' : '📤 发布作业' }}
                      </el-button>
                    </div>
                  </template>
                  <div v-if="hwGeneratedQuestions.length === 0" class="hw-empty">
                    <el-empty description="暂无题目，请先在左侧生成题目" />
                  </div>
                  <div v-else class="hw-content">
                    <div v-for="(question, idx) in hwGeneratedQuestions" :key="idx" class="hw-question">
                      <div class="question-header">
                        <span class="question-no">{{ idx + 1 }}</span>
                        <span class="question-type">{{ question.type === 'choice' ? '选择题' : '判断题' }}</span>
                      </div>
                      <div class="question-text">{{ question.question }}</div>
                      <div v-if="question.options && question.options.length" class="options">
                        <div v-for="(option, oIdx) in question.options" :key="oIdx" class="option">
                          {{ option }}
                        </div>
                      </div>
                      <div class="answer"><strong>答案:</strong> {{ question.answer }}</div>
                      <div v-if="question.explanation" class="explanation"><strong>解析:</strong> {{ question.explanation }}</div>
                      <el-divider />
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { Position, Loading } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  aiChatApi,
  aiGenerateHomeworkApi,
  publishHomeworkApi,
  getHomeworkListApi,
  aiGeneratePPTOutlineApi,
  getHomeworkPublishTargetsApi,
  createPPTTaskApi,
  getPPTTaskByIdApi
} from '@/api/ai'

const router = useRouter()
const userStore = useUserStore()

// 初始化：检查是否已登录
onMounted(() => {
  if (!userStore.isLoggedIn) {
    userStore.initFromLocalStorage()
    if (!userStore.isLoggedIn) {
      router.push('/login')
    }
  }
})

// 激活的 Tab
const activeTab = ref('qa')

// --- AI 问答状态 ---
const inputMsg = ref('')
const chatLoading = ref(false)
const chatList = ref<Array<{ role: string; content: string }>>([
  { role: 'ai', content: '你好！我是 AI 课堂助手。你需要我帮你解答问题、生成课件还是布置作业呢？' }
])
const chatWindowRef = ref<HTMLDivElement>()

// 滚动到聊天窗口底部
const scrollToBottom = async () => {
  await nextTick()
  if (chatWindowRef.value) {
    chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight
  }
}

const sendMessage = async () => {
  if (!inputMsg.value.trim()) return
  if (chatLoading.value) return
  
  // 将用户的消息加入列表
  chatList.value.push({ role: 'user', content: inputMsg.value })
  const userText = inputMsg.value
  inputMsg.value = ''
  await scrollToBottom()
  
  // 添加 AI 回复占位符
  chatList.value.push({ role: 'ai', content: '思考中...' })
  const aiMessageIndex = chatList.value.length - 1
  const aiMessage = chatList.value[aiMessageIndex] as any
  chatLoading.value = true
  
  try {
    console.log('【调试】发送 AI 问答请求:', userText)
    
    // 调用普通 AI 聊天 API
    const response = await aiChatApi({
      message: userText,
      history: chatList.value.slice(0, -1).filter((msg: any) => msg.role !== '' && msg.content !== '')
    }) as any
    
    console.log('【调试】AI 回复:', response)
    
    if (response.code === 0 && response.data) {
      aiMessage.content = response.data.reply || response.data || '暂无回复'
      ElMessage.success('AI 回复已收到')
    } else {
      aiMessage.content = '暂时无法获取 AI 回复，请检查后端服务是否正常运行'
      ElMessage.error(response.message || 'AI 服务异常')
    }
  } catch (error: any) {
    console.error('【调试】Chat error:', error)
    aiMessage.content = `请求失败: ${error.message || '请检查后端服务'}`
    ElMessage.error(`AI 服务连接失败: ${error.message || '请重试'}`)
  } finally {
    chatLoading.value = false
    await scrollToBottom()
  }
}

// --- PPT 生成状态 ---
const pptForm = reactive({
  topic: '',
  pages: 10,
  style: 'simple'
})
const pptLoading = ref(false)
const pptOutline = ref('')
const pptPagesCount = ref(0)
const pptTaskId = ref<number | null>(null)
const pptTaskStatus = ref('')
const pptResultUrl = ref('')

const generatePPT = async () => {
  if (!pptForm.topic.trim()) {
    ElMessage.warning('请输入 PPT 主题')
    return
  }
  
  pptLoading.value = true
  pptOutline.value = ''
  pptResultUrl.value = ''
  pptTaskStatus.value = ''
  try {
    // 第一步：生成 PPT 大纲
    console.log('【调试】第一步：生成 PPT 大纲:', pptForm.topic)
    const outlineResponse = await aiGeneratePPTOutlineApi({
      topic: pptForm.topic,
      pages: pptForm.pages,
      style: pptForm.style
    }) as any
    
    console.log('【调试】大纲生成响应:', outlineResponse)
    
    if (outlineResponse.code !== 0) {
      ElMessage.error(outlineResponse.message || 'PPT 大纲生成失败')
      return
    }
    
    const outlineData = outlineResponse.data
    pptOutline.value = outlineData.markdownOutline || ''
    pptPagesCount.value = outlineData.pages || pptForm.pages
    
    console.log('【调试】PPT 大纲已生成，共 ' + pptPagesCount.value + ' 页')
    ElMessage.success('PPT 大纲已生成，正在创建任务...')
    
    // 第二步：创建 PPT 任务
    console.log('【调试】第二步：创建 PPT 任务')
    const formData = new FormData()
    formData.append('prompt', "主题：" + pptForm.topic + "\n" + "大纲要求：" + pptOutline.value)
    formData.append('pages', pptForm.pages.toString())
    if (pptForm.style) {
      formData.append('style', pptForm.style)
    }
    
    const taskResponse = await createPPTTaskApi(formData) as any
    
    console.log('【调试】PPT 任务创建响应:', taskResponse)
    
    if (taskResponse.code !== 0) {
      ElMessage.error(taskResponse.message || 'PPT 任务创建失败')
      return
    }
    
    const taskData = taskResponse.data
    pptTaskId.value = taskData.recordId
    pptTaskStatus.value = taskData.status
    
    console.log('【调试】PPT 任务已创建，ID:', pptTaskId.value, '状态:', taskData.status)
    ElMessage.success(`PPT 任务已创建 (ID: ${pptTaskId.value})，状态: ${taskData.status}`)
    
    // 第三步：定时查询任务状态
    if (pptTaskId.value) {
      let pollCount = 0
      const maxPolls = 60
      
      const pollInterval = setInterval(async () => {
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          ElMessage.warning('PPT 生成超时，请稍后手动查询')
          return
        }
        
        try {
          const statusResponse = await getPPTTaskByIdApi(pptTaskId.value!) as any
          if (statusResponse.code === 0) {
            const status = statusResponse.data.status
            pptTaskStatus.value = status
            console.log('【调试】PPT 任务状态查询:', status)
            
            if (status === 'SUCCESS') {
              clearInterval(pollInterval)
              pptLoading.value = false
              pptResultUrl.value = statusResponse.data.resultFileUrl
              ElMessage.success('PPT 生成成功！')
            } else if (status === 'FAILED' || status === 'RESULT_SYNC_FAILED') {
              clearInterval(pollInterval)
              pptLoading.value = false
              ElMessage.error(`PPT 生成失败: ${statusResponse.data.errorMessage || status}`)
            }
          }
        } catch (error) {
          console.error('【调试】查询 PPT 任务状态失败:', error)
          clearInterval(pollInterval)
          pptLoading.value = false
        }
        
        pollCount++
      }, 5000)
    } else {
      pptLoading.value = false
    }
  } catch (error: any) {
    console.error('【调试】PPT 生成错误:', error)
    pptLoading.value = false
    ElMessage.error(`PPT 生成失败: ${error.message || '请重试'}`)
  }
}

// --- 课堂作业状态 ---
const hwForm = reactive({
  knowledge: '',
  difficulty: 'medium',
  types: [] as string[],
  questionCount: 6
})
const hwGeneratedQuestions = ref<Array<any>>([])
const hwLoading = ref(false)
const hwPublishing = ref(false)
const hwLoadingTime = ref(0) // 追踪加载时间
let hwLoadingTimer: any = null
const homeworkList = ref<Array<any>>([])

// 智能出题
const generateHomework = async () => {
  if (!hwForm.knowledge.trim()) {
    ElMessage.warning('请输入考察知识点')
    return
  }
  if (hwForm.types.length === 0) {
    ElMessage.warning('请选择题型')
    return
  }
  
  hwLoading.value = true
  hwLoadingTime.value = 0
  hwLoadingTimer = setInterval(() => {
    hwLoadingTime.value++
  }, 1000)
  
  let retryCount = 0
  const maxRetries = 2
  
  const attemptGenerate = async (): Promise<any> => {
    try {
      console.log('【调试】生成作业，题型:', hwForm.types)
      
      const requestData = {
        knowledge: hwForm.knowledge,
        difficulty: hwForm.difficulty as 'easy' | 'medium' | 'hard',
        questionTypes: hwForm.types as ('choice' | 'judge')[],
        questionCount: hwForm.questionCount
      }
      
      console.log('【调试】即将发送的请求参数:', JSON.stringify(requestData, null, 2))
      console.log('【调试】知识点内容:', requestData.knowledge)
      console.log('【调试】难度:', requestData.difficulty)
      console.log('【调试】题型数组:', requestData.questionTypes)
      console.log('【调试】题目数量:', requestData.questionCount)
      
      const response = await aiGenerateHomeworkApi(requestData)
      
      console.log('【调试】完整返回结构:', response)
      console.log('【调试】response.code:', response.code)
      console.log('【调试】response.data:', response.data)
      console.log('【调试】response.questions:', (response as any).questions)
      
      // 尝试从多个可能的位置获取题目
      const responseData = response.data as any
      const questions = responseData?.questions || (response as any).questions
      
      if (response.code === 0 && questions && questions.length > 0) {
        hwGeneratedQuestions.value = questions
        console.log('【调试】题目生成成功，共', questions.length, '题:', questions)
        ElMessage.success(`题目生成成功，共 ${questions.length} 题`)
      } else {
        console.error('【调试】未获取到题目数据。response:', response, 'questions:', questions)
        ElMessage.error('题目生成后端返回为空，请检查参数是否正确')
      }
    } catch (error: any) {
      const errorMsg = error.message || '未知错误'
      const errorStatus = error.response?.status
      
      console.error('【调试】Generate homework error:', error)
      console.error('【调试】错误状态码:', errorStatus)
      console.error('【调试】完整错误对象:', error.response?.data || error)
      
      // 504 错误进行重试
      if (errorStatus === 504 && retryCount < maxRetries) {
        retryCount++
        console.warn(`【调试】发生 504 超时，进行第 ${retryCount} 次重试...`)
        ElMessage.warning(`后端网关超时，正在第 ${retryCount} 次重试...`)
        await new Promise(resolve => setTimeout(resolve, 2000)) // 等待 2 秒后重试
        return await attemptGenerate()
      }
      
      // 最终错误处理
      if (errorStatus === 504) {
        ElMessage.error('后端网关超时（504）：AI 处理请求耗时过长，已重试 2 次仍未成功。请检查后端服务或稍后再试。\n\n→ 请联系后端管理员增加 Nginx proxy_read_timeout 配置')
      } else if (errorMsg.includes('timeout')) {
        ElMessage.error('请求超时：后端处理时间过长，请稍后重试或检查后端服务是否正常运行')
      } else if (errorStatus === 400) {
        ElMessage.error('请求参数错误（400）：请检查填写的知识点、难度等参数是否正确')
      } else if (errorMsg.includes('401') || errorMsg.includes('未登录')) {
        ElMessage.error('登录已过期，请重新登录')
      } else {
        ElMessage.error(`题目生成失败: ${errorMsg}`)
      }
    }
  }
  
  try {
    await attemptGenerate()
  } finally {
    hwLoading.value = false
    if (hwLoadingTimer) {
      clearInterval(hwLoadingTimer)
      hwLoadingTimer = null
    }
    hwLoadingTime.value = 0
  }
}

// 发布作业
const publishHomework = async () => {
  if (hwGeneratedQuestions.value.length === 0) {
    ElMessage.warning('请先生成题目')
    return
  }
  
  hwPublishing.value = true
  try {
    const response = await publishHomeworkApi({
      knowledge: hwForm.knowledge,
      difficulty: hwForm.difficulty as 'easy' | 'medium' | 'hard',
      questionTypes: hwForm.types as ('choice' | 'judge')[],
      content: hwGeneratedQuestions.value,
      studentIds: [],
      classIds: []
    })
    
    if (response.code === 0) {
      ElMessage.success('作业发布成功')
      console.log('【调试】作业发布成功')
      // 重置表单
      hwForm.knowledge = ''
      hwForm.types = []
      hwGeneratedQuestions.value = []
    } else {
      console.error('【调试】作业发布失败，响应:', response)
      ElMessage.error(response.msg || response.message || '作业发布失败')
    }
  } catch (error: any) {
    console.error('【调试】Publish homework error:', error)
    ElMessage.error(`作业发布失败: ${error.message || '请重试'}`)
  } finally {
    hwPublishing.value = false
  }
}

// 获取作业列表
const fetchHomeworkList = async () => {
  try {
    const response = await getHomeworkListApi()
    if (response.code === 0) {
      homeworkList.value = (response.data as any) || []
    }
  } catch (error: any) {
    console.error('Fetch homework list error:', error)
  }
}
</script>

<style scoped>
.ai-assistant-container {
  height: 100%;
}

.main-card {
  height: calc(100vh - 100px); /* 适应屏幕高度，留出外边距 */
  display: flex;
  flex-direction: column;
}

:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 0;
}

.card-header .title {
  font-size: 18px;
  font-weight: bold;
}
.card-header .subtitle {
  font-size: 13px;
  color: #909399;
  margin-left: 10px;
}

.ai-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}
:deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
  padding-top: 20px;
}

/* AI 问答聊天区样式 */
.qa-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.chat-window {
  flex: 1;
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
  margin-bottom: 20px;
  min-height: 400px;
}
.chat-msg {
  display: flex;
  margin-bottom: 20px;
  align-items: flex-start;
}
.chat-msg.user {
  flex-direction: row-reverse;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #409EFF;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 14px;
}
.chat-msg.ai .avatar {
  background-color: #67C23A;
  margin-right: 15px;
}
.chat-msg.user .avatar {
  margin-left: 15px;
}
.msg-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.chat-msg.ai .msg-bubble {
  background-color: #ffffff;
  border-top-left-radius: 0;
}
.chat-msg.user .msg-bubble {
  background-color: #ecf5ff;
  color: #409EFF;
  border-top-right-radius: 0;
}
.input-area {
  margin-top: auto;
}

/* PPT与作业生成工具区样式 */
.tool-container {
  padding: 10px;
}
.full-width-btn {
  width: 100%;
  margin-top: 20px;
}
.preview-area {
  background-color: #f5f7fa;
  height: 400px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px dashed #dcdfe6;
}
.hw-preview-card {
  height: 400px;
  overflow-y: auto;
}
.hw-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.hw-content {
  padding: 10px 0;
}
.hw-question {
  margin-bottom: 20px;
  padding-bottom: 15px;
}
.question-header {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}
.question-no {
  font-weight: bold;
  color: #409EFF;
}
.question-type {
  display: inline-block;
  padding: 2px 8px;
  background-color: #E6F7FF;
  color: #0050B3;
  border-radius: 3px;
  font-size: 12px;
}
.question-text {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
  color: #303133;
}
.options {
  margin-bottom: 10px;
  margin-left: 20px;
}
.option {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}
.answer {
  font-size: 13px;
  color: #67C23A;
  line-height: 1.6;
  margin-bottom: 5px;
}
.explanation {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  padding-left: 10px;
  border-left: 3px solid #E0E0E0;
}
.hw-content p {
  color: #606266;
  line-height: 1.6;
}
</style>