<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { orderApi, productApi } from '@/api'
import { ElCard, ElRow, ElCol, ElStatistic } from 'element-plus'

const statistics = ref({
  totalOrders: 0,
  totalAmount: 0,
  pendingCount: 0,
  paidCount: 0,
  shippedCount: 0,
  completedCount: 0,
})

const recentOrders = ref<any[]>([])
const topProducts = ref<any[]>([])

let orderChart: echarts.ECharts | null = null
let salesChart: echarts.ECharts | null = null

async function fetchStatistics() {
  try {
    const stats = await orderApi.getStatistics()
    statistics.value = stats
  } catch (e) {
    console.error('Failed to fetch statistics:', e)
  }
}

async function fetchRecentOrders() {
  try {
    const result = await orderApi.getOrders({ page: 1, pageSize: 5 })
    recentOrders.value = result?.list || []
  } catch (e) {
    console.error('Failed to fetch recent orders:', e)
    recentOrders.value = []
  }
}

async function fetchTopProducts() {
  try {
    const products = await productApi.getHotProducts()
    topProducts.value = products.slice(0, 5)
  } catch (e) {
    console.error('Failed to fetch top products:', e)
  }
}

function initCharts() {
  const orderChartDom = document.getElementById('orderChart')
  if (orderChartDom) {
    orderChart = echarts.init(orderChartDom)
    orderChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['订单数', '销售额'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '订单数',
          type: 'line',
          data: [120, 132, 101, 134, 190, 230, 220],
          smooth: true,
          areaStyle: {
            opacity: 0.1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#fff' },
            ]),
          },
        },
        {
          name: '销售额',
          type: 'line',
          data: [220, 182, 191, 234, 290, 330, 310],
          smooth: true,
          areaStyle: {
            opacity: 0.1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#764ba2' },
              { offset: 1, color: '#fff' },
            ]),
          },
        },
      ],
    })
  }

  const salesChartDom = document.getElementById('salesChart')
  if (salesChartDom) {
    salesChart = echarts.init(salesChartDom)
    salesChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [
        {
          name: '订单状态',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 18, fontWeight: 'bold' },
          },
          labelLine: { show: false },
          data: [
            { value: statistics.value.completedCount, name: '已完成', itemStyle: { color: '#67c23a' } },
            { value: statistics.value.shippedCount, name: '已发货', itemStyle: { color: '#409eff' } },
            { value: statistics.value.paidCount, name: '待发货', itemStyle: { color: '#e6a23c' } },
            { value: statistics.value.pendingCount, name: '待付款', itemStyle: { color: '#f56c6c' } },
          ],
        },
      ],
    })
  }
}

function handleResize() {
  orderChart?.resize()
  salesChart?.resize()
}

onMounted(() => {
  fetchStatistics()
  fetchRecentOrders()
  fetchTopProducts()
  initCharts()
  window.addEventListener('resize', handleResize)
})
</script>

<template>
  <div class="dashboard">
    <ElRow :gutter="20">
      <ElCol :span="6">
        <ElCard class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-blue">📋</span>
            <span class="stat-label">总订单</span>
          </div>
          <ElStatistic :value="statistics.totalOrders" suffix="单" />
          <div class="stat-change positive">+12.5%</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-green">💰</span>
            <span class="stat-label">总销售额</span>
          </div>
          <ElStatistic :value="statistics.totalAmount" prefix="¥" />
          <div class="stat-change positive">+8.3%</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-orange">⏳</span>
            <span class="stat-label">待发货</span>
          </div>
          <ElStatistic :value="statistics.paidCount" suffix="单" />
          <div class="stat-change warning">+3</div>
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard class="stat-card">
          <div class="stat-header">
            <span class="stat-icon bg-red">💵</span>
            <span class="stat-label">待付款</span>
          </div>
          <ElStatistic :value="statistics.pendingCount" suffix="单" />
          <div class="stat-change negative">-5</div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20" style="margin-top: 20px;">
      <ElCol :span="16">
        <ElCard title="订单趋势" class="chart-card">
          <div id="orderChart" style="height: 350px;"></div>
        </ElCard>
      </ElCol>
      <ElCol :span="8">
        <ElCard title="订单状态分布" class="chart-card">
          <div id="salesChart" style="height: 350px;"></div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="20" style="margin-top: 20px;">
      <ElCol :span="12">
        <ElCard title="最近订单">
          <table class="data-table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>金额</th>
                <th>状态</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id">
                <td>{{ order.orderNo }}</td>
                <td>¥{{ order.payAmount }}</td>
                <td>
                  <span :class="`status-tag status-${order.status}`">
                    {{ order.status === 'pending_payment' ? '待付款' : order.status === 'pending_shipment' ? '待发货' : order.status === 'shipped' ? '已发货' : '已完成' }}
                  </span>
                </td>
                <td>{{ new Date(order.createdAt).toLocaleDateString() }}</td>
              </tr>
              <tr v-if="recentOrders.length === 0">
                <td colspan="4" class="empty">暂无订单</td>
              </tr>
            </tbody>
          </table>
        </ElCard>
      </ElCol>
      <ElCol :span="12">
        <ElCard title="热销商品">
          <table class="data-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>销量</th>
                <th>价格</th>
                <th>库存</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in topProducts" :key="product.id">
                <td>
                  <div class="product-cell">
                    <img :src="product.image" :alt="product.name" class="product-thumb" />
                    <span>{{ product.name }}</span>
                  </div>
                </td>
                <td>{{ product.sales }}</td>
                <td>¥{{ product.price }}</td>
                <td>{{ product.stock }}</td>
              </tr>
              <tr v-if="topProducts.length === 0">
                <td colspan="4" class="empty">暂无商品</td>
              </tr>
            </tbody>
          </table>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style lang="scss" scoped>
.stat-card {
  height: 100%;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.stat-icon.bg-blue { background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%); }
.stat-icon.bg-green { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); }
.stat-icon.bg-orange { background: linear-gradient(135deg, #fff7e6 0%, #ffe58f 100%); }
.stat-icon.bg-red { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); }

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-change {
  font-size: 12px;
  margin-top: 8px;
}

.stat-change.positive { color: #67c23a; }
.stat-change.negative { color: #f56c6c; }
.stat-change.warning { color: #e6a23c; }

.chart-card {
  height: 100%;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 0;
  text-align: left;
  font-size: 14px;
}

.data-table th {
  color: #909399;
  font-weight: 500;
}

.data-table td {
  color: #303133;
}

.data-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
}

.data-table tbody tr:last-child {
  border-bottom: none;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.status-pending_payment { background: #fff1f0; color: #f56c6c; }
.status-pending_shipment { background: #fff7e6; color: #e6a23c; }
.status-shipped { background: #e6f7ff; color: #409eff; }
.status-completed { background: #f6ffed; color: #67c23a; }

.empty {
  text-align: center;
  color: #909399;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}
</style>
