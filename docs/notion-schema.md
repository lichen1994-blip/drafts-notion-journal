# Notion 数据库字段

字段名称和类型必须完全一致：

| 字段 | Notion 类型 | 必填 |
| --- | --- | --- |
| 标题 | Title | 是 |
| 记录时间 | Date | 是 |
| 修改时间 | Date | 是 |
| 地点 | Text | 是 |
| 纬度 | Number | 是 |
| 经度 | Number | 是 |
| 地图 | URL | 是 |
| 标签 | Text | 是 |
| Draft UUID | Text | 是 |
| Draft 链接 | URL | 是 |
| 来源 | Select | 是 |
| 同步状态 | Select | 是 |
| 有定位 | Checkbox | 是 |
| 天气 | Text | 是 |
| 气温 | Number | 是 |
| 体感温度 | Number | 是 |
| 湿度 | Number | 是 |
| 降水量 | Number | 是 |
| 风速 | Number | 是 |

Select 选项：

- `来源`：`Drafts`
- `同步状态`：`已同步`、`需复核`

单位：

- 温度：摄氏度
- 湿度：百分比
- 降水量：毫米
- 风速：公里/小时
