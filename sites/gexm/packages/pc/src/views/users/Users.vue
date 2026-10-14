<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userApi, type User } from '@/api'
import { ElTable, ElTableColumn, ElButton, ElInput, ElSelect, ElDrawer, ElForm, ElFormItem, ElMessage, ElDialog } from 'element-plus'

const users = ref<User[]>([])
const searchKeyword = ref('')
const statusFilter = ref('')
const drawerVisible = ref(false)
const dialogVisible = ref(false)
const drawerTitle = ref('新增用户')
const editingUser = ref<Partial<User>>({})
const deleteId = ref('')

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'active', label: '正常' },
  { value: 'inactive', label: '禁用' },
]

async function fetchUsers() {
  try {
    const query: { page: number; pageSize: number; keyword?: string; status?: string } = { page: 1, pageSize: 100 }
    if (searchKeyword.value) query.keyword = searchKeyword.value
    if (statusFilter.value) query.status = statusFilter.value
    const result = await userApi.getUsers(query)
    users.value = result.list || []
  } catch (e) {
    console.error('Failed to fetch users:', e)
  }
}

function handleSearch() {
  fetchUsers()
}

function openAddDrawer() {
  drawerTitle.value = '新增用户'
  editingUser.value = {
    username: '',
    email: '',
    password: '',
    nickname: '',
    status: 'active',
  }
  drawerVisible.value = true
}

function openEditDrawer(user: User) {
  drawerTitle.value = '编辑用户'
  editingUser.value = { ...user }
  drawerVisible.value = true
}

async function handleSave() {
  try {
    if (!editingUser.value.username || !editingUser.value.email) {
      ElMessage.warning('用户名和邮箱不能为空')
      return
    }
    if (editingUser.value.id) {
      await userApi.updateUser(editingUser.value.id, editingUser.value)
      ElMessage.success('更新成功')
    } else {
      if (!editingUser.value.password) {
        ElMessage.warning('请设置密码')
        return
      }
      await userApi.createUser(editingUser.value as { username: string; email: string; password: string })
      ElMessage.success('创建成功')
    }
    drawerVisible.value = false
    fetchUsers()
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
    await userApi.deleteUser(deleteId.value)
    ElMessage.success('删除成功')
    dialogVisible.value = false
    fetchUsers()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function formatRole(role: string) {
  const roleMap: Record<string, string> = {
    admin: '管理员',
    user: '普通用户',
  }
  return roleMap[role] || role
}

function formatStatus(status: string) {
  const statusMap: Record<string, string> = {
    active: '正常',
    inactive: '禁用',
  }
  return statusMap[status] || status
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="gexm-page">
    <div class="page-header">
      <h2>用户管理</h2>
      <div class="header-actions">
        <ElInput v-model="searchKeyword" placeholder="搜索用户名/邮箱/手机号" style="width: 250px" @keyup.enter="handleSearch" />
        <ElSelect v-model="statusFilter" placeholder="状态" style="width: 120px; margin-left: 10px">
          <ElSelect.Option v-for="opt in statusOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
        </ElSelect>
        <ElButton type="primary" style="margin-left: 10px" @click="openAddDrawer">新增用户</ElButton>
      </div>
    </div>

    <ElTable :data="users" border style="width: 100%">
      <ElTableColumn prop="id" label="ID" width="80" />
      <ElTableColumn prop="username" label="用户名" width="120" />
      <ElTableColumn prop="nickname" label="昵称" width="120" />
      <ElTableColumn prop="email" label="邮箱" width="200" />
      <ElTableColumn prop="phone" label="手机号" width="130" />
      <ElTableColumn prop="role" label="角色" width="100">
        <template #default="scope">{{ formatRole(scope.row.role) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="status" label="状态" width="100">
        <template #default="scope">{{ formatStatus(scope.row.status) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="createdAt" label="注册时间" width="180" />
      <ElTableColumn prop="lastLoginAt" label="最后登录" width="180" />
      <ElTableColumn label="操作" width="160" fixed="right">
        <template #default="scope">
          <ElButton size="small" @click="openEditDrawer(scope.row)">编辑</ElButton>
          <ElButton size="small" type="danger" @click="handleDelete(scope.row.id)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDrawer :title="drawerTitle" v-model="drawerVisible" size="500px">
      <ElForm :model="editingUser" label-width="80px">
        <ElFormItem label="用户名">
          <ElInput v-model="editingUser.username" />
        </ElFormItem>
        <ElFormItem label="昵称">
          <ElInput v-model="editingUser.nickname" />
        </ElFormItem>
        <ElFormItem label="邮箱">
          <ElInput v-model="editingUser.email" />
        </ElFormItem>
        <ElFormItem label="手机号">
          <ElInput v-model="editingUser.phone" />
        </ElFormItem>
        <ElFormItem v-if="!editingUser.id" label="密码">
          <ElInput type="password" v-model="editingUser.password" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="editingUser.status">
            <ElSelect.Option value="active" label="正常" />
            <ElSelect.Option value="inactive" label="禁用" />
          </ElSelect>
        </ElFormItem>
        <div style="margin-top: 20px; text-align: right">
          <ElButton @click="drawerVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleSave" style="margin-left: 10px">保存</ElButton>
        </div>
      </ElForm>
    </ElDrawer>

    <ElDialog title="确认删除" v-model="dialogVisible" width="400px">
      <p>确定要删除该用户吗？此操作不可恢复。</p>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="danger" @click="confirmDelete">确定删除</ElButton>
      </template>
    </ElDialog>
  </div>
</template>