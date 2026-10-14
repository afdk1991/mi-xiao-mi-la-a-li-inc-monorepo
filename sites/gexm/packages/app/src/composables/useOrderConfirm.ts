import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useAddressStore } from '@/store/address'
import { useCartStore } from '@/store/cart'
import { useCouponStore } from '@/store/coupon'
import { memberApi } from '@/api/member'

export function useOrderConfirm() {
  const userStore = useUserStore()
  const addressStore = useAddressStore()
  const cartStore = useCartStore()
  const couponStore = useCouponStore()

  const pointsBalance = ref(0)
  const usePoints = ref(false)
  const pointsToUse = ref(0)
  const remark = ref('')
  const couponSelected = ref<{ discount: number; id: string } | null>(null)

  const goodsTotal = computed(() => {
    return cartStore.selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  })

  const shippingFee = computed(() => 0)

  const pointsDeduction = computed(() => {
    return Math.floor(pointsToUse.value / 100)
  })

  const finalAmount = computed(() => {
    let amount = goodsTotal.value + shippingFee.value
    if (couponSelected.value) {
      amount -= couponSelected.value.discount
    }
    amount -= pointsDeduction.value
    return Math.max(0, amount).toFixed(2)
  })

  async function initData() {
    try {
      if (addressStore.addresses.length === 0) {
        await addressStore.fetchAddresses()
      }

      if (!addressStore.currentAddress && addressStore.addresses.length > 0) {
        addressStore.setCurrentAddress(addressStore.defaultAddress || addressStore.addresses[0])
      }

      if (cartStore.selectedItems.length === 0 && cartStore.cartItems.length === 0) {
        await cartStore.fetchCart()
      }

      if (userStore.isLoggedIn) {
        await couponStore.fetchMyCoupons()
        try {
          const pointsResult = await memberApi.getPointsBalance()
          pointsBalance.value = pointsResult.balance || 0
        } catch (e) {
          console.error('Failed to fetch points balance:', e)
        }
      }
    } catch (e) {
      console.error('Failed to init order confirm data:', e)
    }
  }

  function handlePointsSwitch(e: { detail: { value: boolean } }) {
    usePoints.value = e.detail.value
    if (usePoints.value) {
      pointsToUse.value = Math.min(pointsBalance.value, Math.floor(goodsTotal.value * 100))
    } else {
      pointsToUse.value = 0
    }
  }

  function goAddress() {
    uni.navigateTo({ url: '/pages/address/address-list?select=1' })
  }

  function goCoupon() {
    uni.navigateTo({ url: '/pages/coupon/coupon-list?select=1' })
  }

  async function submitOrder() {
    if (!addressStore.currentAddress) {
      uni.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    if (cartStore.selectedItems.length === 0) {
      uni.showToast({ title: '请选择商品', icon: 'none' })
      return
    }

    uni.showLoading({ title: '提交中...' })
    try {
      await cartStore.createOrder({
        addressId: addressStore.currentAddress.id,
        couponId: couponSelected.value?.id,
        points: usePoints.value ? pointsToUse.value : 0,
        remark: remark.value,
      })
      uni.hideLoading()
      uni.showToast({ title: '下单成功', icon: 'success' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/order/order-list' })
      }, 1500)
    } catch (e) {
      uni.hideLoading()
      uni.showToast({ title: '下单失败', icon: 'none' })
    }
  }

  return {
    pointsBalance,
    usePoints,
    pointsToUse,
    remark,
    couponSelected,
    goodsTotal,
    shippingFee,
    pointsDeduction,
    finalAmount,
    initData,
    handlePointsSwitch,
    goAddress,
    goCoupon,
    submitOrder,
  }
}
