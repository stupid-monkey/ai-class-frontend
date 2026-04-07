<template>
  <el-container class="homework-container">
    <el-header class="top-header">
      <span class="page-title">📚 我的作业</span>
      <el-button type="primary" @click="refreshHomeworks">🔄 刷新</el-button>
    </el-header>

    <el-main class="main-content">
      <el-card shadow="hover" v-if="homeworkList.length === 0">
        <div style="text-align: center; padding: 40px;">
          <el-empty description="暂无作业" />
        </div>
      </el-card>

      <el-row :gutter="20" v-else>
        <el-col :xs="24" :sm="24" :md="12" :lg="8" v-for="hw in homeworkList" :key="hw.homeworkId" style="margin-bottom: 20px;">
          <el-card class="homework-card" :body-style="{ padding: '20px' }">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ hw.knowledge }}</span>
                <el-tag :type="getStatusType(hw.assignmentStatus)">
                  {{ getStatusLabel(hw.assignmentStatus) }}
                </el-tag>
              </div>
            </template>

            <div class="homework-info">
              <div class="info-row">
                <span class="label">📖 知识点:</span>
                <span>{{ hw.knowledge }}</span>
              </div>
              <div class="info-row">
                <span class="label">📝 题型:</span>
                <span>{{ hw.questionTypes.map(mapQuestionType).join('、') }}</span>
              </div>
              <div class="info-row">
                <span class="label">⭐ 难度:</span>
                <span>{{ hw.difficulty === 'easy' ? '简单' : hw.difficulty === 'medium' ? '中等' : '困难' }}</span>
              </div>
              <div class="info-row">
                <span class="label">❓ 题目数:</span>
                <span>{{ hw.questionCount }}</span>
              </div>
              <div class="info-row">
                <span class="label">👨‍🏫 教师:</span>
                <span>{{ hw.teacherName }}</span>
              </div>
              <div class="info-row">
                <span class="label">📅 发布时间:</span>
                <span>{{ formatTime(hw.createdAt) }}</span>
              </div>
            </div>

            <el-button type="primary" @click="goToDetail(hw.homeworkId)" style="width: 100%; margin-top: 10px;">
              {{ hw.assignmentStatus === 'ASSIGNED' ? '📝 开始做题' : hw.assignmentStatus === 'SUBMITTED' ? '✅ 查看提交' : '📊 查看批改' }}
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHomeworkListApi } from '@/api/ai'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ inDashboard?: boolean }>()
const emit = defineEmits(['detail'])

const router = useRouter()
const userStore = useUserStore()

const homeworkList = ref<any[]>([])
const isLoading = ref(false)

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

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const refreshHomeworks = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }

  isLoading.value = true
  try {
    console.log('【调试】加载学生作业列表')
    const response = await getHomeworkListApi() as any
    console.log('【调试】作业列表响应:', response)

    if (response.code === 0) {
      // 过滤出分配给当前学生的作业
      homeworkList.value = (response.data || []).filter((hw: any) => {
        return hw.viewerRole === 'student'
      })
      console.log('【调试】学生作业列表:', homeworkList.value)
      ElMessage.success(`加载成功，共 ${homeworkList.value.length} 项作业`)
    } else {
      ElMessage.error(response.message || '加载作业失败')
    }
  } catch (error: any) {
    console.error('【调试】加载作业列表失败:', error)
    ElMessage.error(`加载失败: ${error.message || '请检查网络'}`)
  } finally {
    isLoading.value = false
  }
}

const goToDetail = (homeworkId: number) => {
  if (props.inDashboard) {
    emit('detail', homeworkId)
  } else {
    router.push({
      path: '/homework-detail',
      query: { id: homeworkId }
    })
  }
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  refreshHomeworks()
})
</script>

<style scoped>
.homework-container {
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

.homework-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.homework-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.homework-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #606266;
}

.label {
  font-weight: 600;
  color: #303133;
}
</style>
