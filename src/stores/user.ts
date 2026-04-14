import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface UserInfo {
  id: string | number
  username: string
  name: string
  school?: string
  email?: string
  role?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>('')
  const userInfo = ref<UserInfo | null>(null)
  const role = ref<string>('')
  const mustChangePassword = ref<boolean>(false)

  // �?localStorage 初始�?
  const initFromLocalStorage = () => {
    const savedToken = localStorage.getItem('token')
    const savedUserInfo = localStorage.getItem('userInfo')
    const savedRole = localStorage.getItem('role')
    const savedMustChangePassword = localStorage.getItem('mustChangePassword')

    if (savedToken) {
      token.value = savedToken
    }
    if (savedUserInfo) {
      try {
        userInfo.value = JSON.parse(savedUserInfo)
      } catch (e) {
        console.error('Failed to parse userInfo from localStorage', e)
      }
    }
    if (savedRole) {
      role.value = savedRole
    }
    if (savedMustChangePassword) {
      mustChangePassword.value = JSON.parse(savedMustChangePassword)
    }
  }

  // 计算属性：是否已登�?
  const isLoggedIn = computed(() => !!token.value)

  // 计算属性：是否是教�?
  const isTeacher = computed(() => role.value === 'teacher')

  // 计算属性：是否是学�?
  const isStudent = computed(() => role.value === 'student')
  const isAdmin = computed(() => role.value === 'admin')

  // 设置用户信息
  const setUser = (newToken: string, newUserInfo: UserInfo, newRole: string, needChangePassword: boolean = false) => {
    token.value = newToken
    userInfo.value = newUserInfo
    role.value = newRole
    mustChangePassword.value = needChangePassword

    // 同时保存�?localStorage
    localStorage.setItem('token', newToken)
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo))
    localStorage.setItem('role', newRole)
    localStorage.setItem('mustChangePassword', JSON.stringify(needChangePassword))
  }

  // 登出 - 清除所有用户信�?
  const logout = () => {
    token.value = ''
    userInfo.value = null
    role.value = ''
    mustChangePassword.value = false

    // 清除 localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('role')
    localStorage.removeItem('mustChangePassword')
  }

  // 更新用户信息（不清除 token�?
  const updateUserInfo = (newUserInfo: Partial<UserInfo>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...newUserInfo }
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    }
  }

  return {
    token,
    userInfo,
    role,
    mustChangePassword,
    isLoggedIn,
    isTeacher,
    isStudent,
    isAdmin,
    initFromLocalStorage,
    setUser,
    logout,
    updateUserInfo
  }
})

