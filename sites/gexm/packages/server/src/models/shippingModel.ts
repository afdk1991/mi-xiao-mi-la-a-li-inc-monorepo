import { getDb } from '../models'
import { generateId } from '../utils/response'

type ShippingTemplateType =
  'fixed' | 'weight' | 'volume' | 'standard' | 'express' | 'same_day' | 'pickup'
type ShippingStatus = 'active' | 'inactive'

interface ShippingRegion {
  region: string
  fee: number
}

interface ShippingTemplate {
  id: string
  name: string
  type: ShippingTemplateType
  base_fee: number
  base_weight: number
  extra_fee: number
  extra_weight: number
  free_threshold: number
  regions: ShippingRegion[]
  estimated_days: string
  status: ShippingStatus
  created_at: string
  updated_at: string
}

interface CreateTemplateData {
  name: string
  type?: ShippingTemplateType
  base_fee?: number
  base_weight?: number
  extra_fee?: number
  extra_weight?: number
  free_threshold?: number
  regions?: ShippingRegion[] | string
  estimated_days?: string
  status?: ShippingStatus
}

interface UpdateTemplateData {
  name?: string
  type?: ShippingTemplateType
  base_fee?: number
  base_weight?: number
  extra_fee?: number
  extra_weight?: number
  free_threshold?: number
  regions?: ShippingRegion[] | string
  estimated_days?: string
  status?: ShippingStatus
}

interface ShippingResult {
  success: boolean
  message?: string
  shippingFee: number
  template?: ShippingTemplate
}

interface FindAllOptions {
  page?: number
  pageSize?: number
  type?: string
  status?: string
}

function parseRegions(template: Record<string, unknown>): void {
  if (template.regions) {
    try {
      template.regions = JSON.parse(template.regions as string)
    } catch {
      template.regions = []
    }
  }
}

const shippingModel = {
  findById(id: string): ShippingTemplate | null {
    const db = getDb()
    const template = db.prepare('SELECT * FROM shipping_templates WHERE id = ?').get(id) as
      Record<string, unknown> | undefined
    if (template) {
      parseRegions(template)
    }
    return (template as unknown as ShippingTemplate) || null
  },

  findAll(options: FindAllOptions = {}): { templates: ShippingTemplate[]; total: number } {
    const db = getDb()
    const { page = 1, pageSize = 20, type = '', status = '' } = options
    const offset = (page - 1) * pageSize

    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (type) {
      whereClause += ' AND type = ?'
      params.push(type)
    }

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM shipping_templates ${whereClause}`)
      .get(...params) as { count: number }

    const templates = db
      .prepare(
        `
        SELECT * FROM shipping_templates
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, pageSize, offset) as Record<string, unknown>[]

    templates.forEach((t) => parseRegions(t))

    return { templates: templates as unknown as ShippingTemplate[], total: countResult.count }
  },

  create(templateData: CreateTemplateData): ShippingTemplate | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    const regionsValue =
      typeof templateData.regions === 'string'
        ? templateData.regions
        : JSON.stringify(templateData.regions || [])

    db.prepare(
      `
      INSERT INTO shipping_templates (
        id, name, type, base_fee, base_weight, extra_fee,
        extra_weight, free_threshold, regions, estimated_days, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      templateData.name,
      templateData.type || 'fixed',
      templateData.base_fee || 0,
      templateData.base_weight || 0,
      templateData.extra_fee || 0,
      templateData.extra_weight || 0,
      templateData.free_threshold || 0,
      regionsValue,
      templateData.estimated_days || '3-5',
      templateData.status || 'active',
      now,
      now
    )

    return this.findById(id)
  },

  update(id: string, data: UpdateTemplateData): ShippingTemplate | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number)[] = []

    const allowedFields: (keyof UpdateTemplateData)[] = [
      'name',
      'type',
      'base_fee',
      'base_weight',
      'extra_fee',
      'extra_weight',
      'free_threshold',
      'regions',
      'estimated_days',
      'status',
    ]
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'regions' && typeof data[field] !== 'string') {
          fields.push(`${field} = ?`)
          values.push(JSON.stringify(data[field]))
        } else {
          fields.push(`${field} = ?`)
          values.push(data[field] as string | number)
        }
      }
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE shipping_templates SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM shipping_templates WHERE id = ?').run(id)
    return result.changes > 0
  },

  calculateShipping(
    templateId: string,
    weight: number = 0,
    orderAmount: number = 0
  ): ShippingResult {
    const template = this.findById(templateId)
    if (!template) {
      return { success: false, message: '运费模板不存在', shippingFee: 0 }
    }

    if (template.status !== 'active') {
      return { success: false, message: '运费模板已停用', shippingFee: 0 }
    }

    if (orderAmount >= template.free_threshold && template.free_threshold > 0) {
      return { success: true, shippingFee: 0, template }
    }

    let shippingFee = template.base_fee

    switch (template.type) {
      case 'fixed':
      case 'standard':
      case 'express':
      case 'same_day':
      case 'pickup':
        shippingFee = template.base_fee
        break
      case 'weight':
        if (weight > template.base_weight) {
          const extraWeight = weight - template.base_weight
          const extraUnits = Math.ceil(extraWeight / template.extra_weight)
          shippingFee += extraUnits * template.extra_fee
        }
        break
      case 'volume':
        shippingFee = template.base_fee
        break
      default:
        shippingFee = template.base_fee
    }

    return { success: true, shippingFee: parseFloat(String(shippingFee)), template }
  },

  getAvailableTemplates(region: string = ''): ShippingTemplate[] {
    const db = getDb()
    let templates: Record<string, unknown>[]

    if (region) {
      templates = db
        .prepare(
          "SELECT * FROM shipping_templates WHERE status = 'active' AND regions LIKE ? ORDER BY created_at DESC"
        )
        .all(`%${region}%`) as Record<string, unknown>[]
    } else {
      templates = db
        .prepare(
          "SELECT * FROM shipping_templates WHERE status = 'active' ORDER BY created_at DESC"
        )
        .all() as Record<string, unknown>[]
    }

    templates.forEach((t) => parseRegions(t))

    return templates as unknown as ShippingTemplate[]
  },

  getDefaultTemplate(): ShippingTemplate | null {
    const db = getDb()
    const template = db
      .prepare(
        "SELECT * FROM shipping_templates WHERE status = 'active' ORDER BY created_at ASC LIMIT 1"
      )
      .get() as Record<string, unknown> | undefined
    if (template) {
      parseRegions(template)
    }
    return (template as unknown as ShippingTemplate) || null
  },
}

export default shippingModel
