import { http } from './request'

export interface Role {
  id: string
  name: string
  description: string
  isSystem: number
  createdAt: string
  updatedAt: string
  permissions?: Permission[]
}

export interface Permission {
  id: string
  name: string
  code: string
  module: string
  description: string
}

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions?: string[]
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {}

export const roleApi = {
  getRoles(query?: { page?: number; pageSize?: number }): Promise<{ list: Role[]; total: number }> {
    return http.get('/admin/roles', query)
  },

  getRoleDetail(id: string): Promise<Role> {
    return http.get(`/admin/roles/${id}`)
  },

  createRole(data: CreateRoleRequest): Promise<Role> {
    return http.post('/admin/roles', data)
  },

  updateRole(id: string, data: UpdateRoleRequest): Promise<void> {
    return http.put(`/admin/roles/${id}`, data)
  },

  deleteRole(id: string): Promise<void> {
    return http.delete(`/admin/roles/${id}`)
  },

  getUserRoles(userId: string): Promise<Role[]> {
    return http.get(`/admin/users/${userId}/roles`)
  },

  assignRoleToUser(data: { userId: string; roleId: string }): Promise<void> {
    return http.post('/admin/users/roles', data)
  },

  removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    return http.delete(`/admin/users/${userId}/roles/${roleId}`)
  },
}