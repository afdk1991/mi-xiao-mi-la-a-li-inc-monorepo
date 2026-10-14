// @ts-nocheck
import type { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import config from '../config'
import { successResponse, errorResponse, generateId } from '../utils/response'
import logger from '../utils/logger'
import { GENERAL_ERRORS, RESOURCE_ERRORS } from '../constants/errorCodes'

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
const ALLOWED_FILE_EXTENSIONS = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  '.pdf',
  '.zip',
  '.txt',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.mp4',
  '.mov',
  '.avi',
  '.mp3',
  '.wav',
]

const IMAGE_MAGIC_NUMBERS = [
  Buffer.from([0xff, 0xd8, 0xff]),
  Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  Buffer.from([0x47, 0x49, 0x46, 0x38]),
  Buffer.from('RIFF'),
  Buffer.from([0x42, 0x4d]),
]

/**
 * 非图片文件的魔术数字签名表
 * 用于验证上传文件的实际内容与扩展名是否匹配
 */
const FILE_SIGNATURES: Record<string, number[][]> = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46]],
  '.zip': [[0x50, 0x4b, 0x03, 0x04]],
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]],
  '.doc': [[0xd0, 0xcf, 0x11, 0xe0]],
  '.xls': [[0xd0, 0xcf, 0x11, 0xe0]],
  '.mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  '.mov': [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]],
  '.avi': [[0x52, 0x49, 0x46, 0x46]],
  '.mp3': [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
  '.wav': [[0x52, 0x49, 0x46, 0x46]],
  // .txt 无魔术数字，跳过验证
}

function validateFileMagic(filePath: string, isImage = false, filename = ''): boolean {
  try {
    const buffer = Buffer.alloc(12)
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buffer, 0, 12, 0)
    fs.closeSync(fd)

    if (isImage) {
      return IMAGE_MAGIC_NUMBERS.some((magic) => buffer.slice(0, magic.length).equals(magic))
    }

    // 非图片文件：根据扩展名验证魔术数字
    const ext = path.extname(filename).toLowerCase()
    const signatures = FILE_SIGNATURES[ext]

    // 无已知签名的扩展名（如 .txt），允许通过
    if (!signatures || signatures.length === 0) {
      return true
    }

    return signatures.some((sig) => {
      const sigBuf = Buffer.from(sig)
      return buffer.slice(0, sigBuf.length).equals(sigBuf)
    })
  } catch (err) {
    logger.error('File magic validation error: %s', (err as Error).message)
    return false
  }
}

function getAllowedExtensions(isImage = false): string[] {
  return isImage ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_FILE_EXTENSIONS
}

function validateFileExtension(filename: string, isImage = false): boolean {
  const ext = path.extname(filename).toLowerCase()
  const allowed = getAllowedExtensions(isImage)
  return allowed.includes(ext)
}

function safeDeleteFile(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    logger.error('Failed to delete file: %s', (err as Error).message)
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.upload.path
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      cb(null, uploadDir)
    } catch (err) {
      cb(err as Error)
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const filename = `${generateId()}${ext}`
    cb(null, filename)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSize,
  },
})

interface UploadFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  destination: string
  filename: string
  path: string
  size: number
}

interface UploadResponse {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadAt: string
}

const uploadController = {
  uploadFile: upload.single('file'),

  handleUpload(req: Request & { file?: UploadFile }, res: Response): Response {
    if (!req.file) {
      return errorResponse(
        res,
        '请上传文件',
        GENERAL_ERRORS.MISSING_PARAMETER.code,
        GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
      )
    }

    if (!validateFileExtension(req.file.originalname, false)) {
      safeDeleteFile(req.file.path)
      return errorResponse(
        res,
        '不支持的文件类型',
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.code,
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.httpStatus
      )
    }

    // 魔术数字校验：验证文件实际内容与扩展名是否匹配
    if (!validateFileMagic(req.file.path, false, req.file.originalname)) {
      safeDeleteFile(req.file.path)
      return errorResponse(
        res,
        '文件内容与扩展名不匹配',
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.code,
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.httpStatus
      )
    }

    const fileUrl = `/uploads/${req.file.filename}`

    logger.info('File uploaded: %s', req.file.originalname, {
      userId: (req as Request & { userId?: string }).userId,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    })

    return successResponse(
      res,
      {
        id: generateId(),
        name: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        type: req.file.mimetype,
        uploadAt: new Date().toISOString(),
      } as UploadResponse,
      '上传成功'
    )
  },

  uploadImage: upload.single('image'),

  handleImageUpload(req: Request & { file?: UploadFile }, res: Response): Response {
    if (!req.file) {
      return errorResponse(
        res,
        '请上传图片',
        GENERAL_ERRORS.MISSING_PARAMETER.code,
        GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
      )
    }

    if (!validateFileExtension(req.file.originalname, true)) {
      safeDeleteFile(req.file.path)
      return errorResponse(
        res,
        '只能上传图片文件',
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.code,
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.httpStatus
      )
    }

    if (!req.file.mimetype.startsWith('image/')) {
      safeDeleteFile(req.file.path)
      return errorResponse(
        res,
        '只能上传图片文件',
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.code,
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.httpStatus
      )
    }

    if (!validateFileMagic(req.file.path, true)) {
      safeDeleteFile(req.file.path)
      return errorResponse(
        res,
        '图片文件格式无效',
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.code,
        RESOURCE_ERRORS.FILE_TYPE_NOT_ALLOWED.httpStatus
      )
    }

    const fileUrl = `/uploads/${req.file.filename}`

    logger.info('Image uploaded: %s', req.file.originalname, {
      userId: (req as Request & { userId?: string }).userId,
      filename: req.file.filename,
      size: req.file.size,
    })

    return successResponse(
      res,
      {
        id: generateId(),
        name: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        type: req.file.mimetype,
        uploadAt: new Date().toISOString(),
      } as UploadResponse,
      '上传成功'
    )
  },
}

export default uploadController
