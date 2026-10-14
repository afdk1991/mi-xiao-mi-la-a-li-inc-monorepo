(function ($) {
	'use strict';

	/* 加载动画隐藏 */
	function hideLoading() {
		var el = document.getElementById('page-loading');
		if (el) { el.classList.add('hide'); setTimeout(function () { el.remove(); }, 350); }
	}
	window.addEventListener('load', function () { setTimeout(hideLoading, 200); });
	setTimeout(hideLoading, 1500); // 兜底

	$(function () {
		/* 移动端菜单 */
		$('#menu-toggle').on('click', function () { $('#main-nav').toggleClass('open'); });

		/* 头部搜索展开 */
		$('#search-toggle').on('click', function () {
			$('#header-search').toggleClass('open');
			setTimeout(function () { var i = $('#header-search input[type=search]'); if (i.length) { i.focus(); } }, 50);
		});

		/* 用户菜单 */
		$('#avatar-btn').on('click', function (e) { e.stopPropagation(); $('#user-menu').toggleClass('open'); });
		$(document).on('click', function () { $('#user-menu').removeClass('open'); });

		/* 首页滑块 */
		var $slider = $('#hero-slider');
		if ($slider.length) {
			var $slides = $slider.find('.slide');
			var idx = 0;
			function show(i) {
				$slides.removeClass('active');
				$slides.eq(i).addClass('active');
				$('.slider-dots button').removeClass('active');
				$('.slider-dots button').eq(i).addClass('active');
			}
			var dots = '';
			$slides.each(function (i) { dots += '<button data-i="' + i + '"></button>'; });
			$slider.find('.slider-dots').html(dots);
			$('.slider-dots button').first().addClass('active');
			$('.slider-dots').on('click', 'button', function () { idx = $(this).data('i'); show(idx); });
			$slider.find('.slider-next').on('click', function () { idx = (idx + 1) % $slides.length; show(idx); });
			$slider.find('.slider-prev').on('click', function () { idx = (idx - 1 + $slides.length) % $slides.length; show(idx); });
			if ($slides.length > 1) { setInterval(function () { idx = (idx + 1) % $slides.length; show(idx); }, 5000); }
		}

		/* 深色模式切换 */
		var $dt = $('#dark-toggle');
		if (document.documentElement.classList.contains('dark')) { $dt.text('☀️'); }
		$dt.on('click', function () {
			var html = document.documentElement;
			var dark = html.classList.toggle('dark');
			try { localStorage.setItem('zibstyle_dark', dark ? '1' : '0'); } catch (e) {}
			document.cookie = 'zibstyle_dark=' + (dark ? '1' : '0') + ';path=/;max-age=' + (60 * 60 * 24 * 365);
			$dt.text(dark ? '☀️' : '🌙');
		});

		/* 点赞 / 收藏（AJAX） */
		var ajax = window.zibstyle_ajax || { url: '/wp-admin/admin-ajax.php', nonce: '' };
		$(document).on('click', '.act-btn', function () {
			var $btn = $(this);
			var act = $btn.data('act');
			var postId = $btn.data('post');
			if (act === 'fav' && !document.body.className.match(/logged-in/)) {
				if (confirm('收藏需要登录，是否前往登录？')) {
					window.location.href = ($('.header-user .login-link').attr('href')) || '/wp-login.php';
				}
				return;
			}
			$.ajax({
				url: ajax.url, type: 'POST', dataType: 'json',
				data: { action: 'zibstyle_' + act, post_id: postId, nonce: ajax.nonce },
				success: function (res) {
					if (res.success) {
						if (act === 'like') {
							$btn.toggleClass('active', res.data.liked);
							$btn.find('.txt').text(res.data.likes);
						} else if (act === 'fav') {
							$btn.toggleClass('active', res.data.faved);
						}
					} else if (act === 'fav') {
						alert(res.data && res.data.msg ? res.data.msg : '操作失败');
					}
				}
			});
		});

		/* 文章目录树 TOC：从正文 h2/h3 生成，点击平滑滚动，滚动高亮 */
		var $content = $('.entry-content');
		var $tocBody = $('#post-toc .toc-body');
		if ($content.length && $tocBody.length) {
			var heads = $content.find('h2, h3');
			if (heads.length) {
				var ol = $('<ol></ol>');
				heads.each(function (i) {
					var tag = this.tagName.toLowerCase();
					var id = 'toc-' + i;
					this.id = id;
					var li = $('<li><a href="#' + id + '">' + $(this).text() + '</a></li>');
					if (tag === 'h3') {
						var lastLi = ol.children('li').last();
						if (lastLi.length && lastLi.find('ol').length === 0) { lastLi.append('<ol></ol>'); }
						var sub = lastLi.length ? lastLi.find('ol').last() : ol;
						sub.append(li);
					} else {
						ol.append(li);
					}
				});
				$tocBody.replaceWith(ol);

				ol.on('click', 'a', function (e) {
					e.preventDefault();
					var t = $(this.getAttribute('href'));
					if (t.length) { $('html,body').animate({ scrollTop: t.offset().top - 80 }, 400); }
				});

				$(window).on('scroll', function () {
					var pos = $(window).scrollTop();
					var cur = heads[0];
					heads.each(function () { if ($(this).offset().top - 90 <= pos) { cur = this; } });
					ol.find('a').removeClass('active').filter('[href="#' + cur.id + '"]').addClass('active');
				});
			} else {
				$('#post-toc').hide();
			}
		}
	});

	/* 返回顶部 FAB */
	var $fab = $('#fab');
	if ($fab.length) {
		$(window).on('scroll', function () {
			$fab.toggleClass('show', $(window).scrollTop() > 400);
		});
		$fab.on('click', function () { $('html,body').animate({ scrollTop: 0 }, 400); });
	}
});
})(jQuery);
