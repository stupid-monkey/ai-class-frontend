<template>
  <el-container class="grading-container">
    <el-header class="top-header">
      <el-button type="primary" link icon="ArrowLeft" @click="goBack">← 返回</el-button>
      <span class="page-title">📊 作业批改</span>
      <span></span>
    </el-header>

    <el-main class="main-content">
      <el-row :gutter="20">
        <!-- 左侧：题目和答案 -->
        <el-col :xs="24" :md="14">
          <el-card shadow="hover">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>📖 {{ homework.knowledge }} - {{ studentName }} 的答案</span>
                <el-tag :type="assignment.status === 'REVIEWED' ? 'success' : 'warning'">
                  {{ assignment.status === 'REVIEWED' ? '已批改' : '待批改' }}
                </el-tag>
              </div>
            </template>

            <div class="grading-area">
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

                <!-- 学生答案 vs 标准答案 -->
                <div class="answer-comparison">
                  <div class="student-answer" :class="isAnswerCorrect(question, Number(idx))">
                    <strong>学生答案:</strong>
                    <span class="answer-badge" :class="isAnswerCorrect(question, Number(idx))">
                      {{ studentAnswers[Number(idx)] || '未答' }}
                    </span>
                  </div>
                  <div class="standard-answer">
                    <strong>标准答案:</strong>
                    <span class="answer-badge correct">{{ question.answer }}</span>
                  </div>
                </div>

                <!-- 解析 -->
                <div class="explanation">
                  <strong>解析:</strong> {{ question.explanation || '暂无解析' }}
                </div>

                <el-divider />
              </div>

              <!-- 学生提交备注 -->
              <div v-if="assignment.note" class="note-display">
                <el-alert
                  :title="`学生备注: ${assignment.note}`"
                  type="info"
                  :closable="false"
                />
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：批改面板 -->
        <el-col :xs="24" :md="10">
          <el-card shadow="hover" class="grading-panel">
            <template #header>
              <span>✏️ 批改评分</span>
            </template>

            <!-- 评分输入 -->
            <el-form-item label="分数（0-100）">
              <el-input-number 
                v-model="gradingForm.score" 
                :min="0" 
                :max="100"
                :disabled="assignment.status === 'REVIEWED' && !isEditingGrade"
                style="width: 100%;"
              />
            </el-form-item>

            <!-- 反馈意见 -->
            <el-form-item label="反馈意见">
              <el-input 
                v-model="gradingForm.feedback" 
                type="textarea" 
                :rows="6"
                placeholder="输入对学生的评价和改进建议"
                :disabled="assignment.status === 'REVIEWED' && !isEditingGrade"
              />
            </el-form-item>

            <!-- 提交按钮 -->
            <div style="display: flex; gap: 10px;">
              <el-button 
                type="primary" 
                @click="submitGrading" 
                :loading="isSubmitting"
                style="flex: 1;"
                v-if="assignment.status !== 'REVIEWED' || isEditingGrade"
              >
                ✅ 提交批改
              </el-button>
              <el-button 
                v-else
                @click="isEditingGrade = true"
                style="flex: 1;"
              >
                🔄 重新批改
              </el-button>
            </div>

            <!-- 作业信息 -->
            <el-divider />

            <el-descriptions :column="1" border style="margin-top: 20px;">
              <el-descriptions-item label="学生">{{ studentName }}</el-descriptions-item>
              <el-descriptions-item label="学号">
                {{ assignment.studentName }}
              </el-descriptions-item>
              <el-descriptions-item label="知识点">{{ homework.knowledge }}</el-descriptions-item>
              <el-descriptions-item label="难度">
                <el-tag :type="getDifficultyType(homework.difficulty)">
                  {{ homework.difficulty === 'easy' ? '简单' : homework.difficulty === 'medium' ? '中等' : '困难' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="题目数">{{ homework.questionCount }}</el-descriptions-item>
              <el-descriptions-item label="提交时间">
                {{ formatTime(assignment.submittedAt) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="assignment.reviewedAt" label="批改时间">
                {{ formatTime(assignment.reviewedAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <!-- 右侧：学生列表 -->
        <el-col :xs="24" :md="10">
          <el-card shadow="hover" class="students-list-panel">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>👥 学生提交列表 ({{ allStudnets.length }})</span>
                <el-tag>{{ pendingCount }} 待批改 | {{ reviewedCount }} 已批改</el-tag>
              </div>
            </template>

            <!-- 筛选标签 -->
            <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
              <el-button 
                :type="studentFilter === 'all' ? 'primary' : 'default'"
                size="small"
                @click="studentFilter = 'all'"
              >
                全部 ({{ allStudnets.length }})
              </el-button>
              <el-button 
                :type="studentFilter === 'submitted' ? 'primary' : 'default'"
                size="small"
                @click="studentFilter = 'submitted'"
              >
                已提交 ({{ submittedCount }})
              </el-button>
              <el-button 
                :type="studentFilter === 'unsubmitted' ? 'primary' : 'default'"
                size="small"
                @click="studentFilter = 'unsubmitted'"
              >
                未提交 ({{ unsubmittedCount }})
              </el-button>
              <el-button 
                :type="studentFilter === 'pending' ? 'primary' : 'default'"
                size="small"
                @click="studentFilter = 'pending'"
              >
                待批改 ({{ pendingCount }})
              </el-button>
              <el-button 
                :type="studentFilter === 'reviewed' ? 'primary' : 'default'"
                size="small"
                @click="studentFilter = 'reviewed'"
              >
                已批改 ({{ reviewedCount }})
              </el-button>
            </div>

            <!-- 学生列表 -->
            <el-scrollbar style="height: 600px;">
              <div v-if="filteredStudents.length === 0" style="text-align: center; padding: 20px; color: #909399;">
                <el-empty description="暂无学生" />
              </div>
              <div v-else>
                <div 
                  v-for="student in filteredStudents" 
                  :key="student.studentId"
                  :class="['student-item', { active: student.studentId === assignment.studentId }]"
                  @click="selectStudent(student)"
                >
                  <div class="student-header">
                    <div style="flex: 1;">
                      <div class="student-name">{{ student.studentName }}</div>
                      <div class="student-id">ID: {{ student.studentId }}</div>
                    </div>
                    <div class="status-badges">
                      <el-tag 
                        v-if="!student.submittedAt"
                        type="danger"
                        size="small"
                      >
                        未提交
                      </el-tag>
                      <el-tag 
                        v-else-if="student.status === 'REVIEWED'"
                        type="success"
                        size="small"
                      >
                        已批改
                      </el-tag>
                      <el-tag 
                        v-else
                        type="warning"
                        size="small"
                      >
                        待批改
                      </el-tag>
                    </div>
                  </div>
                  <div v-if="student.submittedAt" class="student-meta">
                    <span>📅 {{ formatTime(student.submittedAt) }}</span>
                    <span v-if="student.score !== null && student.score !== undefined">{{ student.score }}分</span>
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHomeworkDetailApi, reviewHomeworkApi } from '@/api/ai'
import { useUserStore } from '@/stores/user'
import { ArrowLeft } from '@element-plus/icons-vue'

const props = defineProps<{
  inDashboard?: boolean
  homeworkId?: string
  studentId?: string
}>()
const emit = defineEmits(['back'])

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const homework = reactive<any>({
  homeworkId: 0,
  knowledge: '',
  difficulty: 'medium',
  questionCount: 0,
  content: [],
  teacherName: ''
})

const assignment = reactive<any>({
  studentId: 0,
  studentName: '',
  status: 'SUBMITTED',
  answers: [],
  note: '',
  submittedAt: '',
  score: null,
  feedback: null,
  reviewedAt: null
})

const allStudnets = ref<any[]>([])
const studentFilter = ref<'all' | 'submitted' | 'unsubmitted' | 'pending' | 'reviewed'>('all')
const studentAnswers = reactive<{ [key: number]: string }>({})
const gradingForm = reactive({
  score: null as number | null,
  feedback: ''
})

const studentName = ref('')
const isSubmitting = ref(false)
const isEditingGrade = ref(false)

// 计算过滤后的学生列表
const filteredStudents = computed(() => {
  return allStudnets.value.filter((student: any) => {
    if (studentFilter.value === 'submitted') {
      return student.submittedAt
    } else if (studentFilter.value === 'unsubmitted') {
      return !student.submittedAt
    } else if (studentFilter.value === 'pending') {
      return student.submittedAt && student.status !== 'REVIEWED'
    } else if (studentFilter.value === 'reviewed') {
      return student.status === 'REVIEWED'
    }
    return true
  })
})

// 统计数据
const submittedCount = computed(() => allStudnets.value.filter((s: any) => s.submittedAt).length)
const unsubmittedCount = computed(() => allStudnets.value.filter((s: any) => !s.submittedAt).length)
const pendingCount = computed(() => allStudnets.value.filter((s: any) => s.submittedAt && s.status !== 'REVIEWED').length)
const reviewedCount = computed(() => allStudnets.value.filter((s: any) => s.status === 'REVIEWED').length)

const getDifficultyType = (difficulty: string) => {
  return difficulty === 'easy' ? 'success' : difficulty === 'medium' ? 'warning' : 'danger'
}

const isAnswerCorrect = (question: any, idx: number): string => {
  if (!studentAnswers[idx]) return 'unanswered'
  return studentAnswers[idx] === question.answer ? 'correct' : 'incorrect'
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const goBack = () => {
  if (props.inDashboard) {
    emit('back')
  } else {
    router.back()
  }
}

const loadHomeworkDetail = async () => {
  const homeworkId = props.homeworkId || (route.query.homeworkId as string)
  const studentId = props.studentId || (route.query.studentId as string)

  console.log('【调试】页面参数 - homeworkId:', homeworkId, 'studentId:', studentId)

  if (!homeworkId || !studentId) {
    ElMessage.error('参数缺失: homeworkId=' + homeworkId + ', studentId=' + studentId)
    if (props.inDashboard) emit('back')
    else router.back()
    return
  }

  try {
    console.log('【调试】正在加载作业详情，homeworkId:', homeworkId)
    const response = await getHomeworkDetailApi(parseInt(homeworkId)) as any
    console.log('【调试】作业详情响应:', response)
    console.log('【调试】响应数据结构:', JSON.stringify(response.data, null, 2))

    if (response.code === 0 && response.data) {
      const data = response.data
      Object.assign(homework, data)
      
      console.log('【调试】homework 对象:', homework)
      console.log('【调试】assignments 数组:', data.assignments)
      console.log('【调试】assignments 类型:', typeof data.assignments, '长度:', Array.isArray(data.assignments) ? data.assignments.length : 'N/A')

      // 加载所有学生列表
      if (data.assignments && Array.isArray(data.assignments)) {
        allStudnets.value = data.assignments
        console.log('【调试】已加载学生列表，总数:', allStudnets.value.length)
      }

      // 查找对应学生的提交记录 - 支持多种匹配方式
      let assignmentRecord = null
      
      // 方式1: 通过 studentId 精确匹配
      if (data.assignments && Array.isArray(data.assignments)) {
        assignmentRecord = data.assignments.find((a: any) => {
          console.log('【调试】检查学生记录:', '期望studentId=', studentId, 'a.studentId=', a.studentId, '类型匹配:', a.studentId == studentId)
          return a.studentId == studentId || a.studentId === parseInt(studentId)
        })
      }
      
      // 方式2: 如果没找到且 data 本身就是一个学生的作业（没有 assignments 数组）
      if (!assignmentRecord && !data.assignments && data.studentId) {
        console.log('【调试】使用 data 本身作为单个学生的记录')
        assignmentRecord = data
      }
      
      // 方式3: 如果 data 中有 submittedAt 或 answers，说明这是一个学生的作业
      if (!assignmentRecord && !data.assignments && (data.submittedAt || data.answers)) {
        console.log('【调试】检测到 data 是单个学生作业记录')
        assignmentRecord = data
      }

      if (assignmentRecord) {
        console.log('【调试】找到对应学生的记录:', assignmentRecord)
        Object.assign(assignment, assignmentRecord)
        studentName.value = assignmentRecord.studentName || assignmentRecord.name || '学生'

        // 加载学生的答案
        if (assignmentRecord.answers) {
          for (const ans of assignmentRecord.answers) {
            const idx = typeof ans.questionIndex === 'number' ? ans.questionIndex : parseInt(ans.questionIndex)
            studentAnswers[idx] = ans.answer
            console.log('【调试】加载答案:', idx, '=', ans.answer)
          }
        }

        // 如果已批改，加载已有的分数和反馈
        if (assignmentRecord.score !== null && assignmentRecord.score !== undefined) {
          gradingForm.score = assignmentRecord.score
          gradingForm.feedback = assignmentRecord.feedback || ''
          console.log('【调试】加载已有分数:', assignmentRecord.score)
        }

        console.log('【调试】作业批改信息已加载成功')
      } else {
        console.error('【调试】未找到学生记录，assignments:', data.assignments, '搜索studentId:', studentId)
        ElMessage.error('未找到该学生的提交记录。请检查参数是否正确。')
        setTimeout(() => goBack(), 1000)
      }
    } else {
      ElMessage.error(response.message || '加载作业失败')
    }
  } catch (error: any) {
    console.error('【调试】加载作业失败:', error)
    ElMessage.error(`加载失败: ${error.message}`)
  }
}

const selectStudent = (student: any) => {
  console.log('【调试】选择学生:', student)
  
  // 清空之前的答案
  for (const key in studentAnswers) {
    delete (studentAnswers as any)[key]
  }
  
  // 更新当前学生信息
  Object.assign(assignment, student)
  studentName.value = student.studentName || student.name || '学生'
  
  // 重置批改表单
  if (student.score !== null && student.score !== undefined) {
    gradingForm.score = student.score
    gradingForm.feedback = student.feedback || ''
    isEditingGrade.value = false
  } else {
    gradingForm.score = null
    gradingForm.feedback = ''
    isEditingGrade.value = false
  }
  
  // 加载学生的答案
  if (student.answers && Array.isArray(student.answers)) {
    for (const ans of student.answers) {
      const idx = typeof ans.questionIndex === 'number' ? ans.questionIndex : parseInt(ans.questionIndex)
      studentAnswers[idx] = ans.answer
      console.log('【调试】加载答案:', idx, '=', ans.answer)
    }
  }
  
  console.log('【调试】学生信息已更新')
}

const submitGrading = async () => {
  if (gradingForm.score === null || gradingForm.score === undefined) {
    ElMessage.warning('请输入分数')
    return
  }

  isSubmitting.value = true
  try {
    console.log('【调试】提交批改:', {
      studentId: assignment.studentId,
      score: gradingForm.score,
      feedback: gradingForm.feedback
    })

    const response = await reviewHomeworkApi(homework.homeworkId, {
      studentId: assignment.studentId,
      score: gradingForm.score,
      feedback: gradingForm.feedback || undefined
    }) as any

    console.log('【调试】批改响应:', response)

    if (response.code === 0) {
      ElMessage.success('批改成功！')
      assignment.status = 'REVIEWED'
      assignment.score = gradingForm.score
      assignment.feedback = gradingForm.feedback
      assignment.reviewedAt = new Date().toISOString()
      isEditingGrade.value = false
      
      // 更新学生列表中的状态
      const student = allStudnets.value.find((s: any) => s.studentId === assignment.studentId)
      if (student) {
        student.status = 'REVIEWED'
        student.score = gradingForm.score
        student.feedback = gradingForm.feedback
        student.reviewedAt = new Date().toISOString()
      }
      
      console.log('【调试】作业状态已更新为已批改')
    } else {
      ElMessage.error(response.message || '批改失败')
    }
  } catch (error: any) {
    console.error('【调试】提交批改失败:', error)
    ElMessage.error(`批改失败: ${error.message}`)
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
.grading-container {
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

.grading-area {
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

.answer-comparison {
  display: flex;
  gap: 20px;
  padding: 10px;
  background-color: #fafafa;
  border-radius: 4px;
  margin-bottom: 10px;
}

.student-answer,
.standard-answer {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex: 1;
}

.answer-badge {
  padding: 4px 12px;
  border-radius: 3px;
  background-color: #fff7e6;
  color: #ad6800;
  font-weight: bold;
}

.answer-badge.correct {
  background-color: #f6ffed;
  color: #274106;
}

.answer-badge.incorrect {
  background-color: #fff1f0;
  color: #820014;
}

.answer-badge.unanswered {
  background-color: #f5f5f5;
  color: #666666;
}

.explanation {
  padding: 10px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border-left: 3px solid #52c41a;
  font-size: 13px;
  color: #606266;
}

.note-display {
  margin: 20px 0;
}

.grading-panel {
  position: sticky;
  top: 20px;
}

.students-list-panel {
  position: sticky;
  top: 20px;
}

.student-item {
  cursor: pointer;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.student-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.student-item.active {
  background-color: #e6f7ff;
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.student-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.student-id {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.status-badges {
  display: flex;
  gap: 4px;
}

.student-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #606266;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}
</style>
