# 安装指南

## 1. 准备 Notion 数据库

按照 [notion-schema.md](notion-schema.md) 创建字段。字段名称和类型必须完全一致。

建议单独创建一个名为“感想档案”的数据库，避免向 Drafts 授予无关页面权限。

## 2. 创建 Drafts Action

1. 打开 Drafts 动作列表。
2. 新建 Action，命名为 `同步感想到 Notion`。
3. 添加 `Script` 步骤。
4. 删除 Script 编辑器中的示例注释。
5. 粘贴 `src/drafts-notion-sync.js` 的全部代码。
6. 保持 `Allow asynchronous execution` 关闭。
7. 确认 iOS 和 macOS 的 `List` 已启用。
8. 关闭编辑窗口；Drafts 会自动保存。

创建和编辑自定义 Action 需要 Drafts Pro。安装完成后，请以 Drafts 当前政策为准确认
免费版是否仍可运行已安装动作。

## 3. 首次授权

1. 打开一篇测试 Draft。
2. 运行 `同步感想到 Notion`。
3. 在 Notion 授权页面仅勾选“感想档案”。
4. 返回 Drafts 后，粘贴“感想档案”的完整 Notion 页面链接。
5. 再次运行即可创建记录。

配置保存在 Drafts 的 Credential 中。如需更换数据库，可在 Drafts：

`Settings → Credentials → Drafts Notion Journal Configuration → Forget`

随后再次运行 Action。

## 4. 定位权限

Drafts 只有在创建记录时取得定位权限，才能保存创建坐标。旧记录若没有坐标，脚本无法
事后恢复其历史地点。

## 5. Apple Watch 记录

Apple Watch 适合负责快速捕捉，iPhone 负责运行同步动作：

1. 在 Apple Watch 的 Drafts 中创建记录。
2. 等待 Draft 通过 iCloud 同步到 iPhone。
3. 在 iPhone 打开这篇 Draft。
4. 运行 `同步感想到 Notion`。

脚本无需安装或运行在 Apple Watch 上。如果记录没有携带创建坐标，脚本仍会同步原文、
创建时间和标签，只是不生成地点和天气信息。

若手表记录没有及时出现在手机上，请检查 Apple Watch 与 iPhone 是否使用同一 Apple
账户，并确认 Drafts 的 iCloud 同步正常。

## 6. 更新

更新项目代码后，进入 Action 的 Script 步骤，用新版
`src/drafts-notion-sync.js` 完整替换旧代码。
