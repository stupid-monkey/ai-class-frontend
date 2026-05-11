<template>
  <el-container class="homework-container">
    <el-header class="top-header">
      <span class="page-title">📖 {{ $t('student_hw.title') }}</span>
      <div style="display:flex; gap:10px; align-items:center;">
        <el-radio-group v-model="filterStatus" @change="handleFilterChange">
          <el-radio-button label="all">{{ $t('student_hw.status_all', 'All') }}</el-radio-button>
          <el-radio-button label="ASSIGNED">{{ $t('student_hw.unsubmit', 'Unsubmitted') }}</el-radio-button>
          <el-radio-button label="SUBMITTED">{{ $t('student_hw.submitted', 'Submitted') }}</el-radio-button>
          <el-radio-button label="REVIEWED">{{ $t('student_hw.reviewed', 'Reviewed') }}</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="refreshHomeworks">
          🔄 {{ $t('student_hw.refresh') }}
        </el-button>
      </div>
    </el-header>

    <el-main class="main-content">
      <el-card shadow="never" v-loading="isLoading">
        <el-table :data="homeworkList" border style="width: 100%">
          <el-table-column prop="knowledge" :label="$t('student_hw.knowledge')" min-width="150" />
          <el-table-column prop="teacherName" :label="$t('student_hw.teacher')" width="120" />
          <el-table-column prop="questionCount" :label="$t('student_hw.q_count')" width="100" />
          <el-table-column prop="createdAt" :label="$t('student_hw.pub_time')" width="160">
            <template #default="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="assignmentStatus" :label="$t('student_hw.status', '状态')" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.assignmentStatus)">
                {{ getStatusLabel(row.assignmentStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="score" :label="$t('student_hw.score', '得分')" width="100">
            <template #default="{ row }">
              <span v-if="row.score !== null">{{ row.score }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('student_hw.action', '操作')" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="goToDetail(row.homeworkId)">
                {{
                  row.assignmentStatus === 'ASSIGNED'
                    ? $t('student_hw.start')
                    : row.assignmentStatus === 'SUBMITTED'
                      ? $t('student_hw.view_sub')
                      : $t('student_hw.detail')
                }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end">
          <el-pagination
            v-model:current-page="pageNo"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 30, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStudentHomeworkPageApi } from '@/api/ai'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ inDashboard?: boolean }>()
const emit = defineEmits(['detail'])

const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()

const homeworkList = ref<any[]>([])
const isLoading = ref(false)

const pageNo = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref('all')

const getStatusType = (status: string) => {
  switch (status) {
    case 'ASSIGNED': return 'warning'
    case 'SUBMITTED': return 'info'
    case 'REVIEWED': return 'success'
    default: return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ASSIGNED': return t('student_hw.unsubmit', '未提交')
    case 'SUBMITTED': return t('student_hw.submitted', '已提交')
    case 'REVIEWED': return t('student_hw.reviewed', '已批改')
    default: return status
  }
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
}

const refreshHomeworks = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }

  isLoading.value = true
  try {
    const response = (await getStudentHomeworkPageApi({
      pageNo: pageNo.value,
      pageSize: pageSize.value,
      status: filterStatus.value === 'all' ? undefined : filterStatus.value
    })) as any

    if (response.code === 0) {
      homeworkList.value = response.data.records || []
      total.value = response.data.total || 0
      ElMessage.success(t('student_hw.load_success', { num: homeworkList.value.length }) || `加载了 ${homeworkList.value.length} 条`)
    } else {
      ElMessage.error(response.message || t('student_hw.load_fail'))
    }
  } catch (error: any) {
    ElMessage.error(error.message || t('student_hw.net_fail'))
  } finally {
    isLoading.value = false
  }
}

const handleFilterChange = () => {
  pageNo.value = 1
  refreshHomeworks()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  refreshHomeworks()
}

const handleCurrentChange = (val: number) => {
  pageNo.value = val
  refreshHomeworks()
}

const goToDetail = (homeworkId: number) => {
  if (props.inDashboard) {
    emit('detail', homeworkId)
  } else {
    router.push({
      path: '/homework-detail',
      query: { id: homeworkId },
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
  height: 100%;
  background-color: #f5f7fa;
}

.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.main-content {
  padding: 20px;
}
</style>