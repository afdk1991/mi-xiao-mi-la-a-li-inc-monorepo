export const postgresSchema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  nickname TEXT,
  avatar TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  role TEXT DEFAULT 'user',
  balance NUMERIC DEFAULT 0,
  email_hash TEXT,
  email_verified INTEGER DEFAULT 0,
  phone_verified INTEGER DEFAULT 0,
  is_new_user INTEGER DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  provider_email TEXT,
  avatar TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider_user ON oauth_accounts(provider, provider_user_id);

CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY,
  state TEXT UNIQUE NOT NULL,
  redirect_uri TEXT,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  read INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending',
  timestamp BIGINT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_records_user_id ON sync_records(user_id);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  platform TEXT,
  app_version TEXT,
  error_type TEXT,
  error_message TEXT,
  stack_trace TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  participant_id TEXT,
  type TEXT DEFAULT 'private',
  title TEXT,
  status TEXT DEFAULT 'active',
  last_message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_creator ON conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant ON conversations(participant_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_type TEXT DEFAULT 'global',
  target_id TEXT,
  content TEXT NOT NULL,
  parent_id TEXT,
  status TEXT DEFAULT 'active',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

CREATE TABLE IF NOT EXISTS conversation_reads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  last_read_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  UNIQUE(user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_reads_user ON conversation_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_reads_conversation ON conversation_reads(conversation_id);

CREATE TABLE IF NOT EXISTS sensitive_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data_type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, data_type)
);

CREATE INDEX IF NOT EXISTS idx_sensitive_data_user ON sensitive_data(user_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_data_hash ON sensitive_data(hash);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  level INTEGER DEFAULT 1,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT,
  category_id TEXT,
  main_image TEXT,
  images TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  stock INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'on_sale',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_status_category_sort ON products(status, category_id, sort_order);

CREATE TABLE IF NOT EXISTS product_skus (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku_name TEXT NOT NULL,
  specs TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  stock INTEGER DEFAULT 0,
  sku_image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_skus_product ON product_skus(product_id);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku_id TEXT,
  quantity INTEGER DEFAULT 1,
  selected INTEGER DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_product ON carts(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_carts_created_at ON carts(created_at);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  detail TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  tag TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  coupon_id TEXT,
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  freight NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  pay_amount NUMERIC NOT NULL DEFAULT 0,
  pay_method TEXT,
  pay_time TIMESTAMP,
  shipping_address TEXT,
  shipping_company TEXT,
  shipping_no TEXT,
  shipped_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  refund_reason TEXT,
  refund_amount NUMERIC DEFAULT 0,
  refund_remark TEXT,
  refunded_at TIMESTAMP,
  remark TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

CREATE TABLE IF NOT EXISTS logistics (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  company TEXT,
  tracking_no TEXT,
  status TEXT,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logistics_order ON logistics(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_created_at ON logistics(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku_id TEXT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  sku_name TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE TABLE IF NOT EXISTS order_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  action TEXT NOT NULL,
  operator_id TEXT,
  operator_type TEXT DEFAULT 'system',
  detail TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_action ON order_logs(action);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  payment_no TEXT UNIQUE,
  pay_method TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  third_party_no TEXT,
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP,
  failure_reason TEXT,
  closed_at TIMESTAMP,
  callback_data TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku_id TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  content TEXT NOT NULL,
  images TEXT,
  seller_reply TEXT,
  reply_time TIMESTAMP,
  status TEXT DEFAULT 'active',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status_created ON reviews(product_id, status, created_at);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product ON favorites(product_id);

CREATE TABLE IF NOT EXISTS stock_logs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku_id TEXT,
  change_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  before_stock INTEGER NOT NULL DEFAULT 0,
  after_stock INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  operator_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL,
  FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_sku ON stock_logs(sku_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at ON stock_logs(created_at);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  keyword TEXT NOT NULL,
  search_count INTEGER DEFAULT 1,
  last_searched_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_keyword ON search_history(keyword);
CREATE INDEX IF NOT EXISTS idx_search_history_count ON search_history(search_count DESC);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'fixed',
  value NUMERIC NOT NULL DEFAULT 0,
  min_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  total_quantity INTEGER DEFAULT 0,
  used_quantity INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_time ON coupons(start_time, end_time);

CREATE TABLE IF NOT EXISTS user_coupons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  coupon_id TEXT NOT NULL,
  order_id TEXT,
  status TEXT DEFAULT 'unused',
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon ON user_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_status ON user_coupons(status);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_status ON user_coupons(user_id, status);

CREATE TABLE IF NOT EXISTS member_levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_points INTEGER DEFAULT 0,
  discount_rate NUMERIC DEFAULT 1,
  benefits TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_member_levels_sort ON member_levels(sort_order);

CREATE TABLE IF NOT EXISTS user_points (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  balance INTEGER DEFAULT 0,
  level_id TEXT,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES member_levels(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_level ON user_points(level_id);

CREATE TABLE IF NOT EXISTS point_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  order_id TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_point_logs_type ON point_logs(type);
CREATE INDEX IF NOT EXISTS idx_point_logs_created ON point_logs(created_at);

CREATE TABLE IF NOT EXISTS shipping_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'fixed',
  base_fee NUMERIC DEFAULT 0,
  base_weight NUMERIC DEFAULT 0,
  extra_fee NUMERIC DEFAULT 0,
  extra_weight NUMERIC DEFAULT 0,
  free_threshold NUMERIC DEFAULT 0,
  regions TEXT,
  estimated_days TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipping_templates_type ON shipping_templates(type);

CREATE TABLE IF NOT EXISTS flash_sales (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flash_sales_status ON flash_sales(status);
CREATE INDEX IF NOT EXISTS idx_flash_sales_time ON flash_sales(start_time, end_time);

CREATE TABLE IF NOT EXISTS flash_sale_items (
  id TEXT PRIMARY KEY,
  flash_sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku_id TEXT,
  flash_price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  limit_per_user INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flash_sale_items_sale ON flash_sale_items(flash_sale_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_items_product ON flash_sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_items_status ON flash_sale_items(status);
CREATE INDEX IF NOT EXISTS idx_flash_sale_items_sale_status ON flash_sale_items(flash_sale_id, status);

CREATE TABLE IF NOT EXISTS flash_sale_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  flash_sale_id TEXT NOT NULL,
  flash_sale_item_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku_id TEXT,
  quantity INTEGER DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (flash_sale_item_id) REFERENCES flash_sale_items(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (sku_id) REFERENCES product_skus(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_user ON flash_sale_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_sale ON flash_sale_orders(flash_sale_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_item ON flash_sale_orders(flash_sale_item_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_orders_status ON flash_sale_orders(status);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  checkin_date TEXT NOT NULL,
  streak_days INTEGER DEFAULT 1,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checkin_date);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  receiver_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  status TEXT DEFAULT 'unread',
  reply_to_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_to_id) REFERENCES inbox_messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_receiver ON inbox_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_status ON inbox_messages(status);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_type ON inbox_messages(type);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_created ON inbox_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_receiver_status_created ON inbox_messages(receiver_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_name TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  before_data TEXT,
  after_data TEXT,
  ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

CREATE TABLE IF NOT EXISTS sensitive_verify_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used INTEGER DEFAULT 0,
  used_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sensitive_tokens_user ON sensitive_verify_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_tokens_token ON sensitive_verify_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sensitive_tokens_expires ON sensitive_verify_tokens(expires_at);

CREATE TABLE IF NOT EXISTS reconciliation_records (
  id TEXT PRIMARY KEY,
  recon_date TEXT NOT NULL,
  order_count INTEGER DEFAULT 0,
  payment_count INTEGER DEFAULT 0,
  order_total_amount NUMERIC DEFAULT 0,
  payment_total_amount NUMERIC DEFAULT 0,
  diff_amount NUMERIC DEFAULT 0,
  diff_count INTEGER DEFAULT 0,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recon_date)
);

CREATE INDEX IF NOT EXISTS idx_recon_date ON reconciliation_records(recon_date);

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_attempt TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);

CREATE TABLE IF NOT EXISTS verify_codes (
  id TEXT PRIMARY KEY,
  phone TEXT,
  email TEXT,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verify_codes_phone ON verify_codes(phone);
CREATE INDEX IF NOT EXISTS idx_verify_codes_email ON verify_codes(email);
CREATE INDEX IF NOT EXISTS idx_verify_codes_expires ON verify_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verify_codes_type ON verify_codes(type);
`

export const postgresDefaultData = `
INSERT INTO member_levels (id, name, min_points, discount_rate, benefits, sort_order, created_at) VALUES
('L001', '普通会员', 0, 1.0, '[]', 1, NOW()),
('L002', '白银会员', 1000, 0.98, '["生日礼包"]', 2, NOW()),
('L003', '黄金会员', 5000, 0.95, '["生日礼包","专属客服","优先发货"]', 3, NOW()),
('L004', '钻石会员', 20000, 0.90, '["生日礼包","专属客服","优先发货","免费包邮"]', 4, NOW())
ON CONFLICT DO NOTHING;
`
