<template>
  <view class="order-confirm-page">
    <gexm-nav-bar title="确认订单" />

    <scroll-view class="order-confirm-scroll" scroll-y>
      <OrderAddress />
      <OrderGoods />
      <OrderCoupon :coupon-selected="couponSelected" />
      <OrderPoints
        v-model:use-points="usePoints"
        v-model:points-to-use="pointsToUse"
        :points-balance="pointsBalance"
        :goods-total="goodsTotal"
      />
      <OrderRemark v-model:remark="remark" />
      <OrderAmount
        :goods-total="goodsTotal"
        :shipping-fee="shippingFee"
        :coupon-selected="couponSelected"
        :use-points="usePoints"
        :points-to-use="pointsToUse"
      />
      <view class="bottom-space" />
    </scroll-view>

    <OrderBottomBar :final-amount="finalAmount" @submit="submitOrder" />
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAddressStore } from '@/store/address'
import { useOrderConfirm } from '@/composables/useOrderConfirm'
import OrderAddress from '@/components/order/OrderAddress.vue'
import OrderGoods from '@/components/order/OrderGoods.vue'
import OrderCoupon from '@/components/order/OrderCoupon.vue'
import OrderPoints from '@/components/order/OrderPoints.vue'
import OrderRemark from '@/components/order/OrderRemark.vue'
import OrderAmount from '@/components/order/OrderAmount.vue'
import OrderBottomBar from '@/components/order/OrderBottomBar.vue'

const addressStore = useAddressStore()

const {
  pointsBalance,
  usePoints,
  pointsToUse,
  remark,
  couponSelected,
  goodsTotal,
  shippingFee,
  finalAmount,
  initData,
  submitOrder,
} = useOrderConfirm()

onMounted(() => {
  initData()
})

onShow(() => {
  if (addressStore.addresses.length === 0) {
    initData()
  }
})
</script>

<style lang="scss" scoped>
.order-confirm-page {
  min-height: 100vh;
  background: $bg-color-page;
  display: flex;
  flex-direction: column;
}

.order-confirm-scroll {
  flex: 1;
  height: 0;
}

.bottom-space {
  height: 140rpx;
}
</style>
