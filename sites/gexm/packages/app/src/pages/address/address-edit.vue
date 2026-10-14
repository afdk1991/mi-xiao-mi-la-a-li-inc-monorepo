<template>
  <view class="address-edit-page">
    <gexm-nav-bar :title="isEdit ? '编辑地址' : '新增地址'" />

    <view class="address-form">
      <view class="form-section">
        <view class="form-item">
          <text class="form-label">收货人</text>
          <input
            v-model="form.name"
            class="form-input"
            type="text"
            placeholder="请输入收货人姓名"
            placeholder-class="form-placeholder"
            aria-label="收货人姓名"
          />
        </view>
        <text v-if="errors.name" class="form-error">{{ errors.name }}</text>

        <view class="form-item">
          <text class="form-label">手机号</text>
          <input
            v-model="form.phone"
            class="form-input"
            type="number"
            placeholder="请输入手机号"
            placeholder-class="form-placeholder"
            maxlength="11"
            aria-label="手机号"
          />
        </view>
        <text v-if="errors.phone" class="form-error">{{ errors.phone }}</text>

        <view class="form-item" @click="showRegionPicker = true">
          <text class="form-label">所在地区</text>
          <view class="form-value">
            <text v-if="regionText" class="form-value-text">{{ regionText }}</text>
            <text v-else class="form-placeholder">请选择省市区</text>
            <text class="form-arrow">›</text>
          </view>
        </view>
        <text v-if="errors.region" class="form-error">{{ errors.region }}</text>

        <view class="form-item form-item--textarea">
          <text class="form-label">详细地址</text>
          <textarea
            v-model="form.detail"
            class="form-textarea"
            placeholder="请输入详细地址，如街道、门牌号等"
            placeholder-class="form-placeholder"
            maxlength="200"
            :auto-height="true"
            aria-label="详细地址"
          ></textarea>
        </view>
        <text v-if="errors.detail" class="form-error">{{ errors.detail }}</text>
      </view>

      <view class="form-section">
        <view class="form-item form-item--switch">
          <text class="form-label">设为默认地址</text>
          <switch :checked="form.is_default" color="#409eff" @change="handleSwitchChange" />
        </view>
      </view>
    </view>

    <view class="form-bottom">
      <gexm-button
        type="primary"
        block
        round
        :loading="submitting"
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        保存
      </gexm-button>
    </view>

    <view v-if="showRegionPicker" class="region-picker-mask" @click="showRegionPicker = false">
      <view class="region-picker" @click.stop>
        <view class="region-picker__header">
          <text class="region-picker__cancel" @click="showRegionPicker = false">取消</text>
          <text class="region-picker__title">选择地区</text>
          <text class="region-picker__confirm" @click="confirmRegion">确定</text>
        </view>
        <view class="region-picker__tabs">
          <view class="region-tab" :class="{ active: currentTab === 0 }" @click="switchTab(0)">
            <text>{{ tempRegion.province || '请选择' }}</text>
          </view>
          <view
            v-if="tempRegion.province"
            class="region-tab"
            :class="{ active: currentTab === 1 }"
            @click="switchTab(1)"
          >
            <text>{{ tempRegion.city || '请选择' }}</text>
          </view>
          <view
            v-if="tempRegion.city"
            class="region-tab"
            :class="{ active: currentTab === 2 }"
            @click="switchTab(2)"
          >
            <text>{{ tempRegion.district || '请选择' }}</text>
          </view>
        </view>
        <scroll-view scroll-y class="region-picker__list">
          <view
            v-for="(item, index) in currentRegionList"
            :key="index"
            class="region-item"
            :class="{ active: isRegionSelected(item) }"
            @click="selectRegion(item)"
          >
            <text>{{ item.name }}</text>
            <text v-if="isRegionSelected(item)" class="region-check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAddressStore } from '@/store/address'
import { useUserStore } from '@/store/user'
import { isValidPhone } from '@/utils'

const addressStore = useAddressStore()
const userStore = useUserStore()

const isEdit = ref(false)
const addressId = ref('')
const submitting = ref(false)
const showRegionPicker = ref(false)
const currentTab = ref(0)

const form = ref({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false,
})

const errors = reactive({
  name: '',
  phone: '',
  region: '',
  detail: '',
})

const tempRegion = ref({
  province: '',
  city: '',
  district: '',
})

const regionText = computed(() => {
  const { province, city, district } = form.value
  if (province && city && district) {
    return `${province} ${city} ${district}`
  }
  return ''
})

const canSubmit = computed(() => {
  const { name, phone, province, city, district, detail } = form.value
  return name.trim() && phone.trim() && province && city && district && detail.trim()
})

const regionData = ref([
  {
    name: '北京市',
    cities: [
      {
        name: '北京市',
        districts: [
          '东城区',
          '西城区',
          '朝阳区',
          '丰台区',
          '石景山区',
          '海淀区',
          '门头沟区',
          '房山区',
          '通州区',
          '顺义区',
        ],
      },
    ],
  },
  {
    name: '上海市',
    cities: [
      {
        name: '上海市',
        districts: [
          '黄浦区',
          '徐汇区',
          '长宁区',
          '静安区',
          '普陀区',
          '虹口区',
          '杨浦区',
          '闵行区',
          '宝山区',
          '嘉定区',
        ],
      },
    ],
  },
  {
    name: '广东省',
    cities: [
      {
        name: '广州市',
        districts: [
          '荔湾区',
          '越秀区',
          '海珠区',
          '天河区',
          '白云区',
          '黄埔区',
          '番禺区',
          '花都区',
          '南沙区',
          '从化区',
        ],
      },
      {
        name: '深圳市',
        districts: [
          '罗湖区',
          '福田区',
          '南山区',
          '宝安区',
          '龙岗区',
          '盐田区',
          '龙华区',
          '坪山区',
          '光明区',
        ],
      },
      {
        name: '东莞市',
        districts: [
          '东城街道',
          '南城街道',
          '万江街道',
          '莞城街道',
          '石碣镇',
          '石龙镇',
          '茶山镇',
          '石排镇',
          '企石镇',
          '横沥镇',
        ],
      },
    ],
  },
  {
    name: '浙江省',
    cities: [
      {
        name: '杭州市',
        districts: [
          '上城区',
          '下城区',
          '江干区',
          '拱墅区',
          '西湖区',
          '滨江区',
          '萧山区',
          '余杭区',
          '富阳区',
          '临安区',
        ],
      },
      {
        name: '宁波市',
        districts: [
          '海曙区',
          '江北区',
          '北仑区',
          '镇海区',
          '鄞州区',
          '奉化区',
          '余姚市',
          '慈溪市',
          '象山县',
          '宁海县',
        ],
      },
    ],
  },
  {
    name: '江苏省',
    cities: [
      {
        name: '南京市',
        districts: [
          '玄武区',
          '秦淮区',
          '建邺区',
          '鼓楼区',
          '浦口区',
          '栖霞区',
          '雨花台区',
          '江宁区',
          '六合区',
          '溧水区',
        ],
      },
      {
        name: '苏州市',
        districts: [
          '姑苏区',
          '虎丘区',
          '吴中区',
          '相城区',
          '吴江区',
          '常熟市',
          '张家港市',
          '昆山市',
          '太仓市',
        ],
      },
    ],
  },
])

const currentRegionList = computed(() => {
  if (currentTab.value === 0) {
    return regionData.value.map((p) => ({ name: p.name }))
  } else if (currentTab.value === 1) {
    const province = regionData.value.find((p) => p.name === tempRegion.value.province)
    return province ? province.cities.map((c) => ({ name: c.name })) : []
  } else {
    const province = regionData.value.find((p) => p.name === tempRegion.value.province)
    const city = province?.cities.find((c) => c.name === tempRegion.value.city)
    return city ? city.districts.map((d) => ({ name: d })) : []
  }
})

onLoad((options) => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/login' })
    }, 1500)
    return
  }

  if (options.id) {
    isEdit.value = true
    addressId.value = options.id
    loadAddressDetail()
  }
})

function validate() {
  let valid = true
  Object.keys(errors).forEach((k) => (errors[k] = ''))

  if (!form.value.name.trim()) {
    errors.name = '请输入收货人姓名'
    valid = false
  }

  if (!form.value.phone.trim()) {
    errors.phone = '请输入手机号'
    valid = false
  } else if (!isValidPhone(form.value.phone)) {
    errors.phone = '手机号格式不正确'
    valid = false
  }

  if (!form.value.province || !form.value.city || !form.value.district) {
    errors.region = '请选择所在地区'
    valid = false
  }

  if (!form.value.detail.trim()) {
    errors.detail = '请输入详细地址'
    valid = false
  }

  return valid
}

async function loadAddressDetail() {
  try {
    const detail = await addressStore.fetchAddressDetail(addressId.value)
    if (detail) {
      form.value = {
        name: detail.name || detail.receiver_name || '',
        phone: detail.phone || detail.mobile || '',
        province: detail.province || '',
        city: detail.city || '',
        district: detail.district || '',
        detail: detail.detail || detail.address || '',
        is_default: !!detail.is_default,
      }
    }
  } catch (err) {
    console.error('Failed to load address detail:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function handleSwitchChange(e) {
  form.value.is_default = e.detail.value
}

function switchTab(index) {
  currentTab.value = index
}

function isRegionSelected(item) {
  if (currentTab.value === 0) return tempRegion.value.province === item.name
  if (currentTab.value === 1) return tempRegion.value.city === item.name
  if (currentTab.value === 2) return tempRegion.value.district === item.name
  return false
}

function selectRegion(item) {
  if (currentTab.value === 0) {
    tempRegion.value.province = item.name
    tempRegion.value.city = ''
    tempRegion.value.district = ''
    currentTab.value = 1
  } else if (currentTab.value === 1) {
    tempRegion.value.city = item.name
    tempRegion.value.district = ''
    currentTab.value = 2
  } else {
    tempRegion.value.district = item.name
  }
}

function confirmRegion() {
  if (!tempRegion.value.province || !tempRegion.value.city || !tempRegion.value.district) {
    uni.showToast({ title: '请选择完整的地区', icon: 'none' })
    return
  }
  form.value.province = tempRegion.value.province
  form.value.city = tempRegion.value.city
  form.value.district = tempRegion.value.district
  showRegionPicker.value = false
}

async function handleSubmit() {
  if (!validate() || submitting.value) return

  submitting.value = true
  try {
    const data = {
      name: form.value.name.trim(),
      phone: form.value.phone.trim(),
      province: form.value.province,
      city: form.value.city,
      district: form.value.district,
      detail: form.value.detail.trim(),
      is_default: form.value.is_default ? 1 : 0,
    }

    if (isEdit.value) {
      await addressStore.updateAddress(addressId.value, data)
    } else {
      await addressStore.createAddress(data)
    }

    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (err) {
    console.error('Failed to save address:', err)
    const msg = err?.message || err?.msg || '保存失败，请重试'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.address-edit-page {
  min-height: 100vh;
  background: $bg-color-page;
  padding-bottom: 140rpx;
}

.address-form {
  padding: 24rpx;
}

.form-section {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid $border-color-lighter;

  &:last-child {
    border-bottom: none;
  }

  &--textarea {
    flex-direction: column;
    align-items: flex-start;
  }

  &--switch {
    justify-content: space-between;
  }
}

.form-label {
  font-size: 28rpx;
  color: $text-color;
  width: 160rpx;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: $text-color;
  text-align: right;
}

.form-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.form-value-text {
  font-size: 28rpx;
  color: $text-color;
}

.form-placeholder {
  font-size: 28rpx;
  color: $text-color-placeholder;
}

.form-arrow {
  font-size: 32rpx;
  color: $text-color-placeholder;
  margin-left: 8rpx;
}

.form-textarea {
  width: 100%;
  font-size: 28rpx;
  color: $text-color;
  margin-top: 16rpx;
  min-height: 120rpx;
}

.form-error {
  display: block;
  font-size: 24rpx;
  color: $danger-color;
  padding: 0 24rpx 16rpx;
}

.form-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border-color-lighter;
}

.region-picker-mask {
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

.region-picker {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 32rpx;
    border-bottom: 1rpx solid $border-color-lighter;
  }

  &__cancel {
    font-size: 28rpx;
    color: $text-color-secondary;
  }

  &__title {
    font-size: 32rpx;
    font-weight: bold;
    color: $text-color;
  }

  &__confirm {
    font-size: 28rpx;
    color: $primary-color;
    font-weight: 500;
  }

  &__tabs {
    display: flex;
    padding: 0 24rpx;
    border-bottom: 1rpx solid $border-color-lighter;
  }

  &__list {
    max-height: 50vh;
    padding: 16rpx 0;
  }
}

.region-tab {
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: $text-color-secondary;
  position: relative;

  &.active {
    color: $primary-color;
    font-weight: 500;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 4rpx;
      background: $primary-color;
      border-radius: 2rpx;
    }
  }
}

.region-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: $text-color;

  &.active {
    color: $primary-color;
  }

  &:active {
    background: $bg-color;
  }
}

.region-check {
  color: $primary-color;
  font-size: 28rpx;
  font-weight: bold;
}
</style>
