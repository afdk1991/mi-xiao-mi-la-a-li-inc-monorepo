<template>
  <view class="edit-profile-page">
    <gexm-nav-bar title="编辑资料" />

    <view class="edit-profile-content">
      <view class="edit-profile-avatar-section">
        <view class="edit-profile-avatar-wrapper" @click="chooseAvatar">
          <image v-if="form.avatar" class="edit-profile-avatar" :src="form.avatar" />
          <view v-else class="edit-profile-avatar edit-profile-avatar-default">
            <text>{{ form.nickname.charAt(0) || 'G' }}</text>
          </view>
          <view class="edit-profile-avatar-mask">
            <text>更换头像</text>
          </view>
        </view>
      </view>

      <view class="edit-profile-form">
        <gexm-input
          v-model="form.nickname"
          label="昵称"
          placeholder="请输入昵称"
          :error="errors.nickname"
        />

        <gexm-input
          v-model="form.username"
          label="用户名"
          :disabled="true"
          placeholder="用户名不可修改"
          style="margin-top: 24rpx"
        />

        <gexm-input
          v-model="form.email"
          label="邮箱"
          :disabled="true"
          placeholder="邮箱不可修改"
          style="margin-top: 24rpx"
        />

        <gexm-input
          v-model="form.phone"
          label="手机号"
          placeholder="请输入手机号（选填）"
          :error="errors.phone"
          style="margin-top: 24rpx"
        />
      </view>

      <gexm-button
        type="primary"
        size="large"
        block
        :loading="loading"
        style="margin-top: 48rpx"
        @click="handleSave"
      >
        保存修改
      </gexm-button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import { authApi, uploadApi } from '../../api'
import { isValidPhone } from '../../utils'

const userStore = useUserStore()

const form = reactive({
  nickname: '',
  username: '',
  email: '',
  phone: '',
  avatar: '',
})

const errors = reactive({
  nickname: '',
  phone: '',
})

const loading = ref(false)
const loadingProfile = ref(false)

onLoad(() => {
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/login/login' })
    }, 1500)
    return
  }
  loadProfile()
})

async function loadProfile() {
  if (userStore.userInfo) {
    form.nickname = userStore.userInfo.nickname || ''
    form.username = userStore.userInfo.username || ''
    form.email = userStore.userInfo.email || ''
    form.phone = userStore.userInfo.phone || ''
    form.avatar = userStore.userInfo.avatar || ''
  }

  loadingProfile.value = true
  try {
    const res = await authApi.getProfile()
    if (res) {
      form.nickname = res.nickname || ''
      form.username = res.username || ''
      form.email = res.email || ''
      form.phone = res.phone || ''
      form.avatar = res.avatar || ''
      userStore.setUserInfo(res)
    }
  } catch (err) {
    console.error('Load profile failed:', err)
  } finally {
    loadingProfile.value = false
  }
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      cropAvatar(tempFilePath)
    },
    fail: () => {
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    },
  })
}

function cropAvatar(tempFilePath) {
  uni.cropImage({
    src: tempFilePath,
    cropScale: 1,
    success: async (cropRes) => {
      const croppedFilePath = cropRes.tempFilePath
      try {
        const uploadRes = await uploadApi.uploadImage(croppedFilePath)
        form.avatar = uploadRes.url
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (err) {
        console.error('Upload avatar failed:', err)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.showToast({ title: '裁剪失败', icon: 'none' })
    },
  })
}

function validate() {
  let valid = true
  errors.nickname = ''
  errors.phone = ''

  if (!form.nickname) {
    errors.nickname = '请输入昵称'
    valid = false
  } else if (form.nickname.length < 2 || form.nickname.length > 20) {
    errors.nickname = '昵称长度应为2-20个字符'
    valid = false
  }

  if (form.phone && !isValidPhone(form.phone)) {
    errors.phone = '手机号格式不正确'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return

  loading.value = true
  try {
    const res = await authApi.updateProfile({
      nickname: form.nickname,
      avatar: form.avatar,
      phone: form.phone,
    })

    userStore.updateUserInfo(res)

    uni.showToast({ title: '保存成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (err) {
    console.error('Save profile failed:', err)
    const msg = err?.message || err?.msg || '保存失败，请重试'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.edit-profile-page {
  min-height: 100vh;
  background: $bg-color-page;
}

.edit-profile-content {
  padding: 32rpx;
}

.edit-profile-avatar-section {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.edit-profile-avatar-wrapper {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.edit-profile-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;

  &-default {
    background: $primary-color;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64rpx;
    font-weight: bold;
    color: #fff;
  }
}

.edit-profile-avatar-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 20rpx;
  text-align: center;
  padding: 8rpx 0;
  border-bottom-left-radius: 80rpx;
  border-bottom-right-radius: 80rpx;
}

.edit-profile-form {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: $shadow-sm;
}
</style>
