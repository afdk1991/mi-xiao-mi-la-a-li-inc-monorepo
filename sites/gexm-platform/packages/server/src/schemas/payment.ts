import { z } from 'zod'

export const paySchema = z.object({
  orderId: z.string().nonempty('订单ID不能为空'),
  payMethod: z.string().nonempty('支付方式不能为空'),
})

export const paymentListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive('页码必须为正整数')),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive('每页数量必须为正整数').max(100, '每页数量不能超过100')),
  status: z.string().optional(),
  payMethod: z.string().optional(),
})

export const paymentStatusParamsSchema = z.object({
  orderId: z.string().nonempty('订单ID不能为空'),
})

export const paymentDetailParamsSchema = z.object({
  id: z.string().nonempty('支付ID不能为空'),
})

export const closePaymentParamsSchema = z.object({
  orderId: z.string().nonempty('订单ID不能为空'),
})

export default {
  paySchema,
  paymentListQuerySchema,
  paymentStatusParamsSchema,
  paymentDetailParamsSchema,
  closePaymentParamsSchema,
}
