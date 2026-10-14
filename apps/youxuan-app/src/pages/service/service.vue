<template>
  <view class="page">
    <scroll-view class="chat" scroll-y :scroll-into-view="anchor" scroll-with-animation>
      <view v-for="(m, i) in messages" :key="i" class="msg" :class="m.from" :id="`m${i}`">
        <view class="bubble">{{ m.text }}</view>
      </view>
      <view id="bottom" class="anchor"></view>
    </scroll-view>
    <view class="input-bar">
      <input v-model="text" class="input" placeholder="请输入您的问题…" confirm-type="send" @confirm="send" />
      <view class="send" @tap="send">发送</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';

interface Msg { from: 'me' | 'bot'; text: string; }
const anchor = ref('');
const messages = ref<Msg[]>([
  { from: 'bot', text: '您好，这里是优选智能客服，请问有什么可以帮您？' },
  { from: 'bot', text: '您可以咨询：订单查询 / 退换货 / 发票 / 账户问题' },
]);
const text = ref('');

const replies: [RegExp, string][] = [
  [/订单|发货|物流/, '您可在「我的 → 我的订单」中查看实时物流状态。'],
  [/退款|退货|退换/, '7 天无理由退货，退款将在 1-3 个工作日原路退回。'],
  [/发票/, '请在订单完成后联系人工客服开具电子发票。'],
  [/人工/, '正在为您转接人工客服（演示环境，请留言）。'],
  [/你好|hi|hello/, '您好，请问有什么可以帮您？'],
];

/** 滚到最新一条 */
function scrollBottom() {
  nextTick(() => { anchor.value = 'bottom'; });
}

function send() {
  const t = text.value.trim();
  if (!t) return;
  messages.value.push({ from: 'me', text: t });
  text.value = '';
  scrollBottom();
  setTimeout(() => {
    const hit = replies.find(([re]) => re.test(t));
    messages.value.push({ from: 'bot', text: hit ? hit[1] : '已收到您的问题，客服会尽快回复。' });
    scrollBottom();
  }, 500);
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; }
.chat { flex: 1; padding: 24rpx; height: 0; }
.anchor { height: 1rpx; }
.msg { display: flex; margin-bottom: 20rpx; }
.msg.me { justify-content: flex-end; }
.bubble { max-width: 70%; padding: 20rpx 24rpx; border-radius: 16rpx; font-size: 26rpx; line-height: 1.5; }
.msg.bot .bubble { background: #fff; color: #333; }
.msg.me .bubble { background: #FF5A1F; color: #fff; }
.input-bar { display: flex; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #eee; }
.input { flex: 1; height: 72rpx; background: #f2f3f5; border-radius: 36rpx; padding: 0 24rpx; font-size: 26rpx; }
.send { background: #FF5A1F; color: #fff; padding: 0 32rpx; height: 72rpx; line-height: 72rpx; border-radius: 36rpx; font-size: 26rpx; }
</style>
