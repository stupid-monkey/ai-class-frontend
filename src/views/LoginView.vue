<template>
  <div class="login-wrapper">
    <div style="position: absolute; top: 20px; right: 20px;">
      <el-dropdown @command="handleLanguageChange" trigger="click">
        <el-button type="default" plain>
          {{ $t('common.language') }} <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="en" :disabled="$i18n.locale === 'en'">English</el-dropdown-item>
            <el-dropdown-item command="zh" :disabled="$i18n.locale === 'zh'">简体中文</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <el-card class="login-card" shadow="hover">
      <div class="login-header">
        <h2>🤖 {{ $t('login.title') }}</h2>
        <p>{{ $t('login.subtitle') }}</p>
      </div>

      <el-tabs v-model="activeRole" class="role-tabs">
        <el-tab-pane name="student">
          <template #label>
            <span>👨‍🎓 {{ $t('login.studentLogin') }}</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="teacher">
          <template #label>
            <span>👨‍🏫 {{ $t('login.teacherLogin') }}</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="admin">
          <template #label>
            <span>🛡️ Admin  </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <el-form :model="loginForm" @keyup.enter="handleLogin" label-width="0">
        <el-form-item>
          <el-input 
            v-model="loginForm.username" 
            :placeholder="$t('login.sidPlaceholder')" 
            size="large"
            prefix-icon="User"
            :disabled="isLoading"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            :placeholder="$t('login.pwdPlaceholder')" 
            size="large"
            prefix-icon="Lock"
            show-password
            :disabled="isLoading"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-button 
          type="primary" 
          size="large" 
          class="login-btn"
          :loading="isLoading"
          :disabled="isLoading"
          @click="handleLogin"
        >
          {{ isLoading ? $t('common.loading') : (activeRole === 'teacher' ? $t('login.loginBtnTeach') : $t('login.loginBtnStud')) }}
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { teacherLoginApi, studentLoginApi } from '@/api/log'
import { adminLogin } from '@/api/admin'
import { ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { ArrowDown } from '@element-plus/icons-vue'
import type { ApiResponse } from '@/api/request'
import type { login } from '@/model/login'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const handleLanguageChange = (lang: string) => {
  locale.value = lang
  localStorage.setItem('app_locale', lang)
}
const userStore = useUserStore()
const activeRole = ref('student') // 默认选中的角色：student 或 teacher
const isLoading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

// 页面加载时，尝试恢复上次的账号和密码
onMounted(() => {
  console.log('【调试】LoginView 已挂载')
  
  // 从 sessionStorage 读取上次保存的账号和密码
  const savedUsername = sessionStorage.getItem('lastUsername')
  const savedPassword = sessionStorage.getItem('lastPassword')
  const savedRole = sessionStorage.getItem('lastRole')
  
  if (savedUsername) {
    loginForm.username = savedUsername
    console.log('【调试】已从 sessionStorage 恢复账号:', savedUsername)
  }
  
  if (savedPassword) {
    loginForm.password = savedPassword
    console.log('【调试】已从 sessionStorage 恢复密码')
  }
  
  if (savedRole) {
    activeRole.value = savedRole
    console.log('【调试】已恢复角色:', savedRole)
  }
  
  // 如果有自动登录的账号密码，可以自动登录（可选）
  // 这里暂不实现自动登录，让用户手动点击登录
})

const handleLogin = async () => {
  // 验证输入
  if (!loginForm.username.trim()) {
    ElMessage.error('请输入账号')
    return
  }
  if (!loginForm.password.trim()) {
    ElMessage.error('请输入密码')
    return
  }

  isLoading.value = true
  try {
    // 根据角色调用不同的登录接口
    let loginApiCall
    if (activeRole.value === 'teacher') {
      loginApiCall = teacherLoginApi
    } else if (activeRole.value === 'admin') {
      loginApiCall = adminLogin
    } else {
      loginApiCall = studentLoginApi
    }
    
    const res = await loginApiCall({
      username: loginForm.username,
      password: loginForm.password
    })

    const { code, msg, data } = res as ApiResponse<login>

    if (code === 200 || code === 0) {
      ElMessage.success(t('login.loginSuccess'))
      console.log('登录成功，用户信息：', data)

      // 保存本次登录的账号、密码和角色（以便下次登录状态失效时快速恢复）
      sessionStorage.setItem('lastUsername', loginForm.username)
      sessionStorage.setItem('lastPassword', loginForm.password)
      sessionStorage.setItem('lastRole', activeRole.value)
      console.log('【调试】已保存账号、密码和角色到 sessionStorage')

      // 使用 Store 保存用户信息
      userStore.setUser(data.token, data.userInfo, activeRole.value, data.mustChangePassword || false)

      // 检查是否需要修改密码（首次登录）
      if (data.mustChangePassword) {
        ElMessage.warning('首次登录需要修改密码')
        router.push('/DashboardView')
      } else {
        // 检查是否有重定向路径
        const redirectPath = sessionStorage.getItem('redirectPath') || route.query.redirect as string
        
        if (redirectPath) {
          console.log('【调试】登录成功，准备返回到:', redirectPath)
          // 清除重定向路径
          sessionStorage.removeItem('redirectPath')
          // 返回到之前的页面
          router.push(redirectPath)
        } else {
          // 根据角色跳转到不同的页面
          if (activeRole.value === 'teacher') {
            router.push('/DashboardView')
          } else {
            router.push('/DashboardView')
          }
        }
      }
    } else {
      ElMessage.error(msg || t('login.loginFailed'))
    }
  } catch (error: any) {
    ElMessage.error(error.message || t('login.loginFailed'))
    console.error('登录请求错误：', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.login-card {
  width: 420px;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}
.login-header h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}
.login-header p {
  color: #909399;
  font-size: 14px;
  margin-top: 8px;
}

.role-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.login-btn {
  width: 100%;
  margin-top: 10px;
  font-size: 16px;
  border-radius: 8px;
}
</style>