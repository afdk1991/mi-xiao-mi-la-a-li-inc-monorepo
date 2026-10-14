<template>
  <view class="product-list-page">
    <gexm-nav-bar title="商品列表">
      <template #left>
        <view class="search-bar" @click="goSearch">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索商品</text>
        </view>
      </template>
    </gexm-nav-bar>

    <view class="page-body">
      <view v-if="showCategorySidebar" class="category-sidebar">
        <scroll-view class="sidebar-scroll" scroll-y>
          <view
            v-for="(cat, index) in categories"
            :key="cat.id || index"
            class="sidebar-item"
            :class="{ active: currentCategoryId === cat.id }"
            @click="selectCategory(cat.id)"
          >
            <text>{{ cat.name }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="main-content">
        <view class="filter-bar">
          <view
            v-for="(filter, index) in filters"
            :key="index"
            class="filter-item"
            :class="{ active: currentFilter === index }"
            @click="selectFilter(index)"
          >
            <text>{{ filter.label }}</text>
            <text v-if="filter.hasArrow" class="filter-arrow">
              {{ filter.asc ? '↑' : '↓' }}
            </text>
          </view>
        </view>

        <scroll-view
          class="list-content"
          scroll-y
          refresher-enabled
          :refresher-triggered="refreshing"
          @scrolltolower="loadMore"
          @refresherrefresh="onRefresh"
        >
          <view v-if="loading && products.length === 0" class="skeleton-product-grid">
            <gexm-skeleton v-for="i in 6" :key="i" mode="card" />
          </view>

          <view v-else-if="products.length === 0" class="empty-wrap">
            <gexm-empty
              description="没有找到相关商品"
              :showButton="true"
              buttonText="重新加载"
              @click="reload"
            />
          </view>

          <view v-else class="product-grid">
            <gexm-product-card v-for="product in products" :key="product.id" :product="product" />
          </view>

          <view v-if="loadingMore" class="loading-more">
            <gexm-loading text="加载中..." />
          </view>

          <view v-if="!hasMore && products.length > 0" class="no-more">
            <text>— 没有更多了 —</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { useProductStore } from '@/store/product'
import categoryApi from '@/api/category'
import GexmSkeleton from '@/components/gexm-skeleton'

const productStore = useProductStore()

const keyword = ref('')
const categoryId = ref('')
const currentCategoryId = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)
const currentFilter = ref(0)
const priceAsc = ref(false)
const categories = ref([])
const showCategorySidebar = ref(false)

const filters = [
  { label: '综合', hasArrow: false },
  { label: '销量', hasArrow: false },
  { label: '价格', hasArrow: true, asc: false },
]

const products = computed(() => productStore.products)

onLoad((options) => {
  if (options.categoryId) {
    categoryId.value = options.categoryId
    currentCategoryId.value = options.categoryId
  }
  if (options.keyword) {
    keyword.value = decodeURIComponent(options.keyword)
  }
  if (options.showCategory === 'true') {
    showCategorySidebar.value = true
  }
  loadCategories()
  loadData()
})

async function loadCategories() {
  try {
    const result = await categoryApi.getCategoryTree()
    const catList = result.data || result.categories || result || []
    categories.value = Array.isArray(catList) ? catList : []
  } catch (e) {
    console.error('Load categories failed:', e)
  }
}

async function loadData() {
  loading.value = true
  page.value = 1
  hasMore.value = true
  try {
    const params = {
      page: 1,
      pageSize,
    }
    if (currentCategoryId.value) {
      params.categoryId = currentCategoryId.value
    }
    if (keyword.value) {
      params.keyword = keyword.value
    }
    params.sort = getSort()
    const result = await productStore.fetchProducts(params)
    const list = result.data || result.products || []
    productStore.products = list
    if (list.length < pageSize) {
      hasMore.value = false
    }
  } catch (e) {
    console.error('Load products failed:', e)
  } finally {
    loading.value = false
  }
}

let loadMoreTimer = null
let lastLoadMoreTime = 0

async function loadMore() {
  const now = Date.now()
  if (now - lastLoadMoreTime < 300) return
  if (loadingMore.value || !hasMore.value) return

  if (loadMoreTimer) {
    clearTimeout(loadMoreTimer)
  }

  loadMoreTimer = setTimeout(async () => {
    lastLoadMoreTime = Date.now()
    loadingMore.value = true
    page.value++
    try {
      const params = {
        page: page.value,
        pageSize,
      }
      if (currentCategoryId.value) {
        params.categoryId = currentCategoryId.value
      }
      if (keyword.value) {
        params.keyword = keyword.value
      }
      params.sort = getSort()
      const result = await productStore.fetchProducts(params)
      const list = result.data || result.products || []
      if (list.length > 0) {
        productStore.products = [...productStore.products, ...list]
      }
      if (list.length < pageSize) {
        hasMore.value = false
      }
    } catch (e) {
      console.error('Load more failed:', e)
      page.value--
    } finally {
      loadingMore.value = false
    }
  }, 100)
}

function getSort() {
  switch (currentFilter.value) {
    case 1:
      return 'sales'
    case 2:
      return priceAsc.value ? 'price_asc' : 'price_desc'
    default:
      return 'default'
  }
}

function selectFilter(index) {
  if (index === 2) {
    if (currentFilter.value === 2) {
      priceAsc.value = !priceAsc.value
      filters[2].asc = priceAsc.value
    } else {
      currentFilter.value = 2
      priceAsc.value = false
      filters[2].asc = false
    }
  } else {
    currentFilter.value = index
  }
  loadData()
}

function selectCategory(catId) {
  currentCategoryId.value = catId
  loadData()
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}

function reload() {
  loadData()
}

async function onRefresh() {
  refreshing.value = true
  try {
    page.value = 1
    hasMore.value = true
    const params = {
      page: 1,
      pageSize,
    }
    if (currentCategoryId.value) {
      params.categoryId = currentCategoryId.value
    }
    if (keyword.value) {
      params.keyword = keyword.value
    }
    params.sort = getSort()
    const result = await productStore.fetchProducts(params)
    const list = result.data || result.products || []
    productStore.products = list
    if (list.length < pageSize) {
      hasMore.value = false
    }
  } catch (e) {
    console.error('Refresh failed:', e)
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
.product-list-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

// ===================================
// 搜索栏
// ===================================

.search-bar {
  flex: 1;
  height: 64rpx;
  background: $bg-color-page;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  padding: 0 $spacing-4;
  transition: all $duration-fast $ease-out;

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.search-icon {
  font-size: $font-size-sm;
  margin-right: $spacing-2;
}

.search-placeholder {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

// ===================================
// 页面主体
// ===================================

.page-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  margin-top: $nav-bar-height;
}

// ===================================
// 侧边分类栏
// ===================================

.category-sidebar {
  width: 180rpx;
  background: $bg-color-white;
  border-right: 1rpx solid $gray-100;
  flex-shrink: 0;
}

.sidebar-scroll {
  height: 100%;
}

.sidebar-item {
  padding: $spacing-4 $spacing-3;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  text-align: center;
  border-bottom: 1rpx solid $gray-100;
  position: relative;
  transition: all $duration-fast $ease-out;

  &.active {
    color: $primary-color;
    font-weight: $font-weight-semibold;
    background: $gray-50;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6rpx;
      height: 40rpx;
      background: $primary-color;
      border-radius: 0 3rpx 3rpx 0;
    }
  }

  &:active {
    background: $gray-50;
  }
}

// ===================================
// 主内容区
// ===================================

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// ===================================
// 筛选栏
// ===================================

.filter-bar {
  display: flex;
  align-items: center;
  background: $bg-color-white;
  padding: $spacing-3 0;
  border-bottom: 1rpx solid $gray-100;
  flex-shrink: 0;
  box-shadow: $shadow-xs;
}

.filter-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-1;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  position: relative;
  padding: $spacing-2 0;
  transition: all $duration-fast $ease-out;

  &.active {
    color: $primary-color;
    font-weight: $font-weight-semibold;
  }

  &:active {
    opacity: 0.7;
  }
}

.filter-arrow {
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
}

// ===================================
// 列表内容
// ===================================

.list-content {
  flex: 1;
  height: 0;
  padding: $spacing-3;
}

.loading-wrap,
.empty-wrap {
  padding: $spacing-12 0;
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;

  :deep(.gexm-product-card) {
    width: calc(50% - #{$spacing-3} / 2);
  }
}

.loading-more {
  padding: $spacing-6 0;
  text-align: center;
}

.skeleton-product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;

  :deep(.gexm-skeleton) {
    width: calc(50% - #{$spacing-3} / 2);
  }
}

.no-more {
  text-align: center;
  padding: $spacing-8 0;
  font-size: $font-size-xs;
  color: $text-color-placeholder;
  letter-spacing: 2rpx;
}

// ===================================
// 响应式适配
// ===================================

// 小屏幕优化 (< 375px)
@media screen and (max-width: #{$breakpoint-sm - 1px}) {
  .category-sidebar {
    width: 160rpx;
  }

  .sidebar-item {
    padding: $spacing-3 $spacing-2;
    font-size: $font-size-xs;
  }
}

// 平板及以上 (> 768px)
@media screen and (min-width: $breakpoint-lg) {
  .page-body {
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }

  .category-sidebar {
    width: 240rpx;
  }

  .product-grid {
    :deep(.gexm-product-card) {
      width: calc(25% - #{$spacing-4});
    }
  }
}
</style>
