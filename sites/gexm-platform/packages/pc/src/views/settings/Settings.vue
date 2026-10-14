<script setup lang="ts">
import { ref } from 'vue'
import { ElCard, ElSwitch, ElSelect, ElOption, ElButton, ElMessage, ElForm, ElFormItem } from 'element-plus'

const settings = ref({
  notification: {
    email: true,
    push: true,
    sms: false,
  },
  appearance: {
    theme: 'light',
    language: 'zh-CN',
  },
  data: {
    autoSave: true,
    autoSaveInterval: 5,
  },
})

const themes = [
  { value: 'light', label: '浅色主题' },
  { value: 'dark', label: '深色主题' },
  { value: 'system', label: '跟随系统' },
]

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
]

const intervals = [
  { value: 1, label: '1分钟' },
  { value: 5, label: '5分钟' },
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
]

function handleSave() {
  ElMessage.success('设置已保存')
}

function handleReset() {
  settings.value = {
    notification: { email: true, push: true, sms: false },
    appearance: { theme: 'light', language: 'zh-CN' },
    data: { autoSave: true, autoSaveInterval: 5 },
  }
  ElMessage.info('已重置为默认设置')
}

function handleExport() {
  ElMessage.info('数据导出功能开发中')
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>系统设置</h2>
      <div class="header-actions">
        <ElButton @click="handleReset">重置</ElButton>
        <ElButton type="primary" @click="handleSave">保存设置</ElButton>
      </div>
    </div>

    <ElRow :gutter="20">
      <ElCol :span="16">
        <ElCard title="通知设置" class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">邮件通知</div>
              <div class="setting-desc">接收订单、活动等邮件通知</div>
            </div>
            <ElSwitch v-model="settings.notification.email" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">推送通知</div>
              <div class="setting-desc">接收浏览器推送通知</div>
            </div>
            <ElSwitch v-model="settings.notification.push" />
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">短信通知</div>
              <div class="setting-desc">接收重要事项短信通知</div>
            </div>
            <ElSwitch v-model="settings.notification.sms" />
          </div>
        </ElCard>

        <ElCard title="外观设置" class="settings-card">
          <ElForm :model="settings.appearance" label-width="120px">
            <ElFormItem label="主题">
              <ElSelect v-model="settings.appearance.theme">
                <ElOption v-for="theme in themes" :key="theme.value" :value="theme.value" :label="theme.label" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="语言">
              <ElSelect v-model="settings.appearance.language">
                <ElOption v-for="lang in languages" :key="lang.value" :value="lang.value" :label="lang.label" />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </ElCard>

        <ElCard title="数据设置" class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-title">自动保存</div>
              <div class="setting-desc">自动保存表单数据</div>
            </div>
            <ElSwitch v-model="settings.data.autoSave" />
          </div>
          <ElForm :model="settings.data" label-width="120px">
            <ElFormItem label="自动保存间隔">
              <ElSelect v-model="settings.data.autoSaveInterval" :disabled="!settings.data.autoSave">
                <ElOption v-for="interval in intervals" :key="interval.value" :value="interval.value" :label="interval.label" />
              </ElSelect>
            </ElFormItem>
          </ElForm>
        </ElCard>
      </ElCol>

      <ElCol :span="8">
        <ElCard title="数据管理">
          <div class="data-actions">
            <div class="action-item">
              <div class="action-icon">📥</div>
              <div class="action-info">
                <div class="action-title">导出数据</div>
                <div class="action-desc">导出个人数据为 JSON 文件</div>
              </div>
              <ElButton type="primary" size="small" @click="handleExport">导出</ElButton>
            </div>
            <div class="action-item">
              <div class="action-icon">🗑️</div>
              <div class="action-info">
                <div class="action-title">清除缓存</div>
                <div class="action-desc">清除浏览器本地缓存数据</div>
              </div>
              <ElButton type="danger" size="small" @click="() => ElMessage.info('清除缓存功能开发中')">清除</ElButton>
            </div>
          </div>
        </ElCard>

        <ElCard title="关于" class="about-card">
          <div class="about-item">
            <span class="about-label">版本</span>
            <span class="about-value">v1.0.0</span>
          </div>
          <div class="about-item">
            <span class="about-label">更新时间</span>
            <span class="about-value">2024-01-01</span>
          </div>
          <div class="about-item">
            <span class="about-label">技术支持</span>
            <span class="about-value">support@gexm.com</span>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.settings-card {
  margin-bottom: 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.setting-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.data-actions {
  padding: 8px 0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.action-item:last-child {
  border-bottom: none;
}

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.action-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.action-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.about-card {
  margin-top: 20px;
}

.about-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
}

.about-label {
  color: #909399;
  font-size: 14px;
}

.about-value {
  color: #303133;
  font-size: 14px;
}
</style>
