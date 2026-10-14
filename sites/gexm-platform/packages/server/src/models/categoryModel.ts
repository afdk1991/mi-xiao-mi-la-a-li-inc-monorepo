import { getDb } from './index'
import { generateId } from '../utils/response'

// 分类接口定义
interface Category {
  id: string
  name: string
  parent_id?: string | null
  level: number
  icon?: string
  sort_order?: number
  status?: string
  created_at: string
  updated_at: string
}

// 树形分类节点
interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

// 创建分类数据
interface CreateCategoryData {
  name: string
  parent_id?: string | null
  icon?: string
  sort_order?: number
  status?: string
}

// 更新分类数据
interface UpdateCategoryData {
  name?: string
  parent_id?: string | null
  icon?: string
  sort_order?: number
  status?: string
}

// 排序项
interface SortItem {
  id: string
  sort_order: number
}

// 分类路径项
interface CategoryPathItem {
  id: string
  name: string
  level: number
}

const categoryModel = {
  findById(id: string): Category | null {
    const db = getDb()
    const result = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
      Category | undefined
    return result || null
  },

  findAll(): Category[] {
    const db = getDb()
    return db
      .prepare('SELECT * FROM categories ORDER BY sort_order ASC, created_at DESC')
      .all() as Category[]
  },

  findByParentId(parentId: string | null): Category[] {
    const db = getDb()
    return db
      .prepare(
        'SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC, created_at DESC'
      )
      .all(parentId) as Category[]
  },

  findTree(): CategoryTreeNode[] {
    const all = this.findAll()
    const buildTree = (parentId: string | null): CategoryTreeNode[] => {
      return all
        .filter((cat) => cat.parent_id === parentId)
        .map((cat) => ({
          ...cat,
          children: buildTree(cat.id),
        }))
    }
    return buildTree(null)
  },

  create(data: CreateCategoryData): Category | null {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    let level = 1
    if (data.parent_id) {
      const parent = this.findById(data.parent_id)
      if (parent) {
        level = parent.level + 1
      }
    }

    db.prepare(
      `
      INSERT INTO categories (id, name, parent_id, level, icon, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      data.name,
      data.parent_id || null,
      level,
      data.icon || '',
      data.sort_order || 0,
      data.status || 'active',
      now,
      now
    )

    return this.findById(id)
  },

  update(id: string, data: UpdateCategoryData): Category | null {
    const db = getDb()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    const allowedFields: (keyof UpdateCategoryData)[] = [
      'name',
      'parent_id',
      'icon',
      'sort_order',
      'status',
    ]
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`)
        values.push(data[field] as string | number)
      }
    }

    if (data.parent_id !== undefined) {
      let level = 1
      if (data.parent_id) {
        const parent = this.findById(data.parent_id)
        if (parent) {
          level = parent.level + 1
        }
      }
      const levelIndex = fields.findIndex((f) => f.startsWith('parent_id'))
      fields.splice(levelIndex + 1, 0, 'level = ?')
      values.splice(levelIndex + 1, 0, level)
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  delete(id: string): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return result.changes > 0
  },

  hasChildren(id: string): boolean {
    const db = getDb()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?')
      .get(id) as { count: number }
    return result.count > 0
  },

  updateSortOrder(id: string, sortOrder: number): Category | null {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?').run(
      sortOrder,
      now,
      id
    )
    return this.findById(id)
  },

  batchUpdateSortOrder(sortItems: SortItem[]): number {
    const db = getDb()
    const now = new Date().toISOString()

    const transaction = db.transaction(() => {
      const stmt = db.prepare('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?')
      for (const item of sortItems) {
        stmt.run(item.sort_order, now, item.id)
      }
      return sortItems.length
    })

    return transaction()
  },

  getCategoryPath(id: string): CategoryPathItem[] {
    const path: CategoryPathItem[] = []
    let current = this.findById(id)
    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
        level: current.level,
      })
      if (current.parent_id) {
        current = this.findById(current.parent_id)
      } else {
        break
      }
    }
    return path
  },
}

export default categoryModel
