# @afdk1991/shared-map

统一地图服务抽象层：配置加载、瓦片、坐标转换（GCJ-02 / WGS-84 / BD-09）、polyline 解码、provider 接口（amap / tencent / baidu / osm）。

本包以**源码包**形式发布（仅含 `src/`，由消费方 TypeScript 工程直接编译引用）。

## 使用

```ts
import { MapProvider, getKey, decodeGCJPolyline } from '@afdk1991/shared-map';
```
