// ── File types ──

export const VIDEO_EXTENSIONS = new Set([
  '.mkv', '.mp4', '.avi', '.ts', '.flv', '.wmv', '.webm', '.m4v', '.mov',
]);

export const SUBTITLE_EXTENSIONS = new Set([
  '.ass', '.ssa', '.srt', '.sub', '.sup', '.vtt',
]);


export interface MediaFile {
  /** Absolute path */
  path: string;
  /** Filename only (basename) */
  filename: string;
  /** Extension including dot, lowercase (e.g. ".mkv") */
  ext: string;
  kind: 'video' | 'subtitle';
  /** For subtitles: language suffix like "zh-cn" (without dot) */
  langSuffix?: string;
  /** Filename without extension(s) — used for pairing. For subtitles, also strips lang suffix. */
  stem: string;
}

export interface MediaFileGroup {
  video: MediaFile;
  subtitles: MediaFile[];
}

// ── TMDB types ──

export interface TmdbSearchResult {
  id: number;
  name: string;
  originalName?: string;
  firstAirDate?: string;
  overview: string;
  popularity: number;
  mediaType: 'tv' | 'movie';
  genreIds: number[];
}

const ANIMATION_GENRE_ID = 16;
export function isAnimation(result: TmdbSearchResult): boolean {
  return result.genreIds.includes(ANIMATION_GENRE_ID);
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  releaseDate?: string;
}

export interface TmdbEpisode {
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  airDate?: string;
}

export interface TmdbSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate?: string;
}

export interface TmdbShowDetail {
  id: number;
  name: string;
  seasons: TmdbSeason[];
}

// ── Rename types ──

export interface RenameEntry {
  oldPath: string;
  newPath: string;
}

export interface RenamePlan {
  showName: string;
  tmdbId: number;
  mediaType: 'tv' | 'movie';
  season?: number;
  entries: RenameEntry[];
}

export interface RenameHistoryEntry {
  old: string;
  new: string;
}

export interface RenameHistory {
  version: 1;
  timestamp: string;
  tmdbId: number;
  showName: string;
  entries: RenameHistoryEntry[];
}

// ── CLI options ──

export interface RenameOptions {
  query?: string;
  tmdbId?: number;
  season?: number;
  dryRun: boolean;
  offset: number;
  lang: string;
}

// ── i18n ──

export interface Messages {
  scanningDir: string;
  foundFiles: (videoCount: number, subCount: number) => string;
  noVideoFiles: string;
  searchingTmdb: string;
  enterQuery: string;
  selectShow: string;
  searchAgain: string;
  enterTmdbId: string;
  selectSeason: string;
  fetchingEpisodes: string;
  episodeCountMismatch: (fileCount: number, episodeCount: number) => string;
  renamePlan: string;
  arrow: string;
  confirmRename: string;
  dryRunComplete: string;
  renaming: string;
  renamed: (count: number) => string;
  undoComplete: (count: number) => string;
  noHistory: string;
  undoConfirm: string;
  apiKeyPrompt: string;
  apiKeySave: string;
  apiKeySaved: string;
  episodes: string;
  specials: string;
  tvTag: string;
  tvAnimationTag: string;
  movieTag: string;
  selectMediaType: string;
  noResults: string;
  seasonNotFound: (season: number) => string;
  orphanSubtitles: (count: number) => string;
  noFilesToRename: string;
  startEpisode: string;
  errorInvalidApiKey: string;
  errorNotFound: string;
  errorApiKeyRequired: string;
  errorInvalidTmdbId: string;
  undoTitle: string;
  undoSkipNotFound: (name: string) => string;
  undoSkipExists: (name: string) => string;
  helpMovie: string;
  helpYes: string;
  helpJson: string;
  // CLI help text (labels)
  helpLabelUsage: string;
  helpLabelArguments: string;
  helpLabelOptions: string;
  helpLabelCommands: string;
  helpLabelDisplayHelp: string;
  helpLabelDisplayVersion: string;
  // CLI help text (descriptions & examples)
  helpRenameDesc: string;
  helpUndoDesc: string;
  helpExamples: string;
  helpDescription: string;
  helpDirArg: string;
  helpUndoDirArg: string;
  helpQuery: string;
  helpTmdbId: string;
  helpSeason: string;
  helpDryRun: string;
  helpOffset: string;
  helpLang: string;
}

export const zhMessages: Messages = {
  scanningDir: '扫描目录...',
  foundFiles: (v, s) => `找到 ${v} 个视频文件，${s} 个字幕文件`,
  noVideoFiles: '未找到视频文件',
  searchingTmdb: '搜索 TMDB...',
  enterQuery: '输入搜索关键词：',
  selectShow: '选择正确的作品：',
  searchAgain: '重新搜索',
  enterTmdbId: '手动输入 TMDB ID',
  selectSeason: '选择季：',
  fetchingEpisodes: '获取剧集信息...',
  episodeCountMismatch: (f, e) => `警告：${f} 个视频文件，但 TMDB 有 ${e} 集`,
  renamePlan: '重命名预览：',
  arrow: '→',
  confirmRename: '确认重命名？',
  dryRunComplete: '预览完成，未做任何更改。',
  renaming: '重命名中...',
  renamed: (n) => `完成，已重命名 ${n} 个文件。`,
  undoComplete: (n) => `已回滚 ${n} 个文件。`,
  noHistory: '未找到重命名历史记录。',
  undoConfirm: '确认回滚？',
  apiKeyPrompt: '请输入 TMDB API Key（从 https://www.themoviedb.org/settings/api 获取）：',
  apiKeySave: '保存 API Key 到配置文件？',
  apiKeySaved: 'API Key 已保存。',
  episodes: '集',
  specials: '特别篇',
  tvTag: '[剧集]',
  tvAnimationTag: '[动画]',
  movieTag: '[电影]',
  selectMediaType: '这是剧集还是电影？',
  noResults: '未找到结果。',
  seasonNotFound: (s) => `未找到第 ${s} 季，请手动选择：`,
  orphanSubtitles: (n) => `  ${n} 个字幕文件未匹配，将跳过`,
  noFilesToRename: '没有需要重命名的文件。',
  startEpisode: '从第几集开始？',
  errorInvalidApiKey: 'TMDB API Key 无效',
  errorNotFound: '在 TMDB 上未找到',
  errorApiKeyRequired: 'API Key 不能为空',
  errorInvalidTmdbId: 'TMDB ID 无效',
  undoTitle: '回滚预览：',
  undoSkipNotFound: (name: string) => `  跳过：${name}（文件不存在）`,
  undoSkipExists: (name: string) => `  跳过：${name}（目标已存在）`,
  helpMovie: '作为电影处理（配合 --tmdb-id 使用）',
  helpYes: '跳过确认提示',
  helpJson: '以 JSON 格式输出（隐含 --yes）',
  helpLabelUsage: '用法：',
  helpLabelArguments: '参数：',
  helpLabelOptions: '选项：',
  helpLabelCommands: '命令：',
  helpLabelDisplayHelp: '显示帮助信息',
  helpLabelDisplayVersion: '显示版本号',
  helpRenameDesc: '根据 TMDB 信息重命名视频和字幕文件',
  helpUndoDesc: '回滚上一次重命名操作',
  helpExamples: `示例：
  $ bangumi-renamer rename ./葬送的芙莉莲
  $ bangumi-renamer rename ./Movie.2024.BluRay -n
  $ bangumi-renamer undo ./葬送的芙莉莲

  自动化 (Agent/CI)：
  $ TMDB_API_KEY=xxx bangumi-renamer rename ./path -q "frieren" -s 1 -y
  $ bangumi-renamer rename ./path --tmdb-id 209867 -s 1 -y --json`,
  helpDescription: '使用 TMDB 元数据将动画/剧集/电影文件重命名为 Infuse 兼容格式',
  helpDirArg: '包含视频/字幕文件的目录',
  helpUndoDirArg: '要回滚重命名的目录',
  helpQuery: '使用此标题搜索 TMDB',
  helpTmdbId: '直接使用此 TMDB ID（跳过搜索）',
  helpSeason: '季号',
  helpDryRun: '仅预览，不执行重命名',
  helpOffset: '集号偏移量',
  helpLang: 'TMDB 结果和 CLI 的语言',
};

export const enMessages: Messages = {
  scanningDir: 'Scanning directory...',
  foundFiles: (v, s) => `Found ${v} video file(s), ${s} subtitle file(s)`,
  noVideoFiles: 'No video files found',
  searchingTmdb: 'Searching TMDB...',
  enterQuery: 'Enter search query:',
  selectShow: 'Select the correct show:',
  searchAgain: 'Search again',
  enterTmdbId: 'Enter TMDB ID manually',
  selectSeason: 'Select season:',
  fetchingEpisodes: 'Fetching episode info...',
  episodeCountMismatch: (f, e) => `Warning: ${f} video file(s), but TMDB has ${e} episode(s)`,
  renamePlan: 'Rename preview:',
  arrow: '→',
  confirmRename: 'Confirm rename?',
  dryRunComplete: 'Dry run complete, no changes made.',
  renaming: 'Renaming...',
  renamed: (n) => `Done, renamed ${n} file(s).`,
  undoComplete: (n) => `Reverted ${n} file(s).`,
  noHistory: 'No rename history found.',
  undoConfirm: 'Confirm undo?',
  apiKeyPrompt: 'Enter TMDB API Key (get one at https://www.themoviedb.org/settings/api):',
  apiKeySave: 'Save API Key to config file?',
  apiKeySaved: 'API Key saved.',
  episodes: 'episodes',
  specials: 'Specials',
  tvTag: '[TV]',
  tvAnimationTag: '[Anime]',
  movieTag: '[Movie]',
  selectMediaType: 'Is this a TV show or a movie?',
  noResults: 'No results found.',
  seasonNotFound: (s) => `Season ${s} not found, please select:`,
  orphanSubtitles: (n) => `  ${n} orphan subtitle(s) will be skipped`,
  noFilesToRename: 'No files to rename.',
  startEpisode: 'Start from which episode?',
  errorInvalidApiKey: 'Invalid TMDB API key',
  errorNotFound: 'Not found on TMDB',
  errorApiKeyRequired: 'API key is required',
  errorInvalidTmdbId: 'Invalid TMDB ID',
  undoTitle: 'Undo preview:',
  undoSkipNotFound: (name: string) => `  Skip: ${name} (not found)`,
  undoSkipExists: (name: string) => `  Skip: ${name} (already exists)`,
  helpMovie: 'Treat as movie (use with --tmdb-id)',
  helpYes: 'Skip confirmation prompts',
  helpJson: 'Output as JSON (implies --yes)',
  helpLabelUsage: 'Usage:',
  helpLabelArguments: 'Arguments:',
  helpLabelOptions: 'Options:',
  helpLabelCommands: 'Commands:',
  helpLabelDisplayHelp: 'display help for command',
  helpLabelDisplayVersion: 'output the version number',
  helpRenameDesc: 'Rename video and subtitle files using TMDB metadata',
  helpUndoDesc: 'Undo the last rename operation',
  helpExamples: `Examples:
  $ bangumi-renamer rename ./Frieren
  $ bangumi-renamer rename ./Movie.2024.BluRay -n
  $ bangumi-renamer undo ./Frieren

  Automation (Agent/CI):
  $ TMDB_API_KEY=xxx bangumi-renamer rename ./path -q "frieren" -s 1 -y
  $ bangumi-renamer rename ./path --tmdb-id 209867 -s 1 -y --json`,
  helpDescription: 'Rename anime/TV/movie files to Infuse-compatible naming using TMDB metadata',
  helpDirArg: 'Directory containing video/subtitle files',
  helpUndoDirArg: 'Directory to undo renames in',
  helpQuery: 'Search TMDB with this title',
  helpTmdbId: 'Use this TMDB ID directly (skip search)',
  helpSeason: 'Season number',
  helpDryRun: 'Preview only, do not rename',
  helpOffset: 'Episode number offset',
  helpLang: 'Language for TMDB results and CLI',
};

export function getMessages(lang: string): Messages {
  return lang.startsWith('zh') ? zhMessages : enMessages;
}
