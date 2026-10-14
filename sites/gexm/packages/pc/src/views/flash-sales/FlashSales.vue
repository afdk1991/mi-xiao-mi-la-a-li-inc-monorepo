<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { flashSaleApi, type FlashSale, type FlashSaleItem, type CreateFlashSaleRequest, type CreateFlashSaleItemRequest } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElInput, ElDrawer, ElForm, ElFormItem, ElMessage, ElDatePicker, ElTabs, ElTabPane } from 'element-plus'

const sales = ref<FlashSale[]>([])
const searchKeyword = ref('')
const drawerVisible = ref(false)
const drawerTitle = ref('新增秒杀活动')
const editingSale = reactive<Partial<FlashSale>>({})

const itemsDrawerVisible = ref(false)
const itemsDrawerTitle = ref('秒杀商品列表')
const currentSaleId = ref('')
const saleItems = ref<FlashSaleItem[]>([])

const editingItem = reactive<Partial<CreateFlashSaleItemRequest>>({})
const itemDrawerVisible = ref(false)
const itemDrawerTitle = ref('添加秒杀商品')

const columns = [
  { prop: 'id', label: 'ID', width: 100 },
  { prop: 'name', label: '活动名称', minWidth: 200 },
  { prop: 'description', label: '描述', minWidth: 200 },
  { prop: 'startTime', label: '开始时间', width: 180 },
  { prop: 'endTime', label: '结束时间', width: 180 },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'updatedAt', label: '更新时间', width: 180 },
  { prop: 'actions', label: '操作', width: 200 },
]

const itemColumns = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'productName', label: '商品名称', minWidth: 150 },
  { prop: 'flashPrice', label: '秒杀价', width: 100 },
  { prop: 'originalPrice', label: '原价', width: 100 },
  { prop: 'stock', label: '库存', width: 80 },
  { prop: 'soldCount', label: '已售', width: 80 },
  { prop: 'limitPerUser', label: '限购', width: 80 },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'actions', label: '操作', width: 100 },
]

async function fetchSales() {
  try {
    const result = await flashSaleApi.getFlashSales({ page: 1, pageSize: 100 })
    sales.value = result.list
  } catch (e) {
    console.error('Failed to fetch flash sales:', e)
  }
}

function handleSearch() {
  fetchSales()
}

function openAddDrawer() {
  drawerTitle.value = '新增秒杀活动'
  Object.assign(editingSale, {
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    status: 'pending',
  })
  drawerVisible.value = true
}

function openEditDrawer(sale: FlashSale) {
  drawerTitle.value = '编辑秒杀活动'
  Object.assign(editingSale, sale)
  drawerVisible.value = true
}

async function handleSave() {
  try {
    const data: CreateFlashSaleRequest = {
      name: editingSale.name as string,
      description: editingSale.description as string,
      startTime: editingSale.startTime as string,
      endTime: editingSale.endTime as string,
      status: editingSale.status as string,
    }

    if (editingSale.id) {
      await flashSaleApi.updateFlashSale(editingSale.id, data)
      ElMessage.success('秒杀活动更新成功')
    } else {
      await flashSaleApi.createFlashSale(data)
      ElMessage.success('秒杀活动创建成功')
    }
    drawerVisible.value = false
    fetchSales()
  } catch (e) {
    const msg = (e as { message?: string })?.message || '操作失败'
    ElMessage.error(msg)
  }
}

async function handleDelete(id: string) {
  try {
    await flashSaleApi.deleteFlashSale(id)
    ElMessage.success('秒杀活动删除成功')
    fetchSales()
  } catch (e) {
    const msg = (e as { message?: string })?.message || '删除失败'
    ElMessage.error(msg)
  }
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '待开始',
    active: '进行中',
    ended: '已结束',
    upcoming: '即将开始',
  }
  return map[status] || status
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    pending: 'status-pending',
    active: 'status-active',
    ended: 'status-ended',
    upcoming: 'status-upcoming',
  }
  return map[status] || 'status-default'
}

async function openItemsDrawer(id: string, name: string) {
  currentSaleId.value = id
  itemsDrawerTitle.value = `${name} - 秒杀商品列表`
  itemsDrawerVisible.value = true
  await fetchSaleItems(id)
}

async function fetchSaleItems(id: string) {
  try {
    const result = await flashSaleApi.getFlashSaleDetail(id)
    saleItems.value = result.items || []
  } catch (e) {
    console.error('Failed to fetch sale items:', e)
    saleItems.value = []
  }
}

function openAddItemDrawer() {
  itemDrawerTitle.value = '添加秒杀商品'
  Object.assign(editingItem, {
    productId: '',
    skuId: '',
    salePrice: 0,
    originalPrice: 0,
    stock: 0,
    limitPerUser: 1,
  })
  itemDrawerVisible.value = true
}

async function handleSaveItem() {
  try {
    await flashSaleApi.addSaleItem(currentSaleId.value, editingItem as CreateFlashSaleItemRequest)
    ElMessage.success('秒杀商品添加成功')
    itemDrawerVisible.value = false
    await fetchSaleItems(currentSaleId.value)
  } catch (e) {
    const msg = (e as { message?: string })?.message || '操作失败'
    ElMessage.error(msg)
  }
}

async function handleRemoveItem(itemId: string) {
  try {
    await flashSaleApi.removeSaleItem(currentSaleId.value, itemId)
    ElMessage.success('秒杀商品删除成功')
    await fetchSaleItems(currentSaleId.value)
  } catch (e) {
    const msg = (e as { message?: string })?.message || '删除失败'
    ElMessage.error(msg)
  }
}

onMounted(() => {
  fetchSales()
})
</script>

<template>
  <div class="flash-sales-page">
    <div class="page-header">
      <div class="search-bar">
        <ElInput
          v-model="searchKeyword"
          placeholder="搜索活动名称"
          prefix-icon="Search"
          @keyup.enter="handleSearch"
          clearable
        />
        <ElButton type="primary" @click="handleSearch">搜索</ElButton>
      </div>
      <ElButton type="primary" @click="openAddDrawer">新增活动</ElButton>
    </div>

    <ElTable :data="sales" border stripe class="sales-table">
      <ElTableColumn v-for="col in columns" :key="col.prop" :prop="col.prop" :label="col.label" :width="col.width">
        <template #default="{ row }">
          <template v-if="col.prop === 'startTime'">{{ new Date(row.startTime).toLocaleString() }}</template>
          <template v-else-if="col.prop === 'endTime'">{{ new Date(row.endTime).toLocaleString() }}</template>
          <template v-else-if="col.prop === 'status'">
            <span :class="`status-tag ${getStatusClass(row.status)}`">{{ getStatusText(row.status) }}</span>
          </template>
          <template v-else-if="col.prop === 'updatedAt'">{{ new Date(row.updatedAt).toLocaleString() }}</template>
          <template v-else-if="col.prop === 'actions'">
            <ElButton size="small" @click="openItemsDrawer(row.id, row.name)">商品</ElButton>
            <ElButton size="small" @click="openEditDrawer(row)">编辑</ElButton>
            <ElButton size="small" type="danger" @click="handleDelete(row.id)">删除</ElButton>
          </template>
          <template v-else>{{ row[col.prop] }}</template>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDrawer :title="drawerTitle" v-model="drawerVisible" size="600px" @close="drawerVisible = false">
      <ElForm :model="editingSale" label-width="100px">
        <ElFormItem label="活动名称">
          <ElInput v-model="editingSale.name" />
        </ElFormItem>
        <ElFormItem label="活动描述">
          <ElInput v-model="editingSale.description" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="开始时间">
          <ElDatePicker v-model="editingSale.startTime" type="datetime" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="结束时间">
          <ElDatePicker v-model="editingSale.endTime" type="datetime" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="状态">
          <select v-model="editingSale.status" class="status-select">
            <option value="pending">待开始</option>
            <option value="active">进行中</option>
            <option value="ended">已结束</option>
          </select>
        </ElFormItem>
        <div class="drawer-actions">
          <ElButton @click="drawerVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSave">保存</ElButton>
        </div>
      </ElForm>
    </ElDrawer>

    <ElDrawer :title="itemsDrawerTitle" v-model="itemsDrawerVisible" size="800px" @close="itemsDrawerVisible = false">
      <div class="items-header">
        <ElButton type="primary" @click="openAddItemDrawer">添加商品</ElButton>
      </div>
      <ElTable :data="saleItems" border stripe class="items-table" style="margin-top: 16px">
        <ElTableColumn v-for="col in itemColumns" :key="col.prop" :prop="col.prop" :label="col.label" :width="col.width">
          <template #default="{ row }">
            <template v-if="col.prop === 'flashPrice'">¥{{ row.flashPrice }}</template>
            <template v-else-if="col.prop === 'originalPrice'">¥{{ row.originalPrice }}</template>
            <template v-else-if="col.prop === 'status'">
              <span :class="`status-tag ${row.status === 'active' ? 'status-active' : 'status-inactive'}`">
                {{ row.status === 'active' ? '上架' : '下架' }}
              </span>
            </template>
            <template v-else-if="col.prop === 'actions'">
              <ElButton size="small" type="danger" @click="handleRemoveItem(row.id)">删除</ElButton>
            </template>
            <template v-else>{{ row[col.prop] }}</template>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDrawer>

    <ElDrawer :title="itemDrawerTitle" v-model="itemDrawerVisible" size="500px" @close="itemDrawerVisible = false">
      <ElForm :model="editingItem" label-width="100px">
        <ElFormItem label="商品ID">
          <ElInput v-model="editingItem.productId" />
        </ElFormItem>
        <ElFormItem label="SKU ID">
          <ElInput v-model="editingItem.skuId" />
        </ElFormItem>
        <ElFormItem label="秒杀价格">
          <ElInput v-model.number="editingItem.salePrice" type="number" />
        </ElFormItem>
        <ElFormItem label="原价">
          <ElInput v-model.number="editingItem.originalPrice" type="number" />
        </ElFormItem>
        <ElFormItem label="库存数量">
          <ElInput v-model.number="editingItem.stock" type="number" />
        </ElFormItem>
        <ElFormItem label="限购数量">
          <ElInput v-model.number="editingItem.limitPerUser" type="number" />
        </ElFormItem>
        <div class="drawer-actions">
          <ElButton @click="itemDrawerVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSaveItem">保存</ElButton>
        </div>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<style lang="scss" scoped>
.flash-sales-page {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.search-bar {
  display: flex;
  gap: 12px;
}

.search-bar :deep(.el-input) {
  width: 300px;
}

.sales-table,
.items-table {
  width: 100%;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.status-active {
  background: #f6ffed;
  color: #67c23a;
}

.status-pending {
  background: #fffbe6;
  color: #e6a23c;
}

.status-upcoming {
  background: #ecf5ff;
  color: #409eff;
}

.status-ended {
  background: #f5f5f5;
  color: #909399;
}

.status-default {
  background: #f5f5f5;
  color: #909399;
}

.status-inactive {
  background: #fef0f0;
  color: #f56c6c;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.items-header {
  display: flex;
  justify-content: flex-end;
}

.status-select {
  width: 100%;
  height: 36px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 14px;
}
</style>
