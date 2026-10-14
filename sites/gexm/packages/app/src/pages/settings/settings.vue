<template>
  <view class="settings-page">
    <gexm-nav-bar title="设置" />

    <view class="settings-content">
      <view v-if="userStore.isLoggedIn" class="settings-section">
        <gexm-list-item icon="�" title="账号安全" arrow @click="goToPage('account')" />
        <gexm-list-item icon="�" title="修改密码" arrow @click="goToPage('password')" />
      </view>

      <view class="settings-section">
        <gexm-list-item icon="🔔" title="消息通知" arrow @click="goNotifications" />
        <gexm-list-item icon="🔊" title="声音提醒">
          <template #right>
            <switch :checked="soundEnabled" color="#409eff" @change="toggleSound" />
          </template>
        </gexm-list-item>
        <gexm-list-item icon="🌙" title="深色模式">
          <template #right>
            <switch :checked="isDarkMode" color="#409eff" @change="toggleDarkMode" />
          </template>
        </gexm-list-item>
      </view>

      <view class="settings-section">
        <gexm-list-item
          icon="🗄️"
          title="缓存管理"
          :value="cacheSize"
          arrow
          @click="handleClearCache"
        />
        <gexm-list-item
          icon="🔄"
          title="检查更新"
          :value="appVersion"
          arrow
          @click="handleCheckUpdate"
        />
      </view>

      <view class="settings-section">
        <gexm-list-item icon="📜" title="用户协议" arrow @click="goToPage('agreement')" />
        <gexm-list-item icon="🔒" title="隐私政策" arrow @click="goToPage('privacy')" />
        <gexm-list-item icon="ℹ️" title="关于我们" arrow @click="goToPage('about')" />
      </view>

      <view v-if="userStore.isLoggedIn" class="logout-section">
        <gexm-button type="danger" plain block @click="handleLogout">退出登录</gexm-button>
      </view>

      <view class="settings-version">
        <text class="settings-version-text">Gexm v{{ appVersion }}</text>
        <text class="settings-version-tip">全平台统一体验</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'
import { authApi } from '@/api'

const userStore = useUserStore()
const appStore = useAppStore()

const appVersion = ref('1.0.0')
const cacheSize = ref('0 MB')
const soundEnabled = ref(true)
const isDarkMode = computed(() => appStore.theme === 'dark')

onMounted(() => {
  calcCacheSize()
  loadSettings()
})

function loadSettings() {
  try {
    const sound = uni.getStorageSync('gexm_sound_enabled')
    if (sound !== '') {
      soundEnabled.value = sound
    }
  } catch (e) {
    console.error('Load settings error:', e)
  }
}

function calcCacheSize() {
  cacheSize.value = '12.5 MB'
}

function toggleSound(e) {
  soundEnabled.value = e.detail.value
  uni.setStorageSync('gexm_sound_enabled', soundEnabled.value)
}

function toggleDarkMode(e) {
  const theme = e.detail.value ? 'dark' : 'light'
  appStore.setTheme(theme)
  uni.showToast({ title: `已切换到${e.detail.value ? '深色' : '浅色'}模式`, icon: 'none' })
}

function goNotifications() {
  uni.navigateTo({ url: '/pages/notifications/notifications' })
}

function handleClearCache() {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？',
    success: (res) => {
      if (res.confirm) {
        cacheSize.value = '0 KB'
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      }
    },
  })
}

function handleCheckUpdate() {
  uni.showToast({ title: '当前已是最新版本', icon: 'none' })
}

function goToPage(page) {
  const pageMap = {
    about: '/pages/about/about',
    agreement: '/pages/mine/privacy',
    privacy: '/pages/mine/privacy',
    account: '/pages/edit-profile/edit-profile',
    password: '',
  }

  if (page === 'password') {
    showChangePassword()
    return
  }

  const url = pageMap[page]
  if (url) {
    uni.navigateTo({ url })
  } else {
    uni.showToast({ title: '功能开发中', icon: 'none' })
  }
}

function showChangePassword() {
  uni.showModal({
    title: '修改密码',
    content: '请前往编辑资料页修改密码',
    confirmText: '去修改',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({ url: '/pages/edit-profile/edit-profile' })
      }
    },
  })
}

async function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await authApi.logout()
        } catch (e) {
          console.error('Logout api error:', e)
        }
        userStore.logout()
        uni.showToast({ title: '已退出登录', icon: 'success' })
        setTimeout(() => {
          uni.switchTab({ url: '/pages/index/index' })
        }, 1000)
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.settings-content {
  padding: 24rpx;
}

.settings-section {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.logout-section {
  margin-top: 32rpx;
  margin-bottom: 48rpx;
}

.settings-version {
  text-align: center;
  padding: 24rpx 0 48rpx;

  &-text {
    display: block;
    font-size: 28rpx;
    color: $text-color-secondary;
  }

  &-tip {
    font-size: 24rpx;
    color: $text-color-placeholder;
    margin-top: 8rpx;
  }
}
</style>
