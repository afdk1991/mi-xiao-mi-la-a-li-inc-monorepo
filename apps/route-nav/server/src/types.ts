// route-nav 服务端共享类型（与 client/utils/types.ts 的 ApiResponse 约定对齐）

export interface User {
  id: number
  username: string
  email: string
}

export interface AddressItem {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  city?: string
  isStart: boolean
  isEnd: boolean
  orderIndex: number
  createdAt?: string
}

export interface RouteItem {
  id: number
  name: string
  optimizationMode: 'shortest' | 'balanced' | 'regional'
  totalDistance: number
  addressIds: number[]
  orderedAddresses: AddressItem[]
  createdAt: string
}

export interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
  city: string
}

export interface AttractionItem {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  city: string
  category: string
  region: string
}

export type OptimizationMode = 'shortest' | 'balanced' | 'regional'
