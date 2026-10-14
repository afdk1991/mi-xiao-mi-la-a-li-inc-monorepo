import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'

export function validateSchema<T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source]

    const result = schema.safeParse(data)

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))

      const firstErrorMessage = errors.length > 0 ? errors[0].message : '请求参数验证失败'

      res.status(400).json({
        code: 1001,
        message: firstErrorMessage,
        data: { errors },
        timestamp: Date.now(),
      })
      return
    }

    next()
  }
}

export default { validateSchema }
