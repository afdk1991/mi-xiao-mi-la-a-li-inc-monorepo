import { http } from './request'

export interface Category {
  id: string
  name: string
  parentId?: string
  icon?: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
  children?: Category[]
}

export const categoryApi = {
  getCategories(): Promise<Category[]> {
    return http.get('/admin/categories')
  },
}