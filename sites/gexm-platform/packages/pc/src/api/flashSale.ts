import { http } from './request'

export interface FlashSale {
  id: string
  name: string
  description: string
  startTime: string
  endTime: string
  status: string
  currentStatus?: string
  remainingTime?: number
  createdAt: string
  updatedAt: string
}

export interface FlashSaleItem {
  id: string
  flashSaleId: string
  productId: string
  skuId?: string
  flashPrice: number
  originalPrice: number
  stock: number
  soldCount: number
  limitPerUser: number
  status: string
  productName?: string
  productImage?: string
  skuName?: string
  remainingStock?: number
  progress?: string
}

export interface FlashSaleOrder {
  id: string
  userId: string
  flashSaleId: string
  flashSaleItemId: string
  productId: string
  skuId?: string
  quantity: number
  price: number
  originalPrice: number
  status: string
  createdAt: string
}

export interface CreateFlashSaleRequest {
  name: string
  description?: string
  startTime: string
  endTime: string
  status?: string
}

export interface CreateFlashSaleItemRequest {
  productId: string
  skuId?: string
  salePrice: number
  originalPrice?: number
  stock: number
  limitPerUser?: number
}

export const flashSaleApi = {
  getFlashSales(query?: { page?: number; pageSize?: number; status?: string }): Promise<{
    list: FlashSale[]
    total: number
  }> {
    return http.get('/flash-sales', query)
  },

  getActiveSales(): Promise<FlashSale[]> {
    return http.get('/flash-sales/active')
  },

  getFlashSaleDetail(id: string): Promise<{ saleInfo: FlashSale; items: FlashSaleItem[] }> {
    return http.get(`/flash-sales/${id}/items`)
  },

  getFlashSaleStatus(id: string): Promise<{
    id: string
    name: string
    status: string
    startTime: string
    endTime: string
    remainingTime: number
  }> {
    return http.get(`/flash-sales/${id}/status`)
  },

  createFlashSale(data: CreateFlashSaleRequest): Promise<FlashSale> {
    return http.post('/flash-sales/admin', data)
  },

  updateFlashSale(id: string, data: Partial<CreateFlashSaleRequest>): Promise<FlashSale> {
    return http.put(`/flash-sales/admin/${id}`, data)
  },

  deleteFlashSale(id: string): Promise<void> {
    return http.delete(`/flash-sales/admin/${id}`)
  },

  addSaleItem(id: string, data: CreateFlashSaleItemRequest): Promise<FlashSaleItem> {
    return http.post(`/flash-sales/admin/${id}/items`, data)
  },

  removeSaleItem(id: string, itemId: string): Promise<void> {
    return http.delete(`/flash-sales/admin/${id}/items/${itemId}`)
  },

  getSaleOrders(id: string, query?: { page?: number; pageSize?: number; status?: string }): Promise<{
    list: FlashSaleOrder[]
    total: number
  }> {
    return http.get(`/flash-sales/admin/${id}/orders`, query)
  },
}
