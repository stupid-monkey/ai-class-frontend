<template>
  <el-card shadow="never" class="box-card calendar-card">
    <template #header>
      <div style="display: flex; align-items: center;">
        <span style="font-weight: bold; font-size: 16px; color: #303133;">📅 学期教学日历</span>
        <span style="font-size: 12px; color: #909399; margin-left: 12px; background: #f4f4f5; padding: 4px 10px; border-radius: 12px;">
          点击任意日期查看该周课表并进行 AI 微调
        </span>
      </div>
    </template>
    
    <el-calendar v-model="currentDate" @change="handleDateChange" class="modern-calendar">
      <template #date-cell="{ data }">
        <div 
          class="custom-cal-cell" 
          :class="{ 
            'is-selected': data.isSelected,
            'is-not-current': data.type !== 'current-month',
            'is-rest': getDayStatus(data.day) === 'CANCELED',
            'is-class': getDayStatus(data.day) === 'NORMAL'
          }"
          @click="onCellClick(data.day)"
        >
          <div class="cal-header">
            <span class="cal-date-num">{{ data.day.split('-')[2] }}</span>
          </div>

          <div class="cal-footer">
            <template v-if="getDayStatus(data.day) === 'CANCELED'">
              <span class="status-tag tag-rest">休</span>
            </template>
            <template v-if="getDayStatus(data.day) === 'NORMAL'">
              <span class="status-tag tag-class">课</span>
            </template>
          </div>
        </div>
      </template>
    </el-calendar>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  calendarStatusMap: Record<string, string>
}>()

const emit = defineEmits(['select-date'])

const currentDate = ref(new Date())

// 获取每天的状态
const getDayStatus = (dateString: string) => {
  return props.calendarStatusMap[dateString] || null
}

// 供日历切换月份时使用
const handleDateChange = () => {
  // 可以在这里处理翻页逻辑，目前保持默认
}

// 点击具体格子的事件
const onCellClick = (dateString: string) => {
  emit('select-date', dateString)
}

// 暴露设置日期的方法给父组件
const setDate = (dateString: string) => {
  currentDate.value = new Date(dateString)
}
defineExpose({ setDate })
</script>

<style scoped>
.calendar-card {
  margin-bottom: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02) !important;
}

/* --- 重写 el-calendar 默认表格样式 --- */
.modern-calendar :deep(.el-calendar-table td) {
  border: none !important; /* 去除内部默认网格线 */
}
.modern-calendar :deep(.el-calendar-table tr td:first-child) {
  border-left: none;
}
.modern-calendar :deep(.el-calendar-table tr:first-child td) {
  border-top: none;
}
.modern-calendar :deep(.el-calendar-table .el-calendar-day) {
  height: 90px;
  padding: 4px; /* 让格子之间产生缝隙，形成卡片感 */
  background-color: transparent;
}
.modern-calendar :deep(.el-calendar-table .el-calendar-day:hover) {
  background-color: transparent;
}
.modern-calendar :deep(.el-calendar__header) {
  border-bottom: 1px dashed #ebeef5;
  padding-bottom: 15px;
}

/* --- 核心卡片样式 --- */
.custom-cal-cell {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  background-color: #f8fafc; /* 极浅的蓝灰背景 */
  border-radius: 8px; /* 圆角卡片 */
  border: 1px solid transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 非本月日期淡化 */
.is-not-current {
  opacity: 0.35;
  filter: grayscale(100%);
}

/* 悬浮交互 */
.custom-cal-cell:hover:not(.is-not-current) {
  background-color: #ffffff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
  border-color: #e4e7ed;
  cursor: pointer;
  z-index: 10;
}

/* 选中状态 */
.custom-cal-cell.is-selected {
  background-color: #ecf5ff;
  border-color: #409EFF;
  box-shadow: 0 0 0 1px #409EFF inset, 0 4px 12px rgba(64, 158, 255, 0.15);
}

/* 日常/休息状态背景微调 */
.custom-cal-cell.is-rest {
  background-color: #fff5f5;
}
.custom-cal-cell.is-class {
  background-color: #f0f9eb;
}

/* --- 卡片内部布局 --- */
.cal-header {
  display: flex;
  justify-content: flex-start;
}
.cal-date-num {
  font-size: 16px;
  font-weight: 700;
  color: #606266;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
.is-selected .cal-date-num { color: #409EFF; }
.is-rest .cal-date-num { color: #F56C6C; }

.cal-footer {
  display: flex;
  justify-content: flex-end;
}

/* --- 状态标签 --- */
.status-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: bold;
  letter-spacing: 1px;
}
.tag-rest {
  background-color: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}
.tag-class {
  background-color: #67C23A;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(103, 194, 58, 0.3);
}
</style>