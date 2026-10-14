/* slStyle 自定义器实时预览：主色变更即时反映到页面 */
(function ($) {
	'use strict';

	// 将 #hex 按 percent 调暗(负)/调亮(正)，与 functions.php 的派生逻辑保持一致
	function shade(hex, percent) {
		hex = hex.replace('#', '');
		if (hex.length === 3) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		}
		var r = parseInt(hex.substr(0, 2), 16),
			g = parseInt(hex.substr(2, 2), 16),
			b = parseInt(hex.substr(4, 2), 16);
		if (percent < 0) {
			var f = 1 + percent / 100;
			r = Math.round(r * f);
			g = Math.round(g * f);
			b = Math.round(b * f);
		} else {
			var t = percent / 100;
			r = Math.round(r + (255 - r) * t);
			g = Math.round(g + (255 - g) * t);
			b = Math.round(b + (255 - b) * t);
		}
		function h(x) { return ('0' + x.toString(16)).slice(-2); }
		return '#' + h(r) + h(g) + h(b);
	}

	wp.customize('slstyle_primary_color', function (setting) {
		setting.bind(function (value) {
			var root = document.documentElement;
			root.style.setProperty('--primary', value);
			root.style.setProperty('--primary-dark', shade(value, -12));
			root.style.setProperty('--primary-light', shade(value, 90));
		});
	});
})(jQuery);
