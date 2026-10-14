/**
 * 聚合看板前端刷新。
 *
 * 通过 WordPress 原生 REST API 拉取最新数据，无需页面刷新。
 * 使用 X-WP-Nonce 请求头完成 Cookie 认证的 CSRF 校验。
 *
 * 依赖：由 functions.php 通过 wp_localize_script 注入 zscDashboard 配置。
 */
(function () {
	'use strict';

	if (typeof zscDashboard === 'undefined' || !zscDashboard.pluginOn) {
		return;
	}

	var root = document.getElementById('zsc-dashboard');
	var btn = document.getElementById('zsc-refresh');

	if (!root || !btn) {
		return;
	}

	var i18n = zscDashboard.i18n || {};
	var grid = root.querySelector('.zsc-grid');

	function setLoading(loading) {
		btn.disabled = loading;
		btn.textContent = loading ? (i18n.refreshing || '刷新中…') : (i18n.refresh || '刷新数据');
	}

	function badgeClass(status) {
		if (status === 'ok') { return 'zsc-badge--ok'; }
		if (status === 'error') { return 'zsc-badge--error'; }
		return 'zsc-badge--disabled';
	}

	function badgeText(status) {
		if (status === 'ok') { return '正常'; }
		if (status === 'error') { return '异常'; }
		return '空';
	}

	function text(value) {
		return document.createTextNode(value || '');
	}

	function buildCard(entry) {
		var card = document.createElement('div');
		card.className = 'zsc-card';
		card.setAttribute('data-source', entry.source || '');

		var top = document.createElement('div');
		top.className = 'zsc-card__top';

		var label = document.createElement('span');
		label.className = 'zsc-card__label';
		label.appendChild(text(entry.label));
		top.appendChild(label);

		var badge = document.createElement('span');
		badge.className = 'zsc-badge ' + badgeClass(entry.status);
		badge.appendChild(text(badgeText(entry.status)));
		top.appendChild(badge);
		card.appendChild(top);

		var desc = document.createElement('p');
		desc.className = 'zsc-card__desc';
		desc.appendChild(text(entry.description));
		card.appendChild(desc);

		var metaWrap = document.createElement('p');
		metaWrap.style.margin = '0 0 10px';
		var layer = document.createElement('span');
		layer.className = 'zsc-badge zsc-badge--layer';
		layer.appendChild(text(entry.layer));
		metaWrap.appendChild(layer);

		if (entry.cached) {
			var cached = document.createElement('span');
			cached.className = 'zsc-badge zsc-badge--disabled';
			cached.appendChild(text('缓存'));
			metaWrap.appendChild(cached);
		}
		card.appendChild(metaWrap);

		if (entry.items && entry.items.length) {
			var ul = document.createElement('ul');
			ul.className = 'zsc-list';

			entry.items.forEach(function (item) {
				var li = document.createElement('li');

				if (item.url) {
					var a = document.createElement('a');
					a.href = item.url;
					a.rel = 'noopener noreferrer';
					a.appendChild(text(item.title));
					li.appendChild(a);
				} else {
					li.appendChild(text(item.title));
				}

				if (item.value) {
					var strong = document.createElement('strong');
					strong.appendChild(document.createTextNode(' ' + item.value));
					li.appendChild(strong);
				}

				ul.appendChild(li);
			});

			card.appendChild(ul);
		} else if (entry.message) {
			var msg = document.createElement('p');
			msg.className = 'zsc-error';
			msg.appendChild(text(entry.message));
			card.appendChild(msg);
		}

		return card;
	}

	function render(sources) {
		var fresh = document.createElement('div');
		fresh.className = 'zsc-grid';

		sources.forEach(function (entry) {
			fresh.appendChild(buildCard(entry));
		});

		if (grid && grid.parentNode) {
			grid.parentNode.replaceChild(fresh, grid);
			grid = fresh;
		} else {
			root.appendChild(fresh);
			grid = fresh;
		}
	}

	function refresh() {
		setLoading(true);

		var url = zscDashboard.restUrl + '?source=all&limit=5';

		fetch(url, {
			method: 'GET',
			credentials: 'same-origin',
			headers: {
				'X-WP-Nonce': zscDashboard.nonce || '',
				'Accept': 'application/json'
			}
		})
			.then(function (res) {
				if (!res.ok) {
					throw new Error('HTTP ' + res.status);
				}
				return res.json();
			})
			.then(function (data) {
				if (data && Array.isArray(data.sources)) {
					render(data.sources);
				}
			})
			.catch(function () {
				if (window.console && window.console.warn) {
					window.console.warn(i18n.failed || '刷新失败');
				}
				// 刷新失败时保留服务端已渲染的内容，不做破坏性替换。
			})
			.then(function () {
				setLoading(false);
			});
	}

	btn.addEventListener('click', refresh);
})();
