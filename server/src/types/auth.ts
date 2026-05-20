import { z } from 'zod'

/**
 * 회원가입 스키마
 */
export const registerSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
  // password: z
  //   .string()
  //   .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  //   .regex(/[a-zA-Z]/, '비밀번호에 영문자가 포함되어야 합니다')
  //   .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다'),
  name: z.string().optional()
})

/**
 * 로그인 스키마
 */
export const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요')
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>

/**
 * 인증 제공자 타입
 */
export type AuthProvider = 'email' | 'github' | 'google'
