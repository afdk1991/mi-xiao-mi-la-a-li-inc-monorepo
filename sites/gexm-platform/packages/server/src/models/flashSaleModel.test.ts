import flashSaleModel from './flashSaleModel'
import { getDb } from './index'
import productModel from './productModel'
import userModel from './userModel'

describe('FlashSale Model', () => {
  let db: ReturnType<typeof getDb>

  beforeEach(() => {
    db = getDb()
    db.prepare('DELETE FROM flash_sale_orders').run()
    db.prepare('DELETE FROM flash_sale_items').run()
    db.prepare('DELETE FROM flash_sales').run()
    db.prepare('DELETE FROM products').run()
    db.prepare("DELETE FROM users WHERE username LIKE 'flashsale_%'").run()
  })

  afterEach(() => {
    db.prepare('DELETE FROM flash_sale_orders').run()
    db.prepare('DELETE FROM flash_sale_items').run()
    db.prepare('DELETE FROM flash_sales').run()
    db.prepare('DELETE FROM products').run()
    db.prepare("DELETE FROM users WHERE username LIKE 'flashsale_%'").run()
  })

  describe('create', () => {
    it('should create a flash sale successfully', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Test Flash Sale',
        description: 'Test description',
        start_time: new Date(now + 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'pending',
      })

      expect(sale).not.toBeNull()
      expect(sale.name).toBe('Test Flash Sale')
      expect(sale.description).toBe('Test description')
      expect(sale.status).toBe('pending')
    })

    it('should create a flash sale with default status', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Default Status Sale',
        start_time: new Date(now + 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
      })

      expect(sale.status).toBe('pending')
    })
  })

  describe('findById', () => {
    it('should find flash sale by id', () => {
      const now = Date.now()
      const created = flashSaleModel.create({
        name: 'Find Test Sale',
        start_time: new Date(now + 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
      })

      const found = flashSaleModel.findById(created.id)
      expect(found).not.toBeNull()
      expect(found?.name).toBe('Find Test Sale')
    })

    it('should return null for non-existent id', () => {
      const found = flashSaleModel.findById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update flash sale successfully', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Original Name',
        start_time: new Date(now + 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
      })

      const updated = flashSaleModel.update(sale.id, {
        name: 'Updated Name',
        status: 'active',
      })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.status).toBe('active')
    })
  })

  describe('delete', () => {
    it('should delete flash sale successfully', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'To Delete',
        start_time: new Date(now + 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
      })

      const result = flashSaleModel.delete(sale.id)
      expect(result).toBe(true)

      const found = flashSaleModel.findById(sale.id)
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return paginated flash sales', () => {
      const now = Date.now()
      for (let i = 0; i < 5; i++) {
        flashSaleModel.create({
          name: `Sale ${i}`,
          start_time: new Date(now + i * 1000).toISOString(),
          end_time: new Date(now + 3600000 + i * 1000).toISOString(),
        })
      }

      const result = flashSaleModel.findAll({ page: 1, pageSize: 3 })
      expect(result.sales.length).toBe(3)
      expect(result.total).toBe(5)
    })

    it('should filter by status', () => {
      const now = Date.now()
      flashSaleModel.create({
        name: 'Active Sale',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })
      flashSaleModel.create({
        name: 'Pending Sale',
        start_time: new Date(now + 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'pending',
      })

      const result = flashSaleModel.findAll({ status: 'active' })
      expect(result.sales.length).toBe(1)
      expect(result.sales[0].name).toBe('Active Sale')
    })
  })

  describe('getActiveSales', () => {
    it('should return only active sales', () => {
      const now = Date.now()
      flashSaleModel.create({
        name: 'Active Sale',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })
      flashSaleModel.create({
        name: 'Pending Sale',
        start_time: new Date(now + 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'pending',
      })

      const activeSales = flashSaleModel.getActiveSales()
      expect(activeSales.length).toBe(1)
      expect(activeSales[0].name).toBe('Active Sale')
    })
  })

  describe('createSaleItem', () => {
    it('should create a flash sale item', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Item Test Sale',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      const item = flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        original_price: 100,
        stock: 50,
        limit_per_user: 2,
      })

      expect(item).not.toBeNull()
      expect(item.flash_sale_id).toBe(sale.id)
      expect(item.flash_price).toBe(50)
      expect(item.stock).toBe(50)
      expect(item.limit_per_user).toBe(2)
    })
  })

  describe('getSaleItems', () => {
    it('should return items for a flash sale', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Items Test Sale',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        stock: 50,
      })

      const items = flashSaleModel.getSaleItems(sale.id)
      expect(items.length).toBe(1)
      expect(items[0].flash_price).toBe(50)
    })
  })

  describe('findItemById', () => {
    it('should find item by id', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Item Find Test',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      const createdItem = flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        stock: 50,
      })

      const found = flashSaleModel.findItemById(createdItem.id)
      expect(found).not.toBeNull()
      expect(found?.flash_price).toBe(50)
    })
  })

  describe('buyFlashSale', () => {
    it('should buy flash sale item successfully', async () => {
      const now = Date.now()
      const user = await userModel.create({
        username: 'flashsale_test_user',
        password: 'Test@1234',
        email: 'flashsale@test.com',
      })

      const sale = flashSaleModel.create({
        name: 'Buy Test Sale',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      const item = flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        original_price: 100,
        stock: 50,
        limit_per_user: 2,
      })

      const result = flashSaleModel.buyFlashSale(user.id, sale.id, item.id, 1)

      expect(result).not.toBeNull()
      expect(result.user_id).toBe(user.id)
      expect(result.quantity).toBe(1)
      expect(result.status).toBe('pending')

      const updatedItem = flashSaleModel.findItemById(item.id)
      expect(updatedItem?.stock).toBe(49)
      expect(updatedItem?.sold_count).toBe(1)
    })

    it('should throw error when stock is insufficient', async () => {
      const now = Date.now()
      const user = await userModel.create({
        username: 'flashsale_stock_user',
        password: 'Test@1234',
        email: 'flashsale_stock@test.com',
      })

      const sale = flashSaleModel.create({
        name: 'Stock Test Sale',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      const item = flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        stock: 5,
        limit_per_user: 10,
      })

      expect(() => {
        flashSaleModel.buyFlashSale(user.id, sale.id, item.id, 10)
      }).toThrow('库存不足')
    })

    it('should throw error when exceeding purchase limit', async () => {
      const now = Date.now()
      const user = await userModel.create({
        username: 'flashsale_limit_user',
        password: 'Test@1234',
        email: 'flashsale_limit@test.com',
      })

      const sale = flashSaleModel.create({
        name: 'Limit Test Sale',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      const item = flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        stock: 50,
        limit_per_user: 2,
      })

      flashSaleModel.buyFlashSale(user.id, sale.id, item.id, 2)

      expect(() => {
        flashSaleModel.buyFlashSale(user.id, sale.id, item.id, 1)
      }).toThrow()
    })

    it('should throw error when sale is not active', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Inactive Sale',
        start_time: new Date(now + 10000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'pending',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      const item = flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        stock: 50,
      })

      expect(() => {
        flashSaleModel.buyFlashSale('user-123', sale.id, item.id, 1)
      }).toThrow()
    })
  })

  describe('deleteSaleItem', () => {
    it('should delete a flash sale item', () => {
      const now = Date.now()
      const sale = flashSaleModel.create({
        name: 'Delete Item Test',
        start_time: new Date(now - 1000).toISOString(),
        end_time: new Date(now + 3600000).toISOString(),
        status: 'active',
      })

      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 100,
      })

      const item = flashSaleModel.createSaleItem({
        flash_sale_id: sale.id,
        product_id: product!.id,
        flash_price: 50,
        stock: 50,
      })

      const result = flashSaleModel.deleteSaleItem(item.id)
      expect(result).toBe(true)

      const found = flashSaleModel.findItemById(item.id)
      expect(found).toBeNull()
    })
  })
})
