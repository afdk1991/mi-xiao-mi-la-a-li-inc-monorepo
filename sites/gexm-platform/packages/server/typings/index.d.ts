import type {
  User,
  UserStatus,
  UserRole,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  PaginatedResponse,
  ApiResponse,
  Notification,
  NotificationType,
  UploadFile,
  SyncRecord,
  Product,
  ProductStatus,
  ProductSku,
  Category,
  CategoryStatus,
  CartItem,
  Order,
  OrderStatus,
  OrderItem,
  Address,
  Favorite,
  Review,
  ReviewStatus,
  Conversation,
  ConversationType,
  Message,
  MessageType,
  MessageStatus,
  Comment,
  CommentStatus,
  OrderStatistics,
} from '@gexm/shared'

export {
  User,
  UserStatus,
  UserRole,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  PaginatedResponse,
  ApiResponse,
  Notification,
  NotificationType,
  UploadFile,
  SyncRecord,
  Product,
  ProductStatus,
  ProductSku,
  Category,
  CategoryStatus,
  CartItem,
  Order,
  OrderStatus,
  OrderItem,
  Address,
  Favorite,
  Review,
  ReviewStatus,
  Conversation,
  ConversationType,
  Message,
  MessageType,
  MessageStatus,
  Comment,
  CommentStatus,
  OrderStatistics,
}

export interface Coupon {
  id: string;
  name: string;
  type: 'fixed' | 'percent';
  value: number;
  min_amount: number;
  total_quantity: number;
  used_quantity: number;
  status: 'active' | 'inactive' | 'expired';
  start_time: number;
  end_time: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  status: 'unused' | 'used' | 'expired';
  order_id?: string;
  used_at?: string;
  createdAt: string;
}

export interface Logistics {
  id: string;
  order_id: string;
  company: string;
  tracking_no: string;
  status: string;
  timeline: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashSale {
  id: string;
  title: string;
  start_time: number;
  end_time: number;
  status: 'pending' | 'active' | 'ended';
  createdAt: string;
  updatedAt: string;
}

export interface FlashSaleItem {
  id: string;
  flash_sale_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  original_price: number;
  sale_price: number;
  quantity: number;
  sold_quantity: number;
  limit_per_user: number;
  createdAt: string;
}

export interface MemberLevel {
  id: string;
  name: string;
  min_points: number;
  discount_rate: number;
  benefits: string;
  sort_order: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface MemberRecord {
  id: string;
  user_id: string;
  type: 'earn' | 'spend';
  points: number;
  source: string;
  description: string;
  createdAt: string;
}

export interface CheckinRecord {
  id: string;
  user_id: string;
  date: string;
  points: number;
  streak: number;
  createdAt: string;
}

export interface InboxMessage {
  id: string;
  user_id: string;
  from_user_id?: string;
  title: string;
  content: string;
  type: 'system' | 'user' | 'order';
  status: 'unread' | 'read' | 'deleted';
  createdAt: string;
}

export interface ErrorLog {
  id: string;
  user_id?: string;
  error_type: string;
  error_message: string;
  stack_trace: string;
  request_url?: string;
  request_method?: string;
  request_body?: string;
  user_agent?: string;
  ip_address?: string;
  createdAt: string;
}

export interface ServerConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  secret: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    csrfSecret: string;
    encryptionKey: string;
  };
  database: {
    path: string;
  };
  redis?: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  logging: {
    level: string;
    file: string;
    maxSize: number;
    maxFiles: number;
    maxDays: number;
    compress: boolean;
    enableConsole: boolean;
    maskSensitiveData: boolean;
    maskPatterns: {
      phone: boolean;
      email: boolean;
      idCard: boolean;
      password: boolean;
      token: boolean;
      ip: boolean;
    };
  };
  security: {
    corsOrigins: string[];
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  upload: {
    maxSize: number;
    allowedTypes: string[];
    storagePath: string;
  };
  payment: {
    wechat?: {
      appId: string;
      mchId: string;
      apiKey: string;
      notifyUrl: string;
    };
    alipay?: {
      appId: string;
      privateKey: string;
      publicKey: string;
      notifyUrl: string;
    };
    signAlgorithm: string;
  };
  cache: {
    enabled: boolean;
    defaultTTL: number;
    redis?: {
      enabled: boolean;
      host: string;
      port: number;
      password?: string;
      db: number;
      connectTimeout: number;
      commandTimeout: number;
      maxRetriesPerRequest: number;
      retryDelayOnFailover: number;
    };
    strategies: Record<string, {
      ttl: number;
      staleWhileRevalidate?: number;
    }>;
  };
}

export interface CacheKey {
  prefix: string;
  type: string;
  params: Record<string, unknown>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  memoryHits: number;
  redisHits: number;
}

export interface ApmMetrics {
  uptime: number;
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<number, number>;
    byEndpoint: Record<string, number>;
  };
  latency: {
    average: number;
    max: number;
    min: number;
    byEndpoint: Record<string, {
      average: number;
      max: number;
      min: number;
      count: number;
    }>;
  };
  errors: {
    total: number;
    rate: number;
    byCode: Record<number, number>;
    byEndpoint: Record<string, number>;
    recent: Array<{
      timestamp: number;
      method: string;
      path: string;
      statusCode: number;
      latency: number;
      userAgent?: string;
    }>;
  };
  memory: {
    average: number;
    current: number;
    peak: number;
  };
  timestamp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      csrfToken?: () => string;
    }
  }
}