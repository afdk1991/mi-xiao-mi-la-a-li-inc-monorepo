/**
 * Product 数据模型
 * 
 * 注意：此文件为 ArkTS 代码示例，需将其内容复制到 DevEco Studio 生成的 Stage 工程中使用
 */

export interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  image: string
  images?: string[]
  categoryId: number
  categoryName?: string
  description?: string
  sales: number
  stock: number
  rating?: number
  reviewCount?: number
  tags?: string[]
  sku?: SKU[]
  createdAt?: string
  updatedAt?: string
}

export interface SKU {
  id: number
  name: string
  options: SKUOption[]
}

export interface SKUOption {
  id: number
  name: string
  value: string
  image?: string
}

export interface Category {
  id: number
  name: string
  icon?: string
  parentId?: number
  children?: Category[]
}

export interface CartItem {
  id: number
  productId: number
  productName: string
  productImage: string
  price: number
  quantity: number
  skuId?: number
  skuName?: string
  selected: boolean
}

export interface User {
  id: number
  username: string
  avatar?: string
  phone?: string
  email?: string
  nickname?: string
  gender?: 'male' | 'female' | 'other'
  birthday?: string
  level?: number
  points?: number
  createdAt?: string
}

export interface Address {
  id: number
  userId: number
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
}

export interface Order {
  id: number
  orderNo: string
  userId: number
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  address?: Address
  payType?: 'wxpay' | 'alipay'
  payTime?: string
  createdAt?: string
  updatedAt?: string
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'

export interface OrderItem {
  id: number
  productId: number
  productName: string
  productImage: string
  price: number
  quantity: number
  skuName?: string
}

export interface Coupon {
  id: number
  name: string
  discountType: 'fixed' | 'percent'
  discountValue: number
  minAmount?: number
  expireAt?: string
  stock: number
  usedCount?: number
}

export interface Notification {
  id: number
  userId: number
  type: 'order' | 'coupon' | 'system' | 'activity'
  title: string
  content: string
  read: boolean
  createdAt?: string
}