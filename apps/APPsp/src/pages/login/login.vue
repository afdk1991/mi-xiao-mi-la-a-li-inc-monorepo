<template>
  <view class="page">
    <view class="logo-block">
      <view class="logo">优</view>
      <text class="app-name">优选</text>
      <text class="slogan">综合型电商 · 内容 · 工具</text>
    </view>

    <view class="form">
      <view class="field">
        <text class="prefix">+86</text>
        <input v-model="phone" class="input" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="field">
        <input v-model="code" class="input" type="number" maxlength="6" placeholder="请输入验证码" />
        <text class="send" :class="{ disabled: counting > 0 }" @tap="sendCode">{{ counting > 0 ? counting + 's' : '获取验证码' }}</text>
      </view>
      <view class="login-btn" @tap="doLogin">一键登录 / 注册</view>
      <view class="agreement">
        <text class="dot" :class="{ on: agreed }" @tap="agreed = !agreed"></text>
        <text class="agree-text">我已阅读并同意《用户协议》《隐私政策》</text>
      </view>
    </view>

    <view class="other">
      <view class="other-item" @tap="quickLogin">🟢 微信一键登录</view>
      <view class="other-item" @tap="quickLogin">🍎 Apple 登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { userStore } from '../../store/user';

const phone = ref('');
/** 登录后要直达的页面（非 tabBar）。例如「立即购买」被打断时传 /pages/order/confirm */
const redirect = ref('');
const code = ref('');
const counting = ref(0);
const agreed = ref(true);
let timer: ReturnType<typeof setInterval> | null = null;
/** 登录成功后的延时跳转：页面若在 600ms 内被销毁，必须取消，否则会在已卸载页面触发导航 */
let navTimer: ReturnType<typeof setTimeout> | null = null;

onLoad((q) => {
  redirect.value = (q?.redirect as string) || '';
});

function sendCode() {
  if (counting.value > 0) return;
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  counting.value = 60;
  uni.showToast({ title: '验证码已发送（演示：123456）', icon: 'none' });
  code.value = '123456';
  timer = setInterval(() => {
    counting.value -= 1;
    if (counting.value <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

function doLogin() {
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (!code.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' });
    return;
  }
  if (!agreed.value) {
    uni.showToast({ title: '请先同意协议', icon: 'none' });
    return;
  }
  userStore.login(phone.value);
  uni.showToast({ title: '登录成功', icon: 'success' });
  navTimer = setTimeout(() => goBack(), 600);
}

function quickLogin() {
  userStore.login('13800138000');
  uni.showToast({ title: '登录成功', icon: 'success' });
  navTimer = setTimeout(() => goBack(), 600);
}

/** 登录成功后的去向：有 redirect 直达目标；否则回上一页；无上一页则回首页 */
function goBack() {
  if (redirect.value) {
    // 直接切到目标页，避免用户回到原页后还要再点一次「立即购买」
    uni.redirectTo({ url: redirect.value });
    return;
  }
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: '/pages/index/index' });
  }
}

onUnload(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (navTimer) {
    clearTimeout(navTimer);
    navTimer = null;
  }
});
</script>

<style scoped>
.page { padding: 80rpx 48rpx; min-height: 100vh; }
.logo-block { text-align: center; margin-bottom: 80rpx; }
.logo { width: 140rpx; height: 140rpx; border-radius: 36rpx; background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; font-size: 64rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 24rpx; }
.app-name { font-size: 40rpx; color: #222; font-weight: 700; display: block; }
.slogan { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.form { display: flex; flex-direction: column; gap: 24rpx; }
.field { display: flex; align-items: center; height: 96rpx; background: #fff; border-radius: 16rpx; padding: 0 24rpx; gap: 16rpx; }
.prefix { font-size: 28rpx; color: #222; font-weight: 600; padding-right: 16rpx; border-right: 1rpx solid #eee; }
.input { flex: 1; font-size: 28rpx; }
.send { font-size: 24rpx; color: #FF5A1F; }
.send.disabled { color: #aaa; }
.login-btn { height: 96rpx; line-height: 96rpx; text-align: center; background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; border-radius: 48rpx; font-size: 30rpx; font-weight: 600; margin-top: 16rpx; }
.agreement { display: flex; align-items: center; justify-content: center; gap: 10rpx; margin-top: 24rpx; }
.dot { width: 28rpx; height: 28rpx; border-radius: 50%; border: 2rpx solid #ccc; }
.dot.on { background: #FF5A1F; border-color: #FF5A1F; position: relative; }
.dot.on::after { content: '✓'; color: #fff; font-size: 18rpx; position: absolute; left: 5rpx; top: 0; }
.agree-text { font-size: 22rpx; color: #999; }
.other { margin-top: 100rpx; display: flex; justify-content: center; gap: 40rpx; }
.other-item { font-size: 40rpx; }
</style>
