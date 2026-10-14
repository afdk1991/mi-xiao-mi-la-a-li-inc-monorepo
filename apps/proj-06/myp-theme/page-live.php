<?php
/* Template Name: 直播页面 */
get_header(); ?>
<div class="container">
	<h1 style="padding:24px 0">直播广场</h1>
	<div id="myp-live-player" style="background:#000;aspect-ratio:16/9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff">
		请选择左侧直播
	</div>
	<div id="myp-live-list" style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 0"></div>
	<div style="display:grid;grid-template-columns:1fr 300px;gap:16px">
		<div id="myp-danmu-box" style="background:#fff;height:300px;overflow-y:auto;padding:12px;border-radius:8px"></div>
		<div id="myp-gift-panel" style="background:#fff;padding:12px;border-radius:8px">
			<h4>礼物</h4>
			<div id="myp-gift-list"></div>
		</div>
	</div>
	<div style="margin-top:12px">
		<input id="myp-danmu-input" placeholder="说点什么..." style="flex:1;padding:10px">
		<button class="btn btn-primary" onclick="mypSendDanmu()">发送</button>
	</div>
</div>
<?php get_footer(); ?>
