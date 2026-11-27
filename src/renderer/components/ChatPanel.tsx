import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, Terminal } from 'lucide-react';
import { OllamaStatus, NovaSettings } from '@common/types.js';

interface ChatPanelProps {
  settings: NovaSettings;
  ollamaStatus: OllamaStatus | null;
  onOpenOnboarding: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  settings,
  ollamaStatus,
  onOpenOnboarding,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am NOVA, your offline AI development assistant. Connect your local Ollama model to begin creating, running, and debugging web projects!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');

  const isModelReady = ollamaStatus?.isAvailable && (settings.selectedModel || ollamaStatus.models.length > 0);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // If local AI is offline, show helpful system prompt
    if (!ollamaStatus?.isAvailable) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: 'Local Ollama is offline or not detected. Please ensure Ollama is installed and running on http://127.0.0.1:11434.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }, 300);
    }
  };

  return (
    <aside style={{
      width: '320px',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '12px' }}>
          <Bot size={16} color="var(--accent-primary)" />
          <span>AI Assistant</span>
        </div>
        <span style={{
          fontSize: '11px',
          color: isModelReady ? 'var(--success)' : 'var(--warning)',
          background: 'var(--bg-surface-elevated)',
          padding: '2px 6px',
          borderRadius: '4px',
        }}>
          {isModelReady ? (settings.selectedModel || 'Model Ready') : 'No Model'}
        </span>
      </div>

      {/* Message List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginBottom: '3px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
              <span>{msg.sender === 'user' ? 'You' : msg.sender === 'system' ? 'System' : 'NOVA'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>
            <div style={{
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              lineHeight: '1.5',
              background: msg.sender === 'user' 
                ? 'var(--accent-primary)' 
                : msg.sender === 'system' 
                  ? 'var(--bg-surface-elevated)' 
                  : 'var(--bg-app)',
              color: msg.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
              border: msg.sender === 'system' ? '1px solid var(--warning)' : '1px solid var(--border-subtle)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {!ollamaStatus?.isAvailable && (
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}>
            <p style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '4px' }}>
              Offline AI Setup Guide
            </p>
            <p style={{ marginBottom: '6px' }}>
              NOVA runs strictly offline without cloud APIs. You will need to install Ollama locally.
            </p>
            <button
              onClick={onOpenOnboarding}
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
              }}
            >
              Open Setup Instructions
            </button>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder={ollamaStatus?.isAvailable ? 'Describe what to build or change...' : 'Local AI offline (click for setup)'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ flex: 1, fontSize: '12px' }}
          />
          <button
            onClick={handleSend}
            style={{
              background: 'var(--accent-primary)',
              color: '#ffffff',
              padding: '6px 12px',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
