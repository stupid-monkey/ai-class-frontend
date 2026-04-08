<template>
  <el-container class="detail-container">
    <el-header class="top-header">
      <el-button type="primary" link icon="ArrowLeft" @click="goBack">← {{ $t('hw_detail.back') }}</el-button>
      <span class="page-title">📖 {{ $t('hw_detail.title') }}</span>
      <span></span>
    </el-header>

    <el-main class="main-content">
      <el-row :gutter="20">
        <!-- 左侧：questions目列表 -->
        <el-col :xs="24" :md="16">
          <el-card shadow="hover">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>📝 {{ homework.knowledge }} ({{ $t('hw_detail.total_q', {count: homework.questionCount}) }})</span>
                <el-tag :type="getStatusType(homework.assignmentStatus)">
                  {{ getStatusLabel(homework.assignmentStatus) }}
                </el-tag>
              </div>
            </template>

            <div class="questions-area">
              <div v-for="(question, idx) in homework.content" :key="idx" class="question-item">
                <div class="question-header">
                  <span class="question-no">{{ Number(idx) + 1 }}.</span>
                  <span class="question-type" :class="question.type">
                    {{ question.type === 'choice' ? '[Multiple Choice]' : '[True/False]' }}
                  </span>
                </div>

                <div class="question-text">{{ question.question }}</div>

                <!-- 选项显示 -->
                <div class="options">
                  <div v-for="(option, oIdx) in question.options" :key="oIdx" class="option">
                    <span class="option-letter">{{ String.fromCharCode(65 + Number(oIdx)) }}</span>
                    <span>{{ option }}</span>
                  </div>
                </div>

                <!-- 答questions区域 -->
                <div class="answer-area">
                  <el-radio-group 
                    v-if="question.type === 'choice'" 
                    v-model="studentAnswers[Number(idx)]"
                    :disabled="homework.assignmentStatus !== 'ASSIGNED'"
                  >
                    <el-radio 
                      v-for="(option, oIdx) in question.options" 
                      :key="oIdx"
                      :label="String.fromCharCode(65 + Number(oIdx))"
                      style="display: block; margin-bottom: 8px;"
                    >
                      {{ option }}
                    </el-radio>
                  </el-radio-group>

                  <el-radio-group 
                    v-else 
                    v-model="studentAnswers[Number(idx)]"
                    :disabled="homework.assignmentStatus !== 'ASSIGNED'"
                  >
                    <el-radio label="正确" style="margin-right: 20px;">✓ {{ $t('hw_detail.correct') }}</el-radio>
                    <el-radio label="错误">✗ {{ $t('hw_detail.incorrect') }}</el-radio>
                  </el-radio-group>
                </div>

                <!-- 显示标准答案和解析（如果Reviewed） -->
                <div v-if="homework.assignmentStatus === 'REVIEWED' || homework.currentAssignment?.status === 'REVIEWED'" class="answer-display">
                  <div class="standard-answer">
                    <strong>{{ $t('hw_detail.std_ans') }}:</strong> {{ question.answer }}
                  </div>
                  <div class="explanation">
                    <strong>{{ $t('hw_detail.explanation') }}:</strong> {{ question.explanation || $t('hw_detail.no_exp') }}
                  </div>
                </div>

                <el-divider />
              </div>

              <!-- 备注输入 -->
              <div v-if="homework.assignmentStatus === 'ASSIGNED'" class="note-area">
                <el-form-item :label="$t('hw_detail.note')">
                  <el-input 
                    v-model="submitNote" 
                    type="textarea" 
                    :rows="3"
                    :placeholder="$t('hw_detail.note_place')"
                  />
                </el-form-item>
              </div>

              <!-- 提交按钮 -->
              <div v-if="homework.assignmentStatus === 'ASSIGNED'" class="submit-area">
                <el-button type="primary" @click="submitHomework" :loading="isSubmitting" size="large">
                  ✅ {{ $t('hw_detail.submit') }}
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：信息面板 -->
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="info-card">
            <template #header>
              <span>📋 {{ $t('hw_detail.hw_info') }}</span>
            </template>

            <el-descriptions :column="1" border style="margin-bottom: 20px;">
              <el-descriptions-item :label="$t('hw_detail.teacher')">{{ homework.teacherName }}</el-descriptions-item>
              <el-descriptions-item :label="$t('hw_detail.knowledge')">{{ homework.knowledge }}</el-descriptions-item>
              <el-descriptions-item :label="$t('hw_detail.diff')">
                <el-tag :type="getDifficultyType(homework.difficulty)">
                  {{ homework.difficulty === 'easy' ? $t('hw_detail.easy') : homework.difficulty === 'medium' ? $t('hw_detail.medium') : $t('hw_detail.hard') }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item :label="$t('hw_detail.q_type')">
                {{ homework.questionTypes.map(mapQuestionType).join('、') }}
              </el-descriptions-item>
              <el-descriptions-item :label="$t('hw_detail.q_count')">{{ homework.questionCount }}</el-descriptions-item>
              <el-descriptions-item :label="$t('hw_detail.pub_time')">{{ formatTime(homework.createdAt) }}</el-descriptions-item>
              <el-descriptions-item :label="$t('hw_detail.class')">
                {{ homework.classNames?.join('、') || '-' }}
              </el-descriptions-item>
            </el-descriptions>

            <!-- 提交信息 -->
            <el-card v-if="homework.currentAssignment" shadow="never">
              <template #header>
                <span>✉️ {{ $t('hw_detail.sub_info') }}</span>
              </template>
              <el-descriptions :column="1" border>
                <el-descriptions-item :label="$t('hw_detail.sub_time')">
                  {{ formatTime(homework.currentAssignment.submittedAt) }}
                </el-descriptions-item>
                <el-descriptions-item v-if="homework.currentAssignment.note" :label="$t('hw_detail.your_note')">
                  {{ homework.currentAssignment.note }}
                </el-descriptions-item>
                <el-descriptions-item v-if="homework.currentAssignment.score !== null" :label="$t('hw_detail.score') || 'Score'">
                  <el-tag type="success" size="large">{{ homework.currentAssignment.score }} {{ $t('hw_detail.score_unit') || 'Points' }}</el-tag>
                  <el-tag v-if="homework.currentAssignment.reviewSource === 'AI'" type="info" size="small" style="margin-left: 8px;">AI Graded</el-tag>
                  <el-tag v-else-if="homework.currentAssignment.reviewSource === 'TEACHER'" type="primary" size="small" style="margin-left: 8px;">Teacher Graded</el-tag>
                </el-descriptions-item>
                <el-descriptions-item v-if="homework.currentAssignment.feedback" :label="$t('hw_detail.feedback') || 'Feedback'">
                  {{ homework.currentAssignment.feedback }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHomeworkDetailApi, submitHomeworkApi } from '@/api/ai'
import { useUserStore } from '@/stores/user'
import { ArrowLeft } from '@element-plus/icons-vue'

const props = defineProps<{
  inDashboard?: boolean
  assignmentId?: string | number
}>()
const emit = defineEmits(['back'])

const router = useRouter()
const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()

const homework = reactive<any>({
  homeworkId: 0,
  knowledge: '',
  difficulty: 'medium',
  questionTypes: [],
  questionCount: 0,
  content: [],
  teacherName: '',
  classNames: [],
  createdAt: '',
  assignmentStatus: 'ASSIGNED',
  currentAssignment: null
})

const studentAnswers = reactive<{ [key: number]: string }>({})
const submitNote = ref('')
const isSubmitting = ref(false)

const mapQuestionType = (type: string) => {
  return type === 'choice' ? t('hw_detail.choice') : type === 'judge' ? t('hw_detail.judge') : type === 'blank' ? t('hw_detail.blank') : type
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'ASSIGNED':
      return 'warning'
    case 'SUBMITTED':
      return 'info'
    case 'REVIEWED':
      return 'success'
    default:
      return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ASSIGNED':
      return t('hw_detail.assigned')
    case 'SUBMITTED':
      return t('hw_detail.submitted')
    case 'REVIEWED':
      return t('hw_detail.reviewed')
    default:
      return status
  }
}

const getDifficultyType = (difficulty: string) => {
  return difficulty === 'easy' ? 'success' : difficulty === 'medium' ? 'warning' : 'danger'
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const goBack = () => {
  if (props.inDashboard) emit('back')
  else router.back()
}

const loadHomeworkDetail = async () => {
  const homeworkId = (props.assignmentId || route.query.id) as string
  if (!homeworkId) {
    ElMessage.error(t('hw_detail.miss_id'))
    if (props.inDashboard) emit('back')
    else router.back()
    return
  }

  try {
    console.log('【调试】加载作业详情:', homeworkId)
    const response = await getHomeworkDetailApi(parseInt(homeworkId)) as any
    console.log('【调试】作业详情响应:', response)

    if (response.code === 0 && response.data) {
      const data = response.data
      Object.assign(homework, data)

      // 如果已提交，加载已提交's answers
      if (data.currentAssignment?.answers) {
        for (const ans of data.currentAssignment.answers) {
          studentAnswers[ans.questionIndex] = ans.answer
        }
      }

      console.log('【调试】作业已加载')
    } else {
      ElMessage.error(response.message || t('hw_detail.load_fail'))
    }
  } catch (error: any) {
    console.error('【调试】Failed to load homework:', error)
    ElMessage.error(error.message || t('hw_detail.net_fail'))
  }
}

const submitHomework = async () => {
  // 检查是否所有questions目都已回答
  const emptyQuestions = homework.content
    .map((q: any, idx: number) => !studentAnswers[idx] ? idx + 1 : null)
    .filter((x: any) => x !== null)

  if (emptyQuestions.length > 0) {
    ElMessage.warning(t('hw_detail.miss_q', { nums: emptyQuestions.join(', ') }))
    return
  }

  // 构建答案数据
  const answers = homework.content.map((q: any, idx: number) => ({
    questionIndex: idx,
    answer: studentAnswers[idx]
  }))

  isSubmitting.value = true
  try {
    console.log('【调试】提交答案:', answers)
    const response = await submitHomeworkApi(homework.homeworkId, {
      answers,
      note: submitNote.value || undefined
    }) as any

    console.log('【调试】提交响应:', response)

    if (response.code === 0) {
      ElMessage.success(t('hw_detail.sub_success'))
      homework.assignmentStatus = response.data?.status || 'REVIEWED'
      // 覆盖提交后的 currentAssignment 数据（包含 AI 批改的结果）
      homework.currentAssignment = response.data
      console.log('【调试】作业此时Status已更新为:', homework.assignmentStatus)
    } else {
      ElMessage.error(response.message || t('hw_detail.sub_fail'))
    }
  } catch (error: any) {
    console.error('【调试】提交答案失败:', error)
    ElMessage.error(error.message || t('hw_detail.sub_fail'))
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning(t('hw_detail.login_req'))
    router.push('/login')
    return
  }
  loadHomeworkDetail()
})
</script>

<style scoped>
.detail-container {
  height: 100vh;
  background-color: #f0f2f5;
}

.top-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.main-content {
  padding: 20px;
  overflow-y: auto;
}

.questions-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-item {
  padding: 15px;
  background-color: #f9fafc;
  border-radius: 4px;
  border-left: 4px solid #409eff;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.question-no {
  font-weight: bold;
  color: #303133;
  font-size: 16px;
}

.question-type {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  background-color: #e6f7ff;
  color: #0050b3;
}

.question-type.judge {
  background-color: #f6ffed;
  color: #274106;
}

.question-text {
  font-size: 14px;
  color: #303133;
  margin-bottom: 10px;
  line-height: 1.6;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #ffffff;
  border-radius: 4px;
}

.option {
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.option-letter {
  font-weight: bold;
  min-width: 20px;
}

.answer-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background-color: #fafafa;
  border-radius: 4px;
  margin-bottom: 10px;
}

.answer-display {
  padding: 10px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border-left: 3px solid #52c41a;
}

.standard-answer,
.explanation {
  font-size: 13px;
  color: #606266;
  margin-bottom: 5px;
}

.explanation {
  margin-bottom: 0;
}

.note-area {
  margin: 20px 0;
  padding: 15px;
  background-color: #f9fafc;
  border-radius: 4px;
}

.submit-area {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.info-card {
  position: sticky;
  top: 20px;
}
</style>
