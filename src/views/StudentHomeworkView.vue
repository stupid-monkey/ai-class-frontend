<template>
  <el-container class="homework-container">
    <el-header class="top-header">
      <span class="page-title">📖 {{ $t('student_hw.title') }}</span>
      <el-button type="primary" @click="refreshHomeworks">🔄 {{ $t('student_hw.refresh') }}</el-button>
    </el-header>

    <el-main class="main-content">
      <el-card shadow="hover" v-if="homeworkList.length === 0">
        <div style="text-align: center; padding: 40px;">
          <el-empty :description="$t('student_hw.no_hw')" />
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
                <span class="label">📚 {{ $t('student_hw.knowledge') }}:</span>
                <span>{{ hw.knowledge }}</span>
              </div>
              <div class="info-row">
                <span class="label">📝 {{ $t('student_hw.q_type') }}:</span>
                <span>{{ hw.questionTypes.map(mapQuestionType).join('、') }}</span>
              </div>
              <div class="info-row">
                <span class="label">⭐ {{ $t('student_hw.level') }}:</span>
                <span>{{ hw.difficulty === 'easy' ? $t('student_hw.easy') : hw.difficulty === 'medium' ? $t('student_hw.medium') : $t('student_hw.hard') }}</span>
              </div>
              <div class="info-row">
                <span class="label">❓ {{ $t('student_hw.q_count') }}:</span>
                <span>{{ hw.questionCount }}</span>
              </div>
              <div class="info-row">
                <span class="label">👨‍🏫 {{ $t('student_hw.teacher') }}:</span>
                <span>{{ hw.teacherName }}</span>
              </div>
              <div class="info-row">
                <span class="label">📅 {{ $t('student_hw.pub_time') }}:</span>
                <span>{{ formatTime(hw.createdAt) }}</span>
              </div>
            </div>

            <el-button type="primary" @click="goToDetail(hw.homeworkId)" style="width: 100%; margin-top: 10px;">
              {{ hw.assignmentStatus === 'ASSIGNED' ?  $t('student_hw.start') : hw.assignmentStatus === 'SUBMITTED' ? $t('student_hw.view_sub') : $t('student_hw.detail') }}
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHomeworkListApi } from '@/api/ai'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ inDashboard?: boolean }>()
const emit = defineEmits(['detail'])

const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()

const homeworkList = ref<any[]>([])
const isLoading = ref(false)

const mapQuestionType = (type: string) => {
  return type === 'choice' ? t('student_hw.choice') : type === 'judge' ? t('student_hw.judge') : type === 'blank' ? t('student_hw.blank') : type
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
      return t('student_hw.unsubmit')
    case 'SUBMITTED':
      return t('student_hw.submitted')
    case 'REVIEWED':
      return t('student_hw.reviewed')
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
      ElMessage.success(t('student_hw.load_success', { num: homeworkList.value.length }))
    } else {
      ElMessage.error(response.message || t('student_hw.load_fail'))
    }
  } catch (error: any) {
    console.error('【调试】加载作业列表失败:', error)
    ElMessage.error(error.message || t('student_hw.net_fail'))
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
    ElMessage.warning(t('student_hw.login_req'))
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
