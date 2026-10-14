import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().nonempty('用户名不能为空').max(100, '用户名长度不能超过100个字符'),
  password: z.string().nonempty('密码不能为空').max(100, '密码长度不能超过100个字符'),
})

export const registerSchema = z.object({
  username: z
    .string()
    .nonempty('用户名不能为空')
    .min(3, '用户名长度应为3-20个字符')
    .max(20, '用户名长度应为3-20个字符'),
  email: z.string().nonempty('邮箱不能为空').email('邮箱格式不正确'),
  password: z
    .string()
    .nonempty('密码不能为空')
    .min(8, '密码长度不能少于8位')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;':",.<>?/\\]).+$/,
      '密码必须包含大小写字母、数字和特殊字符'
    ),
  nickname: z.string().max(50, '昵称长度不能超过50个字符').optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '手机号格式不正确')
    .optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().nonempty('刷新令牌不能为空'),
})

export const updateProfileSchema = z.object({
  nickname: z.string().max(50, '昵称长度不能超过50个字符').optional(),
  avatar: z.string().url('头像URL格式不正确').optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '手机号格式不正确')
    .optional(),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().nonempty('旧密码不能为空'),
  newPassword: z
    .string()
    .nonempty('新密码不能为空')
    .min(8, '新密码长度不能少于8位')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;':",.<>?/\\]).+$/,
      '新密码必须包含大小写字母、数字和特殊字符'
    ),
})

export default {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
}
