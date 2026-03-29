# bangumi-renamer

[![npm version](https://img.shields.io/npm/v/bangumi-renamer)](https://www.npmjs.com/package/bangumi-renamer)
[![license](https://img.shields.io/github/license/RuochenLyu/bangumi-renamer)](LICENSE)
[![node](https://img.shields.io/node/v/bangumi-renamer)](package.json)

使用 [TMDB](https://www.themoviedb.org/) 元数据将动漫/剧集/电影文件重命名为 [Infuse](https://firecore.com/infuse) 兼容格式。

[English](README.md)

![screenshot](https://raw.githubusercontent.com/RuochenLyu/bangumi-renamer/main/assets/screenshot-zh.png)

## 功能

- **剧集/动漫**：重命名为 `作品名 - S01E01 - 集标题.ext`
- **电影**：重命名为 `电影名 (2024).ext`
- **字幕**：跟随视频命名，保留语言后缀（`.zh-cn.ass`、`.en.srt`）
- **智能搜索**：同时搜索剧集和电影，区分动画与真人版
- **自动识别**：从目录名提取搜索词，自动检测系统语言
- **嵌套目录**：处理下载工具创建的同名文件夹包裹
- **预览模式**：执行前预览所有更改
- **回滚**：支持撤销上一次重命名
- **Agent 友好**：`--yes` 和 `--json` 支持非交互式自动化

## 安装

```bash
npm install -g bangumi-renamer
```

或直接运行：

```bash
npx bangumi-renamer rename ./path
```

需要 Node.js >= 20。

## 配置

在 https://www.themoviedb.org/settings/api 获取免费的 TMDB API Key。

```bash
export TMDB_API_KEY=你的key
```

或首次运行时 CLI 会提示输入，并可保存到 `~/.config/bangumi-renamer/config.json`。

## 使用方法

### 重命名

```bash
# 交互式：自动从目录名搜索 TMDB
bangumi-renamer rename ./葬送的芙莉莲.S01.1080p

# 指定搜索关键词
bangumi-renamer rename ./path -q "葬送的芙莉莲" -s 1

# 直接指定 TMDB ID（跳过搜索）
bangumi-renamer rename ./path --tmdb-id 209867 -s 1

# 只预览不执行
bangumi-renamer rename ./path -n

# 集号偏移（第 1 个文件 = TMDB 第 13 集）
bangumi-renamer rename ./path --offset 12

# 重命名电影
bangumi-renamer rename ./逃离德黑兰.Argo.2012.BluRay.mkv
```

### 回滚

```bash
bangumi-renamer undo ./path
```

### 自动化（Agent / CI）

```bash
TMDB_API_KEY=xxx bangumi-renamer rename ./path -q "frieren" -s 1 -y
bangumi-renamer rename ./path --tmdb-id 209867 -s 1 -y --json
```

## 选项

### `rename`

| 选项 | 说明 |
|---|---|
| `-q, --query <query>` | 用此标题搜索 TMDB |
| `--tmdb-id <id>` | 直接使用 TMDB ID（跳过搜索） |
| `-s, --season <number>` | 季号 |
| `-n, --dry-run` | 只预览不执行 |
| `--offset <number>` | 集号偏移（默认：0） |
| `-m, --movie` | 作为电影处理（配合 `--tmdb-id` 使用） |
| `-y, --yes` | 跳过确认提示 |
| `--json` | 以 JSON 格式输出（隐含 `--yes`） |
| `-l, --lang <lang>` | TMDB 结果和 CLI 语言（默认：自动检测） |

### `undo`

| 选项 | 说明 |
|---|---|
| `-y, --yes` | 跳过确认 |
| `--json` | 以 JSON 格式输出 |
| `-l, --lang <lang>` | CLI 语言 |

## 命名格式

| 类型 | 格式 |
|---|---|
| 剧集/动漫 | `作品名 - S01E01 - 集标题.mkv` |
| 电影 | `电影名 (2024).mkv` |
| 字幕 | `作品名 - S01E01 - 集标题.zh-cn.ass` |
| 特别篇 | `作品名 - S00E01 - 特别篇标题.mkv` |

## 支持的文件类型

**视频：** `.mkv`、`.mp4`、`.avi`、`.ts`、`.flv`、`.wmv`、`.webm`、`.m4v`、`.mov`

**字幕：** `.ass`、`.ssa`、`.srt`、`.sub`、`.sup`、`.vtt`

**语言后缀：** `zh-cn`、`zh-tw`、`zh-hans`、`zh-hant`、`zh`、`en`、`ja`、`ko`、`fr`、`de`、`es`、`it`、`pt`、`ru`、`default`、`forced`、`sdh`、`cc`

## 退出码

| 代码 | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 用户取消 |
| 2 | 错误 |

## 工作原理

1. 扫描目录中的视频和字幕文件（包括下载工具创建的嵌套目录）
2. 通过文件名匹配配对字幕和视频
3. 同时搜索 TMDB 剧集和电影，让你选择正确的结果
4. 剧集：选择季、获取剧集列表、1:1 映射；电影：使用标题和年份
5. 预览重命名计划
6. 确认后保存历史并执行重命名（嵌套文件会被提升到目标目录）

## 许可

MIT

## 致谢

本产品使用 [TMDB API](https://www.themoviedb.org/documentation/api)，但未获得 TMDB 的认可或认证。

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB Logo" width="120">
