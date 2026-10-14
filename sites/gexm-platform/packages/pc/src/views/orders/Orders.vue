<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { orderApi, type Order, type OrderStatus } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElSelect, ElDrawer, ElMessage } from 'element-plus'

const orders = ref<Order[]>([])
const statusFilter = ref<OrderStatus | ''>('')
const drawerVisible = ref(false)
const selectedOrder = ref<Order | null>(null)

const statusOptions: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'pending_shipment', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

async function fetchOrders() {
  try {
    const query: { page: number; pageSize: number; status?: OrderStatus } = { page: 1, pageSize: 100 }
    if (statusFilter.value) {
      query.status = statusFilter.value
    }
    const result = await orderApi.getOrders(query)
    orders.value = result.list
  } catch (e) {
    console.error('Failed to fetch orders:', e)
  }
}

function handleStatusChange() {
  fetchOrders()
}

function openDetail(order: Order) {
  selectedOrder.value = order
  drawerVisible.value = true
}

async function handleShip(order: Order) {
  try {
    await orderApi.shipOrder(order.id, { trackingNo: 'SF1234567890', shippingMethod: '顺丰速运' })
    ElMessage.success('发货成功')
    fetchOrders()
    if (selectedOrder.value?.id === order.id) {
      selectedOrder.value = await orderApi.getOrderDetail(order.id)
    }
  } catch (e) {
    const msg = (e as { message?: string })?.message || '发货失败'
    ElMessage.error(msg)
  }
}

async function handleComplete(order: Order) {
  try {
    await orderApi.completeOrder(order.id)
    ElMessage.success('订单已完成')
    fetchOrders()
    if (selectedOrder.value?.id === order.id) {
      selectedOrder.value = await orderApi.getOrderDetail(order.id)
    }
  } catch (e) {
    const msg = (e as { message?: string })?.message || '操作失败'
    ElMessage.error(msg)
  }
}

function getStatusText(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending_payment: '待付款',
    pending_shipment: '待发货',
    shipped: '已发货',
    completed: '已完成',
    refund: '退款中',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getStatusClass(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending_payment: 'status-pending',
    pending_shipment: 'status-warning',
    shipped: 'status-info',
    completed: 'status-success',
    refund: 'status-danger',
    cancelled: 'status-disabled',
  }
  return map[status] || 'status-default'
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="orders-page">
    <div class="page-header">
      <ElSelect v-model="statusFilter" placeholder="筛选状态" @change="handleStatusChange">
        <ElOption v-for="option in statusOptions" :key="option.value" :value="option.value" :label="option.label" />
      </ElSelect>
    </div>

    <ElTable :data="orders" border stripe class="orders-table">
      <ElTableColumn prop="orderNo" label="订单号" minWidth="200" />
      <ElTableColumn prop="totalAmount" label="订单金额" width="120">
        <template #default="{ row }">¥{{ row.totalAmount }}</template>
      </ElTableColumn>
      <ElTableColumn prop="payAmount" label="实付金额" width="120">
        <template #default="{ row }">¥{{ row.payAmount }}</template>
      </ElTableColumn>
      <ElTableColumn prop="status" label="状态" width="100">
        <template #default="{ row }">
          <span :class="`status-tag ${getStatusClass(row.status)}`">{{ getStatusText(row.status) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </ElTableColumn>
      <ElTableColumn prop="actions" label="操作" width="200">
        <template #default="{ row }">
          <ElButton size="small" @click="openDetail(row)">查看详情</ElButton>
          <template v-if="row.status === 'pending_shipment'">
            <ElButton size="small" type="primary" @click="handleShip(row)">发货</ElButton>
          </template>
          <template v-if="row.status === 'shipped'">
            <ElButton size="small" type="success" @click="handleComplete(row)">确认收货</ElButton>
          </template>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDrawer title="订单详情" v-model="drawerVisible" size="700px" @close="drawerVisible = false">
      <div v-if="selectedOrder" class="order-detail">
        <div class="detail-section">
          <h3>订单信息</h3>
          <div class="detail-row">
            <span class="detail-label">订单号</span>
            <span class="detail-value">{{ selectedOrder.orderNo }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">状态</span>
            <span :class="`status-tag ${getStatusClass(selectedOrder.status)}`">{{ getStatusText(selectedOrder.status) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">创建时间</span>
            <span class="detail-value">{{ new Date(selectedOrder.createdAt).toLocaleString() }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>收货地址</h3>
          <div class="address-info">
            <div>{{ selectedOrder.address.name }} {{ selectedOrder.address.phone }}</div>
            <div>{{ selectedOrder.address.province }}{{ selectedOrder.address.city }}{{ selectedOrder.address.district }}{{ selectedOrder.address.detail }}</div>
          </div>
        </div>

        <div class="detail-section">
          <h3>商品清单</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>单价</th>
                <th>数量</th>
                <th>小计</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedOrder.items" :key="item.id">
                <td>
                  <div class="product-cell">
                    <img :src="item.productImage" :alt="item.productName" class="product-thumb" />
                    <span>{{ item.productName }}</span>
                  </div>
                </td>
                <td>¥{{ item.price }}</td>
                <td>{{ item.quantity }}</td>
                <td>¥{{ item.totalPrice }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="detail-section">
          <h3>金额明细</h3>
          <div class="detail-row">
            <span class="detail-label">商品总额</span>
            <span class="detail-value">¥{{ selectedOrder.totalAmount }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">优惠金额</span>
            <span class="detail-value">-¥{{ selectedOrder.discountAmount }}</span>
          </div>
          <div class="detail-row total">
            <span class="detail-label">实付金额</span>
            <span class="detail-value">¥{{ selectedOrder.payAmount }}</span>
          </div>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<style lang="scss" scoped>
.orders-page {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.orders-table {
  width: 100%;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.status-pending { background: #fff1f0; color: #f56c6c; }
.status-warning { background: #fff7e6; color: #e6a23c; }
.status-info { background: #e6f7ff; color: #409eff; }
.status-success { background: #f6ffed; color: #67c23a; }
.status-danger { background: #fef0f0; color: #f56c6c; }
.status-disabled { background: #f5f5f5; color: #909399; }
.status-default { background: #f0f0f0; color: #606266; }

.order-detail {
  padding: 12px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.detail-row.total {
  font-weight: 600;
  font-size: 16px;
}

.detail-label {
  color: #909399;
}

.detail-value {
  color: #303133;
}

.address-info {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.items-table th {
  background: #f5f7fa;
  color: #909399;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
}
</style>
