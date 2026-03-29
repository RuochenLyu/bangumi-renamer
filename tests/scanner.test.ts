import { describe, expect, it } from 'vitest';
import { parseSubtitleFilename, classifyFile, pairFiles, getOrphanSubtitles, extractEpisodeNumber } from '../src/scanner.js';
import type { MediaFile, MediaFileGroup } from '../src/types.js';

describe('parseSubtitleFilename', () => {
  it('parses subtitle with language suffix', () => {
    const result = parseSubtitleFilename('[Group] Show - 01.zh-cn.ass');
    expect(result).toEqual({
      ext: '.ass',
      langSuffix: 'zh-cn',
      stem: '[Group] Show - 01',
    });
  });

  it('parses subtitle without language suffix', () => {
    const result = parseSubtitleFilename('[Group] Show - 01.ass');
    expect(result).toEqual({
      ext: '.ass',
      langSuffix: undefined,
      stem: '[Group] Show - 01',
    });
  });

  it('parses srt with en suffix', () => {
    const result = parseSubtitleFilename('Show.S01E01.en.srt');
    expect(result).toEqual({
      ext: '.srt',
      langSuffix: 'en',
      stem: 'Show.S01E01',
    });
  });

  it('handles zh-tw suffix', () => {
    const result = parseSubtitleFilename('Title - 03.zh-tw.ass');
    expect(result).toEqual({
      ext: '.ass',
      langSuffix: 'zh-tw',
      stem: 'Title - 03',
    });
  });

  it('handles forced and sdh suffixes', () => {
    expect(parseSubtitleFilename('Show - 01.forced.srt').langSuffix).toBe('forced');
    expect(parseSubtitleFilename('Show - 01.sdh.srt').langSuffix).toBe('sdh');
  });

  it('does not treat numeric suffixes as language', () => {
    const result = parseSubtitleFilename('Show.1080p.ass');
    expect(result.langSuffix).toBeUndefined();
    expect(result.stem).toBe('Show.1080p');
  });

  it('handles vtt extension', () => {
    const result = parseSubtitleFilename('episode.ja.vtt');
    expect(result).toEqual({ ext: '.vtt', langSuffix: 'ja', stem: 'episode' });
  });

  it('handles JPSC (Japanese+Simplified Chinese) suffix', () => {
    const result = parseSubtitleFilename('[SubGroup] Dandadan - 13 [specs].JPSC.ass');
    expect(result).toEqual({
      ext: '.ass',
      langSuffix: 'jpsc',
      stem: '[SubGroup] Dandadan - 13 [specs]',
    });
  });

  it('handles JPTC (Japanese+Traditional Chinese) suffix', () => {
    const result = parseSubtitleFilename('Dandadan - 13.JPTC.ass');
    expect(result).toEqual({
      ext: '.ass',
      langSuffix: 'jptc',
      stem: 'Dandadan - 13',
    });
  });

  it('handles chs/cht/sc/tc shorthands', () => {
    expect(parseSubtitleFilename('Show - 01.chs.srt').langSuffix).toBe('chs');
    expect(parseSubtitleFilename('Show - 01.cht.srt').langSuffix).toBe('cht');
    expect(parseSubtitleFilename('Show - 01.sc.ass').langSuffix).toBe('sc');
    expect(parseSubtitleFilename('Show - 01.tc.ass').langSuffix).toBe('tc');
  });
});

describe('classifyFile', () => {
  it('classifies mkv as video', () => {
    const file = classifyFile('/media', 'Show - 01.mkv');
    expect(file).toMatchObject({
      kind: 'video',
      ext: '.mkv',
      stem: 'Show - 01',
      filename: 'Show - 01.mkv',
    });
  });

  it('classifies mp4 as video', () => {
    const file = classifyFile('/media', 'Movie.2024.mp4');
    expect(file).toMatchObject({ kind: 'video', ext: '.mp4' });
  });

  it('classifies ass with lang as subtitle', () => {
    const file = classifyFile('/media', 'Show - 01.zh-cn.ass');
    expect(file).toMatchObject({
      kind: 'subtitle',
      ext: '.ass',
      langSuffix: 'zh-cn',
      stem: 'Show - 01',
    });
  });

  it('ignores non-media files', () => {
    expect(classifyFile('/media', 'notes.txt')).toBeNull();
    expect(classifyFile('/media', 'cover.jpg')).toBeNull();
    expect(classifyFile('/media', '.DS_Store')).toBeNull();
  });

  it('handles case-insensitive extensions', () => {
    const file = classifyFile('/media', 'Show.MKV');
    expect(file).toMatchObject({ kind: 'video', ext: '.mkv' });
  });
});

describe('extractEpisodeNumber', () => {
  it('extracts from SxxExx format', () => {
    expect(extractEpisodeNumber('Show - S01E13 - Title')).toBe(13);
    expect(extractEpisodeNumber('Show.S02E05.Title')).toBe(5);
  });

  it('extracts from EP format', () => {
    expect(extractEpisodeNumber('Show EP13')).toBe(13);
    expect(extractEpisodeNumber('Show.Ep03')).toBe(3);
  });

  it('extracts from dash-separated format', () => {
    expect(extractEpisodeNumber('[SubGroup] Dandadan - 13 [720p]')).toBe(13);
    expect(extractEpisodeNumber('Show - 01')).toBe(1);
  });

  it('extracts from trailing number', () => {
    expect(extractEpisodeNumber('Show.13')).toBe(13);
    expect(extractEpisodeNumber('Show 13')).toBe(13);
  });

  it('returns undefined for no episode number', () => {
    expect(extractEpisodeNumber('Just A Title')).toBeUndefined();
  });

  it('prefers SxxExx over dash format', () => {
    expect(extractEpisodeNumber('Show - S01E05 - 13 Reasons')).toBe(5);
  });
});

describe('pairFiles', () => {
  function makeVideo(name: string): MediaFile {
    return { path: `/media/${name}`, filename: name, ext: '.mkv', kind: 'video', stem: name.replace('.mkv', '') };
  }

  function makeSub(name: string, langSuffix?: string): MediaFile {
    const ext = name.endsWith('.ass') ? '.ass' : '.srt';
    const stem = langSuffix
      ? name.slice(0, name.length - ext.length - langSuffix.length - 1)
      : name.slice(0, name.length - ext.length);
    return { path: `/media/${name}`, filename: name, ext, kind: 'subtitle', langSuffix, stem };
  }

  it('pairs video with matching subtitle', () => {
    const videos = [makeVideo('Show - 01.mkv')];
    const subs = [makeSub('Show - 01.ass')];
    const groups = pairFiles(videos, subs);
    expect(groups).toHaveLength(1);
    expect(groups[0].video.filename).toBe('Show - 01.mkv');
    expect(groups[0].subtitles).toHaveLength(1);
  });

  it('pairs video with multiple language subtitles', () => {
    const videos = [makeVideo('Show - 01.mkv')];
    const subs = [
      makeSub('Show - 01.zh-cn.ass', 'zh-cn'),
      makeSub('Show - 01.en.srt', 'en'),
    ];
    const groups = pairFiles(videos, subs);
    expect(groups[0].subtitles).toHaveLength(2);
  });

  it('handles video without subtitles', () => {
    const videos = [makeVideo('Show - 01.mkv'), makeVideo('Show - 02.mkv')];
    const subs = [makeSub('Show - 01.ass')];
    const groups = pairFiles(videos, subs);
    expect(groups[0].subtitles).toHaveLength(1);
    expect(groups[1].subtitles).toHaveLength(0);
  });

  it('handles multiple videos with correct pairing', () => {
    const videos = [makeVideo('Show - 01.mkv'), makeVideo('Show - 02.mkv')];
    const subs = [
      makeSub('Show - 01.zh-cn.ass', 'zh-cn'),
      makeSub('Show - 02.zh-cn.ass', 'zh-cn'),
    ];
    const groups = pairFiles(videos, subs);
    expect(groups[0].subtitles[0].filename).toBe('Show - 01.zh-cn.ass');
    expect(groups[1].subtitles[0].filename).toBe('Show - 02.zh-cn.ass');
  });

  it('falls back to episode number matching for orphan subtitles', () => {
    const videos = [
      makeVideo('胆大党 - S01E13 - Title.mkv'),
      makeVideo('胆大党 - S01E14 - Title2.mkv'),
    ];
    const subs: MediaFile[] = [
      { path: '/media/Dandadan - 13.jpsc.ass', filename: 'Dandadan - 13.jpsc.ass', ext: '.ass', kind: 'subtitle', langSuffix: 'jpsc', stem: 'Dandadan - 13' },
      { path: '/media/Dandadan - 14.jpsc.ass', filename: 'Dandadan - 14.jpsc.ass', ext: '.ass', kind: 'subtitle', langSuffix: 'jpsc', stem: 'Dandadan - 14' },
    ];
    const groups = pairFiles(videos, subs);
    expect(groups).toHaveLength(2);
    expect(groups[0].subtitles).toHaveLength(1);
    expect(groups[0].subtitles[0].filename).toBe('Dandadan - 13.jpsc.ass');
    expect(groups[1].subtitles).toHaveLength(1);
    expect(groups[1].subtitles[0].filename).toBe('Dandadan - 14.jpsc.ass');
  });

  it('does not double-match subtitles already paired by stem', () => {
    const videos = [makeVideo('Show - 01.mkv')];
    const subs = [makeSub('Show - 01.zh-cn.ass', 'zh-cn')];
    const groups = pairFiles(videos, subs);
    expect(groups[0].subtitles).toHaveLength(1);
  });
});

describe('getOrphanSubtitles', () => {
  it('finds subtitles not in any group', () => {
    const sub1: MediaFile = { path: '/media/Show - 01.ass', stem: 'Show - 01', filename: 'Show - 01.ass', ext: '.ass', kind: 'subtitle' };
    const sub2: MediaFile = { path: '/media/Show - 03.ass', stem: 'Show - 03', filename: 'Show - 03.ass', ext: '.ass', kind: 'subtitle' };
    const groups: MediaFileGroup[] = [
      { video: { stem: 'Show - 01' } as MediaFile, subtitles: [sub1] },
    ];
    const orphans = getOrphanSubtitles(groups, [sub1, sub2]);
    expect(orphans).toHaveLength(1);
    expect(orphans[0].filename).toBe('Show - 03.ass');
  });
});
