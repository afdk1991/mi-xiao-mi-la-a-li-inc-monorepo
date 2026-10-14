import type { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

export function generateId(): string {
  return uuidv4()
}

export function successResponse(
  res: Response,
  data: unknown,
  message = '操作成功',
  code = 0,
  statusCode = 200
): void {
  res.status(statusCode).json({
    code,
    message,
    data,
    timestamp: Date.now(),
  })
}

export function errorResponse(
  res: Response,
  message: string,
  code = 1,
  statusCode = 500
): void {
  res.status(statusCode).json({
    code,
    message,
    data: null,
    timestamp: Date.now(),
  })
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): { list: T[]; total: number; page: number; pageSize: number; pages: number } {
  const pages = Math.ceil(total / pageSize)
  return {
    list: data,
    total,
    page,
    pageSize,
    pages,
  }
}
