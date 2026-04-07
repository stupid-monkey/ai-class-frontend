<template>
  <div class="login-wrapper">
    <el-card class="login-card" shadow="hover">
      <div class="login-header">
        <h2>🤖 AI 智慧课堂系统</h2>
        <p>探索未来的学习与教学方式</p>
      </div>

      <el-tabs v-model="activeRole" class="role-tabs">
        <el-tab-pane label="👨‍🎓 学生端登录" name="student"></el-tab-pane>
        <el-tab-pane label="👨‍🏫 教师端登录" name="teacher"></el-tab-pane>
      </el-tabs>

      <el-form :model="loginForm" @keyup.enter="handleLogin" label-width="0">
        <el-form-item>
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入账号" 
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
            placeholder="请输入密码" 
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
          {{ isLoading ? '登录中...' : `立即登录 (${activeRole === 'teacher' ? '教师' : '学生'})` }}
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { teacherLoginApi, studentLoginApi } from '@/api/log'
import { ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { ApiResponse } from '@/api/request'
import type { login } from '@/model/login'

const router = useRouter()
const route = useRoute()
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
    const loginApiCall = activeRole.value === 'teacher' ? teacherLoginApi : studentLoginApi
    
    const res = await loginApiCall({
      username: loginForm.username,
      password: loginForm.password
    })

    const { code, msg, data } = res as ApiResponse<login>

    if (code === 200 || code === 0) {
      ElMessage.success('登录成功！')
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
      ElMessage.error(msg || '登录失败，请检查账号和密码')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '登录请求失败，请稍后再试')
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