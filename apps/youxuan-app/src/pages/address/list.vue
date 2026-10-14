<template>
  <view class="page">
    <view v-if="list.length === 0" class="empty">
      <text class="empty-icon">📍</text>
      <text class="empty-text">还没有收货地址</text>
    </view>

    <view v-else>
      <view v-for="a in list" :key="a.id" class="card">
        <view class="main" @tap="choose(a)">
          <view class="row1">
            <text class="name">{{ a.name }}</text>
            <text class="phone">{{ a.phone }}</text>
            <text v-if="a.isDefault" class="default">默认</text>
          </view>
          <text class="detail">{{ a.region }} {{ a.detail }}</text>
        </view>
        <view class="ops">
          <text class="op" @tap="setDefault(a)">设为默认</text>
          <text class="op" @tap="edit(a)">编辑</text>
          <text class="op danger" @tap="del(a)">删除</text>
        </view>
      </view>
    </view>

    <view class="footer">
      <view class="add" @tap="add">+ 新增收货地址</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { userStore, type Address } from '../../store/user';

const list = ref<Address[]>([]);
const selectMode = ref(false);

onLoad((q) => {
  selectMode.value = q?.select === '1';
});
onShow(() => {
  list.value = [...userStore.state.addresses];
});

function choose(a: Address) {
  if (!selectMode.value) return;
  // 通过 store 回传选中结果：<script setup> 的绑定不会暴露到页面实例上，
  // prev.$vm.address = a 在生产构建下不生效，故改用 store 中转
  userStore.setPendingAddress(a.id);
  uni.navigateBack();
}
function add() {
  uni.navigateTo({ url: '/pages/address/edit' });
}
function edit(a: Address) {
  uni.navigateTo({ url: `/pages/address/edit?id=${a.id}` });
}
function del(a: Address) {
  uni.showModal({
    title: '删除地址',
    content: '确定删除该地址？',
    success: (r) => {
      if (r.confirm) {
        userStore.removeAddress(a.id);
        list.value = [...userStore.state.addresses];
      }
    },
  });
}
function setDefault(a: Address) {
  userStore.setDefaultAddress(a.id);
  list.value = [...userStore.state.addresses];
}
</script>

<style scoped>
.page { padding: 16rpx 24rpx 160rpx; min-height: 100vh; }
.empty { text-align: center; padding: 160rpx 0; color: #999; }
.empty-icon { font-size: 80rpx; display: block; }
.empty-text { font-size: 26rpx; display: block; margin-top: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.row1 { display: flex; align-items: center; gap: 16rpx; }
.name { font-size: 30rpx; color: #222; font-weight: 600; }
.phone { font-size: 26rpx; color: #666; }
.default { font-size: 20rpx; color: #FF5A1F; background: #FFEDE3; padding: 4rpx 12rpx; border-radius: 8rpx; }
.detail { font-size: 26rpx; color: #555; margin-top: 12rpx; line-height: 1.5; display: block; }
.ops { display: flex; justify-content: flex-end; gap: 32rpx; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f5f5f5; }
.op { font-size: 24rpx; color: #666; }
.op.danger { color: #FF3B30; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #eee; }
.add { height: 88rpx; line-height: 88rpx; text-align: center; background: linear-gradient(135deg, #FF8A65, #FF5A1F); color: #fff; border-radius: 44rpx; font-size: 28rpx; font-weight: 600; }
</style>
