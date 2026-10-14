<template>
  <view class="address-list-page">
    <gexm-nav-bar title="收货地址">
      <template #right>
        <text class="add-btn" @click="goToAdd">新增</text>
      </template>
    </gexm-nav-bar>

    <view v-if="loading" class="address-loading">
      <gexm-loading text="加载中..." />
    </view>

    <view v-else-if="!addressStore.hasAddresses" class="address-empty">
      <gexm-empty description="暂无收货地址" show-button button-text="添加地址" @click="goToAdd" />
    </view>

    <view v-else class="address-content">
      <view class="address-list">
        <view
          v-for="item in addressStore.addresses"
          :key="item.id"
          class="address-item"
          @click="handleSelect(item)"
        >
          <view class="address-item__main">
            <view class="address-item__header">
              <text class="address-item__name">{{ item.name || item.receiver_name }}</text>
              <text class="address-item__phone">{{ item.phone || item.mobile }}</text>
              <text v-if="item.is_default" class="address-item__tag">默认</text>
            </view>
            <text class="address-item__detail">
              {{ item.province || '' }}{{ item.city || '' }}{{ item.district || ''
              }}{{ item.detail || item.address || '' }}
            </text>
          </view>
          <view class="address-item__actions">
            <view class="action-btn" @click.stop="handleSetDefault(item)">
              <text class="action-icon">{{ item.is_default ? '☑️' : '⬜️' }}</text>
              <text class="action-text">设为默认</text>
            </view>
            <view class="action-btn" @click.stop="goToEdit(item)">
              <text class="action-icon">✏️</text>
              <text class="action-text">编辑</text>
            </view>
            <view class="action-btn action-btn--danger" @click.stop="handleDelete(item)">
              <text class="action-icon">🗑️</text>
              <text class="action-text">删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="addressStore.hasAddresses" class="address-bottom">
      <gexm-button type="primary" block round @click="goToAdd">新增收货地址</gexm-button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { useAddressStore } from '@/store/address'
import { useUserStore } from '@/store/user'

const addressStore = useAddressStore()
const userStore = useUserStore()

const loading = ref(false)
const selectMode = ref(false)

onLoad((options) => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/login' })
    }, 1500)
    return
  }

  selectMode.value =
    options.select === 'true' || options.mode === 'select' || options.selectMode === '1'

  loadAddresses()
})

async function loadAddresses() {
  loading.value = true
  try {
    await addressStore.fetchAddresses()
  } catch (err) {
    console.error('Failed to load addresses:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goToAdd() {
  uni.navigateTo({ url: '/pages/address/address-edit' })
}

function goToEdit(item) {
  uni.navigateTo({ url: `/pages/address/address-edit?id=${item.id}` })
}

async function handleSetDefault(item) {
  if (item.is_default) return
  try {
    await addressStore.setDefault(item.id)
    uni.showToast({ title: '设置成功', icon: 'success' })
  } catch (err) {
    console.error('Failed to set default:', err)
    uni.showToast({ title: '设置失败', icon: 'none' })
  }
}

async function handleDelete(item) {
  uni.showModal({
    title: '提示',
    content: '确定要删除该地址吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await addressStore.deleteAddress(item.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch (err) {
          console.error('Failed to delete address:', err)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function handleSelect(item) {
  if (selectMode.value) {
    addressStore.setCurrentAddress(item)
    uni.$emit('addressSelected', item)
    uni.navigateBack()
  }
}

onPullDownRefresh(() => {
  loadAddresses().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style lang="scss" scoped>
.address-list-page {
  min-height: 100vh;
  background: $bg-color-page;
  padding-bottom: 140rpx;
}

.add-btn {
  font-size: 28rpx;
  color: $primary-color;
}

.address-loading,
.address-empty {
  padding-top: 200rpx;
}

.address-content {
  padding: 24rpx;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.address-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: $shadow-sm;

  &__main {
    margin-bottom: 20rpx;
  }

  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
  }

  &__name {
    font-size: 30rpx;
    font-weight: bold;
    color: $text-color;
    margin-right: 20rpx;
  }

  &__phone {
    font-size: 28rpx;
    color: $text-color-secondary;
  }

  &__tag {
    font-size: 22rpx;
    color: #fff;
    background: $danger-color;
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
    margin-left: 16rpx;
  }

  &__detail {
    font-size: 26rpx;
    color: $text-color-secondary;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    justify-content: space-around;
    padding-top: 20rpx;
    border-top: 1rpx solid $border-color-lighter;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 8rpx 16rpx;

  &--danger {
    .action-text {
      color: $danger-color;
    }
  }

  &:active {
    opacity: 0.7;
  }
}

.action-icon {
  font-size: 32rpx;
  margin-bottom: 4rpx;
}

.action-text {
  font-size: 24rpx;
  color: $text-color-secondary;
}

.address-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border-color-lighter;
}
</style>
