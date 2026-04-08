<template>
  <div class="chat-container">
    <header class="chat-header">
      <h2>智能排课系统 <span style="font-size: 12px; color: #909399;"></span></h2>
    </header>

    <main class="form-area">
      <div v-if="!isSuccess">
        <el-form :model="formData" label-width="100px" class="schedule-form">
          <el-card shadow="never" class="box-card">
            <template #header><span style="font-weight: bold;">基础排课规则</span></template>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="任务名称">
                  <el-input v-model="formData.taskName" placeholder="例如：2026年春季高一(1)班排课测试" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="学期 ID">
                  <el-input v-model="formData.semesterId" placeholder="例如：2026-SPRING" />
                </el-form-item>
              </el-col>
              <el-col :span="6"><el-form-item label="每周天数"><el-input-number v-model="formData.daysPerWeek" :min="1" :max="7" style="width: 100%;" /></el-form-item></el-col>
              <el-col :span="6"><el-form-item label="每天总节数"><el-input-number v-model="formData.periodsPerDay" :min="1" :max="15" style="width: 100%;" /></el-form-item></el-col>
              <el-col :span="6"><el-form-item label="上午节数"><el-input-number v-model="formData.morningPeriods" :min="0" :max="10" style="width: 100%;" /></el-form-item></el-col>
              <el-col :span="6"><el-form-item label="下午节数"><el-input-number v-model="formData.afternoonPeriods" :min="0" :max="10" style="width: 100%;" /></el-form-item></el-col>
            </el-row>
          </el-card>

          <el-card shadow="never" class="box-card" style="margin-top: 20px;">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold;">排课需求明细</span>
                <el-button type="primary" plain size="small" @click="addRequirement">+ 添加一条需求</el-button>
              </div>
            </template>
            <div v-if="formData.requirements.length === 0" class="empty-tip">暂无排课需求，请点击右上角添加。</div>
            
            <el-row :gutter="15" v-for="(item, index) in formData.requirements" :key="index" class="requirement-row">
              <el-col :span="7"><el-input v-model="item.classId" placeholder="班级ID (如: CLS_001)" /></el-col>
              <el-col :span="7"><el-input v-model="item.courseName" placeholder="学科名称 (如: 语文)" /></el-col>
              <el-col :span="6"><el-input-number v-model="item.weeklyCount" :min="1" :max="20" style="width: 100%;" placeholder="周课时" /></el-col>
              <el-col :span="4" style="text-align: right;"><el-button type="danger" circle icon="Delete" @click="removeRequirement(index)" /></el-col>
            </el-row>
          </el-card>

          <div class="submit-action">
            <el-button type="success" size="large" @click="submitForm" :loading="isSubmitting">确认无误，开始智能排课</el-button>
          </div>
        </el-form>
      </div>

      <div v-else class="result-area">
        <el-result icon="success" title="任务已提交" sub-title="校历生成完毕。请在下方点击任意日期，AI 将为您结算该周课表">
          <template #extra>
            <el-button type="primary" plain @click="resetForm">返回重新配置</el-button>
          </template>
        </el-result>

        <SchoolCalendar 
          ref="calendarRef"
          :calendarStatusMap="calendarStatusMap" 
          @select-date="handleCalendarSelect" 
        />
      </div>
      
      <el-dialog v-model="isSubmitting" title="正在生成校历..." width="650px" :close-on-click-modal="false" :show-close="false">
        <div style="text-align: center; padding: 40px 0;">
          <el-icon class="is-loading" :size="40" color="#409EFF"><Loading /></el-icon>
          <div style="margin-top: 15px; color: #909399;">正在生成全学期日历框架...</div>
        </div>
      </el-dialog>

      <WeeklyScheduleDialog 
        v-model="showWeeklyDialog"
        :taskId="currentTaskId"
        :classId="currentClassId"
        :dateString="clickedDateString"
        :baseConfig="formData"
      />

    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch, onUnmounted } from 'vue'
import { Delete, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 引入子组件
import SchoolCalendar from './SchoolCalendar.vue'
import WeeklyScheduleDialog from './WeeklyScheduleDialog.vue'

// 真实的 API
import { submitScheduleApi, getsemesterResultApi, getScheduleResultApi } from '@/api/schedule'
import type { ApiResponse } from '@/api/request'
import type { submitSchedule, semesterResult, scheduleResult } from '@/model/schedule'

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

const CACHE_KEY = 'smart_schedule_form_draft'

// 全局Status
const isSubmitting = ref(false)         
const isSuccess = ref(false)            
const currentTaskId = ref('')
const currentClassId = ref('CLS_001') 
let pollTimer1: any = null
// 校历与弹窗Status
const calendarRef = ref<InstanceType<typeof SchoolCalendar> | null>(null)
const calendarStatusMap = ref<Record<string, string>>({}) 
const showWeeklyDialog = ref(false)
const clickedDateString = ref('')

// 表单配置
const formData = reactive({
  taskName: '2026年春季高一(1)班排课测试',
  semesterId: '2026-SPRING',
  daysPerWeek: 5, periodsPerDay: 7, morningPeriods: 4, afternoonPeriods: 3,
  requirements: [
    { classId: 'CLS_001', courseName: '语文', weeklyCount: 5 },
    { classId: 'CLS_001', courseName: '数学', weeklyCount: 5 }
  ]
})

// === 学科字典映射 ===
const getSubjectIds = (courseName: string) => {
  const map: Record<string, { cId: string, tId: string }> = {
    '语文': { cId: 'C_CHINESE', tId: 'T_CHI' }, '数学': { cId: 'C_MATH', tId: 'T_MAT' },
    '英语': { cId: 'C_ENGLISH', tId: 'T_ENG' }, '物理': { cId: 'C_PHYSICS', tId: 'T_PHY' },
    '体育': { cId: 'C_PE', tId: 'T_PE' }, '美术': { cId: 'C_ART', tId: 'T_ART' }, '历史': { cId: 'C_HISTORY', tId: 'T_HIS' },
    '政治': { cId: 'C_POLITICS', tId: 'T_POL' }, '生物': { cId: 'C_BIOLOGY', tId: 'T_BIO' }, '化学': { cId: 'C_CHEMISTRY', tId: 'T_CHE' }
  }
  for (const key in map) { if (courseName.includes(key)) return map[key] }
  return { cId: `C_CUSTOM_${courseName}`, tId: `T_CUSTOM_${courseName}` }
}

onMounted(() => {
  const cachedData = localStorage.getItem(CACHE_KEY)
  if (cachedData) try { Object.assign(formData, JSON.parse(cachedData)) } catch (e) {}
})
watch(formData, (newVal) => { localStorage.setItem(CACHE_KEY, JSON.stringify(newVal)) }, { deep: true })

const addRequirement = () => { formData.requirements.push({ classId: 'CLS_001', courseName: '', weeklyCount: 1 }) }
const removeRequirement = (index: number) => { formData.requirements.splice(index, 1) }
const resetForm = () => { isSuccess.value = false; showWeeklyDialog.value = false }

// === 💡 核心改动：提交表单后，直接获取校历，不再死等轮询 ===
const submitForm = async () => {
  if (!formData.taskName) return ElMessage.warning('任务名称不能为空')
  currentClassId.value = formData.requirements[0]?.classId || 'CLS_001'
  
  const submitPayload = {
    ...formData,
    requirements: formData.requirements.map(req => {
      const mappedIds = getSubjectIds(req.courseName)|| { cId: `C_CUSTOM_${req.courseName}`, tId: `T_CUSTOM_${req.courseName}` }
      return { classId: req.classId, courseId: mappedIds.cId, teacherId: mappedIds.tId, weeklyCount: req.weeklyCount }
    })
  }

  isSubmitting.value = true

  try {
    // 1. 提交任务，拿到 taskId
    const res = await submitScheduleApi(submitPayload)
    currentTaskId.value = (res as ApiResponse<submitSchedule>).data.taskId
    console.log("任务提交成功，Task ID:", currentTaskId.value)
    startPollingWeeklyData()

  } catch (error) {
    isSubmitting.value = false
    ElMessage.error("任务提交失败，请检查网络或后端Status")
  }
}
const startPollingWeeklyData = () => {
  // 开启轮询，查这周到底排完没
  pollTimer1 = setInterval(async () => {
    try {
      const weekRes = await getScheduleResultApi( currentTaskId.value, currentClassId.value ,clickedDateString.value )
      const {code,msg,data} = weekRes as ApiResponse<scheduleResult>
        console.log("轮询周数据：", data)
      if (data.status === 'SUCCESS') {
        // 发现排课成功！清除轮询定时器
        clearInterval(pollTimer1)
        pollTimer1 = null
    await fetchCalendarData(currentTaskId.value, currentClassId.value)
    // 3. 校历加载成功，切换视图
    isSubmitting.value = false
    isSuccess.value = true
    return
      }
    } catch (error) {
      clearInterval(pollTimer1)
      pollTimer1 = null

      ElMessage.error("获取周数据失败或网络错误")
    }
  }, 2000)
}
// === 获取校历数据 ===
const fetchCalendarData = async (taskId: string, classId: string) => {
  try {
    const res = await getsemesterResultApi(taskId, classId)
    const {code,msg,data} = res as ApiResponse<semesterResult>
    
    const statusMap: Record<string, string> = {}
    if (data && data.actualTimetable) {
      data.actualTimetable.forEach((item: any) => {
        statusMap[item.calendarDate.split(' ')[0]] = item.status
      })
    }
    calendarStatusMap.value = statusMap
    console.log("校历数据已加载：", data)

    ElMessage.success('学期校历生成成功！点击日历日期查看详情。')
  } catch (error) {
    ElMessage.error("校历数据获取失败")
    throw error 
  }
}
onUnmounted(() => {
  if (pollTimer1) clearInterval(pollTimer1)
})
// 处理日历点击事件
const handleCalendarSelect = (dateStr: string) => {
  clickedDateString.value = dateStr
  showWeeklyDialog.value = true // 打开弹窗，由弹窗接管轮询
}
</script>

<style scoped>
.chat-container { display: flex; flex-direction: column; height: 100vh; background-color: #f5f7fa; }
.chat-header { height: 60px; background-color: #ffffff; border-bottom: 1px solid #e4e7ed; display: flex; align-items: center; padding: 0 20px; }
.chat-header h2 { font-size: 18px; margin: 0; }
.form-area { flex: 1; padding: 20px; overflow-y: auto; }
.schedule-form, .result-area { max-width: 1000px; margin: 0 auto; }
.requirement-row { margin-bottom: 10px; align-items: center; }
.submit-action { margin-top: 30px; text-align: center; margin-bottom: 50px; }
.empty-tip { text-align: center; color: #909399; padding: 20px 0; }
</style>