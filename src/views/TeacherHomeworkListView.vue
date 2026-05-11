<template>
  <el-container class="homework-list-container">
    <el-header class="top-header">
      <div style="display:flex; align-items:center; gap:15px;">
        <el-button v-if="!inDashboard" type="primary" link @click="goBack">← Back</el-button>
        <span class="page-title">📋 {{ $t('teacher_hw.title', 'Grade Assignments List') }}</span>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <el-select v-model="filterClass" placeholder="Class" clearable @change="handleFilterChange" style="width: 150px;">
          <el-option v-for="item in classList" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-radio-group v-model="filterStatus" @change="handleFilterChange">
          <el-radio-button label="all">All</el-radio-button>
          <el-radio-button label="pending">Pending</el-radio-button>
          <el-radio-button label="reviewed">Reviewed</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="refreshAssignments">🔄 Refresh</el-button>
      </div>
    </el-header>

    <el-main class="main-content">
      <el-card shadow="never" v-loading="isLoading">
        <el-table :data="assignments" border style="width: 100%">
          <el-table-column prop="knowledge" label="Knowledge Point" min-width="150" />
          <el-table-column prop="studentName" label="Student Name" width="120" />
          <el-table-column prop="className" label="Class" width="140" />
          <el-table-column prop="submittedAt" label="Submission Time" width="160">
            <template #default="{ row }">
              {{ formatTime(row.submittedAt) || formatTime(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="Status" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 'REVIEWED' ? 'success' : row.status === 'SUBMITTED' ? 'warning' : 'info'">
                {{ row.status === 'REVIEWED' ? 'Reviewed' : row.status === 'SUBMITTED' ? 'Pending' : row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="score" label="Score" width="100">
            <template #default="{ row }">
              <span v-if="row.score !== null">{{ row.score }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="Action" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="goToGrading(row)">
                {{ row.status === 'REVIEWED' ? 'View / Edit' : 'Grade' }}
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
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTeacherAssignmentsPageApi, getHomeworkPublishTargetsApi } from '@/api/ai'
import { useUserStore } from '@/stores/user'

const props = defineProps<{ inDashboard?: boolean }>()
const emit = defineEmits(['grade'])

const router = useRouter()
const userStore = useUserStore()

const assignments = ref<any[]>([])
const isLoading = ref(false)
const classList = ref<{label: string, value: string | number}[]>([])

const filterClass = ref<string | number>('')
const filterStatus = ref('all')
const pageNo = ref(1)
const pageSize = ref(10)
const total = ref(0)

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
}

const fetchClassList = async () => {
  try {
    const res = await getHomeworkPublishTargetsApi() as any
    if (res.code === 0 && res.data) {
      classList.value = (res.data.classes || []).map((item: any) => ({
        label: item.className,
        value: item.classId
      }))
    }
  } catch (error) {
    console.error('Failed to load classes:', error)
  }
}

const refreshAssignments = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }

  isLoading.value = true
  try {
    const response = await getTeacherAssignmentsPageApi({
      pageNo: pageNo.value,
      pageSize: pageSize.value,
      classId: filterClass.value,
      status: filterStatus.value === 'all' ? undefined : (filterStatus.value === 'pending' ? 'SUBMITTED' : filterStatus.value === 'reviewed' ? 'REVIEWED' : undefined)
    }) as any

    if (response.code === 0) {
      assignments.value = response.data.records || []
      total.value = response.data.total || 0
      ElMessage.success(`Loaded ${assignments.value.length} records`)
    } else {
      ElMessage.error(response.message || 'Failed to load assignments')
    }
  } catch (error: any) {
    ElMessage.error(error.message || 'Network error')
  } finally {
    isLoading.value = false
  }
}

const handleFilterChange = () => {
  pageNo.value = 1
  refreshAssignments()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  refreshAssignments()
}

const handleCurrentChange = (val: number) => {
  pageNo.value = val
  refreshAssignments()
}

const goToGrading = (assignment: any) => {
  if (!assignment.homeworkId || !assignment.studentId) {
    ElMessage.error('Incomplete data: missing homeworkId or studentId')
    return
  }

  if (props.inDashboard) {
    emit('grade', assignment)
  } else {
    router.push({
      path: '/teacher-grading',
      query: {
        homeworkId: assignment.homeworkId.toString(),
        studentId: assignment.studentId.toString(),
      },
    })
  }
}

const goBack = () => router.back()

onMounted(async () => {
  await fetchClassList()
  refreshAssignments()
})
</script>

<style scoped>
.homework-list-container {
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
