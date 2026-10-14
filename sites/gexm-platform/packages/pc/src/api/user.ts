import { http } from './request'

export interface User {
  id: string
  username: string
  nickname: string
  email: string
  phone?: string
  avatar?: string
  role: string
  status: string
  balance?: number
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface UserQuery {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  role?: string
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  nickname?: string
  phone?: string
}

export interface UpdateUserRequest {
  nickname?: string
  email?: string
  phone?: string
  status?: string
}

export const userApi = {
  getUsers(query?: UserQuery): Promise<{ list: User[]; total: number }> {
    return http.get('/users', query)
  },

  getUserDetail(id: string): Promise<User> {
    return http.get(`/users/${id}`)
  },

  createUser(data: CreateUserRequest): Promise<User> {
    return http.post('/users', data)
  },

  updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    return http.put(`/users/${id}`, data)
  },

  deleteUser(id: string): Promise<void> {
    return http.delete(`/users/${id}`)
  },
}