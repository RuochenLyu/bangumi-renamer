#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { confirm, input } from '@inquirer/prompts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { getMessages } from './types.js';
import { scanDirectory, pairFiles, getOrphanSubtitles } from './scanner.js';
import { resolveApiKey, selectShow, selectSeason, getEpisodes, getShowDetail, getMovieDetail } from './tmdb.js';
import { buildRenamePlan, buildMovieRenamePlan, printPlan, executePlan } from './renamer.js';
import { saveHistory, executeUndo } from './undo.js';

function detectLang(): string {
  // macOS: system language preference takes priority
  if (process.platform === 'darwin') {
    try {
      const locale = execSync('defaults read -g AppleLocale', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (locale.toLowerCase().startsWith('zh')) return 'zh-CN';
    } catch { /* ignore */ }
  }

  // Fallback to env vars
  const env = process.env['LANG'] || process.env['LC_ALL'] || process.env['LANGUAGE'] || '';
  if (env.toLowerCase().startsWith('zh')) return 'zh-CN';

  return 'en-US';
}

function extractQueryFromDir(dir: string): string {
  const basename = path.basename(dir);
  return basename
    // Strip common release tags
    .replace(/[.\s_\-]*(S\d+|Season\s*\d+|WebRip|BDRip|BluRay|DVDRip|WEB-?DL|1080[pi]|720p|480p|2160p|4K|HEVC|x264|x265|H\.?264|H\.?265|AAC|FLAC|10bit|AVC).*$/i, '')
    // Replace dots/underscores with spaces
    .replace(/[._]/g, ' ')
    .trim();
}

export async function runCli(argv: string[]) {
  const defaultLang = detectLang();
  const helpMsg = getMessages(defaultLang);
  const program = new Command();

  const titleMap: Record<string, string> = {
    'Usage:': helpMsg.helpLabelUsage,
    'Arguments:': helpMsg.helpLabelArguments,
    'Options:': helpMsg.helpLabelOptions,
    'Commands:': helpMsg.helpLabelCommands,
  };
  program.configureHelp({
    styleTitle: (str: string) => titleMap[str] ?? str,
  });

  program
    .name('bangumi-renamer')
    .description(helpMsg.helpDescription)
    .version('1.2.0', '-V, --version', helpMsg.helpLabelDisplayVersion)
    .helpOption('-h, --help', helpMsg.helpLabelDisplayHelp)
    .addHelpText('after', '\n' + helpMsg.helpExamples)
    .addHelpCommand(false);

  program
    .command('rename', { isDefault: true })
    .description(helpMsg.helpRenameDesc)
    .helpOption('-h, --help', helpMsg.helpLabelDisplayHelp)
    .argument('<dir>', helpMsg.helpDirArg)
    .option('-q, --query <query>', helpMsg.helpQuery)
    .option('--tmdb-id <id>', helpMsg.helpTmdbId, parseInt)
    .option('-s, --season <number>', helpMsg.helpSeason, parseInt)
    .option('-n, --dry-run', helpMsg.helpDryRun)
    .option('--offset <number>', helpMsg.helpOffset, parseInt, 0)
    .option('-m, --movie', helpMsg.helpMovie)
    .option('-y, --yes', helpMsg.helpYes)
    .option('--json', helpMsg.helpJson)
    .option('-l, --lang <lang>', helpMsg.helpLang, defaultLang)
    .action(async (dir: string, options) => {
      const resolved = path.resolve(dir);
      const msg = getMessages(options.lang);
      const jsonMode = !!options.json;
      const autoYes = jsonMode || !!options.yes;
      const log = jsonMode ? (() => {}) : console.log.bind(console);

      // Detect single file vs directory
      let resolvedDir: string;
      let singleFile: string | undefined;
      try {
        const s = statSync(resolved);
        if (s.isFile()) {
          resolvedDir = path.dirname(resolved);
          singleFile = path.basename(resolved);
        } else {
          resolvedDir = resolved;
        }
      } catch {
        resolvedDir = resolved;
      }

      // 1. Resolve API key
      const apiKey = await resolveApiKey(msg, autoYes);

      // 2. Scan directory
      log(chalk.dim(msg.scanningDir));
      let { videos, subtitles } = await scanDirectory(resolvedDir);

      // Single file mode: keep only the target video and its subtitles
      if (singleFile) {
        videos = videos.filter((v) => v.filename === singleFile);
        // Keep subtitles that share the same stem or match by episode number
      }

      if (videos.length === 0) {
        if (jsonMode) {
          console.log(JSON.stringify({ command: 'rename', success: false, error: msg.noVideoFiles }));
        } else {
          console.log(chalk.yellow(msg.noVideoFiles));
        }
        process.exitCode = 2;
        return;
      }

      log(msg.foundFiles(videos.length, subtitles.length));

      // 3. Pair files
      const groups = pairFiles(videos, subtitles);
      const orphans = getOrphanSubtitles(groups, subtitles);
      if (orphans.length > 0) {
        log(chalk.yellow(msg.orphanSubtitles(orphans.length)));
      }

      // 4. Search TMDB / select show
      let showId: number;
      let showName: string;
      let mediaType: 'tv' | 'movie';
      let movieYear: string | undefined;

      if (options.tmdbId) {
        showId = options.tmdbId;
        if (options.movie) {
          mediaType = 'movie';
          const detail = await getMovieDetail(apiKey, showId, options.lang);
          showName = detail.title;
          movieYear = detail.releaseDate?.slice(0, 4);
        } else {
          mediaType = 'tv';
          const detail = await getShowDetail(apiKey, showId, options.lang);
          showName = detail.name;
        }
        log(chalk.dim(`Using: ${showName} (TMDB #${showId})`));
      } else {
        const query = options.query || extractQueryFromDir(resolvedDir);
        const result = await selectShow(apiKey, msg, query, options.lang);
        showId = result.id;
        showName = result.name;
        mediaType = result.mediaType;
        if (mediaType === 'movie') {
          const detail = await getMovieDetail(apiKey, showId, options.lang);
          movieYear = detail.releaseDate?.slice(0, 4);
        }
      }

      // 5. Build rename plan
      let plan;
      if (mediaType === 'movie') {
        plan = buildMovieRenamePlan(groups, showName, showId, movieYear, resolvedDir);
      } else {
        const season = await selectSeason(apiKey, showId, msg, options.season, options.lang);
        log(chalk.dim(`${msg.fetchingEpisodes}`));
        const episodes = await getEpisodes(apiKey, showId, season.seasonNumber, options.lang);
        let offset = options.offset;
        if (groups.length !== episodes.length) {
          log(chalk.yellow(msg.episodeCountMismatch(groups.length, episodes.length)));
          if (offset === 0 && groups.length < episodes.length && !autoYes) {
            const answer = await input({ message: msg.startEpisode, default: '1' });
            const startEp = parseInt(answer, 10);
            if (!isNaN(startEp) && startEp > 1) {
              offset = startEp - 1;
            }
          }
        }
        plan = buildRenamePlan(groups, episodes, showName, showId, season.seasonNumber, offset, resolvedDir);
      }

      if (plan.entries.length === 0) {
        if (jsonMode) {
          console.log(JSON.stringify({ command: 'rename', success: false, error: msg.noFilesToRename }));
        } else {
          console.log(chalk.yellow(msg.noFilesToRename));
        }
        process.exitCode = 2;
        return;
      }

      const planEntries = plan.entries.map((e) => ({
        old: path.basename(e.oldPath),
        new: path.basename(e.newPath),
      }));

      // 6. Preview / Dry run
      if (options.dryRun) {
        if (jsonMode) {
          console.log(JSON.stringify({
            command: 'rename', dryRun: true, mediaType, tmdbId: showId, showName,
            entries: planEntries,
          }));
        } else {
          printPlan(plan, msg);
          console.log(chalk.dim(msg.dryRunComplete));
        }
        return;
      }

      // 7. Confirm
      if (!autoYes) {
        printPlan(plan, msg);
        const ok = await confirm({ message: msg.confirmRename, default: true });
        if (!ok) {
          process.exitCode = 1;
          return;
        }
      }

      // 8. Save history, then rename
      await saveHistory(plan, resolvedDir);
      log(chalk.dim(msg.renaming));
      const count = await executePlan(plan);

      if (jsonMode) {
        console.log(JSON.stringify({
          command: 'rename', success: true, mediaType, tmdbId: showId, showName,
          filesRenamed: count, entries: planEntries,
        }));
      } else {
        console.log(chalk.green(msg.renamed(count)));
      }
    });

  program
    .command('undo')
    .description(helpMsg.helpUndoDesc)
    .helpOption('-h, --help', helpMsg.helpLabelDisplayHelp)
    .argument('[dir]', helpMsg.helpUndoDirArg, '.')
    .option('-y, --yes', helpMsg.helpYes)
    .option('--json', helpMsg.helpJson)
    .option('-l, --lang <lang>', helpMsg.helpLang, defaultLang)
    .action(async (dir: string, options) => {
      const resolvedDir = path.resolve(dir);
      const msg = getMessages(options.lang);
      const jsonMode = !!options.json;
      const autoYes = jsonMode || !!options.yes;
      await executeUndo(resolvedDir, msg, { yes: autoYes, json: jsonMode });
    });

  await program.parseAsync(argv, { from: 'user' });
}

// Entry detection
const self = fileURLToPath(import.meta.url);
const entry = realpathSync(process.argv[1]);
if (self === entry) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(message));
    process.exitCode = 2;
  });
}
