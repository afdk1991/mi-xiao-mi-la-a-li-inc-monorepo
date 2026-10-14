import { getDb } from './index'
import { generateId } from '../utils/response'

export interface Role {
  id: string
  name: string
  description: string
  permissions: string
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
  created_at: string
}

const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: '管理员',
    permissions: JSON.stringify(['user:*', 'product:*', 'order:*', 'system:*']),
  },
  {
    name: 'user',
    description: '普通用户',
    permissions: JSON.stringify([
      'user:read',
      'user:update',
      'order:create',
      'order:read',
      'product:read',
      'cart:*',
      'favorite:*',
      'address:*',
    ]),
  },
  {
    name: 'guest',
    description: '访客',
    permissions: JSON.stringify(['product:read', 'order:create']),
  },
]

const DEFAULT_PERMISSIONS = [
  { name: '用户管理', description: '管理所有用户', resource: 'user', action: '*' },
  { name: '用户查看', description: '查看用户信息', resource: 'user', action: 'read' },
  { name: '用户修改', description: '修改用户信息', resource: 'user', action: 'update' },
  { name: '用户删除', description: '删除用户', resource: 'user', action: 'delete' },
  { name: '商品管理', description: '管理所有商品', resource: 'product', action: '*' },
  { name: '商品查看', description: '查看商品', resource: 'product', action: 'read' },
  { name: '商品创建', description: '创建商品', resource: 'product', action: 'create' },
  { name: '商品修改', description: '修改商品', resource: 'product', action: 'update' },
  { name: '商品删除', description: '删除商品', resource: 'product', action: 'delete' },
  { name: '订单管理', description: '管理所有订单', resource: 'order', action: '*' },
  { name: '订单查看', description: '查看订单', resource: 'order', action: 'read' },
  { name: '订单创建', description: '创建订单', resource: 'order', action: 'create' },
  { name: '购物车管理', description: '管理购物车', resource: 'cart', action: '*' },
  { name: '收藏管理', description: '管理收藏', resource: 'favorite', action: '*' },
  { name: '地址管理', description: '管理地址', resource: 'address', action: '*' },
  { name: '系统管理', description: '系统管理权限', resource: 'system', action: '*' },
]

export const roleModel: {
  init: () => void
  findByName: (name: string) => Role | undefined
  findById: (id: string) => Role | undefined
  getAllRoles: () => Role[]
  createRole: (data: { name: string; description: string; permissions: string[] }) => Role
  updateRole: (
    id: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ) => Role | undefined
  deleteRole: (id: string) => boolean
  getPermissions: (roleName: string) => string[]
  hasPermission: (roleName: string, resource: string, action: string) => boolean
} = {
  init() {
    const db = getDb()

    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(resource, action)
      )
    `)

    for (const perm of DEFAULT_PERMISSIONS) {
      try {
        db.prepare(
          `INSERT OR IGNORE INTO permissions (id, name, description, resource, action, created_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          generateId(),
          perm.name,
          perm.description,
          perm.resource,
          perm.action,
          new Date().toISOString()
        )
      } catch {
        // Ignore duplicates
      }
    }

    for (const role of DEFAULT_ROLES) {
      try {
        db.prepare(
          `INSERT OR IGNORE INTO roles (id, name, description, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          generateId(),
          role.name,
          role.description,
          role.permissions,
          new Date().toISOString(),
          new Date().toISOString()
        )
      } catch {
        // Ignore duplicates
      }
    }
  },

  findByName(name) {
    const db = getDb()
    return db.prepare('SELECT * FROM roles WHERE name = ?').get(name) as Role | undefined
  },

  findById(id) {
    const db = getDb()
    return db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Role | undefined
  },

  getAllRoles() {
    const db = getDb()
    return db.prepare('SELECT * FROM roles ORDER BY name').all() as Role[]
  },

  createRole(data) {
    const db = getDb()
    const now = new Date().toISOString()
    const id = generateId()

    db.prepare(
      `INSERT INTO roles (id, name, description, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.name, data.description, JSON.stringify(data.permissions), now, now)

    return this.findById(id) as Role
  },

  updateRole(id, data) {
    const db = getDb()
    const now = new Date().toISOString()

    const fields = []
    const values = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      fields.push('description = ?')
      values.push(data.description)
    }
    if (data.permissions !== undefined) {
      fields.push('permissions = ?')
      values.push(JSON.stringify(data.permissions))
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return this.findById(id)
  },

  deleteRole(id) {
    const db = getDb()
    const result = db.prepare('DELETE FROM roles WHERE id = ?').run(id)
    return result.changes > 0
  },

  getPermissions(roleName) {
    const role = this.findByName(roleName)
    if (!role) {
      return []
    }
    try {
      return JSON.parse(role.permissions) as string[]
    } catch {
      return []
    }
  },

  hasPermission(roleName, resource, action) {
    const permissions = this.getPermissions(roleName)
    const wildcardPermission = `${resource}:*`
    const specificPermission = `${resource}:${action}`

    return permissions.includes(wildcardPermission) || permissions.includes(specificPermission)
  },
}

export default roleModel
