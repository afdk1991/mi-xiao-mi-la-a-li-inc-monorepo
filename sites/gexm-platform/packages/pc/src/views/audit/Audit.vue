<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { auditApi, type AuditLog } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElInput, ElSelect, ElDrawer, ElDatePicker } from 'element-plus'

const logs = ref<AuditLog[]>([])
const searchKeyword = ref('')
const actionFilter = ref('')
const resourceTypeFilter = ref('')
const startDate = ref('')
const endDate = ref('')
const drawerVisible = ref(false)
const selectedLog = ref<AuditLog | null>(null)

const actionOptions = [
  { value: '', label: '全部' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'update_status', label: '状态更新' },
  { value: 'batch_delete', label: '批量删除' },
]

const resourceTypeOptions = [
  { value: '', label: '全部' },
  { value: 'product', label: '商品' },
  { value: 'order', label: '订单' },
  { value: 'review', label: '评论' },
  { value: 'role', label: '角色' },
  { value: 'user', label: '用户' },
]

async function fetchLogs() {
  try {
    const query: { page: number; pageSize: number; action?: string; resourceType?: string; startDate?: string; endDate?: string } = { page: 1, pageSize: 100 }
    if (actionFilter.value) query.action = actionFilter.value
    if (resourceTypeFilter.value) query.resourceType = resourceTypeFilter.value
    if (startDate.value) query.startDate = startDate.value
    if (endDate.value) query.endDate = endDate.value
    const result = await auditApi.getLogs(query)
    logs.value = result.list || []
  } catch (e) {
    console.error('Failed to fetch audit logs:', e)
  }
}

function handleSearch() {
  fetchLogs()
}

function openDetail(log: AuditLog) {
  selectedLog.value = log
  drawerVisible.value = true
}

function formatAction(action: string) {
  const actionMap: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    update_status: '状态更新',
    batch_delete: '批量删除',
    reply: '回复',
    ship: '发货',
    refund_audit: '退款审核',
  }
  return actionMap[action] || action
}

function formatResourceType(type: string) {
  const typeMap: Record<string, string> = {
    product: '商品',
    order: '订单',
    review: '评论',
    role: '角色',
    user: '用户',
  }
  return typeMap[type] || type
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="gexm-page">
    <div class="page-header">
      <h2>审计日志</h2>
      <div class="header-actions">
        <ElInput v-model="searchKeyword" placeholder="搜索管理员ID" style="width: 180px" @keyup.enter="handleSearch" />
        <ElSelect v-model="actionFilter" placeholder="操作类型" style="width: 130px; margin-left: 10px">
          <ElSelect.Option v-for="opt in actionOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
        </ElSelect>
        <ElSelect v-model="resourceTypeFilter" placeholder="资源类型" style="width: 130px; margin-left: 10px">
          <ElSelect.Option v-for="opt in resourceTypeOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
        </ElSelect>
        <ElDatePicker v-model="startDate" type="date" placeholder="开始日期" style="width: 150px; margin-left: 10px" />
        <ElDatePicker v-model="endDate" type="date" placeholder="结束日期" style="width: 150px; margin-left: 10px" />
        <ElButton type="primary" style="margin-left: 10px" @click="handleSearch">搜索</ElButton>
      </div>
    </div>

    <ElTable :data="logs" border style="width: 100%">
      <ElTableColumn prop="id" label="ID" width="120" />
      <ElTableColumn prop="adminId" label="管理员ID" width="120" />
      <ElTableColumn prop="adminName" label="管理员" width="120" />
      <ElTableColumn prop="action" label="操作" width="120">
        <template #default="scope">{{ formatAction(scope.row.action) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="resourceType" label="资源类型" width="120">
        <template #default="scope">{{ formatResourceType(scope.row.resourceType) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="resourceId" label="资源ID" width="120" />
      <ElTableColumn prop="resourceName" label="资源名称" width="150" />
      <ElTableColumn prop="ip" label="IP地址" width="150" />
      <ElTableColumn prop="createdAt" label="操作时间" width="180" />
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="scope">
          <ElButton size="small" @click="openDetail(scope.row)">详情</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDrawer title="日志详情" v-model="drawerVisible" size="600px">
      <div v-if="selectedLog" class="log-detail">
        <div class="detail-row">
          <span class="label">日志ID:</span>
          <span>{{ selectedLog.id }}</span>
        </div>
        <div class="detail-row">
          <span class="label">管理员ID:</span>
          <span>{{ selectedLog.adminId }}</span>
        </div>
        <div class="detail-row">
          <span class="label">管理员:</span>
          <span>{{ selectedLog.adminName || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">操作:</span>
          <span>{{ formatAction(selectedLog.action) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">资源类型:</span>
          <span>{{ formatResourceType(selectedLog.resourceType) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">资源ID:</span>
          <span>{{ selectedLog.resourceId || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">资源名称:</span>
          <span>{{ selectedLog.resourceName || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">IP地址:</span>
          <span>{{ selectedLog.ip || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">User Agent:</span>
          <span>{{ selectedLog.userAgent || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">操作时间:</span>
          <span>{{ selectedLog.createdAt }}</span>
        </div>
        <div v-if="selectedLog.beforeData" class="detail-section">
          <h4>操作前数据</h4>
          <pre>{{ JSON.stringify(JSON.parse(selectedLog.beforeData), null, 2) }}</pre>
        </div>
        <div v-if="selectedLog.afterData" class="detail-section">
          <h4>操作后数据</h4>
          <pre>{{ JSON.stringify(JSON.parse(selectedLog.afterData), null, 2) }}</pre>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<style scoped>
.log-detail {
  padding: 10px;
}

.detail-row {
  display: flex;
  margin-bottom: 12px;
}

.label {
  width: 100px;
  font-weight: bold;
  color: #666;
}

.detail-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.detail-section h4 {
  margin-bottom: 10px;
  color: #333;
}

.detail-section pre {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  color: #666;
}
</style>