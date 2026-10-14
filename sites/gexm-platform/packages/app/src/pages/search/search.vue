<template>
  <view class="search-page">
    <gexm-nav-bar title="搜索">
      <template #left>
        <view class="search-bar">
          <text class="search-icon">🔍</text>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索商品"
            placeholder-class="search-placeholder"
            focus
            confirm-type="search"
            @input="handleInput"
            @confirm="handleSearch"
          />
          <text v-if="keyword" class="search-clear" @click="clearKeyword">✕</text>
        </view>
      </template>
      <template #right>
        <text class="search-btn" @click="handleSearch">搜索</text>
      </template>
    </gexm-nav-bar>

    <scroll-view class="search-content" scroll-y @scrolltolower="loadMore">
      <view v-if="showSuggestions" class="search-suggestions">
        <view
          v-for="(item, index) in suggestions"
          :key="index"
          class="suggestion-item"
          @click="selectSuggestion(item)"
        >
          <text class="suggestion-icon">🔍</text>
          <text class="suggestion-text">{{ item }}</text>
        </view>
      </view>

      <view v-else-if="!hasSearched" class="search-default">
        <view v-if="searchHistory.length > 0" class="search-section">
          <view class="section-header">
            <text class="section-title">搜索历史</text>
            <text class="section-clear" @click="clearHistory">清空</text>
          </view>
          <view class="history-tags">
            <view
              v-for="(item, index) in searchHistory"
              :key="index"
              class="history-tag"
              @click="selectHistory(item)"
            >
              <text>{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="search-section">
          <view class="section-header">
            <text class="section-title">热门搜索</text>
          </view>
          <view class="hot-tags">
            <view
              v-for="(item, index) in hotKeywords"
              :key="index"
              class="hot-tag"
              :class="{ 'hot-tag--top': index < 3 }"
              @click="selectHotKeyword(item)"
            >
              <text v-if="index < 3" class="hot-rank">{{ index + 1 }}</text>
              <text class="hot-text">{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="search-section">
          <view class="section-header">
            <text class="section-title">分类浏览</text>
          </view>
          <view class="category-grid">
            <view
              v-for="cat in categories"
              :key="cat.id"
              class="category-item"
              @click="selectCategory(cat)"
            >
              <view class="category-icon">{{ cat.icon || '📦' }}</view>
              <text class="category-name">{{ cat.name }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="search-results">
        <view v-if="loading" class="results-loading">
          <gexm-loading text="搜索中..." />
        </view>

        <view v-else-if="products.length === 0" class="results-empty">
          <gexm-empty description="未找到相关商品" />
        </view>

        <template v-else>
          <view class="filter-bar">
            <scroll-view scroll-x class="filter-scroll">
              <view class="filter-items">
                <view
                  v-for="item in sortOptions"
                  :key="item.value"
                  class="filter-item"
                  :class="{ 'is-active': sortBy === item.value }"
                  @click="handleSort(item.value)"
                >
                  <text>{{ item.label }}</text>
                  <text v-if="sortBy === item.value" class="filter-arrow">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </text>
                </view>
              </view>
            </scroll-view>
            <view class="filter-btn" @click="showFilterPopup = true">
              <text>筛选</text>
              <text class="filter-btn-icon">⚙️</text>
            </view>
          </view>

          <view class="product-grid">
            <gexm-product-card v-for="item in products" :key="item.id" :product="item" />
          </view>

          <view v-if="loadingMore" class="load-more">
            <gexm-loading text="加载中..." />
          </view>

          <view v-if="!hasMore" class="no-more">
            <text class="no-more-text">— 没有更多了 —</text>
          </view>
        </template>
      </view>
    </scroll-view>

    <view v-if="showFilterPopup" class="filter-popup" @click="showFilterPopup = false">
      <view class="filter-popup__content" @click.stop>
        <view class="filter-popup__header">
          <text class="filter-popup__title">筛选条件</text>
          <text class="filter-popup__close" @click="showFilterPopup = false">✕</text>
        </view>
        <scroll-view scroll-y class="filter-popup__body">
          <view class="filter-section">
            <text class="filter-section__title">价格区间</text>
            <view class="price-inputs">
              <input
                v-model="filterForm.minPrice"
                type="digit"
                class="price-input"
                placeholder="最低价"
              />
              <text class="price-separator">—</text>
              <input
                v-model="filterForm.maxPrice"
                type="digit"
                class="price-input"
                placeholder="最高价"
              />
            </view>
          </view>

          <view class="filter-section">
            <text class="filter-section__title">商品分类</text>
            <view class="category-options">
              <view
                v-for="cat in categories"
                :key="cat.id"
                class="category-option"
                :class="{ 'is-active': filterForm.categoryId === cat.id }"
                @click="filterForm.categoryId = filterForm.categoryId === cat.id ? '' : cat.id"
              >
                <view
                  class="category-option__checkbox"
                  :class="{ 'is-checked': filterForm.categoryId === cat.id }"
                >
                  <text v-if="filterForm.categoryId === cat.id">✓</text>
                </view>
                <text class="category-option__name">{{ cat.name }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="filter-popup__footer">
          <gexm-button size="large" type="default" plain block @click="resetFilter">
            重置
          </gexm-button>
          <gexm-button size="large" type="primary" block @click="applyFilter">确定</gexm-button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import searchApi from '@/api/search'
import categoryApi from '@/api/category'

const keyword = ref('')
const searchHistory = ref([])
const hotKeywords = ref([])
const suggestions = ref([])
const products = ref([])
const categories = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const hasSearched = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20
const sortBy = ref('')
const sortOrder = ref('desc')
const showFilterPopup = ref(false)

const filterForm = ref({
  minPrice: '',
  maxPrice: '',
  categoryId: '',
})

const sortOptions = [
  { label: '综合', value: '' },
  { label: '价格', value: 'price' },
  { label: '销量', value: 'sales' },
  { label: '最新', value: 'createdAt' },
]

const showSuggestions = computed(() => {
  return keyword.value.length > 0 && !hasSearched.value && suggestions.value.length > 0
})

onMounted(() => {
  loadHistory()
  loadHotKeywords()
  loadCategories()
})

function loadHistory() {
  try {
    const history = uni.getStorageSync('search_history')
    if (history) {
      searchHistory.value = Array.isArray(history) ? history : []
    }
  } catch (e) {
    console.error('Failed to load search history:', e)
  }
}

function saveHistory(keyword) {
  if (!keyword || keyword.trim() === '') return

  const trimmed = keyword.trim()
  const index = searchHistory.value.indexOf(trimmed)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
  searchHistory.value.unshift(trimmed)

  if (searchHistory.value.length > 20) {
    searchHistory.value = searchHistory.value.slice(0, 20)
  }

  try {
    uni.setStorageSync('search_history', searchHistory.value)
  } catch (e) {
    console.error('Failed to save search history:', e)
  }
}

function clearHistory() {
  uni.showModal({
    title: '提示',
    content: '确定清空搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        searchHistory.value = []
        try {
          uni.removeStorageSync('search_history')
        } catch (e) {
          console.error('Failed to clear search history:', e)
        }
      }
    },
  })
}

async function loadHotKeywords() {
  try {
    const result = await searchApi.getHotKeywords()
    hotKeywords.value = result || []
  } catch (e) {
    console.error('Failed to load hot keywords:', e)
    hotKeywords.value = [
      '手机',
      '蓝牙耳机',
      '运动鞋',
      '连衣裙',
      '口红',
      '笔记本电脑',
      '手表',
      '背包',
      '护肤品',
      '零食',
    ]
  }
}

async function loadCategories() {
  try {
    const result = await categoryApi.getCategoryTree()
    categories.value = result || []
  } catch (e) {
    console.error('Failed to load categories:', e)
    categories.value = []
  }
}

let suggestionTimer = null
function handleInput() {
  hasSearched.value = false

  if (suggestionTimer) {
    clearTimeout(suggestionTimer)
  }

  if (!keyword.value || keyword.value.trim() === '') {
    suggestions.value = []
    return
  }

  suggestionTimer = setTimeout(async () => {
    try {
      const result = await searchApi.getSuggestions(keyword.value.trim())
      suggestions.value = result || []
    } catch (e) {
      console.error('Failed to load suggestions:', e)
      suggestions.value = []
    }
  }, 300)
}

function handleSearch() {
  if (!keyword.value || keyword.value.trim() === '') {
    uni.showToast({ title: '请输入搜索内容', icon: 'none' })
    return
  }

  saveHistory(keyword.value.trim())
  doSearch()
}

function selectSuggestion(text) {
  keyword.value = text
  saveHistory(text)
  doSearch()
}

function selectHistory(text) {
  keyword.value = text
  saveHistory(text)
  doSearch()
}

function selectHotKeyword(text) {
  keyword.value = text
  saveHistory(text)
  doSearch()
}

function selectCategory(cat) {
  keyword.value = ''
  filterForm.value.categoryId = cat.id
  hasSearched.value = true
  doSearch()
}

function clearKeyword() {
  keyword.value = ''
  suggestions.value = []
  hasSearched.value = false
  products.value = []
}

function handleSort(value) {
  if (sortBy.value === value) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = value
    sortOrder.value = 'desc'
  }
  doSearch()
}

function resetFilter() {
  filterForm.value = {
    minPrice: '',
    maxPrice: '',
    categoryId: '',
  }
}

function applyFilter() {
  showFilterPopup.value = false
  doSearch()
}

async function doSearch() {
  hasSearched.value = true
  loading.value = true
  page.value = 1
  hasMore.value = true
  suggestions.value = []

  try {
    const params = {
      keyword: keyword.value.trim(),
      page: page.value,
      pageSize,
    }

    if (sortBy.value) {
      params.sortBy = sortBy.value
      params.sortOrder = sortOrder.value
    }

    if (filterForm.value.minPrice) {
      params.minPrice = filterForm.value.minPrice
    }
    if (filterForm.value.maxPrice) {
      params.maxPrice = filterForm.value.maxPrice
    }
    if (filterForm.value.categoryId) {
      params.categoryId = filterForm.value.categoryId
    }

    const result = await searchApi.searchProducts(params)
    products.value = result.data || []
    hasMore.value = products.value.length >= pageSize
  } catch (e) {
    console.error('Failed to search products:', e)
    products.value = []
  } finally {
    loading.value = false
  }
}

let loadMoreTimer = null
let lastLoadMoreTime = 0

async function loadMore() {
  const now = Date.now()
  if (now - lastLoadMoreTime < 300) return
  if (!hasMore.value || loadingMore.value || !hasSearched.value) return

  if (loadMoreTimer) {
    clearTimeout(loadMoreTimer)
  }

  loadMoreTimer = setTimeout(async () => {
    lastLoadMoreTime = Date.now()
    loadingMore.value = true
    page.value++

    try {
      const params = {
        keyword: keyword.value.trim(),
        page: page.value,
        pageSize,
      }

      if (sortBy.value) {
        params.sortBy = sortBy.value
        params.sortOrder = sortOrder.value
      }

      if (filterForm.value.minPrice) {
        params.minPrice = filterForm.value.minPrice
      }
      if (filterForm.value.maxPrice) {
        params.maxPrice = filterForm.value.maxPrice
      }
      if (filterForm.value.categoryId) {
        params.categoryId = filterForm.value.categoryId
      }

      const result = await searchApi.searchProducts(params)
      const newProducts = result.data || []
      products.value = [...products.value, ...newProducts]
      hasMore.value = newProducts.length >= pageSize
    } catch (e) {
      console.error('Failed to load more products:', e)
      page.value--
    } finally {
      loadingMore.value = false
    }
  }, 100)
}
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.search-content {
  flex: 1;
  height: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  background: $bg-color;
  border-radius: 40rpx;
  padding: 0 24rpx;
  height: 64rpx;
  width: 500rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: $text-color;
}

.search-placeholder {
  color: $text-color-placeholder;
}

.search-clear {
  font-size: 28rpx;
  color: $text-color-placeholder;
  padding: 8rpx;
}

.search-btn {
  font-size: 28rpx;
  color: $primary-color;
  font-weight: 500;
}

.search-default {
  padding: $spacing-base;
}

.search-section {
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
  box-shadow: $shadow-sm;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
}

.section-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-color;
}

.section-clear {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.history-tag {
  padding: 12rpx 24rpx;
  background: $bg-color;
  border-radius: 32rpx;
  font-size: $font-size-sm;
  color: $text-color-secondary;

  &:active {
    opacity: 0.7;
  }
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.hot-tag {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background: $bg-color;
  border-radius: 32rpx;
  font-size: $font-size-sm;
  color: $text-color-secondary;

  &--top {
    background: rgba(64, 158, 255, 0.1);
    color: $primary-color;
  }

  &:active {
    opacity: 0.7;
  }
}

.hot-rank {
  font-weight: bold;
  margin-right: 8rpx;
  font-size: $font-size-sm;
}

.hot-text {
  font-size: $font-size-sm;
}

.search-suggestions {
  background: $bg-color-white;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: $spacing-base $spacing-md;
  border-bottom: 1rpx solid $border-color-lighter;

  &:active {
    background: $bg-color;
  }
}

.suggestion-icon {
  font-size: 28rpx;
  margin-right: $spacing-sm;
  color: $text-color-placeholder;
}

.suggestion-text {
  font-size: $font-size-base;
  color: $text-color;
}

.search-results {
  padding: $spacing-sm;
}

.results-loading {
  padding: $spacing-xl 0;
}

.results-empty {
  padding: $spacing-xl 0;
}

.filter-bar {
  display: flex;
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  padding: $spacing-sm;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-sm;
}

.filter-scroll {
  flex: 1;
  white-space: nowrap;
}

.filter-items {
  display: inline-flex;
  gap: $spacing-md;
}

.filter-item {
  display: flex;
  align-items: center;
  padding: $spacing-xs $spacing-base;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  border-radius: $border-radius-sm;

  &.is-active {
    background: rgba(64, 158, 255, 0.1);
    color: $primary-color;
  }
}

.filter-arrow {
  margin-left: 4rpx;
  font-size: $font-size-xs;
}

.filter-btn {
  display: flex;
  align-items: center;
  padding: $spacing-xs $spacing-base;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  border-left: 1rpx solid $border-color-lighter;
}

.filter-btn-icon {
  margin-left: 4rpx;
  font-size: $font-size-sm;
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;

  :deep(.gexm-product-card) {
    width: calc(50% - 8rpx);
  }
}

.load-more {
  padding: $spacing-md 0;
  text-align: center;
}

.no-more {
  padding: $spacing-md 0;
  text-align: center;
}

.no-more-text {
  font-size: $font-size-sm;
  color: $text-color-placeholder;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(20% - 16rpx);
  padding: $spacing-sm 0;
}

.category-icon {
  font-size: 56rpx;
  margin-bottom: 8rpx;
}

.category-name {
  font-size: $font-size-xs;
  color: $text-color-secondary;
  text-align: center;
}

.filter-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.filter-popup__content {
  width: 100%;
  max-height: 70vh;
  background: $bg-color-white;
  border-radius: $border-radius-lg $border-radius-lg 0 0;
  display: flex;
  flex-direction: column;
}

.filter-popup__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-base;
  border-bottom: 1rpx solid $border-color-lighter;
}

.filter-popup__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $text-color;
}

.filter-popup__close {
  font-size: $font-size-lg;
  color: $text-color-placeholder;
  padding: $spacing-xs;
}

.filter-popup__body {
  flex: 1;
  padding: $spacing-base;
  overflow-y: auto;
}

.filter-popup__footer {
  padding: $spacing-base;
  padding-bottom: calc(#{$spacing-base} + #{$safe-area-bottom});
  border-top: 1rpx solid $border-color-lighter;
  display: flex;
  gap: $spacing-sm;
}

.filter-section {
  margin-bottom: $spacing-lg;

  &:last-child {
    margin-bottom: 0;
  }
}

.filter-section__title {
  display: block;
  font-size: $font-size-base;
  font-weight: 500;
  color: $text-color;
  margin-bottom: $spacing-base;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.price-input {
  flex: 1;
  height: 80rpx;
  padding: 0 $spacing-base;
  font-size: $font-size-base;
  background: $bg-color-page;
  border-radius: $border-radius-base;
  text-align: center;
}

.price-separator {
  font-size: $font-size-md;
  color: $text-color-placeholder;
}

.category-options {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.category-option {
  display: flex;
  align-items: center;
  padding: $spacing-xs $spacing-base;
  background: $bg-color-page;
  border-radius: $border-radius-sm;
  border: 1rpx solid transparent;

  &.is-active {
    background: rgba(64, 158, 255, 0.1);
    border-color: $primary-color;
  }
}

.category-option__checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid $border-color;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8rpx;

  &.is-checked {
    background: $primary-color;
    border-color: $primary-color;
    text {
      color: #fff;
      font-size: 20rpx;
    }
  }
}

.category-option__name {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}
</style>
