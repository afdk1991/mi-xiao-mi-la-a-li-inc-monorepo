<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { productApi, type Product } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElInput, ElDrawer, ElForm, ElFormItem, ElMessage } from 'element-plus'

const products = ref<Product[]>([])
const searchKeyword = ref('')
const drawerVisible = ref(false)
const drawerTitle = ref('新增商品')
const editingProduct = reactive<Partial<Product>>({})

const columns = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '商品名称', minWidth: 200 },
  { prop: 'category', label: '分类', width: 120 },
  { prop: 'price', label: '价格', width: 100 },
  { prop: 'stock', label: '库存', width: 80 },
  { prop: 'sales', label: '销量', width: 80 },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'updatedAt', label: '更新时间', width: 180 },
  { prop: 'actions', label: '操作', width: 160 },
]

async function fetchProducts() {
  try {
    const result = await productApi.getProducts({ page: 1, pageSize: 100 })
    products.value = result.list
  } catch (e) {
    console.error('Failed to fetch products:', e)
  }
}

function handleSearch() {
  fetchProducts()
}

function openAddDrawer() {
  drawerTitle.value = '新增商品'
  Object.assign(editingProduct, {
    name: '',
    description: '',
    category: '',
    price: 0,
    stock: 0,
    status: 'active',
  })
  drawerVisible.value = true
}

function openEditDrawer(product: Product) {
  drawerTitle.value = '编辑商品'
  Object.assign(editingProduct, product)
  drawerVisible.value = true
}

async function handleSave() {
  try {
    if (editingProduct.id) {
      await productApi.updateProduct(editingProduct.id, editingProduct as Product)
      ElMessage.success('商品更新成功')
    } else {
      await productApi.createProduct(editingProduct as Product)
      ElMessage.success('商品创建成功')
    }
    drawerVisible.value = false
    fetchProducts()
  } catch (e) {
    const msg = (e as { message?: string })?.message || '操作失败'
    ElMessage.error(msg)
  }
}

async function handleDelete(id: string) {
  try {
    await productApi.deleteProduct(id)
    ElMessage.success('商品删除成功')
    fetchProducts()
  } catch (e) {
    const msg = (e as { message?: string })?.message || '删除失败'
    ElMessage.error(msg)
  }
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    active: '上架',
    inactive: '下架',
  }
  return map[status] || status
}

function getStatusClass(status: string) {
  return status === 'active' ? 'status-active' : 'status-inactive'
}

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <div class="products-page">
    <div class="page-header">
      <div class="search-bar">
        <ElInput
          v-model="searchKeyword"
          placeholder="搜索商品名称"
          prefix-icon="Search"
          @keyup.enter="handleSearch"
          clearable
        />
        <ElButton type="primary" @click="handleSearch">搜索</ElButton>
      </div>
      <ElButton type="primary" @click="openAddDrawer">新增商品</ElButton>
    </div>

    <ElTable :data="products" border stripe class="products-table">
      <ElTableColumn v-for="col in columns" :key="col.prop" :prop="col.prop" :label="col.label" :width="col.width">
        <template #default="{ row }">
          <template v-if="col.prop === 'price'">¥{{ row.price }}</template>
          <template v-else-if="col.prop === 'status'">
            <span :class="`status-tag ${getStatusClass(row.status)}`">{{ getStatusText(row.status) }}</span>
          </template>
          <template v-else-if="col.prop === 'updatedAt'">{{ new Date(row.updatedAt).toLocaleString() }}</template>
          <template v-else-if="col.prop === 'actions'">
            <ElButton size="small" @click="openEditDrawer(row)">编辑</ElButton>
            <ElButton size="small" type="danger" @click="handleDelete(row.id)">删除</ElButton>
          </template>
          <template v-else>{{ row[col.prop] }}</template>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDrawer :title="drawerTitle" v-model="drawerVisible" size="500px" @close="drawerVisible = false">
      <ElForm :model="editingProduct" label-width="80px">
        <ElFormItem label="商品名称">
          <ElInput v-model="editingProduct.name" />
        </ElFormItem>
        <ElFormItem label="商品描述">
          <ElInput v-model="editingProduct.description" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="分类">
          <ElInput v-model="editingProduct.category" />
        </ElFormItem>
        <ElFormItem label="价格">
          <ElInput v-model.number="editingProduct.price" type="number" />
        </ElFormItem>
        <ElFormItem label="库存">
          <ElInput v-model.number="editingProduct.stock" type="number" />
        </ElFormItem>
        <ElFormItem label="状态">
          <select v-model="editingProduct.status" class="status-select">
            <option value="active">上架</option>
            <option value="inactive">下架</option>
          </select>
        </ElFormItem>
        <div class="drawer-actions">
          <ElButton @click="drawerVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSave">保存</ElButton>
        </div>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<style lang="scss" scoped>
.products-page {
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

.products-table {
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

.status-inactive {
  background: #f5f5f5;
  color: #909399;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
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
