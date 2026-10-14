# -*- coding: utf-8 -*-
"""渲染采集平台的选择器与搜索 URL 配置（平台端重新开发）。

每个配置字段：
- search: 搜索 URL 模板，{kw} 为按 enc 编码后的关键词
- enc: 关键词编码（utf-8 / gbk）
- lang: cn / en（决定 locale、时区、默认关键词）
- card: 商品卡片选择器（支持逗号分隔多候选）
- name/price/original/image/url/shop/sales: 字段候选选择器列表
- name_attr / image_attr: 优先取的属性
- close: 进入页面后尝试关闭的遮挡弹窗
- scroll / limit / wait / timeout / default_shop
"""

RENDER_CONFIGS = {
    # ---------- 国内：稳定 ----------
    "miyoupin": {
        "search": "https://www.xiaomiyoupin.com/search?keyword={kw}",
        "enc": "utf-8", "lang": "cn",
        "card": ".pro-item",
        "name": [".pro-name", ".pro-desc"], "name_attr": "title",
        "price": [".pro-price .m-num", ".m-num", ".pro-price"],
        "original": [".pro-origin", ".origin-price"],
        "image": [".pro-img img", "img"],
        "url": [".m-safe-anchor", "a[href]"],
        "shop": [], "sales": [],
        "close": [".close", ".modal-close", "[class*='close']"],
        "scroll": 3, "limit": 60, "timeout": 30,
        "default_shop": "小米有品",
    },
    "yanxuan": {
        "search": "https://you.163.com/search?keyword={kw}",
        "home": "https://you.163.com",
        "box": ["input[name='searchInput']", ".yx-cp-searchInput",
                "#searchInput", "input[placeholder*='搜索']"],
        "profile": "yanxuan",
        "enc": "utf-8", "lang": "cn",
        "card": ".m-product.j-product",
        "name": [".m-product-name", ".name", "[title]"],
        "price": [".m-price", ".price-now", ".price"],
        "original": [".m-price-origin", ".price-origin", ".counterPrice"],
        "image": [".m-product-img img", "img"],
        "url": ['a[href*="detail"]', "a[href]"],
        "shop": [], "sales": [],
        "close": [".m-dialog-close", ".close", "[class*='close']"],
        "scroll": 3, "limit": 60, "timeout": 35,
        "default_shop": "网易严选",
    },
    "dangdang": {
        "search": "https://search.dangdang.com/?key={kw}&act=input&page_index={page}",
        "enc": "gb2312", "lang": "cn",
        "card": "li[sku], ul.bigimg li",
        "name": ["p.name a", ".name a", "a[title]"],
        "price": ["p.price .price_n", ".price_n", ".price"],
        "original": ["p.price .price_r", ".price_r", ".price_or"],
        "image": ["a img", "img"],
        "url": ["p.name a", "a[href]"],
        "shop": ["p.link a", ".link a", ".shop"],
        "sales": [".search_star_line", ".comment"],
        "close": [".close", "#popup_close"],
        "scroll": 2, "limit": 60, "timeout": 25,
        "default_shop": "当当网",
    },
    # ---------- 国内：概率性（风控波动，成功即出数） ----------
    "suning": {
        "search": "https://search.suning.com/{kw}/",
        "home": "https://www.suning.com",
        "box": ["#searchKeywords", "input.search-keyword", "input[name*='search']"],
        "profile": "suning",
        "enc": "utf-8", "lang": "cn",
        "card": ".item-bg, .product, li[itemid]",
        "name": [".title", ".sellPoint", "a[title]", ".res-info a"],
        "price": [".price", ".mainprice", ".def-price"],
        "original": [".origin-price", ".price-origin"],
        "image": [".img img", "img"],
        "url": ["a[href]"],
        "shop": [".shop", ".store", ".sales-store"], "sales": [".sales", ".review", ".evaluate"],
        "close": [".close", "[class*='close']", "#close"],
        "scroll": 3, "limit": 60, "timeout": 30,
        "default_shop": "苏宁易购",
    },
    "c1688": {
        "search": "https://s.1688.com/selloffer/offer_search.htm?keywords={kw}",
        "enc": "gbk", "lang": "cn",
        "card": ".space-offer-card, .offer-list-row .offer-card, .sm-offer-item, [data-offer-id]",
        "name": [".title", ".offer-title", "[class*='title']", "a[title]"],
        "price": [".price", "[class*='price']"],
        "original": [".origin-price", ".price-origin"],
        "image": [".offer-img img", "img"],
        "url": ["a[href]"],
        "shop": [".company-name", "[class*='company']"],
        "sales": [".sale", "[class*='sale']", ".trade"],
        "close": [".close", "[class*='close']"],
        "scroll": 4, "limit": 60, "timeout": 30,
        "default_shop": "1688",
    },
    # ---------- 海外：稳定 ----------
    "amazon": {
        "search": "https://www.amazon.com/s?k={kw}",
        "enc": "utf-8", "lang": "en",
        "locale": "en-US", "timezone": "America/Los_Angeles",
        "card": 'div[data-component-type="s-search-result"]',
        "name": ["h2 span", "h2 a span", "h2"],
        "price": [".a-price .a-offscreen", ".a-price-whole", ".a-color-price"],
        "original": [".basisPrice .a-offscreen", ".a-price[data-a-strike] .a-offscreen"],
        "image": [".s-image", "img"],
        "url": ["h2 a", "a.a-link-normal[href]"],
        "shop": [".s-line-clamp-1"], "sales": ['[aria-label*="ratings"]', ".a-size-small"],
        "close": [".a-button-close"],
        "scroll": 3, "limit": 60, "timeout": 30,
        "default_shop": "Amazon",
    },
}

# 平台 -> 渲染配置键的映射（默认与平台键同名）
PLATFORM_TO_CONFIG = {
    "jd": None, "taobao": None, "pdd": None, "tmall": None,
    "dangdang": "dangdang", "suning": "suning", "yanxuan": "yanxuan",
    "c1688": "c1688", "miyoupin": "miyoupin", "amazon": "amazon",
}
