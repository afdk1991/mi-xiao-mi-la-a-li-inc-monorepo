import { http } from './request'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice: number
  image: string
  images: string[]
  categoryId: string
  categoryName: string
  stock: number
  sales: number
  status: string
  isHot: boolean
  isNew: boolean
  skus: SKU[]
  createdAt: string
  updatedAt: string
}

export interface SKU {
  id: string
  productId: string
  name: string
  value: string
  price: number
  stock: number
  image?: string
}

export interface CreateProductRequest {
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  images?: string[]
  categoryId: string
  stock: number
  isHot?: boolean
  isNew?: boolean
  skus?: SKU[]
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  status?: string
}

export interface ProductQuery {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: string
  status?: string
  isHot?: boolean
  isNew?: boolean
  minPrice?: number
  maxPrice?: number
}

export const productApi = {
  getProducts(query?: ProductQuery): Promise<{ list: Product[]; total: number }> {
    return http.get('/products', query)
  },

  getProductDetail(id: string): Promise<Product> {
    return http.get(`/products/${id}`)
  },

  createProduct(data: CreateProductRequest): Promise<Product> {
    return http.post('/products', data)
  },

  updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    return http.put(`/products/${id}`, data)
  },

  deleteProduct(id: string): Promise<void> {
    return http.delete(`/products/${id}`)
  },

  getHotProducts(): Promise<Product[]> {
    return http.get('/products/hot')
  },

  getNewProducts(): Promise<Product[]> {
    return http.get('/products/new')
  },

  updateStock(id: string, data: { stock: number }): Promise<Product> {
    return http.put(`/products/${id}/stock`, data)
  },
}
