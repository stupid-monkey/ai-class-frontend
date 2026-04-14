<template>
  <div class="change-password-container">
    <div class="card">
      <div class="header">
        <h1>{{ isFirstLogin ? 'First Login - Change Password' : 'Change Password' }}</h1>
        <p v-if="isFirstLogin" class="tip">For security reasons, please change your password upon first login</p>
      </div>

      <form @submit.prevent="handleChangePassword" class="form">
        <!-- 当前密码 -->
        <div class="form-group">
          <label for="current-password">{{ isFirstLogin ? 'Initial Password' : 'Current Password' }} *</label>
          <input
            id="current-password"
            v-model="form.currentPassword"
            type="password"
            :placeholder="isFirstLogin ? 'Enter initial password provided by admin' : 'Enter current password'"
            required
            @input="validateCurrentPassword"
          />
          <span v-if="errors.currentPassword" class="error">{{ errors.currentPassword }}</span>
        </div>

        <!-- 新密码 -->
        <div class="form-group">
          <label for="new-password">New Password *</label>
          <input
            id="new-password"
            v-model="form.newPassword"
            type="password"
            placeholder="Enter new password (at least 8 chars, with upper/lowercase & numbers)"
            required
            @input="validateNewPassword"
          />
          <span v-if="errors.newPassword" class="error">{{ errors.newPassword }}</span>
          <div class="password-strength">
            <div :class="['strength-bar', `strength-${strengthLevel}`]"></div>
            <span class="strength-text">{{ strengthText }}</span>
          </div>
        </div>

        <!-- 确认新密码 -->
        <div class="form-group">
          <label for="confirm-password">Confirm New Password *</label>
          <input
            id="confirm-password"
            v-model="form.confirmPassword"
            type="password"
            placeholder="Enter new password again"
            required
            @input="validateConfirmPassword"
          />
          <span v-if="errors.confirmPassword" class="error">{{ errors.confirmPassword }}</span>
        </div>

        <!-- 按钮 -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !isFormValid"
          >
            {{ loading ? 'Changing...' : 'Change Password' }}
          </button>
          <button
            v-if="!isFirstLogin"
            type="button"
            class="btn btn-secondary"
            @click="handleCancel"
            :disabled="loading"
          >
            Cancel
          </button>
        </div>

        <!-- 错误Notice -->
        <div v-if="submitError" class="alert alert-error">
          {{ submitError }}
        </div>

        <!-- 成功Notice -->
        <div v-if="submitSuccess" class="alert alert-success">
          {{ submitSuccess }}
        </div>
      </form>

      <!-- 首次登录Notice -->
      <div v-if="isFirstLogin" class="first-login-tips">
        <h3>Password Security Guidelines</h3>
        <ul>
          <li>✓ Please enter the initial password set by the administrator</li>
          <li>✓ Then set a strong new password</li>
          <li>✓ New password must contain: uppercase, lowercase, numbers, at least 8 characters</li>
          <li>✓ Keep your password safe and do not share it</li>
          <li>✓ Change your password regularly to improve security</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { changePasswordApi } from '@/api/log'

const router = useRouter()
const userStore = useUserStore()

// 是否是首次登录强制修改
const isFirstLogin = ref(false)

// 表单数据
const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 错误信息
const errors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 提交Status
const loading = ref(false)
const submitError = ref('')
const submitSuccess = ref('')

// 密码强度等级
const strengthLevel = computed(() => {
  const pwd = form.value.newPassword
  if (!pwd) return 'none'
  
  let strength = 0
  if (pwd.length >= 8) strength++
  if (pwd.length >= 12) strength++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
  if (/\d/.test(pwd)) strength++
  if (/[^a-zA-Z\d]/.test(pwd)) strength++
  
  if (strength < 2) return 'weak'
  if (strength < 3) return 'fair'
  if (strength < 4) return 'good'
  return 'strong'
})

// 密码强度文本
const strengthText = computed(() => {
  switch (strengthLevel.value) {
    case 'weak': return 'Weak'
    case 'fair': return 'Fair'
    case 'good': return 'Good'
    case 'strong': return 'Strong'
    default: return ''
  }
})

// 是否表单有效
const isFormValid = computed(() => {
  // 所有字段都必须填写
  return (
    form.value.currentPassword &&
    form.value.newPassword &&
    form.value.confirmPassword &&
    !errors.value.currentPassword &&
    !errors.value.newPassword &&
    !errors.value.confirmPassword
  )
})

// 验证当前密码
const validateCurrentPassword = () => {
  if (!form.value.currentPassword) {
    errors.value.currentPassword = isFirstLogin.value ? 'Please enter initial password' : 'Please enter current password'
  } else if (form.value.currentPassword.length < 6) {
    errors.value.currentPassword = 'Password must be at least 6 characters'
  } else {
    errors.value.currentPassword = ''
  }
}

// 验证新密码
const validateNewPassword = () => {
  const pwd = form.value.newPassword
  if (!pwd) {
    errors.value.newPassword = 'Please enter new password'
  } else if (pwd.length < 8) {
    errors.value.newPassword = 'New password must be at least 8 characters'
  } else if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd)) {
    errors.value.newPassword = 'Must contain uppercase and lowercase letters'
  } else if (!/\d/.test(pwd)) {
    errors.value.newPassword = 'Must contain numbers'
  } else if (pwd === form.value.currentPassword) {
    errors.value.newPassword = 'New password cannot be the same as current'
  } else {
    errors.value.newPassword = ''
  }
}

// 验证确认密码
const validateConfirmPassword = () => {
  if (!form.value.confirmPassword) {
    errors.value.confirmPassword = 'Please confirm new password'
  } else if (form.value.confirmPassword !== form.value.newPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
  } else {
    errors.value.confirmPassword = ''
  }
}

// 修改密码
const handleChangePassword = async () => {
  submitError.value = ''
  submitSuccess.value = ''

  if (!isFormValid.value) {
    submitError.value = 'Please complete the form properly'
    return
  }

  loading.value = true

  try {
    const payload = {
      token: userStore.token,
      currentPassword: form.value.currentPassword,
      newPassword: form.value.newPassword
    }

    await changePasswordApi(payload)
    
    submitSuccess.value = 'Password changed successfully! Please log in again'
    
    // 3秒后清除登录Status并跳转到登录页
    setTimeout(() => {
      // 清除用户登录Status
      userStore.logout()
      // 跳转到登录页面，使用新密码重新登录
      router.push('/login')
    }, 2000)
  } catch (error: any) {
    submitError.value = error.message || 'Change failed, please check if your current password is correct'
  } finally {
    loading.value = false
  }
}

// 取消修改
const handleCancel = () => {
  if (isFirstLogin.value) {
    // 首次登录不能取消
    return
  }
  router.back()
}

// 初始化页面
onMounted(() => {
  // 检查用户是否登录
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }

  // 检查是否是首次登录
  isFirstLogin.value = userStore.mustChangePassword
})
</script>

<style scoped>
.change-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  padding: 40px;
  max-width: 500px;
  width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #333;
  margin: 0 0 10px 0;
}

.header .tip {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error {
  display: block;
  color: #e74c3c;
  font-size: 12px;
  margin-top: 5px;
}

.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.strength-bar {
  height: 4px;
  flex: 1;
  background-color: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar::after {
  content: '';
  display: block;
  height: 100%;
  width: 100%;
  border-radius: 2px;
  transition: width 0.3s, background-color 0.3s;
}

.strength-bar.strength-none::after {
  width: 0;
}

.strength-bar.strength-weak::after {
  width: 25%;
  background-color: #e74c3c;
}

.strength-bar.strength-fair::after {
  width: 50%;
  background-color: #f39c12;
}

.strength-bar.strength-good::after {
  width: 75%;
  background-color: #f1c40f;
}

.strength-bar.strength-strong::after {
  width: 100%;
  background-color: #27ae60;
}

.strength-text {
  font-size: 12px;
  color: #666;
  min-width: 30px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5568d3;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #eee;
}

.btn-secondary:disabled {
  opacity: 0.6;
}

.alert {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
}

.alert-error {
  background-color: #fadbd8;
  color: #c0392b;
  border: 1px solid #f5b7b1;
}

.alert-success {
  background-color: #d5f4e6;
  color: #27ae60;
  border: 1px solid #a9dfbf;
}

.first-login-tips {
  background-color: #f0f3ff;
  border-left: 4px solid #667eea;
  padding: 20px;
  border-radius: 4px;
  margin-top: 20px;
}

.first-login-tips h3 {
  margin: 0 0 10px 0;
  color: #667eea;
  font-size: 14px;
}

.first-login-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #555;
  font-size: 13px;
}

.first-login-tips li {
  margin-bottom: 8px;
}

@media (max-width: 600px) {
  .card {
    padding: 30px 20px;
  }

  .header h1 {
    font-size: 24px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
