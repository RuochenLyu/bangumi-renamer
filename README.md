# bangumi-renamer

[![npm version](https://img.shields.io/npm/v/bangumi-renamer)](https://www.npmjs.com/package/bangumi-renamer)
[![license](https://img.shields.io/github/license/RuochenLyu/bangumi-renamer)](LICENSE)
[![node](https://img.shields.io/node/v/bangumi-renamer)](package.json)

Rename anime/TV/movie files to [Infuse](https://firecore.com/infuse)-compatible naming using [TMDB](https://www.themoviedb.org/) metadata.

[中文文档](README.zh-CN.md)

![screenshot](https://raw.githubusercontent.com/RuochenLyu/bangumi-renamer/main/assets/screenshot-en.png)

## Features

- **TV/Anime**: Renames to `Show Name - S01E01 - Episode Title.ext`
- **Movies**: Renames to `Movie Name (2024).ext`
- **Subtitles**: Follows video naming with language suffix preserved (`.zh-cn.ass`, `.en.srt`)
- **Smart search**: Searches TV and movies simultaneously, distinguishes anime from live-action
- **Auto-detect**: Extracts search query from directory name, detects system language
- **Nested directories**: Handles download tools that wrap files in same-named folders
- **Dry-run**: Preview all changes before executing
- **Undo**: Revert the last rename with full history
- **Agent-friendly**: `--yes` and `--json` flags for non-interactive automation

## Install

```bash
npm install -g bangumi-renamer
```

Or run directly:

```bash
npx bangumi-renamer rename ./path
```

Requires Node.js >= 20.

## Setup

Get a free TMDB API key at https://www.themoviedb.org/settings/api

```bash
export TMDB_API_KEY=your_key_here
```

Or let the CLI prompt you on first run — it can save to `~/.config/bangumi-renamer/config.json`.

## Usage

### Rename files

```bash
# Interactive: auto-searches TMDB from directory name
bangumi-renamer rename ./Frieren.S01.1080p

# Specify search query
bangumi-renamer rename ./path -q "frieren" -s 1

# Use TMDB ID directly (skip search)
bangumi-renamer rename ./path --tmdb-id 209867 -s 1

# Preview only
bangumi-renamer rename ./path -n

# Episode offset (file #1 = TMDB episode #13)
bangumi-renamer rename ./path --offset 12

# Rename a movie
bangumi-renamer rename ./Argo.2012.BluRay.mkv
```

### Undo

```bash
bangumi-renamer undo ./path
```

### Automation (Agent / CI)

```bash
TMDB_API_KEY=xxx bangumi-renamer rename ./path -q "frieren" -s 1 -y
bangumi-renamer rename ./path --tmdb-id 209867 -s 1 -y --json
```

## Options

### `rename`

| Option | Description |
|---|---|
| `-q, --query <query>` | Search TMDB with this title |
| `--tmdb-id <id>` | Use TMDB ID directly (skip search) |
| `-s, --season <number>` | Season number |
| `-n, --dry-run` | Preview only, do not rename |
| `--offset <number>` | Episode number offset (default: 0) |
| `-m, --movie` | Treat as movie (use with `--tmdb-id`) |
| `-y, --yes` | Skip confirmation prompts |
| `--json` | Output as JSON (implies `--yes`) |
| `-l, --lang <lang>` | Language for TMDB results and CLI (default: auto-detect) |

### `undo`

| Option | Description |
|---|---|
| `-y, --yes` | Skip confirmation |
| `--json` | Output as JSON |
| `-l, --lang <lang>` | Language for CLI output |

## Naming Format

| Type | Format |
|---|---|
| TV/Anime | `Show Name - S01E01 - Episode Title.mkv` |
| Movie | `Movie Name (2024).mkv` |
| Subtitle | `Show Name - S01E01 - Episode Title.zh-cn.ass` |
| Specials | `Show Name - S00E01 - Special Title.mkv` |

## Supported File Types

**Video:** `.mkv`, `.mp4`, `.avi`, `.ts`, `.flv`, `.wmv`, `.webm`, `.m4v`, `.mov`

**Subtitle:** `.ass`, `.ssa`, `.srt`, `.sub`, `.sup`, `.vtt`

**Language suffixes:** `zh-cn`, `zh-tw`, `zh-hans`, `zh-hant`, `zh`, `en`, `ja`, `ko`, `fr`, `de`, `es`, `it`, `pt`, `ru`, `default`, `forced`, `sdh`, `cc`

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | User cancelled |
| 2 | Error |

## How It Works

1. Scans directory for video and subtitle files (including nested download-tool directories)
2. Pairs subtitles with videos by filename matching
3. Searches TMDB (TV + Movie simultaneously), lets you pick the correct result
4. For TV: selects season, fetches episodes, maps files 1:1; for movies: uses title and year
5. Previews the rename plan
6. On confirmation, saves undo history and renames (flattening nested files to the target directory)

## License

MIT

## Acknowledgments

This product uses the [TMDB API](https://www.themoviedb.org/documentation/api) but is not endorsed or certified by TMDB.

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB Logo" width="120">
