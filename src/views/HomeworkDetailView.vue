<template>
  <el-container class="detail-container">
    <el-header class="top-header">
      <el-button type="primary" link icon="ArrowLeft" @click="goBack">← 返回</el-button>
      <span class="page-title">📖 作业详情</span>
      <span></span>
    </el-header>

    <el-main class="main-content">
      <el-row :gutter="20">
        <!-- 左侧：题目列表 -->
        <el-col :xs="24" :md="16">
          <el-card shadow="hover">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>📝 {{ homework.knowledge }} (共 {{ homework.questionCount }} 题)</span>
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
                    {{ question.type === 'choice' ? '【选择题】' : '【判断题】' }}
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

                <!-- 答题区域 -->
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
                    <el-radio label="正确" style="margin-right: 20px;">✓ 正确</el-radio>
                    <el-radio label="错误">✗ 错误</el-radio>
                  </el-radio-group>
                </div>

                <!-- 显示标准答案和解析（如果已批改） -->
                <div v-if="homework.assignmentStatus !== 'ASSIGNED'" class="answer-display">
                  <div class="standard-answer">
                    <strong>标准答案:</strong> {{ question.answer }}
                  </div>
                  <div class="explanation">
                    <strong>解析:</strong> {{ question.explanation || '暂无解析' }}
                  </div>
                </div>

                <el-divider />
              </div>

              <!-- 备注输入 -->
              <div v-if="homework.assignmentStatus === 'ASSIGNED'" class="note-area">
                <el-form-item label="备注（可选）">
                  <el-input 
                    v-model="submitNote" 
                    type="textarea" 
                    :rows="3"
                    placeholder="例如：第3题有疑问，请老师讲解"
                  />
                </el-form-item>
              </div>

              <!-- 提交按钮 -->
              <div v-if="homework.assignmentStatus === 'ASSIGNED'" class="submit-area">
                <el-button type="primary" @click="submitHomework" :loading="isSubmitting" size="large">
                  ✅ 提交答案
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：信息面板 -->
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="info-card">
            <template #header>
              <span>📋 作业信息</span>
            </template>

            <el-descriptions :column="1" border style="margin-bottom: 20px;">
              <el-descriptions-item label="教师">{{ homework.teacherName }}</el-descriptions-item>
              <el-descriptions-item label="知识点">{{ homework.knowledge }}</el-descriptions-item>
              <el-descriptions-item label="难度">
                <el-tag :type="getDifficultyType(homework.difficulty)">
                  {{ homework.difficulty === 'easy' ? '简单' : homework.difficulty === 'medium' ? '中等' : '困难' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="题型">
                {{ homework.questionTypes.map(mapQuestionType).join('、') }}
              </el-descriptions-item>
              <el-descriptions-item label="题目数">{{ homework.questionCount }}</el-descriptions-item>
              <el-descriptions-item label="发布时间">{{ formatTime(homework.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="班级">
                {{ homework.classNames?.join('、') || '-' }}
              </el-descriptions-item>
            </el-descriptions>

            <!-- 提交信息 -->
            <el-card v-if="homework.currentAssignment" shadow="never">
              <template #header>
                <span>✉️ 提交信息</span>
              </template>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="提交时间">
                  {{ formatTime(homework.currentAssignment.submittedAt) }}
                </el-descriptions-item>
                <el-descriptions-item v-if="homework.currentAssignment.note" label="你的备注">
                  {{ homework.currentAssignment.note }}
                </el-descriptions-item>
                <el-descriptions-item v-if="homework.currentAssignment.score !== null" label="得分">
                  <el-tag type="success" size="large">{{ homework.currentAssignment.score }} 分</el-tag>
                </el-descriptions-item>
                <el-descriptions-item v-if="homework.currentAssignment.feedback" label="老师评语">
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
  return type === 'choice' ? '选择题' : type === 'judge' ? '判断题' : type
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
      return '未提交'
    case 'SUBMITTED':
      return '已提交'
    case 'REVIEWED':
      return '已批改'
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
    ElMessage.error('缺少作业ID参数')
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

      // 如果已提交，加载已提交的答案
      if (data.currentAssignment?.answers) {
        for (const ans of data.currentAssignment.answers) {
          studentAnswers[ans.questionIndex] = ans.answer
        }
      }

      console.log('【调试】作业已加载')
    } else {
      ElMessage.error(response.message || '加载作业失败')
    }
  } catch (error: any) {
    console.error('【调试】加载作业失败:', error)
    ElMessage.error(`加载失败: ${error.message}`)
  }
}

const submitHomework = async () => {
  // 检查是否所有题目都已回答
  const emptyQuestions = homework.content
    .map((q: any, idx: number) => !studentAnswers[idx] ? idx + 1 : null)
    .filter((x: any) => x !== null)

  if (emptyQuestions.length > 0) {
    ElMessage.warning(`请完成第 ${emptyQuestions.join('、')} 题`)
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
      ElMessage.success('答案提交成功！')
      homework.assignmentStatus = 'SUBMITTED'
      homework.currentAssignment = response.data
      console.log('【调试】作业状态已更新为已提交')
    } else {
      ElMessage.error(response.message || '提交失败')
    }
  } catch (error: any) {
    console.error('【调试】提交答案失败:', error)
    ElMessage.error(`提交失败: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
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
