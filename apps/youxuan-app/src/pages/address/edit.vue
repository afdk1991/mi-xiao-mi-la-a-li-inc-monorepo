<template>
  <view class="page">
    <view class="card">
      <view class="row">
        <text class="label">收货人</text>
        <input v-model="form.name" class="input" placeholder="请输入姓名" />
      </view>
      <view class="row">
        <text class="label">手机号</text>
        <input v-model="form.phone" class="input" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="row">
        <text class="label">所在地区</text>
        <input v-model="form.region" class="input" placeholder="省 / 市 / 区" />
      </view>
      <view class="row column">
        <text class="label">详细地址</text>
        <textarea v-model="form.detail" class="textarea" placeholder="街道、楼牌号等" />
      </view>
      <view class="row">
        <text class="label">设为默认</text>
        <switch :checked="form.isDefault" @change="(e: any) => (form.isDefault = e.detail.value)" color="#FF5A1F" />
      </view>
    </view>
    <view class="save" @tap="save">保存</view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { userStore, type Address } from '../../store/user';

const form = reactive<Address>({
  id: '',
  name: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false,
});
const editId = ref('');

onLoad((q) => {
  const id = q?.id;
  if (id) {
    const a = userStore.state.addresses.find((x) => x.id === id);
    if (a) {
      editId.value = a.id;
      Object.assign(form, a);
    }
  }
});

function save() {
  if (!form.name.trim()) return uni.showToast({ title: '请填写收货人', icon: 'none' });
  if (!/^1\d{10}$/.test(form.phone.trim())) return uni.showToast({ title: '请填写正确手机号', icon: 'none' });
  if (!form.region.trim()) return uni.showToast({ title: '请填写所在地区', icon: 'none' });
  if (!form.detail.trim()) return uni.showToast({ title: '请填写详细地址', icon: 'none' });

  const payload: Address = {
    ...form,
    id: editId.value || `A${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: form.name.trim(),
    phone: form.phone.trim(),
    region: form.region.trim(),
    detail: form.detail.trim(),
  };
  userStore.saveAddress(payload);
  uni.showToast({ title: '已保存', icon: 'success' });
  setTimeout(() => {
    // 无上一页时（如从通知直达）navigateBack 会失败，回落到地址列表
    if (getCurrentPages().length > 1) uni.navigateBack();
    else uni.redirectTo({ url: '/pages/address/list' });
  }, 500);
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 0 24rpx; }
.row { display: flex; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row.column { flex-direction: column; align-items: flex-start; }
.row:last-child { border-bottom: none; }
.label { width: 160rpx; font-size: 28rpx; color: #333; }
.input { flex: 1; font-size: 28rpx; }
.textarea { width: 100%; height: 160rpx; margin-top: 16rpx; font-size: 28rpx; }
.save { margin-top: 40rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; }
</style>
