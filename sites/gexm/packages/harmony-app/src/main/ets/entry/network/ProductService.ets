/**
 * ProductService - 商品服务
 * 
 * 注意：此文件为 ArkTS 代码示例，需将其内容复制到 DevEco Studio 生成的 Stage 工程中使用
 * 
 * 功能：
 * 1. 获取推荐商品
 * 2. 获取商品详情
 * 3. 获取分类商品
 * 4. 搜索商品
 */

import { apiClient } from './ApiClient'
import { Product, Category } from '../models/Product'

class ProductService {
  async getRecommendProducts(): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/products/recommend')
    return response.data
  }

  async getProductById(id: number): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}`)
    return response.data
  }

  async getProductsByCategory(categoryId: number, page: number = 1, pageSize: number = 20): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/products', {
      categoryId,
      page,
      pageSize
    })
    return response.data
  }

  async searchProducts(keyword: string, page: number = 1, pageSize: number = 20): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/products/search', {
      keyword,
      page,
      pageSize
    })
    return response.data
  }

  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>('/categories')
    return response.data
  }

  async getCategoryById(id: number): Promise<Category> {
    const response = await apiClient.get<Category>(`/categories/${id}`)
    return response.data
  }
}

export const productService = new ProductService()