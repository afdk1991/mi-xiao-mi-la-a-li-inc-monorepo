// 景点种子数据：覆盖全国主要城市的热门景点（近似坐标，误差百米级，满足演示与路线规划）。
// 仅当 attractions 表为空时由 db.ts 灌入。

export interface AttractionSeed {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  city: string
  category: string
  region: string
}

export const ATTRACTIONS_SEED: AttractionSeed[] = [
  // ---- 华北 ----
  { id: 1, name: '故宫博物院', address: '北京市东城区景山前街4号', latitude: 39.9163, longitude: 116.3972, city: '北京', category: '古迹名胜', region: '华北' },
  { id: 2, name: '颐和园', address: '北京市海淀区新建宫门路19号', latitude: 39.9998, longitude: 116.2755, city: '北京', category: '古迹名胜', region: '华北' },
  { id: 3, name: '八达岭长城', address: '北京市延庆区军都山关沟古道北口', latitude: 40.3587, longitude: 116.016, city: '北京', category: '古迹名胜', region: '华北' },
  { id: 4, name: '天坛公园', address: '北京市东城区天坛东里甲1号', latitude: 39.8822, longitude: 116.4066, city: '北京', category: '古迹名胜', region: '华北' },
  { id: 5, name: '鸟巢国家体育场', address: '北京市朝阳区国家体育场南路1号', latitude: 39.9928, longitude: 116.3964, city: '北京', category: '城市地标', region: '华北' },
  { id: 6, name: '天津之眼摩天轮', address: '天津市河北区三岔河口永乐桥', latitude: 39.147, longitude: 117.172, city: '天津', category: '城市地标', region: '华北' },
  { id: 7, name: '古文化街', address: '天津市南开区通北路宫南大街宫北大街', latitude: 39.141, longitude: 117.187, city: '天津', category: '古迹名胜', region: '华北' },
  { id: 8, name: '避暑山庄', address: '河北省承德市双桥区丽正门大街', latitude: 40.985, longitude: 117.94, city: '承德', category: '古迹名胜', region: '华北' },
  { id: 9, name: '龙门石窟', address: '河南省洛阳市洛龙区龙门中街', latitude: 34.556, longitude: 112.47, city: '洛阳', category: '古迹名胜', region: '华北' },
  { id: 10, name: '清明上河园', address: '河南省开封市龙亭区龙亭西路5号', latitude: 34.799, longitude: 114.263, city: '开封', category: '主题乐园', region: '华北' },
  { id: 11, name: '二七广场', address: '河南省郑州市二七区人民路西司桥', latitude: 34.749, longitude: 113.665, city: '郑州', category: '城市地标', region: '华北' },
  { id: 12, name: '平遥古城', address: '山西省晋中市平遥县照壁南街', latitude: 37.189, longitude: 112.176, city: '晋中', category: '古迹名胜', region: '华北' },
  { id: 13, name: '趵突泉', address: '山东省济南市历下区趵突泉南路1号', latitude: 36.664, longitude: 117.015, city: '济南', category: '自然风光', region: '华北' },

  // ---- 东北 ----
  { id: 14, name: '沈阳故宫', address: '辽宁省沈阳市沈河区沈阳路171号', latitude: 41.795, longitude: 123.434, city: '沈阳', category: '古迹名胜', region: '东北' },
  { id: 15, name: '星海广场', address: '辽宁省大连市沙河口区中山路', latitude: 38.883, longitude: 121.581, city: '大连', category: '城市地标', region: '东北' },
  { id: 16, name: '中央大街', address: '黑龙江省哈尔滨市道里区中央大街1号', latitude: 45.777, longitude: 126.616, city: '哈尔滨', category: '城市地标', region: '东北' },
  { id: 17, name: '冰雪大世界', address: '黑龙江省哈尔滨市松北区太阳岛西区', latitude: 45.779, longitude: 126.562, city: '哈尔滨', category: '主题乐园', region: '东北' },

  // ---- 华东 ----
  { id: 18, name: '外滩', address: '上海市黄浦区中山东一路', latitude: 31.2397, longitude: 121.49, city: '上海', category: '城市地标', region: '华东' },
  { id: 19, name: '东方明珠广播电视塔', address: '上海市浦东新区世纪大道1号', latitude: 31.2397, longitude: 121.4998, city: '上海', category: '城市地标', region: '华东' },
  { id: 20, name: '豫园', address: '上海市黄浦区福佑路168号', latitude: 31.2272, longitude: 121.4922, city: '上海', category: '古迹名胜', region: '华东' },
  { id: 21, name: '上海迪士尼乐园', address: '上海市浦东新区川沙新镇黄赵路310号', latitude: 31.144, longitude: 121.657, city: '上海', category: '主题乐园', region: '华东' },
  { id: 22, name: '西湖风景区', address: '浙江省杭州市西湖区龙井路1号', latitude: 30.245, longitude: 120.149, city: '杭州', category: '自然风光', region: '华东' },
  { id: 23, name: '雷峰塔', address: '浙江省杭州市西湖区南山路15号', latitude: 30.232, longitude: 120.149, city: '杭州', category: '古迹名胜', region: '华东' },
  { id: 24, name: '夫子庙秦淮风光带', address: '江苏省南京市秦淮区贡院街152号', latitude: 32.023, longitude: 118.788, city: '南京', category: '古迹名胜', region: '华东' },
  { id: 25, name: '中山陵', address: '江苏省南京市玄武区石象路7号', latitude: 32.061, longitude: 118.851, city: '南京', category: '古迹名胜', region: '华东' },
  { id: 26, name: '拙政园', address: '江苏省苏州市姑苏区东北街178号', latitude: 31.324, longitude: 120.629, city: '苏州', category: '古迹名胜', region: '华东' },
  { id: 27, name: '鼋头渚', address: '江苏省无锡市滨湖区鼋渚路1号', latitude: 31.521, longitude: 120.229, city: '无锡', category: '自然风光', region: '华东' },
  { id: 28, name: '栈桥', address: '山东省青岛市市南区太平路12号', latitude: 36.057, longitude: 120.317, city: '青岛', category: '城市地标', region: '华东' },
  { id: 29, name: '八大关', address: '山东省青岛市市南区汇泉角东北部', latitude: 36.049, longitude: 120.337, city: '青岛', category: '自然风光', region: '华东' },
  { id: 30, name: '鼓浪屿', address: '福建省厦门市思明区鼓浪屿街道', latitude: 24.447, longitude: 118.067, city: '厦门', category: '自然风光', region: '华东' },
  { id: 31, name: '三坊七巷', address: '福建省福州市鼓楼区南后街', latitude: 26.078, longitude: 119.296, city: '福州', category: '古迹名胜', region: '华东' },
  { id: 32, name: '天一阁', address: '浙江省宁波市海曙区天一街10号', latitude: 29.872, longitude: 121.55, city: '宁波', category: '古迹名胜', region: '华东' },
  { id: 33, name: '包公园', address: '安徽省合肥市包河区芜湖路72号', latitude: 31.853, longitude: 117.287, city: '合肥', category: '古迹名胜', region: '华东' },

  // ---- 华中 ----
  { id: 34, name: '黄鹤楼', address: '湖北省武汉市武昌区蛇山西山坡特1号', latitude: 30.544, longitude: 114.302, city: '武汉', category: '古迹名胜', region: '华中' },
  { id: 35, name: '东湖绿道', address: '湖北省武汉市武昌区东湖路特1号', latitude: 30.556, longitude: 114.396, city: '武汉', category: '自然风光', region: '华中' },
  { id: 36, name: '橘子洲头', address: '湖南省长沙市岳麓区橘子洲头2号', latitude: 28.196, longitude: 112.964, city: '长沙', category: '自然风光', region: '华中' },
  { id: 37, name: '岳麓山', address: '湖南省长沙市岳麓区登高路58号', latitude: 28.188, longitude: 112.937, city: '长沙', category: '自然风光', region: '华中' },

  // ---- 华南 ----
  { id: 38, name: '广州塔', address: '广东省广州市海珠区阅江西路222号', latitude: 23.1066, longitude: 113.3245, city: '广州', category: '城市地标', region: '华南' },
  { id: 39, name: '沙面岛', address: '广东省广州市荔湾区沙面北街', latitude: 23.107, longitude: 113.238, city: '广州', category: '古迹名胜', region: '华南' },
  { id: 40, name: '世界之窗', address: '广东省深圳市南山区华侨城深南大道9037号', latitude: 22.5382, longitude: 113.974, city: '深圳', category: '主题乐园', region: '华南' },
  { id: 41, name: '东部华侨城', address: '广东省深圳市盐田区大梅沙东部华侨城', latitude: 22.599, longitude: 114.302, city: '深圳', category: '主题乐园', region: '华南' },
  { id: 42, name: '亚龙湾', address: '海南省三亚市吉阳区亚龙湾国家旅游度假区', latitude: 18.213, longitude: 109.636, city: '三亚', category: '自然风光', region: '华南' },
  { id: 43, name: '天涯海角', address: '海南省三亚市天涯区天涯镇马岭山麓', latitude: 18.297, longitude: 109.339, city: '三亚', category: '自然风光', region: '华南' },
  { id: 44, name: '骑楼老街', address: '海南省海口市龙华区中山路', latitude: 20.044, longitude: 110.33, city: '海口', category: '古迹名胜', region: '华南' },
  { id: 45, name: '青秀山', address: '广西南宁市青秀区凤岭南路6号', latitude: 22.818, longitude: 108.388, city: '南宁', category: '自然风光', region: '华南' },
  { id: 46, name: '象鼻山', address: '广西桂林市象山区民主路1号', latitude: 25.262, longitude: 110.289, city: '桂林', category: '自然风光', region: '华南' },
  { id: 47, name: '漓江景区', address: '广西桂林市灵川县大圩古镇漓江段', latitude: 25.276, longitude: 110.296, city: '桂林', category: '自然风光', region: '华南' },

  // ---- 西南 ----
  { id: 48, name: '宽窄巷子', address: '四川省成都市青羊区长顺街附近', latitude: 30.669, longitude: 104.057, city: '成都', category: '古迹名胜', region: '西南' },
  { id: 49, name: '大熊猫繁育研究基地', address: '四川省成都市成华区熊猫大道1375号', latitude: 30.737, longitude: 104.146, city: '成都', category: '主题乐园', region: '西南' },
  { id: 50, name: '武侯祠博物馆', address: '四川省成都市武侯区武侯祠大街231号', latitude: 30.647, longitude: 104.043, city: '成都', category: '博物馆', region: '西南' },
  { id: 51, name: '洪崖洞', address: '重庆市渝中区嘉陵江滨江路88号', latitude: 29.564, longitude: 106.583, city: '重庆', category: '城市地标', region: '西南' },
  { id: 52, name: '磁器口古镇', address: '重庆市沙坪坝区磁器口正街', latitude: 29.581, longitude: 106.447, city: '重庆', category: '古迹名胜', region: '西南' },
  { id: 53, name: '石林风景区', address: '云南省昆明市石林彝族自治县石林镇', latitude: 24.818, longitude: 103.346, city: '昆明', category: '自然风光', region: '西南' },
  { id: 54, name: '滇池', address: '云南省昆明市西山区滇池路', latitude: 24.959, longitude: 102.66, city: '昆明', category: '自然风光', region: '西南' },
  { id: 55, name: '洱海', address: '云南省大理市环海东路洱海', latitude: 25.76, longitude: 100.183, city: '大理', category: '自然风光', region: '西南' },
  { id: 56, name: '丽江古城', address: '云南省丽江市古城区民主路', latitude: 26.872, longitude: 100.233, city: '丽江', category: '古迹名胜', region: '西南' },
  { id: 57, name: '布达拉宫', address: '西藏拉萨市城关区北京中路35号', latitude: 29.657, longitude: 91.118, city: '拉萨', category: '宗教文化', region: '西南' },
  { id: 58, name: '甲秀楼', address: '贵州省贵阳市南明区翠微巷8号', latitude: 26.572, longitude: 106.719, city: '贵阳', category: '古迹名胜', region: '西南' },

  // ---- 西北 ----
  { id: 59, name: '兵马俑博物馆', address: '陕西省西安市临潼区秦陵北路', latitude: 34.3844, longitude: 109.2786, city: '西安', category: '博物馆', region: '西北' },
  { id: 60, name: '大雁塔', address: '陕西省西安市雁塔区雁塔路南段11号', latitude: 34.2186, longitude: 108.9642, city: '西安', category: '古迹名胜', region: '西北' },
  { id: 61, name: '回民街', address: '陕西省西安市莲湖区北院门街道', latitude: 34.263, longitude: 108.94, city: '西安', category: '古迹名胜', region: '西北' },
  { id: 62, name: '黄河铁桥', address: '甘肃省兰州市城关区滨河路中段', latitude: 36.065, longitude: 103.815, city: '兰州', category: '城市地标', region: '西北' },
  { id: 63, name: '塔尔寺', address: '青海省西宁市湟中区鲁沙尔镇', latitude: 36.487, longitude: 101.564, city: '西宁', category: '宗教文化', region: '西北' },
  { id: 64, name: '镇北堡西部影城', address: '宁夏银川市西夏区镇北堡110国道东侧', latitude: 38.623, longitude: 106.11, city: '银川', category: '主题乐园', region: '西北' },
  { id: 65, name: '天山天池', address: '新疆乌鲁木齐市阜康市天山天池风景区', latitude: 43.882, longitude: 88.118, city: '乌鲁木齐', category: '自然风光', region: '西北' },

  // ---- 港澳台 ----
  { id: 66, name: '维多利亚港', address: '中国香港九龙油尖旺区尖沙咀海滨', latitude: 22.293, longitude: 114.169, city: '香港', category: '城市地标', region: '港澳台' },
  { id: 67, name: '大三巴牌坊', address: '中国澳门花王堂区炮台山下', latitude: 22.197, longitude: 113.541, city: '澳门', category: '古迹名胜', region: '港澳台' },
  { id: 68, name: '台北101', address: '中国台湾台北市信义区信义路五段7号', latitude: 25.034, longitude: 121.5645, city: '台北', category: '城市地标', region: '港澳台' },
  { id: 69, name: '日月潭', address: '中国台湾南投县鱼池乡日月村', latitude: 23.865, longitude: 120.908, city: '南投', category: '自然风光', region: '港澳台' },
]
