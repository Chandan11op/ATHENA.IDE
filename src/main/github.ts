import fs from 'fs';
import https from 'https';
import path from 'path';
import { safeStorage } from 'electron';
import { GitHubAuthState, GitHubRepoSummary } from '../common/types.js';
import { AthenaDataManager } from './athenaData.js';

export class GitHubService {
  private readonly tokenFilePath: string;
  private cachedToken: string | null = null;

  constructor(private readonly dataManager: AthenaDataManager) {
    this.tokenFilePath = path.join(this.dataManager.getSubdir('settings'), 'github.token.enc');
  }

  private isEncryptionSupported(): boolean {
    try {
      return Boolean(safeStorage && safeStorage.isEncryptionAvailable());
    } catch {
      return false;
    }
  }

  private readStoredToken(): string | null {
    if (this.cachedToken) return this.cachedToken;
    if (!fs.existsSync(this.tokenFilePath) || !this.isEncryptionSupported()) {
      return null;
    }
    try {
      const encrypted = fs.readFileSync(this.tokenFilePath);
      this.cachedToken = safeStorage.decryptString(encrypted);
      return this.cachedToken;
    } catch {
      return null;
    }
  }

  private requestGitHub<T>(apiPath: string, token: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        {
          hostname: 'api.github.com',
          path: apiPath,
          timeout: 10000,
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Athena.IDE-Desktop',
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c.toString('utf8')));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(raw) as T);
              } catch {
                reject(new Error('Invalid JSON response from GitHub API'));
              }
            } else {
              reject(new Error(`GitHub API HTTP ${res.statusCode}`));
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('GitHub request timed out'));
      });
      req.on('error', (err) => reject(err));
    });
  }

  public async getAuthState(): Promise<GitHubAuthState> {
    const encryptionAvailable = this.isEncryptionSupported();
    const token = this.readStoredToken();
    if (!token) {
      return {
        connected: false,
        encryptionAvailable,
        username: null,
        avatarUrl: null,
      };
    }

    try {
      const user = await this.requestGitHub<{ login: string; avatar_url: string }>('/user', token);
      return {
        connected: true,
        encryptionAvailable,
        username: user.login,
        avatarUrl: user.avatar_url,
      };
    } catch (err) {
      return {
        connected: false,
        encryptionAvailable,
        username: null,
        avatarUrl: null,
        error: err instanceof Error ? err.message : 'Unable to verify GitHub token',
      };
    }
  }

  public async saveToken(token: string): Promise<GitHubAuthState> {
    const trimmed = token.trim();
    if (!trimmed) {
      return {
        connected: false,
        encryptionAvailable: this.isEncryptionSupported(),
        username: null,
        avatarUrl: null,
        error: 'Token cannot be empty',
      };
    }
    if (!this.isEncryptionSupported()) {
      return {
        connected: false,
        encryptionAvailable: false,
        username: null,
        avatarUrl: null,
        error: 'OS credential encryption (safeStorage) is unavailable; refusing to save token in plain text.',
      };
    }

    try {
      const user = await this.requestGitHub<{ login: string; avatar_url: string }>('/user', trimmed);
      const encrypted = safeStorage.encryptString(trimmed);
      fs.writeFileSync(this.tokenFilePath, encrypted);
      this.cachedToken = trimmed;
      return {
        connected: true,
        encryptionAvailable: true,
        username: user.login,
        avatarUrl: user.avatar_url,
      };
    } catch (err) {
      return {
        connected: false,
        encryptionAvailable: true,
        username: null,
        avatarUrl: null,
        error: err instanceof Error ? err.message : 'Token verification failed',
      };
    }
  }

  public clearToken(): GitHubAuthState {
    this.cachedToken = null;
    if (fs.existsSync(this.tokenFilePath)) {
      fs.rmSync(this.tokenFilePath, { force: true });
    }
    return {
      connected: false,
      encryptionAvailable: this.isEncryptionSupported(),
      username: null,
      avatarUrl: null,
    };
  }

  public async listRepos(): Promise<{ ok: boolean; repos: GitHubRepoSummary[]; error?: string }> {
    const token = this.readStoredToken();
    if (!token) {
      return { ok: false, repos: [], error: 'Not signed in to GitHub' };
    }
    try {
      const rawRepos = await this.requestGitHub<any[]>('/user/repos?sort=updated&per_page=30', token);
      const repos: GitHubRepoSummary[] = rawRepos.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        private: Boolean(r.private),
        cloneUrl: r.clone_url,
        htmlUrl: r.html_url,
        defaultBranch: r.default_branch,
        description: r.description ?? null,
      }));
      return { ok: true, repos };
    } catch (err) {
      return {
        ok: false,
        repos: [],
        error: err instanceof Error ? err.message : 'Failed to list GitHub repositories',
      };
    }
  }
}
