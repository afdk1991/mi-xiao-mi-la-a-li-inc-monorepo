// @ts-nocheck
import type { Request, Response } from 'express'
import { successResponse, errorResponse, paginate, getParamStr } from '../utils/response'
import shippingModel from '../models/shippingModel'

type ShippingType = 'standard' | 'express' | 'same_day' | 'pickup' | 'fixed' | 'weight' | 'volume'

interface CartItem {
  weight?: number
  quantity?: number
  price?: number
}

interface CalculateResult {
  success: boolean
  message?: string
  shippingFee?: number
}

interface ShippingRegion {
  region: string
  fee: number
}

interface CreateTemplateData {
  name: string
  type: ShippingType
  base_fee: number
  free_threshold: number
  regions: ShippingRegion[] | string
  estimated_days?: string
  status?: 'active' | 'inactive'
}

interface FindAllOptions {
  page: number
  pageSize: number
  status?: string
}

const shippingController = {
  async calculate(req: Request, res: Response): Promise<Response> {
    try {
      const { address, items, templateId } = req.body

      if (!address || !address.province) {
        return errorResponse(res, '收货地址不能为空', 1001, 400)
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return errorResponse(res, '商品列表不能为空', 1001, 400)
      }

      let template
      if (templateId) {
        template = shippingModel.findById(templateId)
        if (!template) {
          return errorResponse(res, '运费模板不存在', 1004, 404)
        }
      } else {
        template = shippingModel.getDefaultTemplate()
        if (!template) {
          return errorResponse(res, '没有可用的运费模板', 1004, 404)
        }
      }

      if (template.status !== 'active') {
        return errorResponse(res, '运费模板已停用', 3701, 400)
      }

      const totalWeight = items.reduce(
        (sum: number, item: CartItem) => sum + (item.weight || 0) * (item.quantity || 1),
        0
      )
      const totalPrice = items.reduce(
        (sum: number, item: CartItem) => sum + (item.price || 0) * (item.quantity || 1),
        0
      )

      const result = shippingModel.calculateShipping(
        template.id,
        totalWeight,
        totalPrice
      ) as CalculateResult

      if (!result.success) {
        return errorResponse(res, result.message || '计算失败', 3701, 400)
      }

      return successResponse(
        res,
        {
          template_id: template.id,
          template_name: template.name,
          shipping_fee: (result.shippingFee || 0).toFixed(2),
          estimated_days: template.estimated_days || '3-5',
          total_weight: totalWeight.toFixed(2),
        },
        '计算成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '计算失败', 1001, 400)
    }
  },

  async getTemplates(req: Request, res: Response): Promise<Response> {
    try {
      const { page = 1, pageSize = 20, status } = req.query

      const result = shippingModel.findAll({
        page: parseInt(String(page), 10),
        pageSize: parseInt(String(pageSize), 10),
        status: status || '',
      } as FindAllOptions)

      return successResponse(
        res,
        paginate(
          result.templates,
          result.total,
          parseInt(String(page), 10),
          parseInt(String(pageSize), 10)
        ),
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async getTemplate(req: Request, res: Response): Promise<Response> {
    try {
      const id = getParamStr(req.params.id)
      const template = shippingModel.findById(id)

      if (!template) {
        return errorResponse(res, '运费模板不存在', 1004, 404)
      }

      return successResponse(res, template, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async adminCreate(req: Request, res: Response): Promise<Response> {
    try {
      const {
        name,
        type,
        base_fee,
        free_threshold,
        regions,
        estimated_days,
        status = 'active',
      } = req.body

      if (!name) {
        return errorResponse(res, '模板名称不能为空', 1001, 400)
      }

      const validTypes: ShippingType[] = [
        'standard',
        'express',
        'same_day',
        'pickup',
        'fixed',
        'weight',
        'volume',
      ]
      if (!validTypes.includes(type)) {
        return errorResponse(res, '无效的配送类型', 1001, 400)
      }

      const fee = parseFloat(String(base_fee))
      if (isNaN(fee) || fee < 0) {
        return errorResponse(res, '基础运费必须大于等于0', 1001, 400)
      }

      const threshold = parseFloat(String(free_threshold))
      if (isNaN(threshold) || threshold < 0) {
        return errorResponse(res, '免费门槛必须大于等于0', 1001, 400)
      }

      const template = shippingModel.create({
        name,
        type,
        base_fee: fee,
        free_threshold: threshold,
        regions: Array.isArray(regions) ? regions.map((r) => ({ region: r, fee: 0 })) : '全国',
        estimated_days: estimated_days || '3-5',
        status,
      } as CreateTemplateData)

      return successResponse(res, template, '创建成功', 0, 201)
    } catch (error) {
      return errorResponse(res, (error as Error).message || '创建失败', 1001, 400)
    }
  },

  async adminUpdate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const template = shippingModel.findById(String(id))

      if (!template) {
        return errorResponse(res, '运费模板不存在', 1004, 404)
      }

      const { name, type, base_fee, free_threshold, regions, estimated_days, status } = req.body

      const updateData: Record<string, unknown> = {}
      if (name !== undefined) {
        updateData.name = name
      }
      const validTypes: ShippingType[] = [
        'standard',
        'express',
        'same_day',
        'pickup',
        'fixed',
        'weight',
        'volume',
      ]
      if (type !== undefined && validTypes.includes(type)) {
        updateData.type = type
      }
      if (base_fee !== undefined) {
        updateData.base_fee = parseFloat(String(base_fee))
      }
      if (free_threshold !== undefined) {
        updateData.free_threshold = parseFloat(String(free_threshold))
      }
      if (regions !== undefined && Array.isArray(regions)) {
        updateData.regions = regions
      }
      if (estimated_days !== undefined) {
        updateData.estimated_days = estimated_days
      }
      if (status !== undefined) {
        updateData.status = status
      }

      const updated = shippingModel.update(String(id), updateData)

      return successResponse(res, updated, '更新成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '更新失败', 1001, 400)
    }
  },

  async adminDelete(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const template = shippingModel.findById(String(id))

      if (!template) {
        return errorResponse(res, '运费模板不存在', 1004, 404)
      }

      shippingModel.delete(String(id))

      return successResponse(res, null, '删除成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '删除失败', 1001, 400)
    }
  },
}

export default shippingController
