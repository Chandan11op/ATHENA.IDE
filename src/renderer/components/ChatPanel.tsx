import React, { useState } from 'react';
import { Send, Bot, User, Plus, X, Sparkles, Layers } from 'lucide-react';
import { OllamaStatus, NovaSettings } from '@common/types.js';
import {
  AgentExecutionMode,
  OFFLINE_AGENT_PLACEHOLDERS,
} from '../types/workbench.js';

interface ChatPanelProps {
  settings: NovaSettings;
  ollamaStatus: OllamaStatus | null;
  isVisible?: boolean;
  selectedAgentId?: string;
  agentMode?: AgentExecutionMode;
  onSelectAgent?: (agentId: string) => void;
  onChangeAgentMode?: (mode: AgentExecutionMode) => void;
  onClose?: () => void;
  onOpenOnboarding: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

const INITIAL_MESSAGE: Message = {
  id: 'welcome-1',
  sender: 'assistant',
  text: 'Ready in offline agent placeholder mode. Pick a local coding agent below (e.g., Ollama Coder) — real streaming & file tools will wire in next.',
  timestamp: 'Now',
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  settings,
  ollamaStatus,
  isVisible = true,
  selectedAgentId = 'ollama-coder',
  agentMode = 'planning',
  onSelectAgent,
  onChangeAgentMode,
  onClose,
  onOpenOnboarding,
}) => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');

  if (!isVisible) return null;

  const activePreset =
    OFFLINE_AGENT_PLACEHOLDERS.find((a) => a.id === selectedAgentId) ??
    OFFLINE_AGENT_PLACEHOLDERS[0];
  const isModelReady = ollamaStatus?.isAvailable && (settings.selectedModel || ollamaStatus.models.length > 0);

  const handleSend = (overrideText?: string) => {
    const content = (overrideText ?? input).trim();
    if (!content) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: content,
      timestamp: nowTime,
    };

    const replyMsg: Message = ollamaStatus?.isAvailable
      ? {
          id: `sys-${Date.now() + 1}`,
          sender: 'assistant',
          text: `[Placeholder — ${activePreset.name} | ${agentMode} mode] Prompt queued for local UI preview. Live Ollama streaming & workspace edits will connect in Milestone 2/4.`,
          timestamp: nowTime,
        }
      : {
          id: `sys-${Date.now() + 1}`,
          sender: 'system',
          text: `Local Ollama is offline (${activePreset.name} placeholder active). Start Ollama at ${settings.ollamaEndpoint} when ready for live local inference.`,
          timestamp: nowTime,
        };

    setMessages((prev) => [...prev, userMsg, replyMsg]);
    if (!overrideText) setInput('');
  };

  return (
    <aside
      aria-label="Athena Agent Panel"
      style={{
        width: '340px',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Antigravity-style Agent Header */}
      <div
        style={{
          height: '35px',
          padding: '0 10px 0 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '12px', color: 'var(--text-bright)' }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span>Athena Agent</span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'var(--bg-surface-elevated)',
              color: isModelReady ? 'var(--success)' : 'var(--warning)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {isModelReady ? (settings.selectedModel || 'Ollama Ready') : 'Placeholder'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            className="workbench-icon-btn"
            title="New Agent Thread"
            aria-label="New Agent Thread"
            onClick={() => setMessages([INITIAL_MESSAGE])}
          >
            <Plus size={14} />
          </button>
          {onClose && (
            <button
              type="button"
              className="workbench-icon-btn"
              title="Hide Agent Panel (Ctrl+L)"
              aria-label="Hide Agent Panel"
              onClick={onClose}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Antigravity Task Plan Placeholder Card */}
      <div
        style={{
          margin: '10px 10px 0',
          padding: '8px 10px',
          borderRadius: '6px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={12} color="var(--accent-cyan)" />
            Agent Workflow (Placeholder)
          </span>
          <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{agentMode}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          1. Inspect workspace → 2. Plan changes → 3. Verify locally
        </p>
      </div>

      {/* Message List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '94%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '10px',
                color: 'var(--text-muted)',
                marginBottom: '3px',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.sender === 'user' ? <User size={11} /> : <Bot size={11} />}
              <span>{msg.sender === 'user' ? 'You' : msg.sender === 'system' ? 'System' : activePreset.name}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.5,
                userSelect: 'text',
                background:
                  msg.sender === 'user'
                    ? 'var(--accent-primary)'
                    : 'var(--bg-surface-elevated)',
                color: msg.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
                border:
                  msg.sender === 'system'
                    ? '1px solid var(--warning)'
                    : '1px solid var(--border-subtle)',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {!ollamaStatus?.isAvailable && (
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '4px' }}>
              Offline AI Setup
            </p>
            <p style={{ marginBottom: '6px' }}>
              Athena.IDE runs strictly locally without cloud APIs. Connect Ollama when ready for live agents.
            </p>
            <button
              type="button"
              onClick={onOpenOnboarding}
              style={{
                background: 'var(--accent-primary)',
                color: '#ffffff',
                padding: '4px 8px',
                fontSize: '11px',
              }}
            >
              Setup Instructions
            </button>
          </div>
        )}
      </div>

      {/* Antigravity-style Composer Card */}
      <div
        style={{
          padding: '8px 10px 10px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <textarea
            rows={2}
            placeholder={`Ask ${activePreset.name} to plan or edit code...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              width: '100%',
              resize: 'none',
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: '12px',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
              <select
                aria-label="Select Local Offline Agent"
                value={selectedAgentId}
                onChange={(e) => onSelectAgent?.(e.target.value)}
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  maxWidth: '140px',
                  background: 'var(--bg-surface-elevated)',
                }}
              >
                {OFFLINE_AGENT_PLACEHOLDERS.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onChangeAgentMode?.(agentMode === 'planning' ? 'fast' : 'planning')}
                title="Switch Agent Execution Mode (Placeholder)"
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  textTransform: 'capitalize',
                }}
              >
                {agentMode}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSend()}
              aria-label="Send prompt"
              style={{
                background: 'var(--accent-primary)',
                color: '#ffffff',
                padding: '4px 10px',
                fontSize: '11px',
              }}
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
