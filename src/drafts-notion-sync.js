/*
 * Drafts → Notion「感想档案」同步动作
 *
 * 用法：
 * 1. 在 Drafts 新建 Action。
 * 2. 添加一个 Script 步骤。
 * 3. 将本文件完整粘贴进去。
 * 4. 首次运行时，在 Notion 授权页面中允许访问「感想档案」。
 *
 * 同一个 Draft 反复运行时会更新原 Notion 页面，不会重复创建。
 */

const NOTION_API_VERSION = "2025-09-03";
const CONFIG_CREDENTIAL_ID = "Drafts Notion Journal Configuration";
const SYNCED_TAG = "notion-synced";
const MAX_RICH_TEXT_LENGTH = 1900;
const MAX_BLOCKS_PER_REQUEST = 100;
const GEOCODER_URL = "https://nominatim.openstreetmap.org/reverse";
const GEOCODER_USER_AGENT = "DraftsNotionPersonalSync/1.1 (personal journal sync)";
const OSM_ATTRIBUTION = "地址数据 © OpenStreetMap contributors";
const WEATHER_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const WEATHER_ATTRIBUTION = "天气数据 © Open-Meteo";

const notion = Notion.create();
notion.version = NOTION_API_VERSION;

function fail(message, detail) {
  const suffix = detail ? `\n\n${detail}` : "";
  alert(`同步失败\n\n${message}${suffix}`);
  context.fail();
  throw new Error(`${message}${suffix}`);
}

function request(method, url, data, parameters) {
  const response = notion.request({ method, url, data, parameters });
  if (response.statusCode < 200 || response.statusCode >= 300) {
    fail(`${method} ${url}\nHTTP ${response.statusCode}`, response.responseText || notion.lastError);
  }
  if (!response.responseText) return {};
  try { return JSON.parse(response.responseText); }
  catch (_) { return notion.lastResponse || {}; }
}

function compactUUID(value) {
  const match = String(value || "").match(/[0-9a-fA-F]{32}/);
  if (match) return match[0];
  const uuid = String(value || "").match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  return uuid ? uuid[0] : "";
}

function configuredDataSourceId() {
  const credential = Credential.create(CONFIG_CREDENTIAL_ID, "粘贴“感想档案”数据库的 Notion 页面链接。配置仅保存在 Drafts 中，不会写入脚本。");
  credential.addTextField("database", "Notion 数据库链接或 Data Source ID");
  if (!credential.authorize()) fail("未完成数据库配置");
  const configured = credential.getValue("database").trim();
  const direct = configured.replace(/^collection:\/\//, "");
  if (/^[0-9a-fA-F-]{32,36}$/.test(direct) && !configured.includes("notion.")) return direct;
  const databaseId = compactUUID(configured);
  if (!databaseId) {
    credential.forget();
    fail("无法从链接中识别 Notion 数据库 ID，请重新运行并粘贴完整数据库链接");
  }
  const database = request("GET", `https://api.notion.com/v1/databases/${databaseId}`);
  const sources = database.data_sources || [];
  if (sources.length !== 1) {
    credential.forget();
    fail(sources.length ? "这个数据库包含多个数据源，请在 Notion 的“管理数据源”中复制 data source ID 后重新运行" : "未找到数据库的数据源，请确认已在授权时允许 Drafts 访问该数据库");
  }
  return sources[0].id;
}

function richText(content) {
  return [{ type: "text", text: { content: String(content || "").slice(0, 2000) } }];
}

function splitText(text, maxLength) {
  const value = String(text || "");
  if (!value) return [""];
  const chunks = [];
  let cursor = 0;
  while (cursor < value.length) {
    let end = Math.min(cursor + maxLength, value.length);
    if (end < value.length) {
      const newline = value.lastIndexOf("\n", end);
      if (newline > cursor) end = newline + 1;
    }
    chunks.push(value.slice(cursor, end));
    cursor = end;
  }
  return chunks;
}

function isoDate(date) { return date instanceof Date ? date.toISOString() : new Date(date).toISOString(); }
function hasLocation(d) { return Number(d.createdLatitude) !== 0 || Number(d.createdLongitude) !== 0; }
function coordinates(d) {
  if (!hasLocation(d)) return "";
  return `${Number(d.createdLatitude).toFixed(6)}, ${Number(d.createdLongitude).toFixed(6)}`;
}
function mapURL(d) {
  if (!hasLocation(d)) return null;
  const lat = encodeURIComponent(d.createdLatitude);
  const lon = encodeURIComponent(d.createdLongitude);
  return `https://maps.apple.com/?ll=${lat},${lon}&q=${lat},${lon}`;
}

function existingLocation(page) {
  try {
    const values = page.properties["地点"].rich_text;
    const text = values.map(item => item.plain_text || "").join("").trim();
    if (/^(坐标：)?-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(text)) return "";
    return text;
  } catch (_) { return ""; }
}

function reverseGeocode(d, cachedLocation) {
  if (!hasLocation(d)) return { name: "", resolved: false };
  if (cachedLocation) return { name: cachedLocation, resolved: true };
  const http = HTTP.create();
  http.timeout = 20;
  const response = http.request({
    url: GEOCODER_URL,
    method: "GET",
    parameters: { format: "jsonv2", lat: String(d.createdLatitude), lon: String(d.createdLongitude), zoom: "18", addressdetails: "1", "accept-language": "zh-CN,zh,en" },
    headers: { "User-Agent": GEOCODER_USER_AGENT, "Accept-Language": "zh-CN,zh,en" }
  });
  if (!response.success) {
    console.log(`反向地理编码失败：HTTP ${response.statusCode} ${response.error || ""}`);
    return { name: `坐标：${coordinates(d)}`, resolved: false };
  }
  try {
    const result = response.responseData || JSON.parse(response.responseText);
    const name = String(result.display_name || "").trim();
    return { name: name || `坐标：${coordinates(d)}`, resolved: Boolean(name) };
  } catch (error) {
    console.log(`无法解析地址结果：${error}`);
    return { name: `坐标：${coordinates(d)}`, resolved: false };
  }
}

function propertyText(page, name) {
  try { return page.properties[name].rich_text.map(item => item.plain_text || "").join("").trim(); }
  catch (_) { return ""; }
}
function propertyNumber(page, name) {
  try { const value = page.properties[name].number; return typeof value === "number" ? value : null; }
  catch (_) { return null; }
}
function existingWeather(page) {
  const summary = propertyText(page, "天气");
  if (!summary) return null;
  return {
    summary,
    temperature: propertyNumber(page, "气温"),
    apparentTemperature: propertyNumber(page, "体感温度"),
    humidity: propertyNumber(page, "湿度"),
    precipitation: propertyNumber(page, "降水量"),
    windSpeed: propertyNumber(page, "风速"),
    resolved: true
  };
}
function dateOnlyUTC(date) { return new Date(date).toISOString().slice(0, 10); }

function wmoWeather(code) {
  const labels = {
    0: "☀️ 晴", 1: "🌤️ 大致晴朗", 2: "⛅ 多云", 3: "☁️ 阴", 45: "🌫️ 雾", 48: "🌫️ 雾凇",
    51: "🌦️ 小毛毛雨", 53: "🌦️ 毛毛雨", 55: "🌧️ 强毛毛雨", 56: "🌧️ 小冻毛毛雨", 57: "🌧️ 强冻毛毛雨",
    61: "🌦️ 小雨", 63: "🌧️ 中雨", 65: "🌧️ 大雨", 66: "🌧️ 小冻雨", 67: "🌧️ 强冻雨",
    71: "🌨️ 小雪", 73: "🌨️ 中雪", 75: "❄️ 大雪", 77: "🌨️ 米雪", 80: "🌦️ 小阵雨", 81: "🌧️ 中阵雨",
    82: "⛈️ 强阵雨", 85: "🌨️ 小阵雪", 86: "❄️ 强阵雪", 95: "⛈️ 雷暴", 96: "⛈️ 雷暴伴小冰雹", 99: "⛈️ 雷暴伴强冰雹"
  };
  return labels[Number(code)] || `天气代码 ${code}`;
}

function fetchWeather(d, cachedWeather) {
  if (!hasLocation(d)) return { resolved: false };
  if (cachedWeather) return cachedWeather;
  const created = new Date(d.createdAt);
  const start = new Date(created.getTime() - 24 * 60 * 60 * 1000);
  const proposedEnd = new Date(created.getTime() + 24 * 60 * 60 * 1000);
  const end = proposedEnd.getTime() < Date.now() ? proposedEnd : new Date();
  const ageDays = (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
  const primaryURL = ageDays <= 90 ? WEATHER_FORECAST_URL : WEATHER_ARCHIVE_URL;
  const fallbackURL = primaryURL === WEATHER_FORECAST_URL ? WEATHER_ARCHIVE_URL : WEATHER_FORECAST_URL;
  const parameters = {
    latitude: String(d.createdLatitude), longitude: String(d.createdLongitude),
    start_date: dateOnlyUTC(start), end_date: dateOnlyUTC(end),
    hourly: ["temperature_2m", "apparent_temperature", "relative_humidity_2m", "precipitation", "weather_code", "wind_speed_10m"].join(","),
    timezone: "GMT", timeformat: "unixtime", temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm"
  };
  function weatherRequest(url) {
    const http = HTTP.create();
    http.timeout = 30;
    return http.request({ url, method: "GET", parameters });
  }
  let response = weatherRequest(primaryURL);
  if (!response.success) {
    console.log(`主要天气接口失败：HTTP ${response.statusCode} ${response.error || ""}`);
    response = weatherRequest(fallbackURL);
  }
  if (!response.success) {
    console.log(`备用天气接口失败：HTTP ${response.statusCode} ${response.error || ""}`);
    return { resolved: false };
  }
  try {
    const result = response.responseData || JSON.parse(response.responseText);
    const hourly = result.hourly || {};
    const times = hourly.time || [];
    const target = created.getTime() / 1000;
    if (!times.length) return { resolved: false };
    let nearest = 0;
    let difference = Infinity;
    for (let i = 0; i < times.length; i++) {
      const currentDifference = Math.abs(Number(times[i]) - target);
      if (currentDifference < difference) { nearest = i; difference = currentDifference; }
    }
    const value = (name) => {
      const item = hourly[name] && hourly[name][nearest];
      return typeof item === "number" ? item : null;
    };
    return {
      summary: wmoWeather(value("weather_code")),
      temperature: value("temperature_2m"),
      apparentTemperature: value("apparent_temperature"),
      humidity: value("relative_humidity_2m"),
      precipitation: value("precipitation"),
      windSpeed: value("wind_speed_10m"),
      resolved: true
    };
  } catch (error) {
    console.log(`无法解析天气结果：${error}`);
    return { resolved: false };
  }
}

function numberOrNull(value) { return typeof value === "number" && Number.isFinite(value) ? value : null; }

function pageProperties(d, location, weather) {
  const located = hasLocation(d);
  const title = (d.displayTitle || d.title || "无标题感想").slice(0, 2000);
  return {
    "标题": { title: richText(title) },
    "记录时间": { date: { start: isoDate(d.createdAt) } },
    "修改时间": { date: { start: isoDate(d.modifiedAt) } },
    "地点": { rich_text: richText(location.name) },
    "纬度": { number: located ? Number(d.createdLatitude) : null },
    "经度": { number: located ? Number(d.createdLongitude) : null },
    "地图": { url: mapURL(d) },
    "标签": { rich_text: richText(d.tags.join(", ")) },
    "Draft UUID": { rich_text: richText(d.uuid) },
    "Draft 链接": { url: d.permalink },
    "来源": { select: { name: "Drafts" } },
    "同步状态": { select: { name: located && location.resolved ? "已同步" : "需复核" } },
    "有定位": { checkbox: located },
    "天气": { rich_text: richText(weather.summary || "") },
    "气温": { number: numberOrNull(weather.temperature) },
    "体感温度": { number: numberOrNull(weather.apparentTemperature) },
    "湿度": { number: numberOrNull(weather.humidity) },
    "降水量": { number: numberOrNull(weather.precipitation) },
    "风速": { number: numberOrNull(weather.windSpeed) }
  };
}

function weatherDescription(weather) {
  if (!weather.resolved) return "未取得";
  const details = [
    weather.summary,
    numberOrNull(weather.temperature) !== null ? `${weather.temperature}°C` : "",
    numberOrNull(weather.apparentTemperature) !== null ? `体感 ${weather.apparentTemperature}°C` : "",
    numberOrNull(weather.humidity) !== null ? `湿度 ${weather.humidity}%` : "",
    numberOrNull(weather.precipitation) !== null ? `降水 ${weather.precipitation} mm` : "",
    numberOrNull(weather.windSpeed) !== null ? `风速 ${weather.windSpeed} km/h` : ""
  ];
  return details.filter(Boolean).join("，");
}

function originalContentBlocks(d, location, weather) {
  const metadata = [
    `Draft UUID：${d.uuid}`, `创建时间：${isoDate(d.createdAt)}`, `修改时间：${isoDate(d.modifiedAt)}`,
    `创建地点：${location.name || "未记录"}`, `原始坐标：${coordinates(d) || "未记录"}`,
    location.resolved ? OSM_ATTRIBUTION : "", `当时天气：${weatherDescription(weather)}`,
    weather.resolved ? WEATHER_ATTRIBUTION : "", `标签：${d.tags.join(", ") || "无"}`, `Draft 链接：${d.permalink}`
  ].filter(Boolean).join("\n");
  const blocks = [
    { object: "block", type: "heading_2", heading_2: { rich_text: richText("记录信息") } },
    { object: "block", type: "code", code: { language: "plain text", rich_text: richText(metadata) } },
    { object: "block", type: "heading_2", heading_2: { rich_text: richText("原文") } }
  ];
  for (const chunk of splitText(d.content, MAX_RICH_TEXT_LENGTH)) {
    blocks.push({ object: "block", type: "code", code: { language: "plain text", rich_text: richText(chunk) } });
  }
  return blocks;
}

function findExistingPage(uuid) {
  const result = request("POST", `https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
    page_size: 1,
    filter: { property: "Draft UUID", rich_text: { equals: uuid } }
  });
  return result.results && result.results.length ? result.results[0] : null;
}

function listChildBlocks(blockId) {
  const blocks = [];
  let cursor = null;
  do {
    const parameters = { page_size: "100" };
    if (cursor) parameters.start_cursor = cursor;
    const result = request("GET", `https://api.notion.com/v1/blocks/${blockId}/children`, undefined, parameters);
    blocks.push(...(result.results || []));
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);
  return blocks;
}

function clearPage(pageId) {
  for (const block of listChildBlocks(pageId)) request("PATCH", `https://api.notion.com/v1/blocks/${block.id}`, { archived: true });
}
function appendBlocks(pageId, blocks) {
  for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    request("PATCH", `https://api.notion.com/v1/blocks/${pageId}/children`, { children: blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST) });
  }
}
function createPage(d, location, weather) {
  const result = request("POST", "https://api.notion.com/v1/pages", {
    parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID },
    properties: pageProperties(d, location, weather)
  });
  appendBlocks(result.id, originalContentBlocks(d, location, weather));
  return result;
}
function updatePage(page, d, location, weather) {
  request("PATCH", `https://api.notion.com/v1/pages/${page.id}`, { properties: pageProperties(d, location, weather) });
  clearPage(page.id);
  appendBlocks(page.id, originalContentBlocks(d, location, weather));
  return page;
}

const DATA_SOURCE_ID = configuredDataSourceId();
const existingPage = findExistingPage(draft.uuid);
const location = reverseGeocode(draft, existingLocation(existingPage));
const weather = fetchWeather(draft, existingWeather(existingPage));
const syncedPage = existingPage ? updatePage(existingPage, draft, location, weather) : createPage(draft, location, weather);
if (!draft.hasTag(SYNCED_TAG)) {
  draft.addTag(SYNCED_TAG);
  draft.update();
}
const actionName = existingPage ? "已更新" : "已创建";
const locationNote = !hasLocation(draft)
  ? "\n此 Draft 没有历史定位，已标记为「需复核」。"
  : !location.resolved
    ? "\n地址暂时未识别，已保留坐标并标记为「需复核」。稍后可再次同步。"
    : `\n地点：${location.name}`;
const weatherNote = weather.resolved
  ? `\n天气：${weatherDescription(weather)}`
  : hasLocation(draft) ? "\n天气暂时未取得，稍后可再次同步。" : "";
alert(`${actionName} Notion 记录：${draft.displayTitle}\n\n${syncedPage.url || ""}${locationNote}${weatherNote}`);
