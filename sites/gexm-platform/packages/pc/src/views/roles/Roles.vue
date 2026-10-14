<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { roleApi, permissionApi, type Role, type Permission } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElInput, ElDrawer, ElForm, ElFormItem, ElMessage, ElDialog, ElTree } from 'element-plus'

const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const searchKeyword = ref('')
const drawerVisible = ref(false)
const dialogVisible = ref(false)
const drawerTitle = ref('新增角色')
const editingRole = ref<Partial<Role>>({})
const selectedPermissions = ref<string[]>([])
const deleteId = ref('')

async function fetchRoles() {
  try {
    const result = await roleApi.getRoles({ page: 1, pageSize: 100 })
    roles.value = result.list || []
  } catch (e) {
    console.error('Failed to fetch roles:', e)
  }
}

async function fetchPermissions() {
  try {
    const result = await permissionApi.getPermissions()
    permissions.value = result.list || []
  } catch (e) {
    console.error('Failed to fetch permissions:', e)
  }
}

function handleSearch() {
  fetchRoles()
}

function openAddDrawer() {
  drawerTitle.value = '新增角色'
  editingRole.value = {
    name: '',
    description: '',
  }
  selectedPermissions.value = []
  drawerVisible.value = true
}

function openEditDrawer(role: Role) {
  drawerTitle.value = '编辑角色'
  editingRole.value = { ...role }
  selectedPermissions.value = role.permissions?.map((p) => p.id) || []
  drawerVisible.value = true
}

function handleCheckChange(data: any, checked: boolean) {
  const id = data.id
  if (checked) {
    if (!selectedPermissions.value.includes(id)) {
      selectedPermissions.value.push(id)
    }
  } else {
    const index = selectedPermissions.value.indexOf(id)
    if (index > -1) {
      selectedPermissions.value.splice(index, 1)
    }
  }
}

function buildTree() {
  const grouped: Record<string, Permission[]> = {}
  permissions.value.forEach((p) => {
    if (!grouped[p.module]) {
      grouped[p.module] = []
    }
    grouped[p.module].push(p)
  })
  return Object.entries(grouped).map(([module, items]) => ({
    id: module,
    label: module,
    children: items.map((item) => ({
      id: item.id,
      label: item.name,
      code: item.code,
    })),
  }))
}

async function handleSave() {
  try {
    if (!editingRole.value.name) {
      ElMessage.warning('角色名称不能为空')
      return
    }
    if (editingRole.value.id) {
      await roleApi.updateRole(editingRole.value.id, {
        name: editingRole.value.name,
        description: editingRole.value.description,
        permissions: selectedPermissions.value,
      })
      ElMessage.success('更新成功')
    } else {
      await roleApi.createRole({
        name: editingRole.value.name,
        description: editingRole.value.description,
        permissions: selectedPermissions.value,
      })
      ElMessage.success('创建成功')
    }
    drawerVisible.value = false
    fetchRoles()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

function handleDelete(id: string) {
  deleteId.value = id
  dialogVisible.value = true
}

async function confirmDelete() {
  try {
    await roleApi.deleteRole(deleteId.value)
    ElMessage.success('删除成功')
    dialogVisible.value = false
    fetchRoles()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function formatSystemFlag(flag: number) {
  return flag === 1 ? '是' : '否'
}

function getPermissionCount(role: Role) {
  return role.permissions?.length || 0
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
</script>

<template>
  <div class="gexm-page">
    <div class="page-header">
      <h2>角色管理</h2>
      <div class="header-actions">
        <ElInput v-model="searchKeyword" placeholder="搜索角色名称" style="width: 250px" @keyup.enter="handleSearch" />
        <ElButton type="primary" style="margin-left: 10px" @click="openAddDrawer">新增角色</ElButton>
      </div>
    </div>

    <ElTable :data="roles" border style="width: 100%">
      <ElTableColumn prop="id" label="ID" width="100" />
      <ElTableColumn prop="name" label="角色名称" width="150" />
      <ElTableColumn prop="description" label="描述" minWidth="200" />
      <ElTableColumn label="权限数量" width="100">
        <template #default="scope">{{ getPermissionCount(scope.row) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="isSystem" label="系统角色" width="100">
        <template #default="scope">{{ formatSystemFlag(scope.row.isSystem) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="createdAt" label="创建时间" width="180" />
      <ElTableColumn label="操作" width="200" fixed="right">
        <template #default="scope">
          <ElButton size="small" @click="openEditDrawer(scope.row)">编辑</ElButton>
          <ElButton size="small" type="danger" @click="handleDelete(scope.row.id)" :disabled="scope.row.isSystem === 1">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDrawer :title="drawerTitle" v-model="drawerVisible" size="700px">
      <ElForm :model="editingRole" label-width="80px">
        <ElFormItem label="角色名称">
          <ElInput v-model="editingRole.name" placeholder="请输入角色名称" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput type="textarea" v-model="editingRole.description" :rows="3" placeholder="请输入角色描述" />
        </ElFormItem>
        <ElFormItem label="权限">
          <ElTree
            :data="buildTree()"
            show-checkbox
            node-key="id"
            :default-checked-keys="selectedPermissions"
            @check="handleCheckChange"
            :props="{ label: 'label', children: 'children' }"
          />
        </ElFormItem>
        <div style="margin-top: 20px; text-align: right">
          <ElButton @click="drawerVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSave" style="margin-left: 10px">保存</ElButton>
        </div>
      </ElForm>
    </ElDrawer>

    <ElDialog title="确认删除" v-model="dialogVisible" width="400px">
      <p>确定要删除该角色吗？此操作不可恢复。</p>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="danger" @click="confirmDelete">确定删除</ElButton>
      </template>
    </ElDialog>
  </div>
</template>