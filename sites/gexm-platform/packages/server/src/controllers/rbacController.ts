// @ts-nocheck
import type { Request, Response } from 'express'
import { getDb } from '../models'
import { generateId, successResponse, errorResponse, paginate } from '../utils/response'
import { GENERAL_ERRORS, AUTH_ERRORS } from '../constants/errorCodes'

interface Role {
  id: string
  name: string
  description: string
  is_system: number
  created_at: string
  updated_at: string
  permissions?: Permission[]
}

interface Permission {
  id: string
  name: string
  code: string
  module: string
  description: string
}

const rbacController = {
  async getRoles(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { page = 1, pageSize = 20 } = req.query

      const countStmt = db.prepare('SELECT COUNT(*) as total FROM roles')
      const total = countStmt.get().total

      const offset = (parseInt(String(page), 10) - 1) * parseInt(String(pageSize), 10)
      const stmt = db.prepare(`
        SELECT * FROM roles
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      const data = stmt.all(parseInt(String(pageSize), 10), offset)

      return successResponse(
        res,
        paginate(data, total, parseInt(String(page), 10), parseInt(String(pageSize), 10)),
        '获取成功'
      )
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async getRoleDetail(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { id } = req.params

      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Role | undefined
      if (!role) {
        return errorResponse(
          res,
          '角色不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      const permissions = db
        .prepare(
          `
        SELECT p.* FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
      `
        )
        .all(id) as Permission[]

      role.permissions = permissions

      return successResponse(res, role, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async createRole(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { name, description, permissions = [] } = req.body

      if (!name) {
        return errorResponse(
          res,
          '角色名称不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const existing = db.prepare('SELECT * FROM roles WHERE name = ?').get(name)
      if (existing) {
        return errorResponse(
          res,
          '角色名称已存在',
          GENERAL_ERRORS.RESOURCE_CONFLICT.code,
          GENERAL_ERRORS.RESOURCE_CONFLICT.httpStatus
        )
      }

      const now = new Date().toISOString()
      const id = generateId('ROL')

      const transaction = db.transaction(() => {
        db.prepare(
          'INSERT INTO roles (id, name, description, is_system, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
        ).run(id, name, description || '', now, now)

        if (permissions.length > 0) {
          const insertPerm = db.prepare(
            'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)'
          )
          for (const permId of permissions) {
            insertPerm.run(id, permId, now)
          }
        }
      })

      transaction()

      return successResponse(res, { id, name, description }, '创建成功', 0, 201)
    } catch (error) {
      return errorResponse(res, (error as Error).message || '创建失败', 1001, 400)
    }
  },

  async updateRole(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const id = req.params.id as string
      const { name, description, permissions } = req.body

      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Role | undefined
      if (!role) {
        return errorResponse(
          res,
          '角色不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      if (role.is_system) {
        return errorResponse(
          res,
          '系统角色不可修改',
          AUTH_ERRORS.FORBIDDEN.code,
          AUTH_ERRORS.FORBIDDEN.httpStatus
        )
      }

      const now = new Date().toISOString()

      const transaction = db.transaction(() => {
        const updates: string[] = []
        const params: (string | number)[] = []

        if (name !== undefined) {
          updates.push('name = ?')
          params.push(name)
        }
        if (description !== undefined) {
          updates.push('description = ?')
          params.push(description)
        }
        updates.push('updated_at = ?')
        params.push(now)
        params.push(id)

        if (updates.length > 1) {
          db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`).run(...params)
        }

        if (permissions !== undefined) {
          db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
          if (permissions.length > 0) {
            const insertPerm = db.prepare(
              'INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)'
            )
            for (const permId of permissions) {
              insertPerm.run(id, permId, now)
            }
          }
        }
      })

      transaction()

      return successResponse(res, null, '更新成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '更新失败', 1001, 400)
    }
  },

  async deleteRole(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { id } = req.params

      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Role | undefined
      if (!role) {
        return errorResponse(
          res,
          '角色不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      if (role.is_system) {
        return errorResponse(
          res,
          '系统角色不可删除',
          AUTH_ERRORS.FORBIDDEN.code,
          AUTH_ERRORS.FORBIDDEN.httpStatus
        )
      }

      db.prepare('DELETE FROM roles WHERE id = ?').run(id)

      return successResponse(res, null, '删除成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '删除失败', 1001, 400)
    }
  },

  async getPermissions(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { module } = req.query
      const moduleStr = String(module || '')

      let sql = 'SELECT * FROM permissions'
      const params: (string | number)[] = []

      if (moduleStr) {
        sql += ' WHERE module = ?'
        params.push(moduleStr)
      }
      sql += ' ORDER BY module, code'

      const data = db.prepare(sql).all(...params) as Permission[]

      const grouped: Record<string, Permission[]> = {}
      for (const perm of data) {
        if (!grouped[perm.module]) {
          grouped[perm.module] = []
        }
        grouped[perm.module].push(perm)
      }

      return successResponse(res, { list: data, grouped }, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },

  async assignRoleToUser(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { userId, roleId } = req.body

      if (!userId || !roleId) {
        return errorResponse(
          res,
          '用户ID和角色ID不能为空',
          GENERAL_ERRORS.MISSING_PARAMETER.code,
          GENERAL_ERRORS.MISSING_PARAMETER.httpStatus
        )
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
      if (!user) {
        return errorResponse(
          res,
          '用户不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId) as Role | undefined
      if (!role) {
        return errorResponse(
          res,
          '角色不存在',
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.code,
          GENERAL_ERRORS.RESOURCE_NOT_FOUND.httpStatus
        )
      }

      const existing = db
        .prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?')
        .get(userId, roleId)
      if (existing) {
        return successResponse(res, null, '用户已拥有该角色')
      }

      const now = new Date().toISOString()
      db.prepare('INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, ?)').run(
        userId,
        roleId,
        now
      )

      return successResponse(res, null, '分配成功', 0, 201)
    } catch (error) {
      return errorResponse(res, (error as Error).message || '分配失败', 1001, 400)
    }
  },

  async removeRoleFromUser(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { userId, roleId } = req.params

      db.prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?').run(userId, roleId)

      return successResponse(res, null, '移除成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '移除失败', 1001, 400)
    }
  },

  async getUserRoles(req: Request, res: Response): Promise<Response> {
    try {
      const db = getDb()
      const { userId } = req.params

      const roles = db
        .prepare(
          `
        SELECT r.* FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ?
        ORDER BY r.created_at DESC
      `
        )
        .all(userId) as Role[]

      return successResponse(res, roles, '获取成功')
    } catch (error) {
      return errorResponse(res, (error as Error).message || '获取失败', 1001, 400)
    }
  },
}

export default rbacController
