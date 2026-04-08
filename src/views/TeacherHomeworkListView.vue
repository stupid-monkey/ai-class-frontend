<template>
  <el-container class="homework-list-container">
    <el-header class="top-header">
      <el-button v-if="!inDashboard" type="primary" link icon="ArrowLeft" @click="goBack">← Back</el-button>
      <span class="page-title">📋 Grade Assignments List</span>
      <span></span>
    </el-header>

    <el-main class="main-content">
      <!-- 选项卡：Pending / Reviewed -->
      <el-tabs v-model="activeTab" @tab-change="changeTab">
        <el-tab-pane label="Pending" name="pending">
          <el-alert 
            v-if="allAssignments.length > 0"
            :title="`📋 Notice：Loaded ${allAssignments.length} assignments, Pending ${pendingAssignments.length} items`"
            type="info"
            style="margin-bottom: 20px;"
          />
          <div v-if="pendingAssignments.length === 0" style="text-align: center; padding: 40px;">
            <el-empty description="No pending assignments" />
          </div>
          <el-table v-else :data="pendingAssignments" border style="width: 100%">
            <el-table-column prop="knowledge" label="Knowledge Point" width="200" />
            <el-table-column prop="studentName" label="Student Name" width="120" />
            <el-table-column prop="submittedAt" label="Submission Time" width="180">
              <template #default="{ row }">
                {{ formatTime(row.submittedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="difficulty" label="Difficulty" width="100">
              <template #default="{ row }">
                <el-tag :type="getDifficultyType(row.difficulty)">
                  {{ row.difficulty === 'easy' ? 'Easy' : row.difficulty === 'medium' ? 'Medium' : 'Hard' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="questionCount" label="Question Count" width="120" />
            <el-table-column label="Action" min-width="160" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small"
                  @click="goToGrading(row)"
                >
                  Review & Grade →
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="Reviewed" name="reviewed">
          <div v-if="reviewedAssignments.length === 0" style="text-align: center; padding: 40px;">
            <el-empty description="No reviewed assignments" />
          </div>
          <el-table v-else :data="reviewedAssignments" border style="width: 100%">
            <el-table-column prop="knowledge" label="Knowledge Point" width="200" />
            <el-table-column prop="studentName" label="Student Name" width="120" />
            <el-table-column prop="score" label="Score" width="100" />
            <el-table-column prop="submittedAt" label="Submission Time" width="180">
              <template #default="{ row }">
                {{ formatTime(row.submittedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="reviewedAt" label="Grading Time" width="180">
              <template #default="{ row }">
                {{ formatTime(row.reviewedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="Action" min-width="160" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  link
                  size="small"
                  @click="goToGrading(row)"
                >
                  View / Edit →
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTeacherPublishedHomeworkApi } from '@/api/ai'
import { useUserStore } from '@/stores/user'
import { ArrowLeft } from '@element-plus/icons-vue'

const props = defineProps<{ inDashboard?: boolean }>()
const emit = defineEmits(['grade'])

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('pending')
const allAssignments = ref<any[]>([])
const isLoading = ref(false)

const getDifficultyType = (difficulty: string) => {
  return difficulty === 'easy' ? 'success' : difficulty === 'medium' ? 'warning' : 'danger'
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const pendingAssignments = computed(() => {
  const result: any[] = []
  
  allAssignments.value.forEach((hw: any) => {
    if (hw.pendingAssignments && Array.isArray(hw.pendingAssignments)) {
      hw.pendingAssignments.forEach((assignment: any) => {
        result.push({
          homeworkId: hw.homeworkId,
          studentId: assignment.studentId,
          studentName: assignment.studentName,
          knowledge: hw.knowledge,
          difficulty: hw.difficulty,
          questionCount: hw.questionCount,
          status: assignment.status,
          submittedAt: assignment.submittedAt,
          score: assignment.score,
          feedback: assignment.feedback
        })
      })
    }
  })
  
  console.log('【Debug】PendingTotal assignments:', result.length)
  return result
})

const reviewedAssignments = computed(() => {
  const result: any[] = []
  
  allAssignments.value.forEach((hw: any) => {
    if (hw.reviewedAssignments && Array.isArray(hw.reviewedAssignments)) {
      hw.reviewedAssignments.forEach((assignment: any) => {
        result.push({
          homeworkId: hw.homeworkId,
          studentId: assignment.studentId,
          studentName: assignment.studentName,
          knowledge: hw.knowledge,
          difficulty: hw.difficulty,
          questionCount: hw.questionCount,
          status: assignment.status,
          submittedAt: assignment.submittedAt,
          reviewedAt: assignment.reviewedAt,
          score: assignment.score,
          feedback: assignment.feedback
        })
      })
    }
  })
  
  console.log('【Debug】ReviewedTotal assignments:', result.length)
  return result
})

const changeTab = () => {
  console.log('【Debug】Switch tab to:', activeTab.value)
}

const goToGrading = (assignment: any) => {
  console.log('【Debug】Click to grade，assignment Object:', JSON.stringify(assignment, null, 2))
  console.log('【Debug】homeworkId:', assignment.homeworkId, 'studentId:', assignment.studentId)
  
  if (!assignment.homeworkId || !assignment.studentId) {
    ElMessage.error('Incomplete data: homeworkId=' + assignment.homeworkId + ', studentId=' + assignment.studentId)
    return
  }
  
  if (props.inDashboard) {
    emit('grade', assignment)
  } else {
    router.push({
      path: '/teacher-grading',
      query: {
        homeworkId: assignment.homeworkId.toString(),
        studentId: assignment.studentId.toString()
      }
    })
  }
}

const goBack = () => {
  router.back()
}

const loadHomeworkList = async () => {
  isLoading.value = true
  try {
    console.log('【Debug】Calling newAPI：GET /api/homework/teacher/published')
    const response = await getTeacherPublishedHomeworkApi() as any
    console.log('【Debug】Teacher published HW response:', response)

    if (response.code === 0 && response.data) {
      const rawData = response.data
      
      // rawData should be assignment array，each includes pendingAssignments and reviewedAssignments
      if (!Array.isArray(rawData)) {
        console.log('【Debug】Response is not array')
        allAssignments.value = Array.isArray(rawData) ? rawData : [rawData]
      } else {
        allAssignments.value = rawData
      }
      
      console.log('【Debug】Load complete:')
      console.log('  - Total assignments:', allAssignments.value.length)
      
      // Calculate totals for debug
      let totalPending = 0
      let totalReviewed = 0
      
      allAssignments.value.forEach((hw: any, idx: number) => {
        const pending = (hw.pendingAssignments || []).length
        const reviewed = (hw.reviewedAssignments || []).length
        totalPending += pending
        totalReviewed += reviewed
        
        console.log(`  - Assignments ${idx} (${hw.knowledge}): Pending${pending}items, Reviewed${reviewed}items`)
      })
      
      console.log(`【Debug】Total: Pending${totalPending}items, Reviewed${totalReviewed}items`)
      
      if (allAssignments.value.length === 0) {
        ElMessage.info('No homework data')
      }
    } else {
      console.log('【Debug】API Error or empty')
      ElMessage.error(response.message || 'Failed to load list')
    }
  } catch (error: any) {
    console.error('【Debug】Exception loading list:', error)
    ElMessage.error('Failed to load list: ' + (error.message || 'Please try again'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  
  if (!userStore.isTeacher) {
    ElMessage.error('Only teachers can access grading')
    router.back()
    return
  }

  loadHomeworkList()
})
</script>

<style scoped>
.homework-list-container {
  height: 100vh;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
