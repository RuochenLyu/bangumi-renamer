import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  VIDEO_EXTENSIONS,
  SUBTITLE_EXTENSIONS,
  type MediaFile,
  type MediaFileGroup,
} from './types.js';

/** Matches language-like suffixes: 2-10 letters, optionally hyphen-separated (e.g. zh-cn, jpsc, forced) */
const LANG_SUFFIX_PATTERN = /^[a-z]{2,10}(-[a-z]{2,10})*$/;

/**
 * Parse a subtitle filename to extract the language suffix and the "stem" (base name without lang + ext).
 *
 * Example: "Show - 01.zh-cn.ass" → { ext: ".ass", langSuffix: "zh-cn", stem: "Show - 01" }
 */
export function parseSubtitleFilename(filename: string): {
  ext: string;
  langSuffix: string | undefined;
  stem: string;
} {
  // Find the subtitle extension
  const lowerName = filename.toLowerCase();
  let ext = '';
  for (const subtitleExt of SUBTITLE_EXTENSIONS) {
    if (lowerName.endsWith(subtitleExt)) {
      ext = subtitleExt;
      break;
    }
  }
  if (!ext) {
    return { ext: path.extname(filename).toLowerCase(), langSuffix: undefined, stem: path.basename(filename, path.extname(filename)) };
  }

  // Strip the subtitle extension to check for language suffix
  const withoutExt = filename.slice(0, filename.length - ext.length);

  // Check if there's a language suffix before the extension
  const lastDot = withoutExt.lastIndexOf('.');
  if (lastDot > 0) {
    const possibleLang = withoutExt.slice(lastDot + 1).toLowerCase();
    if (LANG_SUFFIX_PATTERN.test(possibleLang)) {
      return {
        ext,
        langSuffix: possibleLang,
        stem: withoutExt.slice(0, lastDot),
      };
    }
  }

  return { ext, langSuffix: undefined, stem: withoutExt };
}

/**
 * Classify a single filename into a MediaFile.
 * Returns null if the file is neither a video nor a subtitle.
 */
export function classifyFile(dir: string, filename: string): MediaFile | null {
  const lowerName = filename.toLowerCase();

  // Check video
  for (const videoExt of VIDEO_EXTENSIONS) {
    if (lowerName.endsWith(videoExt)) {
      const ext = videoExt;
      const stem = filename.slice(0, filename.length - ext.length);
      return { path: path.join(dir, filename), filename, ext, kind: 'video', stem };
    }
  }

  // Check subtitle
  for (const subExt of SUBTITLE_EXTENSIONS) {
    if (lowerName.endsWith(subExt)) {
      const parsed = parseSubtitleFilename(filename);
      return {
        path: path.join(dir, filename),
        filename,
        ext: parsed.ext,
        kind: 'subtitle',
        langSuffix: parsed.langSuffix,
        stem: parsed.stem,
      };
    }
  }

  return null;
}

function hasMediaExtension(name: string): boolean {
  const lower = name.toLowerCase();
  for (const ext of VIDEO_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  for (const ext of SUBTITLE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Scan a directory and return classified media files.
 * Handles download tools that create directories named like media files
 * (e.g., "Episode-01.mkv/" containing "Episode-01.mkv").
 */
export async function scanDirectory(dir: string): Promise<{ videos: MediaFile[]; subtitles: MediaFile[] }> {
  const entries = await readdir(dir);
  const videos: MediaFile[] = [];
  const subtitles: MediaFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const s = await stat(fullPath).catch(() => null);
    if (!s) continue;

    if (s.isFile()) {
      const file = classifyFile(dir, entry);
      if (file) {
        if (file.kind === 'video') videos.push(file);
        else subtitles.push(file);
      }
    } else if (s.isDirectory() && hasMediaExtension(entry)) {
      // Download tool pattern: directory named like a media file
      const subEntries = await readdir(fullPath).catch(() => [] as string[]);
      for (const subEntry of subEntries) {
        const subStat = await stat(path.join(fullPath, subEntry)).catch(() => null);
        if (subStat?.isFile()) {
          const file = classifyFile(fullPath, subEntry);
          if (file) {
            if (file.kind === 'video') videos.push(file);
            else subtitles.push(file);
          }
        }
      }
    }
  }

  // Sort by filename for consistent ordering
  videos.sort((a, b) => a.filename.localeCompare(b.filename));
  subtitles.sort((a, b) => a.filename.localeCompare(b.filename));

  return { videos, subtitles };
}

/**
 * Extract episode number from a filename stem.
 * Tries patterns in order of specificity:
 *   S01E13 → EP13 → " - 13" → trailing number
 */
export function extractEpisodeNumber(stem: string): number | undefined {
  const sxe = stem.match(/S\d+E(\d+)/i);
  if (sxe) return parseInt(sxe[1], 10);

  const ep = stem.match(/EP(\d+)/i);
  if (ep) return parseInt(ep[1], 10);

  const dash = stem.match(/\s-\s(\d+)(?:\s|$|\[)/);
  if (dash) return parseInt(dash[1], 10);

  const trailing = stem.match(/[\s.](\d+)$/);
  if (trailing) return parseInt(trailing[1], 10);

  return undefined;
}

/**
 * Pair videos with their subtitle files.
 * Phase 1: exact stem match.
 * Phase 2: episode-number fallback for orphan subtitles.
 */
export function pairFiles(videos: MediaFile[], subtitles: MediaFile[]): MediaFileGroup[] {
  const groups: MediaFileGroup[] = [];

  if (videos.length === 1) {
    groups.push({ video: videos[0], subtitles: [...subtitles] });
    return groups;
  }

  // Phase 1: exact stem match
  const matchedIndices = new Set<number>();
  for (const video of videos) {
    const matched: MediaFile[] = [];
    for (let i = 0; i < subtitles.length; i++) {
      if (subtitles[i].stem === video.stem) {
        matched.push(subtitles[i]);
        matchedIndices.add(i);
      }
    }
    groups.push({ video, subtitles: matched });
  }

  // Phase 2: episode-number fallback for orphans
  const orphans = subtitles.filter((_, i) => !matchedIndices.has(i));
  if (orphans.length > 0) {
    const epToGroup = new Map<number, number>();
    for (let i = 0; i < groups.length; i++) {
      const ep = extractEpisodeNumber(groups[i].video.stem);
      if (ep !== undefined && !epToGroup.has(ep)) {
        epToGroup.set(ep, i);
      }
    }

    for (const sub of orphans) {
      const ep = extractEpisodeNumber(sub.stem);
      if (ep !== undefined) {
        const idx = epToGroup.get(ep);
        if (idx !== undefined) {
          groups[idx].subtitles.push(sub);
        }
      }
    }
  }

  return groups;
}

/**
 * Get orphan subtitles not assigned to any video group.
 */
export function getOrphanSubtitles(groups: MediaFileGroup[], subtitles: MediaFile[]): MediaFile[] {
  const paired = new Set<string>();
  for (const group of groups) {
    for (const sub of group.subtitles) {
      paired.add(sub.path);
    }
  }
  return subtitles.filter((sub) => !paired.has(sub.path));
}
