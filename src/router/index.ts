import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('@/views/AuthCallback.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/Projects.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: () => import('@/views/ProjectDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/diff/:projectId/:snapshotId',
    name: 'DiffView',
    component: () => import('@/views/DiffView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 라우터 가드
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 인증이 필요한 라우트인지 확인
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // 인증이 필요한 경우
  if (requiresAuth) {
    // 토큰이 있으면 검증 시도
    if (authStore.token) {
      const isValid = await authStore.checkAuth()
      if (isValid) {
        next()
      } else {
        // 토큰이 유효하지 않으면 로그인 페이지로
        next('/login')
      }
    } else {
      // 토큰이 없으면 로그인 페이지로
      next('/login')
    }
  } else {
    // 인증이 필요 없는 라우트 (로그인/회원가입)
    // 이미 로그인되어 있으면 홈으로 리다이렉트
    if (authStore.isAuthenticated) {
      next('/')
    } else {
      next()
    }
  }
})

export default router
