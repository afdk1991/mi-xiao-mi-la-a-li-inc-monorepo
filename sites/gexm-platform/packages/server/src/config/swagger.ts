import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gexm API',
      version: '1.0.0',
      description: 'Gexm 电商系统 API 接口文档',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // 收货地址
        Address: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '地址 ID' },
            user_id: { type: 'string' },
            name: { type: 'string', description: '收货人姓名' },
            phone: { type: 'string', description: '联系电话' },
            province: { type: 'string', description: '省' },
            city: { type: 'string', description: '市' },
            district: { type: 'string', description: '区/县' },
            detail: { type: 'string', description: '详细地址' },
            is_default: { type: 'integer', description: '是否默认(0/1)' },
            tag: { type: 'string', description: '标签（家/公司/学校等）' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        AddressInput: {
          type: 'object',
          required: ['name', 'phone', 'province', 'city', 'district', 'detail'],
          properties: {
            name: { type: 'string', description: '收货人姓名' },
            phone: { type: 'string', description: '联系电话' },
            province: { type: 'string', description: '省' },
            city: { type: 'string', description: '市' },
            district: { type: 'string', description: '区/县' },
            detail: { type: 'string', description: '详细地址' },
            isDefault: { type: 'boolean', description: '是否设为默认' },
            tag: { type: 'string', description: '标签' },
          },
        },
        // 优惠券
        Coupon: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '优惠券 ID' },
            name: { type: 'string', description: '优惠券名称' },
            type: { type: 'string', enum: ['fixed', 'percent'], description: '类型(固定金额/百分比)' },
            value: { type: 'number', description: '优惠值(金额或百分比)' },
            min_amount: { type: 'number', description: '最低消费金额' },
            max_discount: { type: 'number', nullable: true, description: '最大抵扣金额' },
            total_quantity: { type: 'integer', description: '总发放量' },
            per_user_limit: { type: 'integer', description: '每人限领数' },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'inactive'], description: '状态' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        UserCoupon: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '用户优惠券记录 ID' },
            user_id: { type: 'string' },
            coupon_id: { type: 'string' },
            status: { type: 'string', enum: ['unused', 'used', 'expired'], description: '使用状态' },
            order_id: { type: 'string', nullable: true, description: '关联订单 ID' },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' },
            used_time: { type: 'string', format: 'date-time', nullable: true },
            coupon: { $ref: '#/components/schemas/Coupon' },
          },
        },
        CouponInput: {
          type: 'object',
          required: ['name', 'type', 'value'],
          properties: {
            name: { type: 'string', description: '优惠券名称' },
            type: { type: 'string', enum: ['fixed', 'percent'], description: '类型' },
            value: { type: 'number', description: '优惠值(金额或百分比)' },
            min_amount: { type: 'number', default: 0, description: '最低消费金额' },
            max_discount: { type: 'number', nullable: true, description: '最大抵扣金额' },
            total_quantity: { type: 'integer', default: 0, description: '总发放量' },
            per_user_limit: { type: 'integer', default: 1, description: '每人限领数' },
            start_time: { type: 'string', format: 'date-time', description: '开始时间' },
            end_time: { type: 'string', format: 'date-time', description: '结束时间' },
            status: { type: 'string', enum: ['active', 'inactive'], default: 'active' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Auth', description: '认证接口' },
      { name: 'Products', description: '商品接口' },
      { name: 'Orders', description: '订单接口' },
      { name: 'Payment', description: '支付接口' },
      { name: 'Cart', description: '购物车接口' },
      { name: 'Users', description: '用户接口' },
      { name: 'Coupons', description: '优惠券接口' },
      { name: 'Categories', description: '分类接口' },
      { name: 'Addresses', description: '收货地址接口' },
      { name: 'Reviews', description: '评价接口' },
      { name: 'Members', description: '会员接口' },
      { name: 'FlashSales', description: '秒杀活动接口' },
      { name: 'Admin', description: '管理后台接口' },
      { name: 'Queue', description: '消息队列管理接口' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
}

const swaggerSpec = swaggerJsdoc(options)

export default swaggerSpec
