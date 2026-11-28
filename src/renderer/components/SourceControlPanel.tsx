import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  GitBranch,
  GitCommit,
  GitFork,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  GitBranchInfo,
  GitCommitEntry,
  GitHubAuthState,
  GitHubRepoSummary,
  GitStatusSummary,
} from '@common/types.js';

interface SourceControlPanelProps {
  currentWorkspace: string | null;
  onRefreshStatus: () => Promise<void>;
  gitStatus: GitStatusSummary | null;
  onOpenDiff: (filePath: string, diffText: string) => void;
  onWorkspaceChanged: (newPath: string) => void;
}

export const SourceControlPanel: React.FC<SourceControlPanelProps> = ({
  currentWorkspace,
  onRefreshStatus,
  gitStatus,
  onOpenDiff,
  onWorkspaceChanged,
}) => {
  const [commitMsg, setCommitMsg] = useState('');
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [newBranch, setNewBranch] = useState('');
  const [commits, setCommits] = useState<GitCommitEntry[]>([]);
  const [ghAuth, setGhAuth] = useState<GitHubAuthState | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadExtra = async () => {
    if (!window.athenaApi) return;
    const auth = await window.athenaApi.getGitHubAuthState();
    setGhAuth(auth);
    if (currentWorkspace && gitStatus?.isRepo) {
      const [brRes, logRes] = await Promise.all([
        window.athenaApi.listGitBranches(),
        window.athenaApi.getGitLog(8),
      ]);
      if (brRes.ok) setBranches(brRes.branches);
      if (logRes.ok) setCommits(logRes.commits);
    }
  };

  useEffect(() => {
    void loadExtra();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, gitStatus?.branch, gitStatus?.changes.length]);

  const handleAction = async (fn: () => Promise<{ ok?: boolean; error?: string; output?: string }>, okText: string) => {
    setBusy(true);
    setFeedback(null);
    const res = await fn();
    setBusy(false);
    if (res.error) setFeedback(`Error: ${res.error}`);
    else setFeedback(res.output?.trim() || okText);
    await onRefreshStatus();
    await loadExtra();
  };

  const viewDiff = async (filePath: string, staged: boolean) => {
    if (!window.athenaApi) return;
    const res = await window.athenaApi.getGitDiff(filePath, staged);
    onOpenDiff(filePath, res.diff || '(No line diff or untracked file)');
  };

  const stagedChanges = (gitStatus?.changes ?? []).filter((c) => c.staged);
  const unstagedChanges = (gitStatus?.changes ?? []).filter((c) => !c.staged);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <GitBranch size={13} color="var(--accent-cyan)" />
          {gitStatus?.branch ?? 'No repo'}
        </span>
        <button
          type="button"
          className="workbench-icon-btn"
          title="Refresh Git Status"
          onClick={() => void onRefreshStatus()}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {gitStatus && !gitStatus.gitInstalled && (
        <p style={{ fontSize: 11, color: 'var(--warning)' }}>
          Git CLI was not detected in PATH. Install Git to enable local source control.
        </p>
      )}

      {gitStatus?.gitInstalled && gitStatus.isRepo && (
        <>
          <textarea
            rows={2}
            placeholder="Commit message..."
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            style={{ width: '100%', fontSize: 12, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              className="athena-btn-primary"
              style={{ flex: 1 }}
              disabled={busy || !commitMsg.trim()}
              onClick={() =>
                void handleAction(async () => {
                  const res = await window.athenaApi.commitGit(commitMsg);
                  if (res.ok) setCommitMsg('');
                  return res;
                }, 'Committed changes.')
              }
            >
              <Check size={13} />
              Commit
            </button>
            <button
              type="button"
              className="athena-btn-secondary"
              disabled={busy}
              title="Pull from remote"
              onClick={() => void handleAction(() => window.athenaApi.pullGit(), 'Pulled latest.')}
            >
              <ArrowDown size={13} />
            </button>
            <button
              type="button"
              className="athena-btn-secondary"
              disabled={busy}
              title="Push to remote"
              onClick={() => void handleAction(() => window.athenaApi.pushGit(), 'Pushed commits.')}
            >
              <ArrowUp size={13} />
            </button>
          </div>

          {/* Staged */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
              Staged Changes ({stagedChanges.length})
            </div>
            {stagedChanges.map((c) => (
              <div key={`staged-${c.path}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 0' }}>
                <button
                  type="button"
                  style={{ flex: 1, justifyContent: 'flex-start', overflow: 'hidden' }}
                  onClick={() => void viewDiff(c.path, true)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.path}
                  </span>
                </button>
                <span style={{ color: 'var(--success)', fontSize: 10 }}>{c.status[0]?.toUpperCase()}</span>
                <button
                  type="button"
                  className="workbench-icon-btn"
                  style={{ width: 20, height: 20 }}
                  title="Unstage"
                  onClick={() => void handleAction(() => window.athenaApi.unstageGitFiles([c.path]), 'Unstaged.')}
                >
                  <Minus size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Unstaged */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>Changes ({unstagedChanges.length})</span>
              {unstagedChanges.length > 0 && (
                <button
                  type="button"
                  style={{ fontSize: 10, color: 'var(--accent-cyan)' }}
                  onClick={() =>
                    void handleAction(
                      () => window.athenaApi.stageGitFiles(unstagedChanges.map((u) => u.path)),
                      'Staged all changes.'
                    )
                  }
                >
                  Stage All
                </button>
              )}
            </div>
            {unstagedChanges.map((c) => (
              <div key={`work-${c.path}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 0' }}>
                <button
                  type="button"
                  style={{ flex: 1, justifyContent: 'flex-start', overflow: 'hidden' }}
                  onClick={() => void viewDiff(c.path, false)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.path}
                  </span>
                </button>
                <span style={{ color: 'var(--warning)', fontSize: 10 }}>{c.status[0]?.toUpperCase()}</span>
                <button
                  type="button"
                  className="workbench-icon-btn"
                  style={{ width: 20, height: 20 }}
                  title="Stage"
                  onClick={() => void handleAction(() => window.athenaApi.stageGitFiles([c.path]), 'Staged.')}
                >
                  <Plus size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Branches */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Branches</div>
            <select
              value={gitStatus.branch ?? ''}
              onChange={(e) => void handleAction(() => window.athenaApi.checkoutGitBranch(e.target.value), 'Switched branch.')}
              style={{ width: '100%', fontSize: 11, marginBottom: 4 }}
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                placeholder="New branch name..."
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                style={{ flex: 1, fontSize: 11 }}
              />
              <button
                type="button"
                className="athena-btn-secondary"
                disabled={!newBranch.trim()}
                onClick={() =>
                  void handleAction(async () => {
                    const r = await window.athenaApi.createGitBranch(newBranch);
                    if (r.ok) setNewBranch('');
                    return r;
                  }, 'Created branch.')
                }
              >
                Create
              </button>
            </div>
          </div>

          {/* Recent Commits */}
          {commits.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Recent Commits</div>
              {commits.map((c) => (
                <div key={c.hash} style={{ fontSize: 11, padding: '2px 0', color: 'var(--text-secondary)' }}>
                  <GitCommit size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{c.shortHash}</span>{' '}
                  {c.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Optional GitHub Section */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <GitFork size={13} />
          GitHub (Optional)
        </div>
        {ghAuth?.connected ? (
          <>
            <div style={{ fontSize: 11, color: 'var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Signed in as @{ghAuth.username}</span>
              <button
                type="button"
                className="athena-btn-secondary"
                style={{ fontSize: 10, padding: '2px 6px' }}
                onClick={() => void window.athenaApi.clearGitHubToken().then(setGhAuth)}
              >
                Sign out
              </button>
            </div>
            <button
              type="button"
              className="athena-btn-secondary"
              onClick={async () => {
                const res = await window.athenaApi.listGitHubRepos();
                if (res.ok) setRepos(res.repos);
                else setFeedback(res.error ?? 'Failed to list repos');
              }}
            >
              Load My Repositories
            </button>
            {repos.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, gap: 4 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.fullName}</span>
                <button
                  type="button"
                  className="workbench-icon-btn"
                  title="Clone Repository"
                  onClick={async () => {
                    const res = await window.athenaApi.cloneGitRepo(r.cloneUrl);
                    if (res.ok && res.targetDir) {
                      onWorkspaceChanged(res.targetDir);
                      setFeedback(`Cloned into ${res.targetDir}`);
                    } else if (res.error) {
                      setFeedback(res.error);
                    }
                  }}
                >
                  <Download size={12} />
                </button>
              </div>
            ))}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              type="password"
              placeholder="GitHub PAT (encrypted via OS safeStorage)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              style={{ fontSize: 11 }}
            />
            <button
              type="button"
              className="athena-btn-secondary"
              disabled={!tokenInput.trim()}
              onClick={async () => {
                const res = await window.athenaApi.saveGitHubToken(tokenInput);
                setGhAuth(res);
                if (res.connected) setTokenInput('');
                if (res.error) setFeedback(res.error);
              }}
            >
              Connect GitHub
            </button>
          </div>
        )}
      </div>

      {feedback && <p style={{ fontSize: 11, color: 'var(--accent-cyan)' }}>{feedback}</p>}
    </div>
  );
};
