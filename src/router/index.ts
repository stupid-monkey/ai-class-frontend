import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouteMeta } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 扩展 RouteMeta 接口
interface ExtendedMeta extends RouteMeta {
  requiresAuth?: boolean
  title?: string
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',      // 登录路径
      name: 'login',
      component: () => import(/* webpackChunkName: "login" */ '@/views/LoginView.vue'),
      meta: { requiresAuth: false } as ExtendedMeta
    },
    {
      path: '/change-password', // 修改密码路径
      name: 'changePassword',
      component: () => import(/* webpackChunkName: "changePassword" */ '@/views/ChangePasswordView.vue'),
      meta: { requiresAuth: true, title: '修改密码' } as ExtendedMeta
    },
    {
      path: '/',           // 默认根路径重定向到 dashboard
      redirect: '/DashboardView'
    },
    {
      path: '/DashboardView', // 工作台路径
      name: 'dashboard',
      component: () => import(/* webpackChunkName: "dashboard" */ '@/views/DashboardView.vue'),
      meta: { requiresAuth: true, title: 'AI 课堂控制台' } as ExtendedMeta
    },
    {
      path: '/ChatView',   // 聊天页面
      name: 'chat',
      component: () => import(/* webpackChunkName: "chat" */ '@/views/schedule/ChatView.vue'),
      meta: { requiresAuth: true, title: '智能排课系统' } as ExtendedMeta
    },
    {
      path: '/AiAssistant', // AI 助手
      name: 'aiassistant',
      component: () => import(/* webpackChunkName: "aiassistant" */ '@/views/AiAssistant.vue'),
      meta: { requiresAuth: true, title: 'AI 智慧课堂' } as ExtendedMeta
    },
    {
      path: '/SchoolCalendar', // 校历
      name: 'schoolcalendar',
      component: () => import(/* webpackChunkName: "schoolcalendar" */ '@/views/schedule/SchoolCalendar.vue'),
      meta: { requiresAuth: true, title: '校历管理' } as ExtendedMeta
    },
    {
      path: '/student-homework', // 学生作业列表
      name: 'studentHomework',
      component: () => import(/* webpackChunkName: "studentHomework" */ '@/views/StudentHomeworkView.vue'),
      meta: { requiresAuth: true, title: '我的作业' } as ExtendedMeta
    },
    {
      path: '/homework-detail', // 作业详情（学生提交）
      name: 'homeworkDetail',
      component: () => import(/* webpackChunkName: "homeworkDetail" */ '@/views/HomeworkDetailView.vue'),
      meta: { requiresAuth: true, title: '作业详情' } as ExtendedMeta
    },
    {
      path: '/teacher-homework-list', // 教师作业列表（待批改）
      name: 'teacherHomeworkList',
      component: () => import(/* webpackChunkName: "teacherHomeworkList" */ '@/views/TeacherHomeworkListView.vue'),
      meta: { requiresAuth: true, title: '作业批改列表' } as ExtendedMeta
    },
    {
      path: '/teacher-grading', // 教师批改
      name: 'teacherGrading',
      component: () => import(/* webpackChunkName: "teacherGrading" */ '@/views/TeacherGradingView.vue'),
      meta: { requiresAuth: true, title: '作业批改' } as ExtendedMeta
    },
    {
      path: '/:pathMatch(.*)*',  // 404 处理
      name: 'NotFound',
      component: () => import(/* webpackChunkName: "notfound" */ '@/views/LoginView.vue'),
      meta: { requiresAuth: false } as ExtendedMeta
    }
  ] as RouteRecordRaw[]
})

// 路由守卫：检查权限
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // 初始化用户信息（从 localStorage）
  if (!userStore.isLoggedIn) {
    userStore.initFromLocalStorage()
  }

  const requiresAuth = (to.meta as ExtendedMeta).requiresAuth
  const isLoggedIn = userStore.isLoggedIn
  const mustChangePassword = userStore.mustChangePassword

  // 如果用户已登录但需要修改密码，且不是要去修改密码页面
  if (isLoggedIn && mustChangePassword && to.path !== '/change-password') {
    next('/change-password')
  }
  // 如果路由需要认证但用户未登录
  else if (requiresAuth && !isLoggedIn) {
    next('/login')
  }
  // 如果用户已登录但尝试访问登录页
  else if (to.path === '/login' && isLoggedIn) {
    if (mustChangePassword) {
      next('/change-password')
    } else {
      next('/DashboardView')
    }
  }
  // 其他情况正常进行
  else {
    next()
  }
})

// 路由后置守卫（可选）
router.afterEach((to) => {
  // 设置页面标题
  const title = (to.meta as ExtendedMeta).title || 'AI 智慧课堂'
  document.title = title
})

export default router
