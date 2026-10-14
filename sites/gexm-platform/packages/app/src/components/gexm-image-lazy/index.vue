<template>
  <view
    :id="containerId"
    class="gexm-image-lazy"
    :class="[
      { 'gexm-image-lazy--loaded': isLoaded, 'gexm-image-lazy--error': isError },
      `gexm-image-lazy--${shape}`,
    ]"
    :style="containerStyle"
  >
    <image
      v-if="shouldLoad"
      class="gexm-image-lazy__image"
      :class="{ 'gexm-image-lazy__image--fade-in': isLoaded && !isError }"
      :src="currentSrc"
      :mode="mode"
      :lazy-load="false"
      @load="handleImageLoad"
      @error="handleImageError"
    />
    <view v-if="!isLoaded && !isError" class="gexm-image-lazy__placeholder">
      <view class="gexm-image-lazy__skeleton" />
    </view>
    <view v-if="isError" class="gexm-image-lazy__error" @click="handleRetry">
      <text class="gexm-image-lazy__error-icon">🖼️</text>
      <text class="gexm-image-lazy__error-text">加载失败</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, getCurrentInstance, nextTick } from 'vue'

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  mode: {
    type: String,
    default: 'aspectFill',
  },
  width: {
    type: String,
    default: '',
  },
  height: {
    type: String,
    default: '',
  },
  aspectRatio: {
    type: [String, Number],
    default: '',
  },
  shape: {
    type: String,
    default: 'square',
    validator: (val) => ['square', 'round', 'circle'].includes(val),
  },
  borderRadius: {
    type: String,
    default: '',
  },
  rootMargin: {
    type: String,
    default: '200px',
  },
  lazy: {
    type: Boolean,
    default: true,
  },
  errorImage: {
    type: String,
    default: '',
  },
  maxRetries: {
    type: Number,
    default: 2,
  },
  minHeight: {
    type: String,
    default: '200rpx',
  },
})

const emit = defineEmits(['load', 'error', 'click'])

const isLoaded = ref(false)
const isError = ref(false)
const shouldLoad = ref(false)
const retryCount = ref(0)
const currentSrc = ref('')
const containerId = ref(`gexm-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

let observer = null
let observerCtx = null

const displayErrorImage = computed(() => {
  return props.errorImage || '/static/images/placeholder.svg'
})

const containerStyle = computed(() => {
  const style = {}
  if (props.width) {
    style.width = props.width
  }
  if (props.height) {
    style.height = props.height
  }
  if (props.minHeight) {
    style.minHeight = props.minHeight
  }
  if (props.aspectRatio) {
    style.aspectRatio = props.aspectRatio
  }
  if (props.borderRadius) {
    style.borderRadius = props.borderRadius
  }
  return style
})

onMounted(() => {
  currentSrc.value = props.src
  if (!props.lazy) {
    shouldLoad.value = true
  } else {
    initObserver()
  }
})

onUnmounted(() => {
  destroyObserver()
})

watch(
  () => props.src,
  (newVal) => {
    if (newVal !== currentSrc.value) {
      currentSrc.value = newVal
      isLoaded.value = false
      isError.value = false
      retryCount.value = 0
      if (!props.lazy) {
        shouldLoad.value = true
      } else if (!shouldLoad.value) {
        initObserver()
      }
    }
  }
)

function initObserver() {
  // #ifdef H5
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            shouldLoad.value = true
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: props.rootMargin,
        threshold: 0.01,
      }
    )

    nextTick(() => {
      const el = document.getElementById(containerId.value)
      if (el && observer) {
        observer.observe(el)
      }
    })
    return
  }
  // #endif

  // #ifndef H5
  const instance = getCurrentInstance()
  if (instance && uni.createIntersectionObserver) {
    nextTick(() => {
      observerCtx = uni.createIntersectionObserver(instance, {
        thresholds: [0],
        observeAll: false,
      })

      const margin = parseInt(props.rootMargin) || 200
      observerCtx.relativeToViewport({
        top: margin,
        bottom: margin,
      })

      observerCtx.observe(`#${containerId.value}`, (res) => {
        if (res.intersectionRatio > 0) {
          shouldLoad.value = true
          if (observerCtx) {
            observerCtx.disconnect()
            observerCtx = null
          }
        }
      })
    })
    return
  }
  // #endif

  shouldLoad.value = true
}

function destroyObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (observerCtx) {
    observerCtx.disconnect()
    observerCtx = null
  }
}

function handleImageLoad() {
  isLoaded.value = true
  isError.value = false
  emit('load')
}

function handleImageError() {
  if (retryCount.value < props.maxRetries) {
    retryCount.value++
    const timestamp = Date.now()
    const separator = currentSrc.value.includes('?') ? '&' : '?'
    currentSrc.value = `${props.src}${separator}retry=${retryCount.value}&t=${timestamp}`
    return
  }

  if (props.errorImage) {
    currentSrc.value = props.errorImage
    isLoaded.value = true
  } else {
    isError.value = true
  }
  emit('error')
}

function handleRetry() {
  if (retryCount.value >= props.maxRetries + 2) return
  isError.value = false
  isLoaded.value = false
  retryCount.value++
  currentSrc.value = props.src
}
</script>

<style lang="scss" scoped>
.gexm-image-lazy {
  position: relative;
  overflow: hidden;
  background: $bg-color-gray-light;
  display: block;
  width: 100%;
  height: 100%;

  &--round {
    border-radius: $border-radius-base;
  }

  &--circle {
    border-radius: 50%;
  }

  &__image {
    width: 100%;
    height: 100%;
    display: block;
    opacity: 0;

    &--fade-in {
      animation: gexmFadeIn 0.3s ease-in-out forwards;
    }
  }

  &__placeholder {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $bg-color-gray-light;
  }

  &__skeleton {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      $bg-color-gray-light 25%,
      $bg-color-gray 50%,
      $bg-color-gray-light 75%
    );
    background-size: 200% 100%;
    animation: gexmSkeleton 1.5s ease-in-out infinite;
  }

  &__error {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: $bg-color-gray-light;

    &-icon {
      font-size: 48rpx;
      opacity: 0.5;
    }

    &-text {
      font-size: $font-size-xs;
      color: $text-color-placeholder;
      margin-top: $spacing-xs;
    }
  }
}

@keyframes gexmFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes gexmSkeleton {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
