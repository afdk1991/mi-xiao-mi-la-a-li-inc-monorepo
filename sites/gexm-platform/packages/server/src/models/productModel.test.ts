import productModel from './productModel'
import categoryModel from './categoryModel'
import { getDb } from './index'

describe('Product Model', () => {
  let db: ReturnType<typeof getDb>

  beforeEach(() => {
    db = getDb()
    db.prepare('DELETE FROM stock_logs').run()
    db.prepare('DELETE FROM product_skus').run()
    db.prepare('DELETE FROM products').run()
    db.prepare('DELETE FROM categories').run()
  })

  afterEach(() => {
    db.prepare('DELETE FROM stock_logs').run()
    db.prepare('DELETE FROM product_skus').run()
    db.prepare('DELETE FROM products').run()
    db.prepare('DELETE FROM categories').run()
  })

  describe('create', () => {
    it('should create a product successfully', () => {
      const product = productModel.create({
        name: 'Test Product',
        price: 100,
        stock: 50,
      })

      expect(product).not.toBeNull()
      expect(product?.name).toBe('Test Product')
      expect(product?.price).toBe(100)
      expect(product?.stock).toBe(50)
      expect(product?.status).toBe('on_sale')
    })

    it('should create a product with images', () => {
      const product = productModel.create({
        name: 'Product with Images',
        price: 200,
        stock: 30,
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      })

      expect(product).not.toBeNull()
      expect(Array.isArray(product?.images)).toBe(true)
      expect(product?.images?.length).toBe(2)
    })

    it('should create a product with skus', () => {
      const product = productModel.create({
        name: 'Product with SKUs',
        price: 150,
        stock: 100,
        skus: [
          { sku_name: 'Color: Red', price: 150, stock: 50 },
          { sku_name: 'Color: Blue', price: 150, stock: 50 },
        ],
      })

      expect(product).not.toBeNull()
      const skus = productModel.findSkusByProductId(product!.id)
      expect(skus.length).toBe(2)
    })
  })

  describe('findById', () => {
    it('should find product by id', () => {
      const product = productModel.create({
        name: 'Find Test Product',
        price: 99,
        stock: 10,
      })

      const found = productModel.findById(product!.id)
      expect(found).not.toBeNull()
      expect(found?.name).toBe('Find Test Product')
    })

    it('should return null for non-existent product', () => {
      const found = productModel.findById('non_existent_id')
      expect(found).toBeNull()
    })

    it('should parse images from JSON string', () => {
      const product = productModel.create({
        name: 'Product with Parsed Images',
        price: 100,
        stock: 20,
        images: ['https://example.com/img.jpg'],
      })

      const found = productModel.findById(product!.id)
      expect(Array.isArray(found?.images)).toBe(true)
    })
  })

  describe('findAll', () => {
    it('should return all products with pagination', () => {
      for (let i = 0; i < 5; i++) {
        productModel.create({
          name: `Product ${i}`,
          price: 100 + i,
          stock: 10,
        })
      }

      const result = productModel.findAll({ page: 1, pageSize: 3 })
      expect(result.products.length).toBe(3)
      expect(result.total).toBeGreaterThanOrEqual(5)
    })

    it('should filter products by category', () => {
      const category1 = categoryModel.create({ name: 'Test Cat 1' })
      const category2 = categoryModel.create({ name: 'Test Cat 2' })

      const product1 = productModel.create({
        name: 'Category Product 1',
        price: 100,
        stock: 10,
        category_id: category1!.id,
      })
      productModel.create({
        name: 'Category Product 2',
        price: 200,
        stock: 20,
        category_id: category2!.id,
      })

      const result = productModel.findAll({ categoryId: category1!.id })
      expect(result.products.length).toBe(1)
      expect(result.products[0].id).toBe(product1?.id)
    })

    it('should search products by keyword', () => {
      const searchProduct = productModel.create({
        name: 'Search Test Product',
        subtitle: 'Search subtitle',
        price: 100,
        stock: 10,
      })
      productModel.create({
        name: 'Another Product',
        price: 200,
        stock: 20,
      })

      const result = productModel.findAll({ keyword: 'Search' })
      const foundSearchProduct = result.products.find((p) => p.id === searchProduct?.id)
      expect(foundSearchProduct).not.toBeUndefined()
      expect(foundSearchProduct?.name).toBe('Search Test Product')
    })

    it('should filter products by price range', () => {
      const p1 = productModel.create({ name: 'Low Price', price: 50, stock: 10 })
      const p2 = productModel.create({ name: 'Medium Price', price: 150, stock: 10 })
      const p3 = productModel.create({ name: 'High Price', price: 250, stock: 10 })

      const result = productModel.findAll({ minPrice: 100, maxPrice: 200 })
      const testProducts = result.products.filter(
        (p) => p.id === p1?.id || p.id === p2?.id || p.id === p3?.id
      )
      expect(testProducts.length).toBe(1)
      expect(testProducts[0].name).toBe('Medium Price')
    })

    it('should sort products by sales', () => {
      const product1 = productModel.create({ name: 'Low Sales', price: 100, stock: 10 })
      db.prepare('UPDATE products SET sales = 10 WHERE id = ?').run(product1!.id)

      const product2 = productModel.create({ name: 'High Sales', price: 200, stock: 20 })
      db.prepare('UPDATE products SET sales = 100 WHERE id = ?').run(product2!.id)

      const result = productModel.findAll({ sort: 'sales', pageSize: 100 })
      const testProducts = result.products.filter(
        (p) => p.id === product1?.id || p.id === product2?.id
      )
      expect(testProducts.length).toBe(2)
      expect(testProducts[0].sales).toBeGreaterThan(testProducts[1].sales)
    })

    it('should sort products by price ascending', () => {
      const product1 = productModel.create({ name: 'PriceSortAsc1', price: 300, stock: 10 })
      const product2 = productModel.create({ name: 'PriceSortAsc2', price: 100, stock: 10 })
      const product3 = productModel.create({ name: 'PriceSortAsc3', price: 200, stock: 10 })

      expect(product1).not.toBeNull()
      expect(product2).not.toBeNull()
      expect(product3).not.toBeNull()

      const result = productModel.findAll({ sort: 'price_asc', pageSize: 1000 })
      expect(result.total).toBe(3)

      expect(result.products[0].price).toBe(100)
      expect(result.products[1].price).toBe(200)
      expect(result.products[2].price).toBe(300)
    })

    it('should sort products by price descending', () => {
      const product1 = productModel.create({ name: 'PriceSortDesc1', price: 100, stock: 10 })
      const product2 = productModel.create({ name: 'PriceSortDesc2', price: 300, stock: 10 })
      const product3 = productModel.create({ name: 'PriceSortDesc3', price: 200, stock: 10 })

      expect(product1).not.toBeNull()
      expect(product2).not.toBeNull()
      expect(product3).not.toBeNull()

      const result = productModel.findAll({ sort: 'price_desc', pageSize: 1000 })
      expect(result.total).toBe(3)

      expect(result.products[0].price).toBe(300)
      expect(result.products[1].price).toBe(200)
      expect(result.products[2].price).toBe(100)
    })
  })

  describe('findByCategoryId', () => {
    it('should return products by category', () => {
      const category = categoryModel.create({ name: 'Test Category' })

      productModel.create({
        name: 'Cat Product 1',
        price: 100,
        stock: 10,
        category_id: category!.id,
      })

      const result = productModel.findByCategoryId(category!.id)
      expect(result.products.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('update', () => {
    it('should update product fields', () => {
      const product = productModel.create({
        name: 'Original Name',
        price: 100,
        stock: 10,
      })

      const updated = productModel.update(product!.id, {
        name: 'Updated Name',
        price: 200,
      })

      expect(updated?.name).toBe('Updated Name')
      expect(updated?.price).toBe(200)
    })

    it('should update product images', () => {
      const product = productModel.create({
        name: 'Product',
        price: 100,
        stock: 10,
      })

      const updated = productModel.update(product!.id, {
        images: ['https://example.com/new_img.jpg'],
      })

      expect(Array.isArray(updated?.images)).toBe(true)
      expect(updated?.images?.length).toBe(1)
    })

    it('should return null for non-existent product', () => {
      const updated = productModel.update('non_existent_id', { name: 'Test' })
      expect(updated).toBeNull()
    })
  })

  describe('updateStatus', () => {
    it('should update product status', () => {
      const product = productModel.create({
        name: 'Status Test',
        price: 100,
        stock: 10,
      })

      const updated = productModel.updateStatus(product!.id, 'off_sale')
      expect(updated?.status).toBe('off_sale')
    })
  })

  describe('delete', () => {
    it('should delete product', () => {
      const product = productModel.create({
        name: 'Delete Test',
        price: 100,
        stock: 10,
      })

      const result = productModel.delete(product!.id)
      expect(result).toBe(true)

      const found = productModel.findById(product!.id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent product', () => {
      const result = productModel.delete('non_existent_id')
      expect(result).toBe(false)
    })
  })

  describe('getDetail', () => {
    it('should return product with category name and skus', () => {
      const category = categoryModel.create({ name: 'Test Category' })

      const product = productModel.create({
        name: 'Detail Test',
        price: 100,
        stock: 10,
        category_id: category!.id,
        skus: [{ sku_name: 'Test SKU', price: 100, stock: 5 }],
      })

      const detail = productModel.getDetail(product!.id)
      expect(detail).not.toBeNull()
      expect(detail?.skus?.length).toBe(1)
      expect(detail?.skus?.[0]?.sku_name).toBe('Test SKU')
    })
  })

  describe('adjustStock', () => {
    it('should increase product stock', () => {
      const product = productModel.create({
        name: 'Stock Test',
        price: 100,
        stock: 10,
      })

      const result = productModel.adjustStock({
        productId: product!.id,
        quantity: 5,
        reason: 'Stock increase',
      })

      expect(result.beforeStock).toBe(10)
      expect(result.afterStock).toBe(15)

      const updatedProduct = productModel.findById(product!.id)
      expect(updatedProduct?.stock).toBe(15)
    })

    it('should decrease product stock', () => {
      const product = productModel.create({
        name: 'Stock Decrease',
        price: 100,
        stock: 10,
      })

      const result = productModel.adjustStock({
        productId: product!.id,
        quantity: -5,
        reason: 'Stock decrease',
      })

      expect(result.beforeStock).toBe(10)
      expect(result.afterStock).toBe(5)
    })

    it('should throw error when stock insufficient', () => {
      const product = productModel.create({
        name: 'Stock Error',
        price: 100,
        stock: 5,
      })

      expect(() => {
        productModel.adjustStock({
          productId: product!.id,
          quantity: -10,
        })
      }).toThrow('库存不足')
    })

    it('should adjust SKU stock', () => {
      const product = productModel.create({
        name: 'SKU Stock Test',
        price: 100,
        stock: 20,
        skus: [{ sku_name: 'Test SKU', price: 100, stock: 10 }],
      })

      const sku = productModel.findSkusByProductId(product!.id)[0]

      const result = productModel.adjustStock({
        productId: product!.id,
        skuId: sku.id,
        quantity: -3,
        reason: 'SKU stock decrease',
      })

      expect(result.beforeStock).toBe(10)
      expect(result.afterStock).toBe(7)
    })

    it('should throw error for non-existent SKU', () => {
      const product = productModel.create({
        name: 'SKU Error',
        price: 100,
        stock: 10,
      })

      expect(() => {
        productModel.adjustStock({
          productId: product!.id,
          skuId: 'non_existent_sku',
          quantity: -5,
        })
      }).toThrow('SKU不存在')
    })
  })

  describe('findLowStock', () => {
    it('should return products with low stock', () => {
      const lowStock = productModel.create({ name: 'Low Stock', price: 100, stock: 5 })
      productModel.create({ name: 'High Stock', price: 200, stock: 50 })

      const result = productModel.findLowStock(10)
      const testProducts = result.filter((p) => p.id === lowStock?.id)
      expect(testProducts.length).toBe(1)
      expect(testProducts[0].name).toBe('Low Stock')
    })
  })

  describe('getStockLogs', () => {
    it('should return stock logs for product', () => {
      const product = productModel.create({
        name: 'Log Test',
        price: 100,
        stock: 10,
      })

      productModel.adjustStock({
        productId: product!.id,
        quantity: 5,
        reason: 'Test log',
      })

      const result = productModel.getStockLogs(product!.id)
      expect(result.total).toBe(1)
      expect(result.logs[0].reason).toBe('Test log')
    })
  })

  describe('batchUpdateStatus', () => {
    it('should batch update product status', () => {
      const product1 = productModel.create({ name: 'Batch 1', price: 100, stock: 10 })
      const product2 = productModel.create({ name: 'Batch 2', price: 200, stock: 20 })

      const count = productModel.batchUpdateStatus([product1!.id, product2!.id], 'off_sale')
      expect(count).toBe(2)

      const updated1 = productModel.findById(product1!.id)
      const updated2 = productModel.findById(product2!.id)
      expect(updated1?.status).toBe('off_sale')
      expect(updated2?.status).toBe('off_sale')
    })
  })

  describe('batchDelete', () => {
    it('should batch delete products', () => {
      const product1 = productModel.create({ name: 'Batch Delete 1', price: 100, stock: 10 })
      const product2 = productModel.create({ name: 'Batch Delete 2', price: 200, stock: 20 })

      const count = productModel.batchDelete([product1!.id, product2!.id])
      expect(count).toBe(2)

      expect(productModel.findById(product1!.id)).toBeNull()
      expect(productModel.findById(product2!.id)).toBeNull()
    })
  })
})
