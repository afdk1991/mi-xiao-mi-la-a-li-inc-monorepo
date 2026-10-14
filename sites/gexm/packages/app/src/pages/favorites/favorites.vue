<template>
  <view class="favorites-page">
    <gexm-nav-bar title="我的收藏" />

    <view v-if="loading" class="favorites-loading">
      <gexm-loading text="加载中..." />
    </view>

    <view v-else-if="!hasFavorites" class="favorites-empty">
      <gexm-empty
        description="暂无收藏的商品"
        show-button
        button-text="去逛逛"
        @click="goShopping"
      />
    </view>

    <view v-else class="favorites-content">
      <scroll-view
        scroll-y
        class="favorites-scroll"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
      >
        <view class="favorites-grid">
          <view v-for="item in favorites" :key="item.id" class="favorite-item">
            <gexm-product-card :product="getProductData(item)" @click="goToDetail(item)" />
            <view class="favorite-remove" @click="handleRemoveFavorite(item)">
              <text class="remove-icon">×</text>
            </view>
          </view>
        </view>
        <view class="bottom-space" />
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { useFavoriteStore } from '@/store/favorite'

const favoriteStore = useFavoriteStore()
const loading = ref(false)
const refreshing = ref(false)

const favorites = computed(() => favoriteStore.favorites)
const hasFavorites = computed(() => favoriteStore.hasFavorites)

onShow(() => {
  loadFavorites()
})

onMounted(() => {
  loadFavorites()
})

async function loadFavorites() {
  loading.value = true
  try {
    await favoriteStore.fetchFavorites()
  } catch (err) {
    console.error('Failed to load favorites:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getProductData(item) {
  return item.product || item
}

function getProductId(item) {
  return item.product_id || item.product?.id || item.id
}

function goToDetail(item) {
  const productId = getProductId(item)
  if (productId) {
    uni.navigateTo({ url: `/pages/product/detail?id=${productId}` })
  }
}

async function handleRemoveFavorite(item) {
  const productId = getProductId(item)
  uni.showModal({
    title: '提示',
    content: '确定要取消收藏吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await favoriteStore.removeFavorite(productId)
          uni.showToast({ title: '已取消收藏', icon: 'success' })
        } catch (err) {
          console.error('Failed to remove favorite:', err)
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

function goShopping() {
  uni.switchTab({
    url: '/pages/index/index',
    fail: () => {
      uni.navigateTo({ url: '/pages/index/index' })
    },
  })
}

async function onRefresh() {
  refreshing.value = true
  try {
    await favoriteStore.fetchFavorites()
  } catch (err) {
    console.error('Failed to refresh favorites:', err)
  } finally {
    refreshing.value = false
  }
}

onPullDownRefresh(() => {
  onRefresh().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style lang="scss" scoped>
.favorites-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.favorites-loading,
.favorites-empty {
  padding-top: 200rpx;
}

.favorites-content {
  flex: 1;
  overflow: hidden;
}

.favorites-scroll {
  height: 100%;
  padding: $spacing-sm;
}

.favorites-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.favorite-item {
  width: calc(50% - 8rpx);
  position: relative;
}

.favorite-remove {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 48rpx;
  height: 48rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  &:active {
    transform: scale(0.9);
  }
}

.remove-icon {
  color: #fff;
  font-size: 32rpx;
  line-height: 1;
  margin-top: -4rpx;
}

.bottom-space {
  height: 40rpx;
}
</style>
