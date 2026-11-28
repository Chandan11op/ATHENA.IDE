import fs from 'fs';
import path from 'path';
import { AthenaExtension } from '../common/types.js';
import { AthenaDataManager } from './athenaData.js';

const BUILTIN_EXTENSIONS: AthenaExtension[] = [
  {
    id: 'athena.lang-web-ts',
    name: 'TypeScript, React & Web Language Pack',
    version: '1.0.0',
    author: 'Athena.IDE Core',
    description: 'Syntax highlighting, folding, and diagnostics via local Monaco Editor workers.',
    category: 'language',
    enabled: true,
    builtIn: true,
    compatibility: 'verified-athena',
    permissions: ['editor:language-features'],
  },
  {
    id: 'athena.theme-dark-plus',
    name: 'Athena Dark+ & Light Themes',
    version: '1.0.0',
    author: 'Athena.IDE Core',
    description: 'VS Code-inspired Dark+ default workbench theme and Light theme alternative.',
    category: 'theme',
    enabled: true,
    builtIn: true,
    compatibility: 'verified-athena',
    permissions: ['ui:theme'],
  },
  {
    id: 'athena.ollama-inline',
    name: 'Ollama Local Inline Assistant',
    version: '1.0.0',
    author: 'Athena.IDE Core',
    description: 'Offline inline code generation & streaming chat using localhost Ollama.',
    category: 'ai-tool',
    enabled: true,
    builtIn: true,
    compatibility: 'verified-athena',
    permissions: ['network:loopback-ollama', 'workspace:read'],
  },
  {
    id: 'athena.knowledge-rag',
    name: 'athena.data Knowledge Indexer',
    version: '1.0.0',
    author: 'Athena.IDE Core',
    description: 'Local chunk indexing for user-selected workspaces and reference documents.',
    category: 'workflow',
    enabled: true,
    builtIn: true,
    compatibility: 'verified-athena',
    permissions: ['workspace:read', 'data:index'],
  },
];

export class ExtensionManager {
  private readonly registryPath: string;
  private extensions: AthenaExtension[];

  constructor(private readonly dataManager: AthenaDataManager) {
    this.registryPath = path.join(this.dataManager.getSubdir('extensions'), 'extensions.json');
    this.extensions = this.load();
  }

  private load(): AthenaExtension[] {
    let saved: AthenaExtension[] = [];
    if (fs.existsSync(this.registryPath)) {
      try {
        saved = JSON.parse(fs.readFileSync(this.registryPath, 'utf8')) as AthenaExtension[];
      } catch {
        saved = [];
      }
    }

    const byId = new Map(saved.map((e) => [e.id, e]));
    const merged: AthenaExtension[] = BUILTIN_EXTENSIONS.map((builtin) => ({
      ...builtin,
      enabled: byId.get(builtin.id)?.enabled ?? builtin.enabled,
    }));

    for (const ext of saved) {
      if (!ext.builtIn && !merged.some((m) => m.id === ext.id)) {
        merged.push(ext);
      }
    }

    this.save(merged);
    return merged;
  }

  private save(list: AthenaExtension[]): void {
    const temp = `${this.registryPath}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(list, null, 2), 'utf8');
    fs.renameSync(temp, this.registryPath);
  }

  public list(): AthenaExtension[] {
    return [...this.extensions];
  }

  public toggle(id: string, enabled: boolean): AthenaExtension[] {
    this.extensions = this.extensions.map((ext) =>
      ext.id === id ? { ...ext, enabled } : ext
    );
    this.save(this.extensions);
    return this.list();
  }

  public installFromManifestFile(filePath: string): {
    ok: boolean;
    extension?: AthenaExtension;
    error?: string;
  } {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AthenaExtension>;
      if (!raw.id || !raw.name || !raw.version) {
        return { ok: false, error: 'Manifest must declare id, name, and version' };
      }

      const ext: AthenaExtension = {
        id: String(raw.id),
        name: String(raw.name),
        version: String(raw.version),
        author: String(raw.author || 'Local User'),
        description: String(raw.description || 'User-installed Athena extension manifest'),
        category:
          raw.category === 'language' ||
          raw.category === 'theme' ||
          raw.category === 'ai-tool' ||
          raw.category === 'workflow'
            ? raw.category
            : 'workflow',
        enabled: true,
        builtIn: false,
        compatibility: 'experimental',
        permissions: Array.isArray(raw.permissions) ? raw.permissions.map(String) : ['workspace:read'],
      };

      this.extensions = [
        ...this.extensions.filter((e) => e.id !== ext.id),
        ext,
      ];
      this.save(this.extensions);
      return { ok: true, extension: ext };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Invalid extension manifest JSON',
      };
    }
  }

  public uninstall(id: string): { ok: boolean; error?: string } {
    const target = this.extensions.find((e) => e.id === id);
    if (!target) return { ok: false, error: 'Extension not found' };
    if (target.builtIn) return { ok: false, error: 'Built-in core modules cannot be uninstalled (disable instead)' };

    this.extensions = this.extensions.filter((e) => e.id !== id);
    this.save(this.extensions);
    return { ok: true };
  }
}
