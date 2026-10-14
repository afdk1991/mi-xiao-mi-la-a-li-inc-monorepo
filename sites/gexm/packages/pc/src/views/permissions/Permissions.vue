<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { permissionApi, type Permission } from '@/api'
import { ElTable, ElTableColumn, ElTree } from 'element-plus'

const permissions = ref<Permission[]>([])
const groupedPermissions = ref<Record<string, Permission[]>>({})

async function fetchPermissions() {
  try {
    const result = await permissionApi.getPermissions()
    permissions.value = result.list || []
    groupedPermissions.value = result.grouped || {}
  } catch (e) {
    console.error('Failed to fetch permissions:', e)
  }
}

function buildTree() {
  return Object.entries(groupedPermissions.value).map(([module, items]) => ({
    id: module,
    label: module,
    children: items.map((item) => ({
      id: item.id,
      label: `${item.name} (${item.code})`,
      code: item.code,
      description: item.description,
    })),
  }))
}

onMounted(() => {
  fetchPermissions()
})
</script>

<template>
  <div class="gexm-page">
    <div class="page-header">
      <h2>权限管理</h2>
      <div class="header-actions">
        <span class="hint">权限由系统自动生成，无法手动修改</span>
      </div>
    </div>

    <div class="permission-container">
      <div class="tree-section">
        <h3>权限树</h3>
        <ElTree
          :data="buildTree()"
          node-key="id"
          :props="{ label: 'label', children: 'children' }"
          default-expand-all
        />
      </div>

      <div class="table-section">
        <h3>权限列表</h3>
        <ElTable :data="permissions" border style="width: 100%">
          <ElTableColumn prop="id" label="ID" width="100" />
          <ElTableColumn prop="name" label="权限名称" width="150" />
          <ElTableColumn prop="code" label="权限标识" width="150" />
          <ElTableColumn prop="module" label="所属模块" width="120" />
          <ElTableColumn prop="description" label="描述" minWidth="200" />
        </ElTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint {
  color: #999;
  font-size: 14px;
}

.permission-container {
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