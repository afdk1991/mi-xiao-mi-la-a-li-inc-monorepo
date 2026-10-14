import type { Request, Response, NextFunction } from 'express'
import { errorResponse } from '../utils/response'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_REGEX = /^[1-9]\d*$/
const PREFIXED_ID_REGEX = /^[A-Za-z]+[0-9a-f]{12}$/

export type IdType = 'uuid' | 'numeric' | 'any' | 'entity'

export interface IdValidationOptions {
  paramName?: string
  idType?: IdType
  required?: boolean
}

export function validateId(options: IdValidationOptions = {}) {
  const { paramName = 'id', idType = 'any', required = true } = options

  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const paramValue = req.params[paramName]

    if (!paramValue) {
      if (required) {
        return errorResponse(res, `缺少参数: ${paramName}`, 1001, 400)
      }
      return next()
    }

    let isValid = false

    const value = Array.isArray(paramValue) ? paramValue[0] : paramValue

    switch (idType) {
      case 'uuid':
        isValid = UUID_REGEX.test(value)
        break
      case 'numeric':
        isValid = NUMERIC_REGEX.test(value)
        break
      case 'entity':
        isValid = UUID_REGEX.test(value) || PREFIXED_ID_REGEX.test(value)
        break
      case 'any':
        isValid = value.length > 0 && value.length <= 64
        break
    }

    if (!isValid) {
      const typeDesc =
        idType === 'uuid'
          ? 'UUID格式'
          : idType === 'numeric'
            ? '数字格式'
            : idType === 'entity'
              ? '有效ID格式'
              : '有效格式'
      return errorResponse(res, `${paramName} 格式不正确，需要${typeDesc}`, 1001, 400)
    }

    next()
  }
}

export function validateNumericId(paramName: string = 'id') {
  return validateId({ paramName, idType: 'numeric' })
}

export function validateUuid(paramName: string = 'id') {
  return validateId({ paramName, idType: 'uuid' })
}

export function validateEntityId(paramName: string = 'id') {
  return validateId({ paramName, idType: 'entity' })
}

export default {
  validateId,
  validateNumericId,
  validateUuid,
  validateEntityId,
}
