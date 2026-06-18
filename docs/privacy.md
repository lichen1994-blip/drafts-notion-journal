# 隐私说明

脚本在用户主动运行同步时处理以下信息：

| 服务 | 发送内容 | 用途 |
| --- | --- | --- |
| Notion | 原文、时间、标签、坐标、地址、天气 | 保存个人记录 |
| OpenStreetMap Nominatim | 经纬度 | 转换为地点名称 |
| Open-Meteo | 经纬度、创建日期 | 查询当时天气 |

## 不会写入公开源码的信息

- Notion OAuth Token
- Notion 数据库链接或数据源 ID
- Draft 原文
- 精确地址和经纬度

Notion OAuth Token 由 Drafts 管理。数据库链接通过 Drafts Credential 保存在用户设备中。

## 公共接口使用

项目面向个人、低频、主动触发的记录同步。请勿将其改造成高频批量地理编码工具。
