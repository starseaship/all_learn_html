# Zoe's Study Archive

静态学习资料库。默认展示最新学期，历史学期通过顶部入口访问。

## 课堂资料 HTML 制作规范

将阅读题、课堂照片或讲义整理成 HTML 时，默认按 [study-html-publish 工作流程](.agents/skills/study-html-publish/SKILL.md) 制作并上传本仓库，同步登记首页目录。仓库内的 `AGENTS.md` 也会向支持读取该文件的编码助手提供说明。

## 添加或更新资料

1. 把 HTML 和相关资源放进学期文件夹，例如 `26aut/`。
2. 推荐在 HTML 的 `<head>` 中填写 `description`、`type`、`course`、`date` 和 `lesson-number` 元信息。`type` 支持 `grammar`、`vocabulary`、`quiz`、`notes`、`writing`、`reference`。
3. 需要单独调整卡片信息时，在 `catalog-overrides.json` 中以相对文件路径添加记录。可选的 `badges`（最多 4 个短标签，如“日中对照”“原讲义 35 页”）会显示在卡片底部。标题写成“数据科学第3回｜主题”时，首页会把“数据科学 第3回”显示为卡片小标题，“主题”作为卡片标题。
4. 提交前在仓库根目录运行 `python3 scripts/build_catalog.py`，并一起提交生成的 `materials.json`。这个步骤也适用于资料删除、改名和移动。
5. 首页默认按资料加入目录的顺序倒序排列，最新加入的文件在最前。`materials.json` 的 `addedOrder` 由目录脚本自动为新文件分配；重新生成目录或修改现有资料时会保留既有顺序。

目录脚本只读取 HTML 头部；首页只请求 `materials.json`，不会为了获得标题提前下载完整讲义。目录使用条件缓存，加载失败时显示上次成功的目录并提供重试。缓存不包含任何编辑、收藏或阅读记录。

## 页面结构

- `index.html`：主页面和移动端安装元信息。
- `assets/tokens.css`：首页与阅读页共用的配色变量。
- `assets/archive.css`：首页的响应式布局。
- `assets/reader.css`、`assets/reader.js`：阅读页共用外壳，提供顶部“‹ 资料库”返回栏，以及底部浮动的假名/中文开关（会记住上次的选择）。新增阅读页时，在 `<head>` 末尾加上这三行即可：`tokens.css`、`reader.css` 和 `reader.js`（`defer`）。
- `assets/archive.js`：目录加载、学期切换、搜索和筛选。
- `assets/material-utils.mjs`：目录验证与排序。
- `app.html`：兼容旧地址，跳转到主页面。
- `scripts/build_catalog.py`：生成轻量目录，无第三方依赖。

发布仍使用现有 GitHub Pages。没有本地编辑、导入导出、收藏或继续阅读功能。
