export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  phone?: string;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type UserStatus = 'active' | 'inactive' | 'banned';
export type UserRole = 'admin' | 'user' | 'guest';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatar?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
  requestId: string;
}

export interface AppConfig {
  appName: string;
  appVersion: string;
  apiBaseUrl: string;
  enableOffline: boolean;
  enablePush: boolean;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export type NotificationType = 'system' | 'message' | 'notice';

export interface UploadFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadAt: string;
}

export interface SyncRecord {
  id: string;
  tableName: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  syncStatus: 'pending' | 'success' | 'failed';
  timestamp: number;
  retryCount: number;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category_id: string;
  main_image: string;
  images: string;
  price: number;
  original_price: number;
  stock: number;
  description: string;
  status: ProductStatus;
  sort_order: number;
  skus: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductStatus = 'on_sale' | 'off_sale';

export interface ProductSku {
  id: string;
  product_id: string;
  name: string;
  spec: Record<string, string>;
  price: number;
  stock: number;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string;
  icon: string;
  sort_order: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export type CategoryStatus = 'active' | 'inactive';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  sku_id: string;
  quantity: number;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  order_no: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  freight: number;
  discount_amount: number;
  pay_amount: number;
  shipping_address: string;
  pay_method?: string;
  pay_time?: string;
  shipping_company?: string;
  shipping_no?: string;
  shipped_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku_id: string;
  product_name: string;
  product_image: string;
  sku_name: string;
  price: number;
  quantity: number;
  total_price: number;
  createdAt: string;
}

export interface Address {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  createdAt: string;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  score: number;
  content: string;
  images: string;
  status: ReviewStatus;
  createdAt: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  type: ConversationType;
  createdAt: string;
  updatedAt: string;
}

export type ConversationType = 'private' | 'group' | 'ai';

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'file' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  reply_to_id?: string;
  likes: number;
  status: CommentStatus;
  createdAt: string;
}

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface OrderStatistics {
  totalOrders: number;
  totalAmount: number;
  pendingCount: number;
  paidCount: number;
  shippedCount: number;
  completedCount: number;
  cancelledCount: number;
}