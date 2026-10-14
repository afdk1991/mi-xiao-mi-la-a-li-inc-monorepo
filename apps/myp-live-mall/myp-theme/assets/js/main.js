/* MYP 全局交互 + 购物车 */
function mypApi(path, method, data) {
  return fetch(MYP_API.rest + path, {
    method: method || 'GET',
    headers: { 'X-WP-Nonce': MYP_API.nonce, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined
  }).then(r => r.json());
}

function mypAddCart(productId) {
  mypApi('cart', 'POST', { product_id: productId, quantity: 1 }).then(r => {
    alert(r.msg || '已加入购物车');
  });
}

function mypBuyNow(productId) {
  mypApi('cart', 'POST', { product_id: productId, quantity: 1 }).then(() => {
    location.href = MYP_API.home + 'cart';
  });
}

/* P1-12 修复：去结算 = 购物车 items + 收货表单 → POST /checkout（后端已支持优惠券/会员折扣/积分抵现） */
function mypCheckout() {
  const consignee = (document.getElementById('myp-consignee') || {}).value || '';
  const mobile    = (document.getElementById('myp-mobile') || {}).value || '';
  const address   = (document.getElementById('myp-address') || {}).value || '';
  if (!consignee || !mobile || !address) { alert('请填写完整的收货信息'); return; }
  mypApi('cart').then(r => {
    const items = (r.data || []).map(it => ({ product_id: it.product_id, quantity: it.quantity }));
    if (!items.length) { alert('购物车为空'); return; }
    mypApi('checkout', 'POST', { items, consignee, mobile, address }).then(res => {
      if (res.code === 0) {
        alert('下单成功：订单 #' + res.data.order_id + '，应付 ¥' + res.data.pay_amount + '（已优惠 ¥' + res.data.discount + '）');
        location.href = MYP_API.home + 'user-center';
      } else {
        alert(res.msg || '下单失败，请重试');
      }
    });
  });
}

jQuery(function ($) {
  // 购物车页
  if ($('#myp-cart-list').length) {
    mypApi('cart').then(r => {
      const items = r.data || [];
      if (!items.length) { $('#myp-cart-list').html('<p>购物车为空</p>'); return; }
      let html = '<table class="widefat"><tr><th>商品</th><th>单价</th><th>数量</th></tr>';
      items.forEach(it => {
        html += `<tr><td>${it.post_title}</td><td>¥${it.price}</td><td>${it.quantity}</td></tr>`;
      });
      html += '</table>';
      $('#myp-cart-list').html(html);
    });
  }
  // 用户中心
  if ($('#myp-user-orders').length) {
    mypApi('orders').then(r => {
      const list = r.data || [];
      $('#myp-user-orders').html(list.length ? '<pre>' + JSON.stringify(list, null, 2) + '</pre>' : '<p>暂无订单</p>');
    });
    mypApi('points').then(r => {
      $('#myp-user-points').html('当前积分：' + (r.data ? r.data.balance : 0));
    });
  }
});
