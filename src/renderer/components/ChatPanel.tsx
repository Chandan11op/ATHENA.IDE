import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  FileDiff,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  AthenaSettings,
  ConversationMessage,
  ConversationRecord,
  OllamaChatMessage,
  OllamaStatus,
  ProposedFileEdit,
} from '@common/types.js';

interface ChatPanelProps {
  settings: AthenaSettings;
  ollamaStatus: OllamaStatus | null;
  isVisible: boolean;
  currentWorkspace: string | null;
  activeFile?: { path: string; relativePath: string; content: string };
  selectionText?: string;
  onClose: () => void;
  onOpenOnboarding: () => void;
  onPreviewProposedEdit: (edit: ProposedFileEdit) => void;
  onApplyProposedEdits: (edits: ProposedFileEdit[], label: string) => Promise<void>;
}

function parseProposedEdits(markdown: string): ProposedFileEdit[] {
  const edits: ProposedFileEdit[] = [];
  const regex = /```athena-edit\s+path="([^"]+)"(?:\s+action="(create|modify|delete)")?\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const relativePath = match[1]?.trim();
    const action = (match[2] as ProposedFileEdit['action'] | undefined) ?? 'modify';
    const newContent = match[3] ?? '';
    if (relativePath) {
      edits.push({ relativePath, action, newContent });
    }
  }
  return edits;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  settings,
  ollamaStatus,
  isVisible,
  currentWorkspace,
  activeFile,
  selectionText,
  onClose,
  onOpenOnboarding,
  onPreviewProposedEdit,
  onApplyProposedEdits,
}) => {
  const [threadId, setThreadId] = useState<string>(`conv-${Date.now()}`);
  const [savedThreads, setSavedThreads] = useState<ConversationRecord[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [includeFile, setIncludeFile] = useState(true);
  const [includeSelection, setIncludeSelection] = useState(true);
  const [includeKnowledge, setIncludeKnowledge] = useState(false);
  const [streamingRequestId, setStreamingRequestId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadThreads = async () => {
    if (!window.athenaApi) return;
    setSavedThreads(await window.athenaApi.listConversations());
  };

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (!window.athenaApi) return;
    return window.athenaApi.onOllamaChatChunk((ev) => {
      if (ev.delta) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === `assistant-${ev.requestId}`
              ? { ...m, content: m.content + ev.delta }
              : m
          )
        );
      }
      if (ev.done) {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === `assistant-${ev.requestId}`
              ? { ...m, proposedEdits: parseProposedEdits(m.content) }
              : m
          );
          const firstUser = updated.find((m) => m.role === 'user');
          if (window.athenaApi && updated.length > 0) {
            void window.athenaApi
              .saveConversation({
                id: threadId,
                title: (firstUser?.content || 'Athena Thread').slice(0, 48),
                model: settings.selectedModel || ollamaStatus?.models[0]?.name || 'local',
                workspacePath: currentWorkspace,
                updatedAt: new Date().toISOString(),
                messages: updated,
              })
              .then(loadThreads);
          }
          return updated;
        });
        setStreamingRequestId(null);
      }
    });
  }, [threadId, settings.selectedModel, ollamaStatus?.models, currentWorkspace]);

  if (!isVisible) return null;

  const activeModel =
    settings.selectedModel || ollamaStatus?.models[0]?.name || '';
  const isOllamaReady = Boolean(ollamaStatus?.isAvailable && activeModel);

  const startNewThread = () => {
    setThreadId(`conv-${Date.now()}`);
    setMessages([]);
  };

  const sendPrompt = async (overridePrompt?: string) => {
    const promptText = (overridePrompt ?? input).trim();
    if (!promptText || streamingRequestId || !window.athenaApi) return;

    if (!isOllamaReady) {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'system',
          content:
            'Local Ollama or a selected coding model is unavailable. Install Ollama from https://ollama.com/ and pull a coding model such as `ollama run qwen2.5-coder:1.5b` or `ollama run codellama`.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }

    const reqId = `req-${Date.now()}`;
    const userMsg: ConversationMessage = {
      id: `user-${reqId}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsg: ConversationMessage = {
      id: `assistant-${reqId}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    if (!overridePrompt) setInput('');
    setStreamingRequestId(reqId);

    const contextBlocks: string[] = [];
    if (currentWorkspace) contextBlocks.push(`Workspace: ${currentWorkspace}`);
    if (includeFile && activeFile) {
      contextBlocks.push(`Active file (${activeFile.relativePath}):\n\`\`\`\n${activeFile.content.slice(0, 6000)}\n\`\`\``);
    }
    if (includeSelection && selectionText?.trim()) {
      contextBlocks.push(`Selected code:\n\`\`\`\n${selectionText.slice(0, 3000)}\n\`\`\``);
    }
    if (includeKnowledge) {
      const hits = await window.athenaApi.queryKnowledge(promptText, 3);
      if (hits.length > 0) {
        contextBlocks.push(
          `athena.data knowledge hits:\n${hits
            .map((h) => `- ${h.filePath}: ${h.excerpt}`)
            .join('\n')}`
        );
      }
    }

    const systemPrompt = [
      'You are Athena.IDE Local Coding Assistant running offline via Ollama.',
      'Be accurate, concise, and never invent file contents you did not see.',
      'When proposing file changes, you may format an editable proposal block as:',
      '```athena-edit path="relative/path.ext" action="modify"\n<full updated file content>\n```',
      contextBlocks.join('\n\n'),
    ]
      .filter(Boolean)
      .join('\n\n');

    const chatPayload: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-8)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: promptText },
    ];

    const res = await window.athenaApi.streamOllamaChat(
      reqId,
      activeModel,
      chatPayload,
      settings.ollamaEndpoint
    );

    if (!res.ok && res.error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `assistant-${reqId}`
            ? { ...m, content: m.content || `Error: ${res.error}` }
            : m
        )
      );
      setStreamingRequestId(null);
    }
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <aside
      aria-label="Athena AI Panel"
      style={{
        width: 350,
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 35,
          padding: '0 10px 0 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-bright)' }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span>Athena AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button type="button" className="workbench-icon-btn" title="New Conversation" onClick={startNewThread}>
            <Plus size={14} />
          </button>
          <button type="button" className="workbench-icon-btn" title="Clear Messages" onClick={() => setMessages([])}>
            <Trash2 size={13} />
          </button>
          <button type="button" className="workbench-icon-btn" title="Hide AI Panel (Ctrl+L)" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Privacy & Thread Selector */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: isOllamaReady ? 'var(--success)' : 'var(--warning)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={12} />
            {isOllamaReady ? `Local: ${activeModel}` : 'Ollama Offline / No Model'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>127.0.0.1</span>
        </div>

        {savedThreads.length > 0 && (
          <select
            aria-label="Conversation History"
            value={threadId}
            onChange={(e) => {
              const found = savedThreads.find((t) => t.id === e.target.value);
              if (found) {
                setThreadId(found.id);
                setMessages(found.messages);
              }
            }}
            style={{ fontSize: 11, padding: '2px 6px' }}
          >
            <option value={threadId}>Current Thread ({messages.length} msgs)</option>
            {savedThreads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Fail-safe when Ollama unavailable */}
      {!ollamaStatus?.isAvailable && (
        <div
          style={{
            margin: 10,
            padding: 10,
            borderRadius: 4,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--warning)',
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--warning)' }}>
            <AlertTriangle size={13} />
            Ollama Not Detected
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Download Ollama from <code>https://ollama.com/</code> and install a lightweight coding model:
          </p>
          <code style={{ padding: '4px 6px', background: 'var(--bg-app)', fontFamily: 'var(--font-mono)' }}>
            ollama run qwen2.5-coder:1.5b
          </code>
          <button type="button" className="athena-btn-primary" onClick={onOpenOnboarding}>
            Open Offline AI Setup Wizard
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p>Ask Athena AI to explain, debug, refactor, or generate code locally.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {[
                ['Explain file', 'Explain what the active file does step by step.'],
                ['Write tests', 'Generate Vitest unit tests for the active file.'],
                ['Find bugs', 'Review the active file for potential bugs or edge cases.'],
                ['Refactor', 'Suggest a clean refactor for the selected code.'],
              ].map(([label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  className="athena-btn-secondary"
                  style={{ fontSize: 11, padding: '3px 7px' }}
                  onClick={() => void sendPrompt(prompt)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'stretch',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {msg.role === 'user' ? <User size={11} /> : <Bot size={11} />}
                {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : activeModel || 'Athena'} · {msg.timestamp}
              </span>
              {msg.content && (
                <button
                  type="button"
                  title="Copy response"
                  onClick={() => void copyText(msg.id, msg.content)}
                  style={{ padding: 2 }}
                >
                  {copiedId === msg.id ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                </button>
              )}
            </div>

            <div
              style={{
                padding: '8px 10px',
                borderRadius: 4,
                fontSize: 12,
                lineHeight: 1.5,
                userSelect: 'text',
                whiteSpace: 'pre-wrap',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                border: msg.role === 'system' ? '1px solid var(--warning)' : '1px solid var(--border-subtle)',
              }}
            >
              {msg.content || (streamingRequestId && msg.id.endsWith(streamingRequestId) ? 'Thinking locally...' : '')}
            </div>

            {msg.proposedEdits && msg.proposedEdits.length > 0 && (
              <div
                style={{
                  padding: 8,
                  borderRadius: 4,
                  background: 'var(--bg-app)',
                  border: '1px solid var(--accent-primary)',
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  Proposed File Edits ({msg.proposedEdits.length})
                </div>
                {msg.proposedEdits.map((ed, i) => (
                  <div key={`${ed.relativePath}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      [{ed.action}] <code>{ed.relativePath}</code>
                    </span>
                    <button
                      type="button"
                      className="athena-btn-secondary"
                      style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => onPreviewProposedEdit(ed)}
                    >
                      <FileDiff size={11} />
                      Diff
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="athena-btn-primary"
                  onClick={() => void onApplyProposedEdits(msg.proposedEdits!, 'Athena AI Approved Edit')}
                >
                  <Check size={12} />
                  Create Snapshot &amp; Apply Changes
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div style={{ padding: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10, color: 'var(--text-secondary)' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={includeFile} onChange={(e) => setIncludeFile(e.target.checked)} />
            File
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={includeSelection} onChange={(e) => setIncludeSelection(e.target.checked)} />
            Selection
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={includeKnowledge} onChange={(e) => setIncludeKnowledge(e.target.checked)} />
            athena.data Index
          </label>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <textarea
            rows={2}
            placeholder="Ask local Ollama model..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendPrompt();
              }
            }}
            style={{ flex: 1, fontSize: 12, resize: 'none' }}
          />
          {streamingRequestId ? (
            <button
              type="button"
              className="athena-btn-secondary"
              title="Stop generation"
              onClick={() => {
                void window.athenaApi?.abortOllamaChat(streamingRequestId);
                setStreamingRequestId(null);
              }}
            >
              <Square size={13} color="var(--danger)" />
            </button>
          ) : (
            <button
              type="button"
              className="athena-btn-primary"
              aria-label="Send prompt"
              onClick={() => void sendPrompt()}
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
