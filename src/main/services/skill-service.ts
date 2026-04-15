import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

type SkillScope = 'project' | 'user';
type SkillSourceKind = '.claude' | '.agents' | '.codex';

interface SkillDiscoveryRoot {
  baseDir: string;
  precedence: number;
  scope: SkillScope;
  sourceKind: SkillSourceKind;
}

interface SkillDiscoveryCandidate {
  baseDir: string;
  diagnostics: string[];
  location: string;
  name: string;
  description: string;
  scope: SkillScope;
  sourceKind: SkillSourceKind;
}

export interface InstalledSkillRecord {
  baseDir: string;
  description: string;
  diagnostics: string[];
  isShadowed: boolean;
  location: string;
  name: string;
  scope: SkillScope;
  shadowedBy: string | null;
  sourceKind: SkillSourceKind;
}

export interface SkillsScanRoot {
  baseDir: string;
  diagnostics: string[];
  exists: boolean;
  scope: SkillScope;
  sourceKind: SkillSourceKind;
}

export interface InstalledSkillsResult {
  diagnostics: string[];
  scannedRoots: SkillsScanRoot[];
  shadowedSkills: InstalledSkillRecord[];
  skills: InstalledSkillRecord[];
}

interface SkillServiceInput {
  // Optional: only set when the app has a concept of an "opened workspace".
  // In the current desktop app there is no workspace picker, so this is
  // typically left undefined and only user-level (~/.claude, ~/.agents, ...)
  // skills are discovered.
  workspaceRoot?: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const TOP_LEVEL_KEY_PATTERN = /^([A-Za-z0-9_-]+):(.*)$/;
const DISCOVERY_MAX_DEPTH = 3;
const SKIPPED_DIRECTORY_NAMES = new Set(['.git', 'node_modules']);

function extractFrontmatter(content: string) {
  const match = FRONTMATTER_PATTERN.exec(content);
  return match?.[1] ?? null;
}

function stripFrontmatter(content: string) {
  const match = FRONTMATTER_PATTERN.exec(content);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

function unquoteScalar(value: string) {
  const trimmed = value.trim();

  if (trimmed.length >= 2 && trimmed[0] === trimmed.at(-1) && ['"', "'"].includes(trimmed[0])) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseTopLevelFrontmatter(frontmatterText: string) {
  const fields = new Map<string, string | null>();
  const lines = frontmatterText.split(/\r?\n/u);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (!line.trim() || line.trimStart().startsWith('#')) {
      index += 1;
      continue;
    }

    if (line[0]?.match(/\s/u)) {
      throw new Error(`Unexpected indentation in frontmatter: ${line}`);
    }

    const match = TOP_LEVEL_KEY_PATTERN.exec(line);

    if (!match) {
      throw new Error(`Invalid frontmatter line: ${line}`);
    }

    const [, key, rawValuePart] = match;
    const rawValue = rawValuePart.trim();

    if (['|', '>', '|-', '>-', '|+', '>+'].includes(rawValue)) {
      const blockLines: string[] = [];
      index += 1;

      while (index < lines.length) {
        const nextLine = lines[index] ?? '';

        if (nextLine && !nextLine[0]?.match(/\s/u)) {
          break;
        }

        blockLines.push(nextLine.trimStart());
        index += 1;
      }

      const value = rawValue.startsWith('>')
        ? blockLines.filter(Boolean).join(' ').trim()
        : blockLines.join('\n').trim();

      fields.set(key, value);
      continue;
    }

    if (rawValue) {
      fields.set(key, unquoteScalar(rawValue));
      index += 1;
      continue;
    }

    fields.set(key, null);
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index] ?? '';

      if (!nextLine.trim()) {
        index += 1;
        continue;
      }

      if (!nextLine[0]?.match(/\s/u)) {
        break;
      }

      index += 1;
    }
  }

  return fields;
}

async function pathExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function collectSkillDirectories(
  rootPath: string,
  depth = 0,
): Promise<{ directories: string[]; diagnostics: string[] }> {
  if (!(await pathExists(rootPath))) {
    return { directories: [], diagnostics: [] };
  }

  if (depth > DISCOVERY_MAX_DEPTH) {
    return {
      directories: [],
      diagnostics: [`Skipped nested directories under ${rootPath} after max depth.`],
    };
  }

  let entries;

  try {
    entries = await readdir(rootPath, { encoding: 'utf8', withFileTypes: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown directory read error';
    return { directories: [], diagnostics: [`Failed to read ${rootPath}: ${message}`] };
  }

  if (entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
    return { directories: [rootPath], diagnostics: [] };
  }

  const directories: string[] = [];
  const diagnostics: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }

    const nestedPath = join(rootPath, entry.name);
    const result = await collectSkillDirectories(nestedPath, depth + 1);
    directories.push(...result.directories);
    diagnostics.push(...result.diagnostics);
  }

  return { directories, diagnostics };
}

async function parseSkillMetadata(location: string) {
  const diagnostics: string[] = [];
  const skillFilePath = join(location, 'SKILL.md');

  let content: string;

  try {
    content = await readFile(skillFilePath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown file read error';
    return {
      diagnostics: [`Failed to read ${skillFilePath}: ${message}`],
      metadata: null,
    };
  }

  const frontmatter = extractFrontmatter(content);

  if (!frontmatter) {
    return {
      diagnostics: [`Missing YAML frontmatter in ${skillFilePath}`],
      metadata: null,
    };
  }

  let fields: Map<string, string | null>;

  try {
    fields = parseTopLevelFrontmatter(frontmatter);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown frontmatter parse error';
    return {
      diagnostics: [`Invalid frontmatter in ${skillFilePath}: ${message}`],
      metadata: null,
    };
  }

  const name = fields.get('name')?.trim() ?? '';
  const description = fields.get('description')?.trim() ?? '';

  if (!name) {
    diagnostics.push(`Missing required "name" in ${skillFilePath}`);
  }

  if (!description) {
    diagnostics.push(`Missing required "description" in ${skillFilePath}`);
  }

  if (diagnostics.length > 0) {
    return {
      diagnostics,
      metadata: null,
    };
  }

  return {
    diagnostics,
    metadata: {
      description,
      name,
    },
  };
}

function toInstalledSkillRecord(
  candidate: SkillDiscoveryCandidate,
  input: { isShadowed: boolean; shadowedBy: string | null },
): InstalledSkillRecord {
  return {
    baseDir: candidate.baseDir,
    description: candidate.description,
    diagnostics: candidate.diagnostics,
    isShadowed: input.isShadowed,
    location: candidate.location,
    name: candidate.name,
    scope: candidate.scope,
    shadowedBy: input.shadowedBy,
    sourceKind: candidate.sourceKind,
  };
}

export class SkillService {
  private readonly roots: SkillDiscoveryRoot[];

  constructor(input: SkillServiceInput = {}) {
    const homeDir = homedir();
    const roots: SkillDiscoveryRoot[] = [];

    // Project-level roots are only registered when an explicit workspace is
    // opened. The current desktop app has no workspace picker, so callers
    // typically omit workspaceRoot and only the user-level roots below apply.
    // Precedence is numerically ordered: higher wins. Project > user, and
    // within the same scope we prefer .claude (Claude Code's default install
    // path) > .agents > .codex to match where users are most likely to have
    // installed skills.
    if (input.workspaceRoot) {
      roots.push(
        {
          baseDir: join(input.workspaceRoot, '.claude', 'skills'),
          precedence: 6,
          scope: 'project',
          sourceKind: '.claude',
        },
        {
          baseDir: join(input.workspaceRoot, '.agents', 'skills'),
          precedence: 5,
          scope: 'project',
          sourceKind: '.agents',
        },
        {
          baseDir: join(input.workspaceRoot, '.codex', 'skills'),
          precedence: 4,
          scope: 'project',
          sourceKind: '.codex',
        },
      );
    }

    roots.push(
      {
        baseDir: join(homeDir, '.claude', 'skills'),
        precedence: 3,
        scope: 'user',
        sourceKind: '.claude',
      },
      {
        baseDir: join(homeDir, '.agents', 'skills'),
        precedence: 2,
        scope: 'user',
        sourceKind: '.agents',
      },
      {
        baseDir: join(homeDir, '.codex', 'skills'),
        precedence: 1,
        scope: 'user',
        sourceKind: '.codex',
      },
    );

    this.roots = roots;
  }

  // Read the SKILL.md body (without frontmatter) for a given skill name.
  // Returns null if the skill is not found or the file cannot be read.
  async readSkillContent(
    skills: InstalledSkillRecord[],
    name: string,
  ): Promise<{ skillDirectory: string; content: string } | null> {
    const skill = skills.find((s) => s.name.toLowerCase() === name.toLowerCase());

    if (!skill) {
      return null;
    }

    const skillFilePath = join(skill.location, 'SKILL.md');

    try {
      const raw = await readFile(skillFilePath, 'utf-8');
      const content = stripFrontmatter(raw);
      return { skillDirectory: skill.location, content };
    } catch {
      return null;
    }
  }

  async listInstalledSkills(): Promise<InstalledSkillsResult> {
    const diagnostics: string[] = [];
    const scannedRoots: SkillsScanRoot[] = [];
    const candidates: Array<SkillDiscoveryCandidate & { precedence: number }> = [];

    for (const root of this.roots) {
      const exists = await pathExists(root.baseDir);
      const rootDiagnostics: string[] = [];

      if (!exists) {
        scannedRoots.push({
          baseDir: root.baseDir,
          diagnostics: rootDiagnostics,
          exists: false,
          scope: root.scope,
          sourceKind: root.sourceKind,
        });
        continue;
      }

      const { directories, diagnostics: discoveryDiagnostics } = await collectSkillDirectories(
        root.baseDir,
      );
      rootDiagnostics.push(...discoveryDiagnostics);
      diagnostics.push(...discoveryDiagnostics);

      for (const directory of directories) {
        const { metadata, diagnostics: parseDiagnostics } = await parseSkillMetadata(directory);

        if (!metadata) {
          diagnostics.push(...parseDiagnostics);
          rootDiagnostics.push(...parseDiagnostics);
          continue;
        }

        candidates.push({
          baseDir: root.baseDir,
          description: metadata.description,
          diagnostics: parseDiagnostics,
          location: directory,
          name: metadata.name,
          precedence: root.precedence,
          scope: root.scope,
          sourceKind: root.sourceKind,
        });
      }

      scannedRoots.push({
        baseDir: root.baseDir,
        diagnostics: rootDiagnostics,
        exists: true,
        scope: root.scope,
        sourceKind: root.sourceKind,
      });
    }

    candidates.sort((left, right) => {
      if (right.precedence !== left.precedence) {
        return right.precedence - left.precedence;
      }

      return left.name.localeCompare(right.name);
    });

    const winningLocationsByName = new Map<string, string>();
    const skills: InstalledSkillRecord[] = [];
    const shadowedSkills: InstalledSkillRecord[] = [];

    for (const candidate of candidates) {
      const winningLocation = winningLocationsByName.get(candidate.name);

      if (!winningLocation) {
        winningLocationsByName.set(candidate.name, candidate.location);
        skills.push(toInstalledSkillRecord(candidate, { isShadowed: false, shadowedBy: null }));
        continue;
      }

      const shadowedRecord = toInstalledSkillRecord(candidate, {
        isShadowed: true,
        shadowedBy: winningLocation,
      });
      shadowedRecord.diagnostics = [
        ...shadowedRecord.diagnostics,
        `Shadowed by ${winningLocation}`,
      ];
      shadowedSkills.push(shadowedRecord);
    }

    skills.sort((left, right) => left.name.localeCompare(right.name));
    shadowedSkills.sort((left, right) => left.name.localeCompare(right.name));
    diagnostics.sort((left, right) => left.localeCompare(right));

    return {
      diagnostics,
      scannedRoots,
      shadowedSkills,
      skills,
    };
  }
}
