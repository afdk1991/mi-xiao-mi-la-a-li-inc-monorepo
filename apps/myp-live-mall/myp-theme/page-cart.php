<?php
/* Template Name: 购物车页面 */
get_header(); ?>
<div class="container">
	<h1 style="padding:24px 0">购物车</h1>
	<div id="myp-cart-list">加载中...</div>
	<div style="background:#fff;padding:16px;border-radius:8px;margin:16px 0;max-width:480px">
		<h3 style="margin-bottom:12px">收货信息</h3>
		<p>收货人 <input id="myp-consignee" class="regular-text" style="width:100%" placeholder="姓名"></p>
		<p>手机号 <input id="myp-mobile" class="regular-text" style="width:100%" placeholder="手机号"></p>
		<p>收货地址 <input id="myp-address" class="regular-text" style="width:100%" placeholder="省市区 + 详细地址"></p>
	</div>
	<p style="margin:20px 0">
		<button class="btn btn-primary" onclick="mypCheckout()">去结算</button>
	</p>
</div>
<?php get_footer(); ?>
