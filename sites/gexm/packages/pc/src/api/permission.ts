import { http } from './request'
import type { Permission } from './role'

export interface PermissionGroup {
  module: string
  permissions: Permission[]
}

export const permissionApi = {
  getPermissions(query?: { module?: string }): Promise<{ list: Permission[]; grouped: Record<string, Permission[]> }> {
    return http.get('/admin/permissions', query)
  },
}