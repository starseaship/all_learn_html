# Zoe's Study Archive

静态学习资料库。默认展示最新学期，历史学期通过顶部入口访问。

## 添加或更新资料

1. 把 HTML 和相关资源放进学期文件夹，例如 `26aut/`。
2. 推荐在 HTML 的 `<head>` 中填写 `description`、`type`、`course`、`date` 和 `lesson-number` 元信息。`type` 支持 `grammar`、`vocabulary`、`quiz`、`notes`、`writing`、`reference`。
3. 需要单独调整卡片信息时，在 `catalog-overrides.json` 中以相对文件路径添加记录。
4. 提交前在仓库根目录运行 `python3 scripts/build_catalog.py`，并一起提交生成的 `materials.json`。这个步骤也适用于资料删除、改名和移动。

目录脚本只读取 HTML 头部；首页只请求 `materials.json`，不会为了获得标题提前下载完整讲义。目录使用条件缓存，加载失败时显示上次成功的目录并提供重试。缓存不包含任何编辑、收藏或阅读记录。

## 页面结构

- `index.html`：主页面和移动端安装元信息。
- `assets/archive.css`：响应式布局和配色。
- `assets/archive.js`：目录加载、学期切换、搜索和筛选。
- `assets/material-utils.mjs`：目录验证与排序。
- `app.html`：兼容旧地址，跳转到主页面。
- `scripts/build_catalog.py`：生成轻量目录，无第三方依赖。

发布仍使用现有 GitHub Pages。没有本地编辑、导入导出、收藏或继续阅读功能。
