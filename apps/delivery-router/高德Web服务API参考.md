# 高德地图 Web 服务 API 参考手册

> 适用范围：项目 009「商品采集 / 配送定位系统」地图服务抽象层（`src/mapservice.ts`）。
> 坐标系：高德返回全部为 **GCJ-02（火星坐标）**，与 OSM 的 WGS-84 切换需在 `mapservice.ts` 内分派隔离，二者不可混用。
> 通用约定：所有接口为 HTTP GET，`key` 为必填（需申请 **Web 服务** 类型 Key，非 JS API Key）；入参/出参统一 UTF-8；经纬度格式均为 `经度,纬度`，小数点后 ≤6 位。
> 公共返回字段：`status`(1成功/0失败)、`info`(OK 或错误原因)、`infocode`(10000 正确)。

---

## 一、地理 / 逆地理编码

### 1.1 地理编码（地址 → 坐标）
- **URL**：`https://restapi.amap.com/v3/geocode/geo?parameters`
- **参数**

| 参数 | 必填 | 说明 |
|---|---|---|
| `key` | ✅ | Web 服务 Key |
| `address` | ✅ | 结构化地址（省+市+区+街道+门牌），如 `北京市朝阳区阜通东大街6号` |
| `city` | 可选 | 限定城市（中文/拼音/adcode），提升精度 |
| `output` | 可选 | JSON(默认)/XML |

- **返回**：`geocodes[]` → `formatted_address` / `location`(`经度,纬度`) / `province`/`city`/`district` / `adcode` / `level`(匹配级别)

### 1.2 逆地理编码（坐标 → 地址）
- **URL**：`https://restapi.amap.com/v3/geocode/regeo?parameters`
- **参数**

| 参数 | 必填 | 说明 |
|---|---|---|
| `key` | ✅ | Web 服务 Key |
| `location` | ✅ | `经度,纬度`，小数点后 ≤6 位 |
| `extensions` | 可选 | `base`(默认，基础地址) / `all`(含周边 POI、道路、AOI) |
| `radius` | 可选 | 搜索半径 0~3000，默认 1000 米 |
| `poitype` | 可选 | POI 类型码，需 `extensions=all` |
| `homeorcorp` | 可选 | 0 不优化 / 1 居家优先 / 2 公司优先（排序 POI） |

- **返回**：`regeocode.addressComponent`(国家/省/市/区/乡镇/街道门牌/商圈) + `regeocode.pois[]`、`roads[]`、`aois[]`（`extensions=all` 时返回）

**项目用法**：地址批量导入后做正/逆编码，得到 GCJ-02 坐标点用于地图打点与路线规划。

---

## 二、路径规划（驾车 / 步行 / 公交）

### 2.1 驾车路径规划（配送主用）
- **URL**：`https://restapi.amap.com/v3/direction/driving?parameters`
- **参数**

| 参数 | 必填 | 说明 |
|---|---|---|
| `key` | ✅ | Web 服务 Key |
| `origin` | ✅ | `经度,纬度`，可传 1~3 个点（`x1,y1|x2,y2|x3,y3`）算车头角度 |
| `destination` | ✅ | `经度,纬度` |
| `strategy` | 可选 | 见下方策略表 |
| `waypoints` | 可选 | 途经点，`;` 分隔，最多 16 个 |
| `extensions` | ✅(默认 base) | `all` 才返回 `steps` 详细转向 + `taxi_cost` |
| `province`/`number` | 可选 | 车牌省份/号码，用于限行规避 |
| `cartype` | 可选 | 0 普通 / 1 纯电 / 2 插混 |
| `avoidpolygons` | 可选 | 避让区域（最多 32 个区域，每区域 ≤16 顶点） |

- **strategy 取值**

| 值 | 含义 | 返回条数 |
|---|---|---|
| `0` | 速度优先（非最短） | 1 |
| `2` | 常规最快（综合距离/耗时） | 1 |
| `4` | 躲避拥堵（可能绕路） | 1 |
| `10` | 躲避拥堵+较短+省时（APP 默认） | **多条** |
| `12` | 躲避拥堵 | 多条 |
| `13` | 不走高速 | 多条 |
| `19`/`20` | 高速优先 | 多条 |

> TSP 路线规划建议用 `strategy=2`（单条最快）或 `strategy=10`（拿多条备选）。

- **返回**：`route.paths[]` → `distance`(米) / `duration`(秒) / `strategy` / `tolls`(元) / `traffic_lights`(红绿灯数) / `restriction`(限行 0/1)。`paths[].steps[]` → `instruction`(转向语) / `road` / `distance` / `duration` / `polyline` / `action`(动作) / `assistant_action`(辅助动作)。
- **polyline 解码**：高德返回路线坐标串，项目 `src/mapservice.ts` 的 `decodeGCJPolyline` 负责解码为 `[lat,lng]` 数组供 Leaflet 绘制。

### 2.2 步行路径规划
- **URL**：`https://restapi.amap.com/v3/direction/walking?parameters`
- **参数**：`key`/`origin`/`destination`(均必填，格式同上)；可选 `origin_id`/`destination_id`(POI ID 提升精度)
- **返回**：`route.paths[]` → `distance`/`duration`/`steps[]`(含 `walk_type`：人行横道/地下通道/过街天桥等)

### 2.3 公交路径规划
- **URL**：`https://restapi.amap.com/v3/direction/transit/integrated?parameters`
- **参数**：`key`/`origin`/`destination`/`city`(必填)；`cityd`(跨城必填)；`strategy`(0最快/1最经济/2最少换乘/3最少步行/5不乘地铁)；`nightflag`
- **返回**：`route.transits[]` → `cost`(元)/`duration`/`walking_distance`/`segments[]`(walking+bus/railway)

**项目用法**：配送员导航（逐步转向步骤 + ETA），切换服务/坐标系时清空旧路线（坐标系变化，旧几何无效）。

---

## 三、搜索 POI（高级）

| 类型 | URL | 核心参数 |
|---|---|---|
| 关键字搜索 | `https://restapi.amap.com/v3/place/text` | `keywords` 或 `types`(二选一必填)、`city`、`citylimit`、`extensions` |
| 周边搜索 | `https://restapi.amap.com/v3/place/around` | `location`(必填)、`radius`(默认5000,≤50000)、`keywords`/`types`、`sortrule`(distance/weight) |
| 多边形搜索 | `https://restapi.amap.com/v3/place/polygon` | `polygon`(必填，`|` 分隔坐标对，矩形可传左上右下两点) |
| ID 查询 | `https://restapi.amap.com/v3/place/detail` | `id`(POI ID，必填，最多1个) |

**通用参数**：`key`(必填)、`offset`(每页，建议≤25)、`page`(默认1)、`extensions`(base/all)、`langCode`(zh/en)。
**翻页限制**：同请求最多返回 200 条。
**types 编码**：6 位，前2大类+中2中类+后2小类（如 `010000` 汽车服务，`010101` 中国石化）。

- **返回**：`pois[]` → `id` / `parent` / `name` / `type` / `typecode` / `address` / `location`(`X,Y`) / `distance`(仅周边搜索有值) / `tel` / `adcode` / `adname`(区县) / `entr_location`(入口坐标，可作到达点)。
- **AOI 边界查询**（高阶，需工单开通）：`https://restapi.amap.com/v5/aoi/polyline?id=xxx` → `aois[].polyline`(`_` 分隔边界串)。

**项目用法**：地址批量导入时做自动补全/纠偏；按 POI 类型（如小区、写字楼）校验配送点有效性。

---

## 四、输入提示

- **URL**：`https://restapi.amap.com/v3/assistant/inputtips?parameters`
- **参数**

| 参数 | 必填 | 说明 |
|---|---|---|
| `key` | ✅ | Web 服务 Key |
| `keywords` | ✅ | 查询关键词 |
| `city` | 可选 | citycode/adcode（不支持县级市） |
| `citylimit` | 可选 | true/false，仅返回该城市 |
| `location` | 可选 | `X,Y`，在此附近优先返回（city 非空时生效） |
| `type` | 可选 | POI 分类（建议用分类代码，`|` 分隔） |
| `datatype` | 可选 | all/poi/bus/busline（`|` 分隔） |

- **返回**：`tips[]` → `id`(POI ID/bus ID/busline ID) / `name` / `district`(省+市+区) / `adcode` / `location`(`X,Y`，busline 不返回) / `address`
- **联用**：输入提示返回的 `id` 可直接喂给「搜索 POI · ID 查询」拿详情。

**项目用法**：地址输入框实时联想，提升批量导入准确率；拿 `id` 回查精确坐标。

---

## 五、坐标转换

- **URL**：`https://restapi.amap.com/v3/assistant/coordinate/convert?parameters`
- **参数**

| 参数 | 必填 | 说明 |
|---|---|---|
| `key` | ✅ | Web 服务 Key |
| `locations` | ✅ | 坐标点，`经度,纬度`，多对以 `|` 分隔，最多 40 对 |
| `coordsys` | 可选 | `gps` / `mapbar` / `baidu` / `autonavi`(默认，不转换) |
| `output` | 可选 | JSON(默认)/XML |

- **返回**：`locations` —— 转换后坐标串，多坐标以 `;` 间隔，格式 `经度,纬度`。
- **坐标体系**：`gps`=WGS-84（GPS 设备/外部轨迹）；`baidu`=BD-09；`autonavi`=GCJ-02（高德原生，无需转换）。

**项目用法**：处理外部导入的 GPS/WGS-84 轨迹或百度坐标，统一转 GCJ-02 后再做路线规划与打点。

---

## 六、行政区域查询

- **URL**：`https://restapi.amap.com/v3/config/district?parameters`
- **参数**

| 参数 | 必填 | 说明 |
|---|---|---|
| `key` | ✅ | Web 服务 Key |
| `keywords` | 可选 | 行政区名称/citycode/adcode（单关键词） |
| `subdistrict` | 可选 | 0/1/2/3，返回下 N 级行政区（默认 1） |
| `extensions` | 可选 | `base`(默认，不返边界) / `all`(返当前级边界 polyline，不含子级) |
| `filter` | 可选 | 按 adcode 过滤，只返该省/市 |
| `page`/`offset` | 可选 | 外层最多 20 条，超出翻页 |

- **返回**：`districts[]` → `adcode` / `name` / `center`(中心点坐标) / `level`(country/province/city/district/street) / `polyline`(边界，`|` 分隔多块地块) / `districts[]`(下级，递归)。
- **注意**：街道级无独立 adcode（继承区县），且不返回边界；不支持台湾省详细区划。

**项目用法**：按区/街道聚合配送单；取 `center` 作为区域配送中心候选点；`polyline` 可在地图上绘制行政区边界。

---

## 七、公共错误码与配额

- **status=0 失败** 时看 `info` / `infocode`：
  - `INVALID_USER_KEY`：Key 错误或未启用 Web 服务
  - `DAILY_QUERY_OVER_LIMIT`：超出日调用配额
  - `QUERY_NO_RESULTS`：无结果（地址无法解析等）
  - `INSUFFICIENT_PRIVILEGES`：权限不足（如 AOI/多语言需工单）
  - `10000`：正确（`infocode`）
- **配额**：Web 服务 API 有日调用上限，Key 申请"Web 服务"类型；高并发/生产建议开启 `sig` 数字签名防泄露。
- **安全**：Key 存于 `localStorage`（键 `delivery.mapSettings`），不硬编码入前端源码；切换地图服务（amap/tencent/osm）即清空旧路线，避免坐标系错配。

---

## 八、其他 Web 服务 API（补充）

### 8.1 静态地图（返回图片）
- **URL**：`https://restapi.amap.com/v3/staticmap?parameters`（GET）
- **参数**

| 参数 | 必填 | 说明 |
|---|---|---|
| `key` | ✅ | Web 服务 Key |
| `location` | 有覆盖物时可选 | 中心点 `经度,纬度` |
| `zoom` | ✅ | 缩放级别 1~17 |
| `size` | 可选 | `宽*高`，最大 1024*1024，默认 400*400 |
| `scale` | 可选 | 1 普通 / 2 高清（尺寸翻倍） |
| `markers` | 可选 | 标注，最多 10 个；格式 `size,color,label:lng,lat;lng,lat\|...` |
| `labels` | 可选 | 文字标签，最多 10 个；`content,font,bold,fontSize,fontColor,background:lng,lat` |
| `paths` | 可选 | 折线/多边形，最多 4 个；`weight,color,transparency,fillcolor,fillTransparency:lng,lat;...`（fillcolor 非空则封闭为多边形） |
| `traffic` | 可选 | 0 不显路况 / 1 显实时路况 |

- **返回**：一张地图 PNG 图片（非 JSON）。
- **项目用法**：生成路线缩略图、配送单附图、分享图、打印用静态路线图。

### 8.2 IP 定位
- **URL**：`https://restapi.amap.com/v3/ip?parameters`（GET）
- **参数**：`key`(必填)；`ip`(可选，仅国内 IPv4，不填取请求 IP)；`sig`(签名用户必填)
- **返回**：`province` / `city` / `adcode` / `rectangle`(城市矩形范围，左下右上两点)
- **项目用法**：地域预判/默认城市（配送系统非强依赖，弱用途）。

### 8.3 天气查询
- **URL**：`https://restapi.amap.com/v3/weather/weatherInfo?parameters`（GET）
- **参数**：`key`(必填)；`city`(必填，adcode)；`extensions`(`base` 实况 / `all` 预报)；`output`(JSON/XML)
- **返回**：
  - `lives[]`(实况)：`province`/`city`/`adcode`/`weather`(天气现象)/`temperature`(℃)/`winddirection`/`windpower`(级)/`humidity`/`reporttime`
  - `forecast[].casts[]`(预报)：`date`/`week`/`dayweather`/`nightweather`/`daytemp`/`nighttemp`/`daywind`/`daypower`
- **更新频率**：实况每小时多次；预报每天约 8/11/18 点。
- **项目用法**：配送调度参考（恶劣天气提示/改派）。

### 8.4 轨迹纠偏（POST）
- **URL**：`https://restapi.amap.com/v4/grasproad/driving`（**POST**）
- **参数**：queryString 含 `key`(必填)；body 为 JsonArray（最多 500 点），每点含 `x`(经度)/`y`(纬度)/`ag`(与正北夹角角度)/`tm`(秒，首点从1970起、其余为差值)/`sp`(速度 km/h)，**全部必填**
- **返回**：`data.distance`(总距离) / `data.points[]`(纠偏后 x,y) / `errcode`(`30001` 抓路失败，通常点数少/稀疏)
- **注意**：个人开发者每日仅 10000 次，大批量请用「猎鹰轨迹服务」；`ag=0` 或速度不合理易导致失败；定位点间隔 5~10 秒纠偏效果最优。
- **项目用法**：处理配送员实际轨迹回传，把飘点纠偏到道路上。

### 8.5 云图服务（⚠️ 已下线）
- **状态**：2021-06-01 起正式下线，2021-09-01 平台关闭，**接口不可用**。
- **原能力**：位置数据存储/检索/展现、Excel 导入发布地图、周边/本地/多边形/ID 检索。
- **替代**：自建数据服务，或高德「猎鹰轨迹服务」；本项目配送点已用 IndexedDB 本地存储，无需云图。

---

## 九、项目集成映射速查

| 业务场景 | 调用 API | 关键参数 |
|---|---|---|
| 地址 → 坐标打点 | 地理编码 `v3/geocode/geo` | `address`, `city` |
| 坐标 → 详细地址 | 逆地理 `v3/geocode/regeo` | `location`, `extensions=all` |
| 配送路线规划 | 驾车 `v3/direction/driving` | `origin`,`destination`,`strategy=2/10`,`extensions=all` |
| 逐步导航/ETA | 驾车 `steps[]` | `instruction`, `duration`, `polyline`→`decodeGCJPolyline` |
| 地址联想补全 | 输入提示 `v3/assistant/inputtips` | `keywords`, `city`, `citylimit` |
| POI 校验/纠偏 | 搜索 `v3/place/text\|around\|detail` | `keywords`/`types`, `id` |
| 外部 GPS 轨迹对齐 | 坐标转换 `v3/assistant/coordinate/convert` | `locations`, `coordsys=gps` |
| 按区聚合配送单 | 行政区 `v3/config/district` | `keywords`, `subdistrict`, `extensions=all` |
| 路线/配送单缩略图 | 静态地图 `v3/staticmap` | `location`,`zoom`,`markers`,`paths` |
| 恶劣天气改派提示 | 天气 `v3/weather/weatherInfo` | `city`(adcode), `extensions=all` |
| 配送员轨迹纠偏 | 轨迹纠偏 `v4/grasproad/driving`(POST) | body: x/y/ag/tm/sp |
