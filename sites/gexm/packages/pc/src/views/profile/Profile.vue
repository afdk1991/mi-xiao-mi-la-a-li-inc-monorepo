<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { authApi } from '@/api'
import { ElForm, ElFormItem, ElInput, ElButton, ElCard, ElRow, ElCol, ElMessage } from 'element-plus'

const userStore = useUserStore()
const editing = ref(false)
const form = reactive({
  nickname: '',
  email: '',
  phone: '',
})

onMounted(() => {
  loadUserInfo()
})

function loadUserInfo() {
  form.nickname = userStore.nickname || ''
  form.email = (userStore.userInfo as any)?.email || ''
  form.phone = (userStore.userInfo as any)?.phone || ''
}

function toggleEdit() {
  editing.value = !editing.value
  if (!editing.value) {
    loadUserInfo()
  }
}

async function handleSave() {
  try {
    await authApi.updateProfile(form)
    userStore.setUserInfo({
      ...userStore.userInfo,
      ...form,
    })
    ElMessage.success('个人信息更新成功')
    editing.value = false
  } catch (e) {
    const msg = (e as { message?: string })?.message || '更新失败'
    ElMessage.error(msg)
  }
}

function handleCancel() {
  editing.value = false
  loadUserInfo()
}
</script>

<template>
  <div class="profile-page">
    <ElRow :gutter="20">
      <ElCol :span="8">
        <ElCard class="profile-card">
          <div class="profile-avatar-section">
            <div class="profile-avatar">
              {{ (userStore.nickname || userStore.username || 'U').charAt(0) }}
            </div>
            <div class="profile-name">{{ userStore.nickname || userStore.username }}</div>
            <div class="profile-role">{{ (userStore.userInfo as any)?.role || '普通用户' }}</div>
          </div>
        </ElCard>

        <ElCard title="统计数据" class="stats-card">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">12</div>
              <div class="stat-label">订单数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">520</div>
              <div class="stat-label">积分</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">3</div>
              <div class="stat-label">优惠券</div>
            </div>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :span="16">
        <ElCard title="个人信息" class="info-card">
          <ElForm :model="form" label-width="100px">
            <ElFormItem label="用户名">
              <span class="form-value">{{ userStore.username }}</span>
            </ElFormItem>

            <ElFormItem label="昵称">
              <template v-if="editing">
                <ElInput v-model="form.nickname" />
              </template>
              <span v-else class="form-value">{{ form.nickname || '-' }}</span>
            </ElFormItem>

            <ElFormItem label="邮箱">
              <template v-if="editing">
                <ElInput v-model="form.email" />
              </template>
              <span v-else class="form-value">{{ form.email || '-' }}</span>
            </ElFormItem>

            <ElFormItem label="手机号">
              <template v-if="editing">
                <ElInput v-model="form.phone" />
              </template>
              <span v-else class="form-value">{{ form.phone || '-' }}</span>
            </ElFormItem>

            <ElFormItem label="注册时间">
              <span class="form-value">{{ new Date((userStore.userInfo as any)?.createdAt || Date.now()).toLocaleString() }}</span>
            </ElFormItem>

            <ElFormItem v-if="!editing">
              <ElButton type="primary" @click="toggleEdit">编辑资料</ElButton>
            </ElFormItem>
            <ElFormItem v-else>
              <ElButton type="primary" @click="handleSave">保存</ElButton>
              <ElButton @click="handleCancel">取消</ElButton>
            </ElFormItem>
          </ElForm>
        </ElCard>

        <ElCard title="安全设置" class="security-card">
          <div class="security-items">
            <div class="security-item">
              <div class="security-info">
                <div class="security-title">修改密码</div>
                <div class="security-desc">定期更换密码以保障账户安全</div>
              </div>
              <ElButton type="text" @click="() => ElMessage.info('修改密码功能开发中')">修改</ElButton>
            </div>
            <div class="security-item">
              <div class="security-info">
                <div class="security-title">绑定手机</div>
                <div class="security-desc">{{ form.phone ? '已绑定' : '未绑定' }}</div>
              </div>
              <ElButton type="text" @click="() => ElMessage.info('绑定手机功能开发中')">{{ form.phone ? '更换' : '绑定' }}</ElButton>
            </div>
            <div class="security-item">
              <div class="security-info">
                <div class="security-title">绑定邮箱</div>
                <div class="security-desc">{{ form.email ? '已绑定' : '未绑定' }}</div>
              </div>
              <ElButton type="text" @click="() => ElMessage.info('绑定邮箱功能开发中')">{{ form.email ? '更换' : '绑定' }}</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  padding: 0;
}

.profile-card {
  text-align: center;
}

.profile-avatar-section {
  padding: 20px 0;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: #fff;
  margin: 0 auto 16px;
}

.profile-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.profile-role {
  font-size: 14px;
  color: #909399;
}

.stats-card {
  margin-top: 20px;
}

.stats-grid {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.info-card,
.security-card {
  margin-bottom: 20px;
}

.form-value {
  color: #303133;
  font-size: 14px;
}

.security-items {
  padding: 12px 0;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.security-item:last-child {
  border-bottom: none;
}

.security-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.security-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
