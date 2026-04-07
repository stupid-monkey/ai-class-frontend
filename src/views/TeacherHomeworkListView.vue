<template>
  <el-container class="homework-list-container">
    <el-header class="top-header">
      <el-button v-if="!inDashboard" type="primary" link icon="ArrowLeft" @click="goBack">← 返回</el-button>
      <span class="page-title">📋 作业批改列表</span>
      <span></span>
    </el-header>

    <el-main class="main-content">
      <!-- 选项卡：待批改 / 已批改 -->
      <el-tabs v-model="activeTab" @tab-change="changeTab">
        <el-tab-pane label="待批改（未评分）" name="pending">
          <el-alert 
            v-if="allAssignments.length > 0"
            :title="`📋 提示：共加载 ${allAssignments.length} 个作业，待批改 ${pendingAssignments.length} 条`"
            type="info"
            style="margin-bottom: 20px;"
          />
          <div v-if="pendingAssignments.length === 0" style="text-align: center; padding: 40px;">
            <el-empty description="暂无待批改的作业" />
          </div>
          <el-table v-else :data="pendingAssignments" border style="width: 100%">
            <el-table-column prop="knowledge" label="知识点" width="200" />
            <el-table-column prop="studentName" label="学生名称" width="120" />
            <el-table-column prop="submittedAt" label="提交时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.submittedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="difficulty" label="难度" width="100">
              <template #default="{ row }">
                <el-tag :type="getDifficultyType(row.difficulty)">
                  {{ row.difficulty === 'easy' ? '简单' : row.difficulty === 'medium' ? '中等' : '困难' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="questionCount" label="题数" width="80" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small"
                  @click="goToGrading(row)"
                >
                  编辑批改 →
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="已批改（已评分）" name="reviewed">
          <div v-if="reviewedAssignments.length === 0" style="text-align: center; padding: 40px;">
            <el-empty description="暂无已批改的作业" />
          </div>
          <el-table v-else :data="reviewedAssignments" border style="width: 100%">
            <el-table-column prop="knowledge" label="知识点" width="200" />
            <el-table-column prop="studentName" label="学生名称" width="120" />
            <el-table-column prop="score" label="分数" width="100" />
            <el-table-column prop="submittedAt" label="提交时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.submittedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="reviewedAt" label="批改时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.reviewedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  link
                  size="small"
                  @click="goToGrading(row)"
                >
                  查看 / 修改 →
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
  
  console.log('【调试】待批改作业总数:', result.length)
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
  
  console.log('【调试】已批改作业总数:', result.length)
  return result
})

const changeTab = () => {
  console.log('【调试】切换选项卡至:', activeTab.value)
}

const goToGrading = (assignment: any) => {
  console.log('【调试】点击编辑批改，assignment 对象:', JSON.stringify(assignment, null, 2))
  console.log('【调试】homeworkId:', assignment.homeworkId, 'studentId:', assignment.studentId)
  
  if (!assignment.homeworkId || !assignment.studentId) {
    ElMessage.error('数据不完整: homeworkId=' + assignment.homeworkId + ', studentId=' + assignment.studentId)
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
    console.log('【调试】调用新API：GET /api/homework/teacher/published')
    const response = await getTeacherPublishedHomeworkApi() as any
    console.log('【调试】教师已发布作业列表响应:', response)

    if (response.code === 0 && response.data) {
      const rawData = response.data
      
      // rawData 应该是作业数组，每个作业已经包含 pendingAssignments 和 reviewedAssignments
      if (!Array.isArray(rawData)) {
        console.log('【调试】响应数据不是数组')
        allAssignments.value = Array.isArray(rawData) ? rawData : [rawData]
      } else {
        allAssignments.value = rawData
      }
      
      console.log('【调试】加载完成:')
      console.log('  - 全部作业数:', allAssignments.value.length)
      
      // 计算合计数据用于调试
      let totalPending = 0
      let totalReviewed = 0
      
      allAssignments.value.forEach((hw: any, idx: number) => {
        const pending = (hw.pendingAssignments || []).length
        const reviewed = (hw.reviewedAssignments || []).length
        totalPending += pending
        totalReviewed += reviewed
        
        console.log(`  - 作业 ${idx} (${hw.knowledge}): 待批改${pending}条, 已批改${reviewed}条`)
      })
      
      console.log(`【调试】总计: 待批改${totalPending}条, 已批改${totalReviewed}条`)
      
      if (allAssignments.value.length === 0) {
        ElMessage.info('暂无作业数据')
      }
    } else {
      console.log('【调试】API 返回错误或数据为空')
      ElMessage.error(response.message || '加载作业列表失败')
    }
  } catch (error: any) {
    console.error('【调试】加载作业列表异常:', error)
    ElMessage.error('加载作业列表失败: ' + (error.message || '请重试'))
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
    ElMessage.error('只有教师可以访问批改页面')
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
