import { initDatabase, getDb, closeDb } from '../../models'

describe('Database initialization with PostgreSQL', () => {
  let originalDbType: string | undefined

  beforeAll(() => {
    originalDbType = process.env.DB_TYPE
    process.env.DB_TYPE = 'postgres'
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5433'
    process.env.DB_NAME = 'gexm_test'
    process.env.DB_USER = 'gexm'
    process.env.DB_PASSWORD = 'gexm_test_password'
  })

  afterAll(() => {
    closeDb()
    if (originalDbType !== undefined) {
      process.env.DB_TYPE = originalDbType
    } else {
      delete process.env.DB_TYPE
    }
  })

  it('should initialize without throwing', () => {
    expect(() => initDatabase()).not.toThrow()
  })

  it('should return a client with type=postgres', () => {
    const db = getDb()
    const info = db.getConnectionInfo()
    expect(info.type).toBe('postgres')
  })

  it('should create users table', () => {
    const db = getDb()
    const result = db.prepare(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'"
    ).get()
    expect(result).toBeDefined()
    expect(result.table_name).toBe('users')
  })

  it('should create products table', () => {
    const db = getDb()
    const result = db.prepare(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public'"
    ).get()
    expect(result).toBeDefined()
    expect(result.table_name).toBe('products')
  })

  it('should create orders table', () => {
    const db = getDb()
    const result = db.prepare(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public'"
    ).get()
    expect(result).toBeDefined()
    expect(result.table_name).toBe('orders')
  })

  it('should insert default admin user', () => {
    const db = getDb()
    const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get()
    expect(admin).toBeDefined()
    expect(admin.username).toBe('admin')
  })

  it('should insert default categories', () => {
    const db = getDb()
    const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get()
    expect(categories.count).toBeGreaterThanOrEqual(8)
  })

  it('should insert default products', () => {
    const db = getDb()
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get()
    expect(products.count).toBeGreaterThanOrEqual(8)
  })

  it('should create RBAC tables and default roles', () => {
    const db = getDb()
    const roles = db.prepare('SELECT COUNT(*) as count FROM roles').get()
    expect(roles.count).toBeGreaterThanOrEqual(4)
  })

  it('should pass healthCheck', () => {
    const db = getDb()
    expect(db.healthCheck()).toBe(true)
  })
})