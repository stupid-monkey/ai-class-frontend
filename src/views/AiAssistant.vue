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
                <div
                  v-if="msg.role === 'ai'"
                  class="msg-bubble markdown-body"
                  v-html="
                    DOMPurify.sanitize(
                      marked(
                        msg.content.includes('你好！我是 AI') ||
                          msg.content.includes('Hello! I am the AI')
                          ? $t('dashboard_mod.aiGreeting')
                          : msg.content,
                      ) as string,
                    )
                  "
                ></div>
                <div v-else class="msg-bubble markdown-body" v-text="msg.content"></div>
              </div>
            </div>
            <div class="input-area">
              <el-input
                v-model="inputMsg"
                placeholder="向 AI 提问任何关于课程、知识点的问questions..."
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
                    {{ chatLoading ? '思考中...' : '发送' }}
                    <el-icon class="el-icon--right"><Position /></el-icon>
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
                  <el-form-item label="PPT 主questions/大纲">
                    <el-input
                      v-model="pptForm.topic"
                      type="textarea"
                      :rows="4"
                      placeholder="请输入你要生成的 PPT 主questions，例如：高中物理《牛顿第二定律》教学课件..."
                    />
                  </el-form-item>
                  <el-form-item label="Generation Mode">
                    <el-input model-value="Standard Mode" disabled />
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
                <div
                  v-if="pptResultUrl"
                  class="preview-area"
                  style="
                    background-color: #ffffff;
                    padding: 15px;
                    border-radius: 4px;
                    border: 1px solid #e1f3d8;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                  "
                >
                  <div
                    style="
                      margin-bottom: 10px;
                      color: #67c23a;
                      font-weight: bold;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    "
                  >
                    <span>🎉 PPT generation successful!</span>
                    <a :href="pptResultUrl" target="_blank" style="text-decoration: none">
                      <el-button type="success" size="small">⬇️ 下载 PPT</el-button>
                    </a>
                    <template v-if="pptPersonalResourceId">
                      <el-button type="primary" size="small" style="margin-left:8px" @click="previewResource(pptPersonalResourceId)">🔍 预览个人资源</el-button>
                    </template>
                  </div>
                  <!-- 后端已支持将PPT转PDF预览，直接展示 -->
                  <iframe
                    :src="pptResultUrl"
                    width="100%"
                    style="flex-grow: 1; border: 1px solid #dcdfe6; min-height: 500px"
                    frameborder="0"
                  ></iframe>
                </div>

                <!-- 处理中Status -->
                <div
                  v-else-if="pptTaskStatus === 'PROCESSING' || pptTaskStatus === 'SUBMITTED'"
                  class="preview-area"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    min-height: 400px;
                  "
                >
                  <el-result icon="info" title="PPT 生成Status">
                    <template #sub-title>
                      <div
                        style="
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          gap: 10px;
                        "
                      >
                        <el-icon class="is-loading" :size="30"><Loading /></el-icon>
                        <span>{{
                          pptTaskStatus === 'PROCESSING'
                            ? 'AI 正在分析大纲构思页面 (这可能需要几分钟)...'
                            : '任务已推送到远端生成队列，请耐心等待...'
                        }}</span>
                      </div>
                    </template>
                  </el-result>
                </div>

                <!-- 大纲展示 -->
                <div
                  v-else-if="pptOutline"
                  class="preview-area"
                  style="
                    background-color: #ffffff;
                    padding: 15px;
                    border-radius: 4px;
                    border: 1px solid #dcdfe6;
                    overflow-y: auto;
                  "
                >
                  <div style="margin-bottom: 10px; color: #409eff; font-weight: bold">
                    📄 PPT outline预览 ({{ pptPagesCount }} 页)
                  </div>
                  <el-text style="white-space: pre-wrap">{{ pptOutline }}</el-text>
                </div>

                <div v-else class="preview-area">
                  <el-empty description="暂无预览，请先在左侧输入信息并生成" />
                </div>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <el-tab-pane label="📚 问答记录" name="records">
          <div class="tool-container">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form label-position="top">
                  <el-form-item label="Session ID (可选)">
                    <el-input v-model="recordsSessionId" placeholder="输入 sessionId 以筛选" />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="fetchMyRecords" :loading="recordsLoading">查询我的记录</el-button>
                  </el-form-item>
                  <el-divider />
                  <div v-if="userStore.isTeacher">
                    <el-form-item label="班级 ID (教师)">
                      <el-input-number v-model="teacherRecordsFilter.classId" :min="0" />
                    </el-form-item>
                    <el-form-item label="学生 ID (教师)">
                      <el-input-number v-model="teacherRecordsFilter.studentId" :min="0" />
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="fetchTeacherRecords" :loading="recordsLoading">教师查询</el-button>
                    </el-form-item>
                  </div>
                </el-form>
              </el-col>
              <el-col :span="16">
                <el-table :data="chatRecords" style="width: 100%">
                  <el-table-column prop="id" label="ID" width="80" />
                  <el-table-column prop="sessionId" label="Session" />
                  <el-table-column prop="question" label="Question" />
                  <el-table-column prop="answer" label="Answer" />
                  <el-table-column prop="createdAt" label="Created At" width="180" />
                </el-table>
                <div style="text-align: right; margin-top: 8px;">
                  <el-pagination :current-page="recordsPageNo" :page-size="recordsPageSize" :total="recordsTotal" @current-change="onRecordsPageChange" layout="prev, pager, next" />
                </div>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <el-tab-pane label="💳 AIPPT Credits" name="credits">
          <div class="tool-container">
            <el-row :gutter="20">
              <el-col :span="8">
                <div style="padding: 8px 0">
                  <el-button type="primary" @click="fetchCredits" :loading="creditsLoading">刷新 Credits</el-button>
                </div>
                <div style="margin-top: 12px">
                  <div><strong>总 Credits:</strong> {{ creditsTotal ?? '-' }}</div>
                </div>
              </el-col>
              <el-col :span="16">
                <el-table :data="creditsRecords" style="width:100%">
                  <el-table-column prop="recordId" label="Record ID" width="120" />
                  <el-table-column prop="requestNo" label="Request No" />
                  <el-table-column prop="mode" label="Mode" width="160" />
                  <el-table-column prop="creditDeducted" label="Deducted" width="100" />
                  <el-table-column prop="creditRemaining" label="Remaining" width="120" />
                  <el-table-column label="资源" width="140">
                    <template #default="{ row }">
                      <div v-if="row.personalResourceId">
                        <el-button type="primary" size="mini" @click="previewResource(row.personalResourceId)">预览</el-button>
                      </div>
                      <div v-else>-</div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createdAt" label="Created At" width="180" />
                </el-table>
                <div style="text-align: right; margin-top: 8px;">
                  <el-pagination :current-page="creditsPageNo" :page-size="creditsPageSize" :total="creditsTotalCount" @current-change="onCreditsPageChange" layout="prev, pager, next" />
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
                  <el-form-item label="Additional Prompt (Optional)">
                    <el-input
                      v-model="hwForm.prompt"
                      type="textarea"
                      :rows="2"
                      placeholder="Can be used to constrain the style, scenario, and expression of the question"
                    />
                  </el-form-item>
                  <el-form-item label="Reference File">
                    <el-upload
                      class="upload-demo"
                      action="#"
                      :auto-upload="false"
                      :limit="1"
                      accept=".txt,.md,.csv,.docx,.json,.xml,.html,.yaml,.pdf"
                      :on-change="handleFileChange"
                      v-model:file-list="hwForm.fileList"
                    >
                      <el-button type="primary">Select File</el-button>
                      <template #tip>
                        <div class="el-upload__tip">
                          Supports txt, md, csv, docx, pdf etc., not exceeding 100MB
                        </div>
                      </template>
                    </el-upload>
                  </el-form-item>
                  <el-form-item label="Knowledge Points">
                    <el-input
                      v-model="hwForm.knowledge"
                      type="textarea"
                      :rows="3"
                      placeholder="例如：唐诗三百首、李白生平、浪漫主义..."
                    />
                  </el-form-item>
                  <el-form-item label="questions目难度">
                    <el-radio-group v-model="hwForm.difficulty">
                      <el-radio-button label="easy">简单</el-radio-button>
                      <el-radio-button label="medium">中等</el-radio-button>
                      <el-radio-button label="hard">困难</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item label="questions型包含">
                    <el-checkbox-group v-model="hwForm.types">
                      <el-checkbox label="choice">选择questions</el-checkbox>
                      <el-checkbox label="judge">判断questions</el-checkbox>
                    </el-checkbox-group>
                  </el-form-item>
                  <el-form-item label="questions目数量">
                    <el-input-number v-model="hwForm.questionCount" :min="1" :max="20" />
                  </el-form-item>
                  <el-button
                    type="success"
                    class="full-width-btn"
                    size="large"
                    @click="generateHomework"
                    :loading="hwLoading"
                    :disabled="hwLoading"
                  >
                    {{ hwLoading ? `⏳ Processing (${hwLoadingTime}s)` : '💡 智能出questions' }}
                  </el-button>
                </el-form>
              </el-col>
              <el-col :span="16">
                <el-card shadow="hover" class="hw-preview-card">
                  <template #header>
                    <div style="display: flex; justify-content: space-between; align-items: center">
                      <span>生成的作业预览 ({{ hwGeneratedQuestions.length }} questions)</span>
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
                    <el-empty description="暂无questions目，请先在左侧生成questions目" />
                  </div>
                  <div v-else class="hw-content">
                    <div
                      v-for="(question, idx) in hwGeneratedQuestions"
                      :key="idx"
                      class="hw-question"
                    >
                      <div class="question-header">
                        <span class="question-no">{{ idx + 1 }}</span>
                        <span class="question-type">{{
                          question.type === 'choice' ? '选择questions' : '判断questions'
                        }}</span>
                      </div>
                      <div class="question-text">{{ question.question }}</div>
                      <div v-if="question.options && question.options.length" class="options">
                        <div v-for="(option, oIdx) in question.options" :key="oIdx" class="option">
                          {{ option }}
                        </div>
                      </div>
                      <div class="answer"><strong>答案:</strong> {{ question.answer }}</div>
                      <div v-if="question.explanation" class="explanation">
                        <strong>Explanation:</strong> {{ question.explanation }}
                      </div>
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
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
const { t } = useI18n()
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { Position, Loading } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  aiStreamChatFetch,
  aiChatApi,
  aiGenerateHomeworkApi,
  publishHomeworkApi,
  getHomeworkListApi,
  aiGeneratePPTOutlineApi,
  getHomeworkPublishTargetsApi,
  createPPTTaskApi,
  getPPTTaskByIdApi,
  getMyChatRecordsApi,
  getTeacherChatRecordsApi,
  getAipptCreditsApi
} from '@/api/ai'
import { getResourceDownloadUrlApi } from '@/api/resource'

const router = useRouter()
import { useRoute } from 'vue-router'
const route = useRoute()
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

// --- AI 问答Status ---
const inputMsg = ref('')
const chatLoading = ref(false)
const chatSessionId = ref('')
const chatList = ref<Array<{ role: string; content: string }>>([
  { role: 'ai', content: t('dashboard_mod.aiGreeting') }
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
    aiMessage.content = ''
    await aiStreamChatFetch(
      {
        sessionId: chatSessionId.value || undefined,
        message: userText,
        history: chatList.value.slice(0, -1).filter((msg: any) => msg.role !== '' && msg.content !== '')
      },
      (event, data) => {
        if (event === 'heartbeat') return;
        if (event === 'done') {
          chatLoading.value = false;
          scrollToBottom();
          if (data?.sessionId) {
            chatSessionId.value = data.sessionId
          }
          if (data && data.reply) {
            aiMessage.content = data.reply;
          }
          return;
        }
        if (event === 'data' || event === 'message') {
          const token = typeof data === 'string'
            ? data.replace(/^data:/, '').trim()
            : data?.reply || data?.content || data?.message || ''
          if (token) aiMessage.content += token
          scrollToBottom();
        }
      },
      (error) => {
        console.error('【调试】Chat stream error:', error)
        if (!aiMessage.content) {
          aiMessage.content = 'Request failed. Please try again later.'
          ElMessage.error('AI service temporarily unavailable. Please try again later.')
        }
        chatLoading.value = false;
        scrollToBottom();
      }
    )
  } catch (error: any) {
    console.error('【调试】Chat error:', error)
    aiMessage.content = 'Request failed. Please try again later.'
    ElMessage.error('AI service temporarily unavailable. Please try again later.')
    chatLoading.value = false
    await scrollToBottom()
  }
}

// --- PPT 生成Status ---
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
const pptPersonalResourceId = ref<number | null>(null)

const generatePPT = async () => {
  if (!pptForm.topic.trim()) {
    ElMessage.warning('Please enter PPT topic')
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
      ElMessage.error('Failed to generate PPT outline')
      return
    }

    const outlineData = outlineResponse.data
    pptOutline.value = outlineData.markdownOutline || ''
    pptPagesCount.value = outlineData.pages || pptForm.pages

    console.log('【调试】PPT 大纲已生成，共 ' + pptPagesCount.value + ' 页')
    ElMessage.success('PPT outline generated, creating task...')

    // 第二步：创建 PPT 任务
    console.log('【调试】第二步：创建 PPT 任务')
    const formData = new FormData()
    formData.append('prompt', "主questions：" + pptForm.topic + "\n" + "大纲要求：" + pptOutline.value)
    formData.append('pages', pptForm.pages.toString())
    if (pptForm.style) {
      formData.append('style', pptForm.style)
    }

    const taskResponse = await createPPTTaskApi(formData) as any

    console.log('【调试】PPT 任务创建响应:', taskResponse)

    if (taskResponse.code !== 0) {
      ElMessage.error('Failed to create PPT task')
      return
    }

    const taskData = taskResponse.data
    pptTaskId.value = taskData.recordId
    pptTaskStatus.value = taskData.status
    pptPersonalResourceId.value = taskData.personalResourceId ?? null

    console.log('【调试】PPT task created，ID:', pptTaskId.value, 'Status:', taskData.status)
    ElMessage.success(`PPT task created (ID: ${pptTaskId.value})，Status: ${taskData.status}`)

    // 第三步：定时查询任务Status
    if (pptTaskId.value) {
      let pollCount = 0
      const maxPolls = 60

      const pollInterval = setInterval(async () => {
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          ElMessage.warning('PPT generation timed out. Please check again later.')
          return
        }

        try {
          const statusResponse = await getPPTTaskByIdApi(pptTaskId.value!) as any
          if (statusResponse.code === 0) {
            const status = statusResponse.data.status
            pptTaskStatus.value = status
            console.log('【调试】PPT 任务Status查询:', status)

            if (status === 'SUCCESS') {
              clearInterval(pollInterval)
              pptLoading.value = false
              pptResultUrl.value = statusResponse.data.resultFileUrl
              pptPersonalResourceId.value = statusResponse.data.personalResourceId ?? null
              ElMessage.success('PPT generation successful!')
            } else if (status === 'FAILED' || status === 'RESULT_SYNC_FAILED') {
              clearInterval(pollInterval)
              pptLoading.value = false
              ElMessage.error('PPT generation failed')
            }
          }
        } catch (error) {
          console.error('【调试】查询 PPT 任务Status失败:', error)
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
    ElMessage.error('PPT generation failed. Please try again later.')
  }
}

// --- 课堂作业Status ---
const hwForm = reactive({
  knowledge: '',
  difficulty: 'medium',
  types: [] as string[],
  questionCount: 6,
  prompt: '',
  fileList: [] as any[]
})

const handleFileChange = (file: any, fileList: any[]) => {
  const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.yaml', '.docx', '.pdf']
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  const isAllowed = allowedExtensions.includes(fileExt)
  const isLt100M = file.size / 1024 / 1024 < 100

  if (!isAllowed) {
    ElMessage.error(`File type not supported. Please upload one of: ${allowedExtensions.join(', ')}`)
    hwForm.fileList = []
    return false
  }
  if (!isLt100M) {
    ElMessage.error('File size cannot exceed 100MB!')
    hwForm.fileList = []
    return false
  }
}

const hwGeneratedQuestions = ref<Array<any>>([])
const hwLoading = ref(false)
const hwPublishing = ref(false)
const hwLoadingTime = ref(0) // 追踪加载时间
let hwLoadingTimer: any = null
const homeworkList = ref<Array<any>>([])

// 智能出questions
const generateHomework = async () => {
  if (!hwForm.knowledge.trim()) {
    ElMessage.warning('Please enter knowledge points')
    return
  }
  if (hwForm.types.length === 0) {
    ElMessage.warning('Please select question types')
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
      console.log('【调试】生成作业，questions型:', hwForm.types)

      let requestData: any
      const isFileUpload = hwForm.fileList && hwForm.fileList.length > 0;

      if (isFileUpload) {
        const formData = new FormData();
        formData.append('knowledge', hwForm.knowledge);
        formData.append('difficulty', hwForm.difficulty);
        hwForm.types.forEach(item => {
          formData.append('questionTypes', item);
        });
        formData.append('questionCount', hwForm.questionCount.toString());
        if (hwForm.prompt) {
          formData.append('prompt', hwForm.prompt);
        }
        formData.append('file', hwForm.fileList[0].raw);
        console.log('【调试】即将发送的请求参数: [FormData]');
        requestData = formData;
      } else {
        requestData = {
          knowledge: hwForm.knowledge,
          difficulty: hwForm.difficulty as 'easy' | 'medium' | 'hard',
          questionTypes: hwForm.types as ('choice' | 'judge')[],
          questionCount: hwForm.questionCount
        }
        if (hwForm.prompt) {
          requestData.prompt = hwForm.prompt;
        }
        console.log('【调试】即将发送的请求参数:', JSON.stringify(requestData, null, 2))
        console.log('【调试】知识点内容:', requestData.knowledge)
        console.log('【调试】难度:', requestData.difficulty)
        console.log('【调试】questions型数组:', requestData.questionTypes)
        console.log('【调试】questions目数量:', requestData.questionCount)
      }

      const response = await aiGenerateHomeworkApi(requestData)

      console.log('【调试】完整返回结构:', response)
      console.log('【调试】response.code:', response.code)
      console.log('【调试】response.data:', response.data)
      console.log('【调试】response.questions:', (response as any).questions)

      // 尝试从多个可能的位置获取questions目
      const responseData = response.data as any
      const questions = responseData?.questions || (response as any).questions

      if (response.code === 0 && questions && questions.length > 0) {
        hwGeneratedQuestions.value = questions
        console.log('【调试】Questions generated successfully, total', questions.length, 'questions:', questions)
        ElMessage.success(`Questions generated successfully, total ${questions.length} questions`)
      } else {
        console.error('【调试】未获取到questions目数据。response:', response, 'questions:', questions)
        ElMessage.error('Failed to generate questions')
      }
    } catch (error: any) {
      const errorMsg = error.message || '未知错误'
      const errorStatus = error.response?.status

      console.error('【调试】Generate homework error:', error)
      console.error('【调试】错误Status码:', errorStatus)
      console.error('【调试】完整错误对象:', error.response?.data || error)

      // 504 错误进行重试
      if (errorStatus === 504 && retryCount < maxRetries) {
        retryCount++
        console.warn(`【调试】发生 504 超时，进行第 ${retryCount} 次重试...`)
        ElMessage.warning(`Request timed out, retrying (${retryCount}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 2000)) // 等待 2 秒后重试
        return await attemptGenerate()
      }

      // 最终错误处理
      if (errorStatus === 504) {
        ElMessage.error('Request timed out. Please try again later.')
      } else if (errorMsg.includes('timeout')) {
        ElMessage.error('Request timed out. Please try again later.')
      } else if (errorStatus === 400) {
        ElMessage.error('Invalid request parameters')
      } else if (errorMsg.includes('401') || errorMsg.includes('未登录')) {
        ElMessage.error('Session expired. Please sign in again.')
      } else {
        ElMessage.error('Failed to generate questions')
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
    ElMessage.warning('Please generate questions first')
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
      ElMessage.success('Homework published successfully')
      console.log('【调试】Homework published successfully')
      // 重置表单
      hwForm.knowledge = ''
      hwForm.types = []
      hwGeneratedQuestions.value = []
    } else {
      console.error('【调试】Failed to publish homework，响应:', response)
      ElMessage.error('Failed to publish homework')
    }
  } catch (error: any) {
    console.error('【调试】Publish homework error:', error)
    ElMessage.error('Failed to publish homework')
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

// ----- 问答记录（我的 / 教师） -----
const recordsSessionId = ref('')
const recordsLoading = ref(false)
const chatRecords = ref<Array<any>>([])
const recordsPageNo = ref(1)
const recordsPageSize = ref(10)
const recordsTotal = ref(0)
const teacherRecordsFilter = reactive({ classId: undefined as number | undefined, studentId: undefined as number | undefined })

const fetchMyRecords = async (page: number = 1) => {
  recordsLoading.value = true
  try {
    const res = await getMyChatRecordsApi({ sessionId: recordsSessionId.value || undefined, pageNo: page, pageSize: recordsPageSize.value }) as any
    if (res.code === 0) {
      chatRecords.value = res.data.records || []
      recordsTotal.value = res.data.total || 0
      recordsPageNo.value = res.data.pageNo || page
    }
  } catch (e) {
    console.error('fetchMyRecords error', e)
  } finally {
    recordsLoading.value = false
  }
}

// 将某个 session 的问答记录加载到聊天区用于回放
const loadSessionToChat = async (sessionId?: string) => {
  if (!sessionId) return
  try {
    // 切换到 QA tab
    activeTab.value = 'qa'
    // 请求该 session 的全部记录（尝试拉取较大的 pageSize）
    const res = await getMyChatRecordsApi({ sessionId, pageNo: 1, pageSize: 200 }) as any
    if (res && res.code === 0) {
      const records = res.data.records || []
      // 将历史记录转换为 chatList（user / ai 交替）
      const list: Array<{ role: string; content: string }> = []
      for (const r of records) {
        if (r.question) list.push({ role: 'user', content: r.question })
        if (r.answer) list.push({ role: 'ai', content: r.answer })
      }
      // 若无历史则保留问候语
      chatList.value = list.length > 0 ? list : [{ role: 'ai', content: t('dashboard_mod.aiGreeting') }]
      chatSessionId.value = sessionId
      await nextTick()
      if (chatWindowRef.value) chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight
    }
  } catch (e) {
    console.error('loadSessionToChat error', e)
  }
}

// 监听路由 query 中的 sessionId，以便外部导航时回放会话
watch(
  () => route.query.sessionId,
  (val) => {
    const sid = String(val || '')
    if (sid) {
      loadSessionToChat(sid)
    }
  },
  { immediate: true }
)

const fetchTeacherRecords = async (page: number = 1) => {
  if (!userStore.isTeacher) {
    ElMessage.warning('仅教师可使用此查询')
    return
  }
  recordsLoading.value = true
  try {
    const res = await getTeacherChatRecordsApi({ classId: teacherRecordsFilter.classId, studentId: teacherRecordsFilter.studentId, pageNo: page, pageSize: recordsPageSize.value }) as any
    if (res.code === 0) {
      chatRecords.value = res.data.records || []
      recordsTotal.value = res.data.total || 0
      recordsPageNo.value = res.data.pageNo || page
    }
  } catch (e) {
    console.error('fetchTeacherRecords error', e)
  } finally {
    recordsLoading.value = false
  }
}

const onRecordsPageChange = (page: number) => {
  // 根据是否设置了教师筛选调用不同 API
  if (userStore.isTeacher && (teacherRecordsFilter.classId || teacherRecordsFilter.studentId)) {
    fetchTeacherRecords(page)
  } else {
    fetchMyRecords(page)
  }
}

// ----- AIPPT Credits -----
const creditsLoading = ref(false)
const creditsRecords = ref<Array<any>>([])
const creditsPageNo = ref(1)
const creditsPageSize = ref(10)
const creditsTotal = ref<number | null>(null)
const creditsTotalCount = ref(0)

const fetchCredits = async (page: number = 1) => {
  creditsLoading.value = true
  try {
    const res = await getAipptCreditsApi({ pageNo: page, pageSize: creditsPageSize.value }) as any
    if (res.code === 0) {
      creditsRecords.value = res.data.records || []
      creditsTotal.value = res.data.totalCredits ?? null
      creditsTotalCount.value = res.data.total || 0
      creditsPageNo.value = res.data.pageNo || page
    }
  } catch (e) {
    console.error('fetchCredits error', e)
  } finally {
    creditsLoading.value = false
  }
}

const onCreditsPageChange = (page: number) => {
  fetchCredits(page)
}

// 预览资源（教师资源预览接口）
const previewResource = async (resourceId: number | null) => {
  if (!resourceId) {
    ElMessage.warning('无可预览的资源')
    return
  }
  try {
    const res = await getResourceDownloadUrlApi(resourceId) as any
    if (res && res.code === 0) {
      const url = typeof res.data === 'string' ? res.data : res.data?.previewUrl || res.data?.resultFileUrl || res.data?.url
      if (url) {
        window.open(url, '_blank')
      } else {
        ElMessage.error('未返回可访问的链接')
      }
    } else {
      ElMessage.error(res?.message || '获取资源地址失败')
    }
  } catch (e) {
    console.error('previewResource error', e)
    ElMessage.error('获取资源链接失败')
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
  background-color: #409eff;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 14px;
}
.chat-msg.ai .avatar {
  background-color: #67c23a;
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
  color: #409eff;
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
  color: #409eff;
}
.question-type {
  display: inline-block;
  padding: 2px 8px;
  background-color: #e6f7ff;
  color: #0050b3;
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
  color: #67c23a;
  line-height: 1.6;
  margin-bottom: 5px;
}
.explanation {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  padding-left: 10px;
  border-left: 3px solid #e0e0e0;
}
.hw-content p {
  color: #606266;
  line-height: 1.6;
}
</style>
