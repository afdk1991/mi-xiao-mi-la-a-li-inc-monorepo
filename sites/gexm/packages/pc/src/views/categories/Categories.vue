<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { categoryApi, type Category } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElDrawer, ElForm, ElFormItem, ElMessage, ElTree } from 'element-plus'

const categories = ref<Category[]>([])
const drawerVisible = ref(false)
const drawerTitle = ref('新增分类')
const editingCategory = ref<Partial<Category>>({})

async function fetchCategories() {
  try {
    const result = await categoryApi.getCategories()
    categories.value = result || []
  } catch (e) {
    console.error('Failed to fetch categories:', e)
  }
}

function buildTree() {
  const map: Record<string, Category> = {}
  const roots: Category[] = []
  
  categories.value.forEach((cat) => {
    map[cat.id] = { ...cat, children: [] }
  })
  
  categories.value.forEach((cat) => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children?.push(map[cat.id])
    } else {
      roots.push(map[cat.id])
    }
  })
  
  return roots
}

function buildTreeData() {
  function convert(cat: Category) {
    return {
      id: cat.id,
      label: cat.name,
      status: cat.status,
      sortOrder: cat.sortOrder,
      children: cat.children?.map(convert),
    }
  }
  return buildTree().map(convert)
}

function openAddDrawer() {
  drawerTitle.value = '新增分类'
  editingCategory.value = {
    name: '',
    sortOrder: 0,
    status: 'active',
  }
  drawerVisible.value = true
}

function openEditDrawer(category: Category) {
  drawerTitle.value = '编辑分类'
  editingCategory.value = { ...category }
  drawerVisible.value = true
}

async function handleSave() {
  try {
    if (!editingCategory.value.name) {
      ElMessage.warning('分类名称不能为空')
      return
    }
    ElMessage.success(editingCategory.value.id ? '更新成功' : '创建成功')
    drawerVisible.value = false
    fetchCategories()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

function formatStatus(status: string) {
  const statusMap: Record<string, string> = {
    active: '启用',
    inactive: '禁用',
  }
  return statusMap[status] || status
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="gexm-page">
    <div class="page-header">
      <h2>分类管理</h2>
      <div class="header-actions">
        <ElButton type="primary" @click="openAddDrawer">新增分类</ElButton>
      </div>
    </div>

    <div class="category-container">
      <div class="tree-section">
        <h3>分类树</h3>
        <ElTree
          :data="buildTreeData()"
          node-key="id"
          :props="{ label: 'label', children: 'children' }"
          default-expand-all
          @node-click="openEditDrawer"
        />
      </div>

      <div class="table-section">
        <h3>分类列表</h3>
        <ElTable :data="categories" border style="width: 100%">
          <ElTableColumn prop="id" label="ID" width="80" />
          <ElTableColumn prop="name" label="分类名称" width="150" />
          <ElTableColumn prop="parentId" label="父级ID" width="100" />
          <ElTableColumn prop="sortOrder" label="排序" width="80" />
          <ElTableColumn prop="status" label="状态" width="100">
            <template #default="scope">{{ formatStatus(scope.row.status) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="createdAt" label="创建时间" width="180" />
          <ElTableColumn label="操作" width="160" fixed="right">
            <template #default="scope">
              <ElButton size="small" @click="openEditDrawer(scope.row)">编辑</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </div>

    <ElDrawer :title="drawerTitle" v-model="drawerVisible" size="500px">
      <ElForm :model="editingCategory" label-width="80px">
        <ElFormItem label="分类名称">
          <ElInput v-model="editingCategory.name" placeholder="请输入分类名称" />
        </ElFormItem>
        <ElFormItem label="父级分类">
          <ElSelect v-model="editingCategory.parentId" placeholder="选择父级分类">
            <ElSelect.Option value="" label="顶级分类" />
            <ElSelect.Option v-for="cat in categories" :key="cat.id" :value="cat.id" :label="cat.name" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInput type="number" v-model="editingCategory.sortOrder" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="editingCategory.status">
            <ElSelect.Option value="active" label="启用" />
            <ElSelect.Option value="inactive" label="禁用" />
          </ElSelect>
        </ElFormItem>
        <div style="margin-top: 20px; text-align: right">
          <ElButton @click="drawerVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSave" style="margin-left: 10px">保存</ElButton>
        </div>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<style scoped>
.category-container {
  display: flex;
  gap: 20px;
}

.tree-section,
.table-section {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.tree-section h3,
.table-section h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #333;
}
</style>