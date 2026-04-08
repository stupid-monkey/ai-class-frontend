<template>
  <el-config-provider :locale="currentElementLocale">
    <RouterView />
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores/user'
import { refreshTokenApi } from '@/api/log'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'

const { locale } = useI18n()
const currentElementLocale = computed(() => (locale.value === 'zh' ? zhCn : en))

const router = useRouter()
const userStore = useUserStore()

// Token检测设置
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30分钟无操作自动登出
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000 // 每15分钟检查并刷新一次Token

let inactivityTimer: number | null = null
let tokenRefreshTimer: number | null = null
let lastActivityTime = Date.now()

// 记录用户活动
const recordActivity = () => {
  lastActivityTime = Date.now()
  // 重置无操作计时器
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
  inactivityTimer = setTimeout(handleInactivity, INACTIVITY_TIMEOUT)
}

// 处理无操作超时
const handleInactivity = () => {
  if (userStore.isLoggedIn) {
    console.warn('检测到长时间无操作，已自动登出')
    userStore.logout()
    router.push('/login')
  }
}

// 自动刷新Token
const autoRefreshToken = async () => {
  if (!userStore.isLoggedIn || !userStore.token) {
    return
  }
  
  try {
    const response = await refreshTokenApi(userStore.token)
    if (response.code === 0 && (response.data as any)?.token) {
      // 更新本地token
      userStore.setUser(
        (response.data as any).token,
        userStore.userInfo!,
        userStore.role
      )
      console.log('Token已刷新')
    }
  } catch (error: any) {
    console.warn('Token刷新失败:', error.message)
  }
}

// 监听用户活动事件
onMounted(() => {
  // 初始化活动计时器
  inactivityTimer = setTimeout(handleInactivity, INACTIVITY_TIMEOUT)
  
  // 启动Token自动刷新定时器
  tokenRefreshTimer = setInterval(autoRefreshToken, TOKEN_REFRESH_INTERVAL)
  
  // 监听用户交互事件
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
  activityEvents.forEach(event => {
    document.addEventListener(event, recordActivity)
  })
})

// 清理定时器和事件监听
onBeforeUnmount(() => {
  if (inactivityTimer) clearTimeout(inactivityTimer)
  if (tokenRefreshTimer) clearInterval(tokenRefreshTimer)
  
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
  activityEvents.forEach(event => {
    document.removeEventListener(event, recordActivity)
  })
})
</script>

<style>
/* 重置全局基础样式，确保聊天框能完美贴合浏览器边缘，没有多余白边 */
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden; /* 防止出现多余的全局滚动条 */
}
</style>