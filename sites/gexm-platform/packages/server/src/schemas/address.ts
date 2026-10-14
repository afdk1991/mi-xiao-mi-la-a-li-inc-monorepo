import { z } from 'zod'

const booleanLike = z
  .union([z.boolean(), z.number(), z.string()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null) {
      return undefined
    }
    if (typeof val === 'boolean') {
      return val
    }
    if (typeof val === 'number') {
      return val === 1
    }
    return val === 'true' || val === '1'
  })

export const createAddressSchema = z.object({
  name: z.string().nonempty('联系人姓名不能为空'),
  phone: z
    .string()
    .nonempty('联系电话不能为空')
    .regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  province: z.string().nonempty('省份不能为空'),
  city: z.string().nonempty('城市不能为空'),
  district: z.string().nonempty('区县不能为空'),
  detail: z.string().nonempty('详细地址不能为空'),
  isDefault: booleanLike,
  tag: z.string().max(20, '地址标签长度不能超过20个字符').optional(),
})

export const updateAddressSchema = z.object({
  name: z.string().nonempty('联系人姓名不能为空').optional(),
  phone: z
    .string()
    .nonempty('联系电话不能为空')
    .regex(/^1[3-9]\d{9}$/, '手机号格式不正确')
    .optional(),
  province: z.string().nonempty('省份不能为空').optional(),
  city: z.string().nonempty('城市不能为空').optional(),
  district: z.string().nonempty('区县不能为空').optional(),
  detail: z.string().nonempty('详细地址不能为空').optional(),
  isDefault: booleanLike,
  tag: z.string().max(20, '地址标签长度不能超过20个字符').optional(),
})

export default { createAddressSchema, updateAddressSchema }
