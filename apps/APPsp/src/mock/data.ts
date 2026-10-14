import type { Post, Product, ToolItem } from '../api/types';

export const mockProducts: Product[] = [
  { id: 'p1', title: '北欧风简约保温杯 500ml', price: 89, originalPrice: 129, sales: 2300, tag: '包邮', color: '#FF8A80', emoji: '🥤' },
  { id: 'p2', title: '无线蓝牙降噪耳机 Pro', price: 399, originalPrice: 599, sales: 8600, tag: '热销', color: '#82B1FF', emoji: '🎧' },
  { id: 'p3', title: '智能手环 运动心率监测', price: 159, sales: 5400, tag: '新品', color: '#B9F6CA', emoji: '⌚' },
  { id: 'p4', title: '便携折叠收纳箱 60L', price: 69, originalPrice: 99, sales: 1200, color: '#FFE57F', emoji: '📦' },
  { id: 'p5', title: '机械键盘 87键 红轴', price: 249, sales: 3100, tag: '直降', color: '#B388FF', emoji: '⌨️' },
  { id: 'p6', title: '桌面香薰机 静音大雾量', price: 119, sales: 980, color: '#80CBC4', emoji: '🌿' },
  { id: 'p7', title: '纯棉四件套 1.8m床', price: 199, originalPrice: 299, sales: 4700, tag: '好评', color: '#F48FB1', emoji: '🛏️' },
  { id: 'p8', title: '充电宝 20000mAh 快充', price: 129, sales: 12000, tag: '爆款', color: '#A5D6A7', emoji: '🔋' },
];

export const mockPosts: Post[] = [
  { id: 's1', author: '小鹿同学', avatarColor: '#FF8A80', content: '今天用新键盘写了一下午代码，手感真的绝了，声音小又有段落感，推荐给久坐码字的朋友。', imageColor: '#FFCCBC', likes: 328, comments: 42, time: '10 分钟前' },
  { id: 's2', author: '产品老王', avatarColor: '#82B1FF', content: '分享一个提升效率的小习惯：早上到公司先花 10 分钟列三件最重要的事，其他都往后排。坚持一个月变化很大。', imageColor: '#BBDEFB', likes: 1024, comments: 156, time: '1 小时前' },
  { id: 's3', author: '阿茶', avatarColor: '#B9F6CA', content: '宁波今天的云太好看了，下班路上随手拍的。', imageColor: '#C8E6C9', likes: 86, comments: 12, time: '3 小时前' },
  { id: 's4', author: '前端小方', avatarColor: '#FFE57F', content: '刚把自己的 APP 跑通到安卓真机，从 0 到 1 的成就感谁懂。后面会持续更新迭代。', imageColor: '#FFF9C4', likes: 512, comments: 88, time: '昨天' },
];

export const mockTools: ToolItem[] = [
  { key: 'todo', name: '待办清单', desc: '本地记事', iconColor: '#FF8A80' },
  { key: 'calc', name: '计算器', desc: '快速计算', iconColor: '#82B1FF' },
  { key: 'currency', name: '汇率换算', desc: '多币种', iconColor: '#B9F6CA' },
  { key: 'scan', name: '扫一扫', desc: '扫码识别', iconColor: '#FFE57F' },
  { key: 'note', name: '随手记', desc: '笔记备忘', iconColor: '#B388FF' },
  { key: 'qr', name: '生成二维码', desc: '文本转码', iconColor: '#80CBC4' },
  { key: 'level', name: '水平仪', desc: '传感器', iconColor: '#F48FB1' },
  { key: 'more', name: '更多', desc: '持续上架', iconColor: '#A5D6A7' },
];
