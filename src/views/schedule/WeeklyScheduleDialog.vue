<template>
  <el-dialog 
    v-model="dialogVisible" 
    :title="`${formatSelectedDate} 所在周课表详情`" 
    width="1100px" 
    top="5vh"
    destroy-on-close
  >
    <div v-loading="isLoadingWeeklyData" :element-loading-text="pollingStatusText" class="dialog-inner-content">
      
      <div v-if="!isLoadingWeeklyData">
        <el-card shadow="never" class="box-card timetable-card">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; font-size: 16px;">本周课表</span>
              
              <div 
                v-if="evaluationData" 
                class="score-container" 
                :class="getScoreClass(evaluationData.evaluations[0].score)"
                @click="showEvaluationDialog = true"
                title="点击查看 AI 评分明细"
              >
                <div class="score-ring">
                  <div class="score-circle">
                    <div class="score-label">AI 评分</div>
                    <div class="score-value">{{ evaluationData.evaluations[0].score }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          
          <el-table :data="formattedTimetable" border style="width: 100%">
            <el-table-column prop="periodNum" label="节次" width="80" align="center" fixed="left">
              <template #default="scope">
                <div style="font-weight: bold; color: #606266;">第 {{ scope.row.periodNum }} 节</div>
                <div style="font-size: 12px; color: #909399; margin-top: 4px;">{{ scope.row.periodNum <= baseConfig.morningPeriods ? '上午' : '下午' }}</div>
              </template>
            </el-table-column>
            
            <el-table-column v-for="day in baseConfig.daysPerWeek" :key="day" align="center" min-width="120">
              <template #header>
                <div style="line-height: 1.2;">
                  <div style="font-size: 14px; color: #303133;">星期{{ dayMap[day - 1] }}</div>
                  <div style="font-size: 12px; color: #909399; font-weight: normal; margin-top: 4px;">
                    {{ currentWeekDates[day - 1] }}
                  </div>
                </div>
              </template>
              <template #default="scope">
                <div v-if="scope.row['day' + day]" class="course-cell" :style="{ backgroundColor: getCourseColor(scope.row['day' + day].courseName).bg, borderColor: getCourseColor(scope.row['day' + day].courseName).border }">
                  <div class="course-name" :style="{ color: getCourseColor(scope.row['day' + day].courseName).text }">{{ scope.row['day' + day].courseName }}</div>
                  <div class="teacher-name">{{ scope.row['day' + day].teacherName }}</div>
                </div>
                <div v-else class="empty-cell">- 空 -</div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card shadow="never" class="box-card chat-card">
          <template #header>
            <span style="font-weight: bold; color: #409EFF;">✨ AI 课表微调助手</span>
            <span style="font-size: 12px; color: #909399; margin-left: 10px;">告诉 AI 你的调整想法，本周课表将实时更新</span>
          </template>
          
          <div class="chat-messages" ref="chatListRef">
            <div v-for="(msg, index) in chatMessages" :key="index" :class="['chat-msg', msg.role]">
              <el-avatar v-if="msg.role === 'ai'" :size="36" class="avatar-ai">AI</el-avatar>
              <div class="msg-bubble">
                <div style="white-space: pre-wrap; line-height: 1.6;">{{ msg.content }}</div>
              </div>
              <el-avatar v-if="msg.role === 'user'" :size="36" class="avatar-user">我</el-avatar>
            </div>
            
            <div v-if="isChatting" class="chat-msg ai">
              <el-avatar :size="36" class="avatar-ai">AI</el-avatar>
              <div class="msg-bubble">
                <div class="typing-indicator"><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
          
          <div class="chat-input-area">
            <el-input 
              v-model="chatInput" 
              placeholder="例如：把本周一的语文课换到周二下午..." 
              @keyup.enter="sendChatMessage" 
              :disabled="isChatting" 
              size="large"
            />
            <el-button type="primary" size="large" :loading="isChatting" @click="sendChatMessage" style="margin-left: 12px; border-radius: 8px;">发送</el-button>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog v-model="showEvaluationDialog" title="🤖 AI 排课质量评估报告" width="600px" append-to-body>
      <div v-if="evaluationData">
        <div class="summary-comment">
          <el-icon style="margin-right: 8px; margin-top: 3px;"><InfoFilled /></el-icon>
          <div><strong>综合评价：</strong><br/>{{ evaluationData.evaluations[0].summaryComment }}</div>
        </div>
        <h4 style="margin-top: 25px; margin-bottom: 15px;">扣分明细：</h4>
        <el-table :data="evaluationData.evaluations[0].deductionItems" border stripe>
          <el-table-column prop="dimension" label="评估维度" width="120" align="center">
            <template #default="scope"><el-tag type="warning">{{ scope.row.dimension }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="reason" label="扣分原因" />
          <el-table-column prop="deduction" label="扣分" width="80" align="center">
            <template #default="scope"><span style="color: #F56C6C; font-weight: bold;">-{{ scope.row.deductScore || scope.row.deduction }}</span></template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onMounted } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getScheduleResultApi, getScheduleEvaluationApi, chatApi } from '@/api/schedule'
import type { ApiResponse } from '@/api/request'
import type { scheduleResult, ScheduleEvaluation } from '@/model/schedule'

const props = defineProps<{
  modelValue: boolean
  taskId: string
  dateString: string
  baseConfig: any 
  classId:string
}>()
onMounted(() => {
  console.log("WeeklyScheduleDialog mounted with props:", props)
})
const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isLoadingWeeklyData = ref(false)
const pollingStatusText = ref('')
let pollTimer: any = null

const timetableData = ref<any[]>([])
const evaluationData = ref<ScheduleEvaluation | null>(null)
const showEvaluationDialog = ref(false)

const chatInput = ref('')
const isChatting = ref(false)
const chatMessages = ref<{role: 'user'|'ai', content: string}[]>([])
const chatListRef = ref<HTMLElement | null>(null)

const dayMap = ['一', '二', '三', '四', '五', '六', '日']

const formatSelectedDate = computed(() => {
  if (!props.dateString) return ''
  const d = new Date(props.dateString)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const currentWeekDates = computed(() => {
  if (!props.dateString) return []
  const dates = []
  const current = new Date(props.dateString)
  let dayOfWeek = current.getDay() || 7
  const monday = new Date(current)
  monday.setDate(current.getDate() - dayOfWeek + 1)
  for (let i = 0; i < props.baseConfig.daysPerWeek; i++) {
    const targetDate = new Date(monday)
    targetDate.setDate(monday.getDate() + i)
    dates.push(`${targetDate.getMonth() + 1}月${targetDate.getDate()}日`)
  }
  return dates
})

// === 💡 核心改动：监听弹窗打开，接管轮询逻辑 ===
watch(() => dialogVisible.value, (newVal) => {
  if (newVal && props.taskId && props.dateString) {
    startPollingWeeklyData()
  } else {
    // 弹窗关闭时，必须清除定时器防止内存泄漏
    if (pollTimer) clearInterval(pollTimer)
  }
})

const startPollingWeeklyData = () => {
  isLoadingWeeklyData.value = true
  pollingStatusText.value = '正在向 AI 获取该周排课结果...'
  chatMessages.value = []
  

  // 开启轮询，查这周到底排完没
  pollTimer = setInterval(async () => {
    try {
      const weekRes = await getScheduleResultApi(  props.taskId,props.classId , props.dateString )
      const weekData = weekRes as unknown as ApiResponse<scheduleResult>
      
      // 💡 修复点：将后端返回的 status 强制转为大写再比较，完美兼容 "success" 和 "SUCCESS"
      const currentStatus = (weekData.data.status || '').toUpperCase()

      if (currentStatus === 'SUCCESS') {
        // 发现排课成功！清除轮询定时器
        clearInterval(pollTimer)
        pollTimer = null
        
        timetableData.value = weekData.data.timetable || []
        console.log("✅ 成功拿到本周课表数据:", timetableData.value) // 方便你调试
        
        // 课表拿到后，获取评分数据
        await fetchEvaluation()

        // 初始化问候语并关闭 Loading
        chatMessages.value = [{ role: 'ai', content: `这是 ${props.dateString} 所在周的课表。如需对本周微调，请直接告诉我。` }]
        isLoadingWeeklyData.value = false

      } else if (currentStatus === 'COMPUTING') {
        pollingStatusText.value = 'AI 还在进行冲突优化，请稍候...'
      }
    } catch (error) {
      clearInterval(pollTimer)
      pollTimer = null
      isLoadingWeeklyData.value = false
      ElMessage.error("获取周数据失败或网络错误")
    }
  }, 2000)
}

// 提取评价获取方法
// 提取评价获取方法
// 提取评价获取方法
const fetchEvaluation = async () => {
  try {
    // 注意：如果你们的后端接口需要 classId 和 dateString 才能查评价，请在此处加上参数！
    const evalRes = await getScheduleEvaluationApi( props.taskId )
    
    // 💡 修复点：强兼容解包。如果有标准的 data 结构就取 data，否则直接取本体
    const { data } = evalRes as ApiResponse<ScheduleEvaluation>
    const resData = data || evalRes
    console.log("✅ AI 评价接口返回数据：", resData)
    // 只要有核心字段，就赋值给视图
    if (resData ) {
      evaluationData.value = resData
      console.log("✅ AI 评价数据已成功挂载渲染：", resData)
    } else {
      console.warn("⚠️ 获取到了评价接口，但没找到 score 等字段：", resData)
    }
  } catch(e) {
    console.error("❌ 评价获取失败", e)
  }
}

// ============= 颜色与矩阵转换工具 =============
const colorPalette = [
  { bg: '#ecf5ff', text: '#409eff', border: '#d9ecff' }, { bg: '#f0f9eb', text: '#67c23a', border: '#e1f3d8' },
  { bg: '#fdf6ec', text: '#e6a23c', border: '#faecd8' }, { bg: '#fef0f0', text: '#f56c6c', border: '#fde2e2' }
]
const courseColorMap = new Map<string, typeof colorPalette[0]>()
let colorIndex = 0

const getCourseColor = (courseName: string) => {
  if (!courseName || courseName === '无') return { bg: '#ffffff', text: '#909399', border: '#ebeef5' }
  if (courseColorMap.has(courseName)) return courseColorMap.get(courseName)!
  const color = colorPalette[colorIndex % colorPalette.length]|| { bg: '#ffffff', text: '#909399', border: '#ebeef5' };
   courseColorMap.set(courseName, color); colorIndex++
  return color
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 75) return 'score-good'
  return 'score-poor'
}

const formattedTimetable = computed(() => {
  const matrix: any[] = []
  
  // 遍历每天的每一节课（行）
  for (let period = 1; period <= props.baseConfig.periodsPerDay; period++) {
    const rowData: any = { periodNum: period }
    
    // 遍历星期一到星期X（列）
    for (let day = 1; day <= props.baseConfig.daysPerWeek; day++) {
      
      const course = timetableData.value.find(item => {
        // 1. 兼容节次字段：支持 periodNum 或 period_num，并强转为数字
        const itemPeriod = Number(item.periodNum || item.period_num)
        
        // 2. 兼容星期字段：支持 dayOfWeek 或 day_of_week
        let itemDay = Number(item.dayOfWeek || item.day_of_week)
        
        // 3. 💡 核心兜底：如果后端现在不返回 dayOfWeek，而是返回 calendarDate (如 "2026-03-02")
        if (!itemDay && item.calendarDate) {
          const dateObj = new Date(item.calendarDate.replace(/-/g, '/')) // 兼容 iOS 的日期解析
          let weekDay = dateObj.getDay() // 0 是周日，1 是周一
          itemDay = weekDay === 0 ? 7 : weekDay // 将 0-6 转换为 1-7
        }

        // 最终比对：节次和星期几必须同时对上
        return itemDay === day && itemPeriod === period
      })
      
      // 挂载到 day1, day2... 属性上供 el-table 渲染
      rowData[`day${day}`] = course || null
    }
    matrix.push(rowData)
  }
  
  // 如果你还是渲染不出来，打开控制台看这句打印，检查字段名是不是变了！
  console.log("转换后的二维矩阵数据：", matrix)
  
  return matrix
})

// ============= 微调聊天 =============
// ============= 微调聊天 =============
const scrollChatToBottom = async () => {
  await nextTick(); if (chatListRef.value) chatListRef.value.scrollTop = chatListRef.value.scrollHeight
}

const sendChatMessage = async () => {
  const text = chatInput.value.trim()
  if (!text || isChatting.value) return
  
  chatMessages.value.push({ role: 'user', content: text })
  chatInput.value = ''
  isChatting.value = true
  scrollChatToBottom()

  try {
    const chatRes = await chatApi({ message: text, taskId: props.taskId, classId: props.classId })
    
    // 兼容 AI 消息文本提取
    const aiReplyMsg = (chatRes as any).data || (chatRes as any).msg || chatRes
    const replyText = typeof aiReplyMsg === 'string' 
      ? aiReplyMsg 
      : (typeof aiReplyMsg === 'object' && aiReplyMsg && 'data' in aiReplyMsg ? aiReplyMsg.data : '收到指令，课表已调整。')
    
    chatMessages.value.push({ role: 'ai', content: replyText })
    
    // 💡 核心修复 1：稍微等 500 毫秒！让后端数据库有充足的时间 commit 事务，避免查到旧数据
    setTimeout(async () => {
      try {
        const refreshRes = await getScheduleResultApi(props.taskId, props.classId, props.dateString)
        const { data } = refreshRes as ApiResponse<scheduleResult>
        const refreshData = data || refreshRes
        
        if (refreshData && typeof refreshData === 'object' && 'timetable' in refreshData) {
          // 💡 核心修复 2：使用深拷贝强制生成一个全新地址的数组，100% 触发 Vue 的响应式刷新！
          timetableData.value = JSON.parse(JSON.stringify(refreshData.timetable || []))
          console.log("🔄 微调后，已拉取最新课表并强制刷新视图:", timetableData.value)
          
          // 💡 核心修复 3：课表既然改了，让 AI 评分面板也顺便刷新一下
          await fetchEvaluation()
        } else {
          console.warn("⚠️ 微调后拉取的数据结构中找不到 timetable 字段:", refreshData)
        }
      } catch (e) {
        console.error("🔄 刷新最新课表时发生网络异常:", e)
      }
    }, 500)

  } catch (error) {
    console.error("聊天接口异常:", error)
    chatMessages.value.push({ role: 'ai', content: "请求或刷新失败，请稍后重试。" })
  } finally {
    isChatting.value = false
    scrollChatToBottom()
  }
}

// 兜底：组件销毁时确保关闭定时器
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
/* 保持原有样式不变 */
.dialog-inner-content { min-height: 400px; }
.timetable-card { margin-bottom: 20px; }
.course-cell { border-width: 1px; border-style: solid; border-radius: 6px; padding: 10px 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 65px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.3s; }
.course-cell:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
.course-name { font-weight: bold; font-size: 14px; margin-bottom: 6px; letter-spacing: 1px; }
.teacher-name { font-size: 12px; color: #606266; background-color: rgba(255, 255, 255, 0.7); padding: 2px 8px; border-radius: 10px; }
.empty-cell { color: #dcdfe6; font-size: 13px; padding: 20px 0; }
.score-container { cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.3s; }
.score-container:hover { transform: scale(1.08); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1); }
.score-ring { padding: 4px; border-radius: 50%; border: 2px dashed currentColor; display: flex; align-items: center; justify-content: center; }
.score-circle { width: 50px; height: 50px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: currentColor; }
.score-label { font-size: 10px; line-height: 1; margin-bottom: 2px; color: rgba(255, 255, 255, 0.9); }
.score-value { font-size: 20px; font-weight: 900; line-height: 1; color: #fff; }
.score-excellent { color: #67C23A; }
.score-good { color: #E6A23C; }
.score-poor { color: #F56C6C; }
.summary-comment { padding: 15px 20px; background-color: #f4f4f5; border-radius: 8px; color: #606266; line-height: 1.6; font-size: 14px; display: flex; align-items: flex-start; border-left: 4px solid #409EFF; }

.chat-card { margin-bottom: 20px; border-radius: 12px; }
.chat-messages { height: 350px; overflow-y: auto; padding: 20px; background-color: #f7f9fc; border-radius: 8px; margin-bottom: 20px; display: flex; flex-direction: column; border: 1px solid #ebeef5; }
.chat-msg { display: flex; margin-bottom: 20px; align-items: flex-start; width: 100%; }
.chat-msg.user { justify-content: flex-end; }
.chat-msg.ai { justify-content: flex-start; }
.avatar-ai { background: linear-gradient(135deg, #409EFF, #36a3f7); color: white; margin-right: 12px; box-shadow: 0 2px 6px rgba(64,158,255,0.3); }
.avatar-user { background: linear-gradient(135deg, #67C23A, #85ce61); color: white; margin-left: 12px; box-shadow: 0 2px 6px rgba(103,194,58,0.3); }
.msg-bubble { max-width: 75%; padding: 12px 16px; border-radius: 10px; font-size: 14px; position: relative; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
.chat-msg.ai .msg-bubble { background-color: #ffffff; color: #333; border-top-left-radius: 2px; }
.chat-msg.user .msg-bubble { background-color: #e1f3d8; color: #333; border-top-right-radius: 2px; }
.chat-input-area { display: flex; align-items: center; }
.typing-indicator span { display: inline-block; width: 6px; height: 6px; background-color: #909399; border-radius: 50%; margin: 0 2px; animation: typing 1.4s infinite ease-in-out both; }
.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
@keyframes typing { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
</style>