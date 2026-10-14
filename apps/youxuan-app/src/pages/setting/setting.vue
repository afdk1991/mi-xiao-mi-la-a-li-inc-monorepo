<template>
  <view class="page">
    <view class="card">
      <view class="row" @tap="clearCache">
        <text class="name">清除缓存</text>
        <text class="value">{{ cacheSize }}</text>
      </view>
      <view class="row" @tap="onAbout">
        <text class="name">关于我们</text>
        <text class="arrow">›</text>
      </view>
      <view class="row" @tap="onAgreement">
        <text class="name">用户协议</text>
        <text class="arrow">›</text>
      </view>
      <view class="row" @tap="onPrivacy">
        <text class="name">隐私政策</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view v-if="isLogin" class="logout" @tap="logout">退出登录</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { userStore } from '../../store/user';

const cacheSize = ref('0KB');
const isLogin = ref(false);

onShow(() => {
  isLogin.value = userStore.state.user.isLoggedIn;
  calcSize();
});

/** 统计缓存体积（H5 统计 localStorage，App 端统计本地文件） */
function calcSize() {
  try {
    // #ifdef H5
    // 口径必须与 doClear() 一致：只统计「会被清掉」的非 appsp_ 键。
    // 否则显示体积包含账号/订单等业务数据，清理后数字纹丝不动，用户会以为没清干净。
    let total = 0;
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('appsp_')) return;
      total += (localStorage.getItem(k) || '').length;
    });
    cacheSize.value = total > 1024 ? (total / 1024).toFixed(1) + 'KB' : total + 'B';
    // #endif
    // #ifndef H5
    uni.getSavedFileList({
      success: (res) => {
        const total = (res.fileList || []).reduce((s, f) => s + (f.size || 0), 0);
        cacheSize.value = total > 1024 ? (total / 1024).toFixed(1) + 'KB' : total + 'B';
      },
      fail: () => { cacheSize.value = '0KB'; },
    });
    // #endif
  } catch {
    cacheSize.value = '0KB';
  }
}

/** 真正执行清理：只删缓存类数据，appsp_ 前缀的业务数据（账号/订单/购物车）一律保留 */
function doClear(): Promise<number> {
  return new Promise((resolve) => {
    // #ifdef H5
    let n = 0;
    try {
      Object.keys(localStorage).forEach((k) => {
        if (!k.startsWith('appsp_')) {
          localStorage.removeItem(k);
          n++;
        }
      });
    } catch { /* ignore */ }
    resolve(n);
    // #endif
    // #ifndef H5
    uni.getSavedFileList({
      success: (res) => {
        const files = res.fileList || [];
        if (!files.length) return resolve(0);
        let done = 0;
        files.forEach((f) => {
          uni.removeSavedFile({
            filePath: f.filePath,
            complete: () => {
              done++;
              if (done === files.length) resolve(files.length);
            },
          });
        });
      },
      fail: () => resolve(0),
    });
    // #endif
  });
}

function clearCache() {
  uni.showModal({
    title: '清除缓存',
    content: '将清理临时图片与文件，不影响账号和订单数据',
    success: (r) => {
      if (!r.confirm) return;
      doClear().then((n) => {
        calcSize();
        uni.showToast({ title: n > 0 ? `已清理 ${n} 项` : '暂无缓存', icon: 'none' });
      });
    },
  });
}
function onAbout() { uni.navigateTo({ url: '/pages/about/about' }); }
function onAgreement() { uni.showModal({ title: '用户协议', content: '欢迎使用优选。您在使用本服务前应仔细阅读本协议。', showCancel: false }); }
function onPrivacy() { uni.showModal({ title: '隐私政策', content: '我们重视您的隐私，本应用仅在本地存储您的订单与设置数据。', showCancel: false }); }
function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success: (r) => {
      if (r.confirm) {
        userStore.logout();
        isLogin.value = false;
        uni.showToast({ title: '已退出', icon: 'success' });
      }
    },
  });
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 0 24rpx; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 30rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.name { font-size: 28rpx; color: #333; }
.value { font-size: 24rpx; color: #999; }
.arrow { color: #ccc; font-size: 32rpx; }
.logout { margin-top: 60rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #fff; color: #FF3B30; border-radius: 44rpx; font-size: 28rpx; }
</style>
