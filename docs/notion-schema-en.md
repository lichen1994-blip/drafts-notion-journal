# Notion Database Schema

Property names and types must match exactly. The script currently uses Chinese property names when calling the Notion API.

| Property name | Notion type | Required |
| --- | --- | --- |
| 标题 | Title | Yes |
| 记录时间 | Date | Yes |
| 修改时间 | Date | Yes |
| 地点 | Text | Yes |
| 纬度 | Number | Yes |
| 经度 | Number | Yes |
| 地图 | URL | Yes |
| 标签 | Text | Yes |
| Draft UUID | Text | Yes |
| Draft 链接 | URL | Yes |
| 来源 | Select | Yes |
| 同步状态 | Select | Yes |
| 有定位 | Checkbox | Yes |
| 天气 | Text | Yes |
| 气温 | Number | Yes |
| 体感温度 | Number | Yes |
| 湿度 | Number | Yes |
| 降水量 | Number | Yes |
| 风速 | Number | Yes |

Select options:

- `来源`: `Drafts`
- `同步状态`: `已同步`, `需复核`

Units:

- Temperature: degrees Celsius
- Humidity: percent
- Precipitation: millimeters
- Wind speed: kilometers per hour
