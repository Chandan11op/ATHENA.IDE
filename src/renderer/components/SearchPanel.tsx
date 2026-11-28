import React, { useState } from 'react';
import { Search, FileCode2 } from 'lucide-react';
import { SearchResultItem } from '@common/types.js';

interface SearchPanelProps {
  currentWorkspace: string | null;
  onOpenFileAtLine: (filePath: string, line: number, column: number) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  currentWorkspace,
  onOpenFileAtLine,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  const runSearch = async () => {
    if (!currentWorkspace || !query.trim() || !window.athenaApi) return;
    setSearching(true);
    const res = await window.athenaApi.searchWorkspace(query);
    setSearching(false);
    setSearchedOnce(true);
    if (res.ok) setResults(res.results);
  };

  if (!currentWorkspace) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>
        Open a workspace folder to search files and contents.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="search"
          placeholder="Search files or text..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runSearch();
          }}
          style={{ flex: 1, fontSize: 12 }}
        />
        <button
          type="button"
          className="athena-btn-primary"
          onClick={() => void runSearch()}
          disabled={searching}
          aria-label="Run workspace search"
        >
          <Search size={13} />
        </button>
      </div>

      {searching && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Searching workspace...</p>
      )}

      {!searching && searchedOnce && results.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No matches found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {results.map((item, idx) => (
          <button
            key={`${item.filePath}:${item.line}:${idx}`}
            type="button"
            onClick={() => onOpenFileAtLine(item.filePath, item.line, item.column)}
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              padding: '5px 7px',
              borderRadius: 4,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              gap: 2,
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%' }}>
              <FileCode2 size={12} color="var(--accent-cyan)" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-bright)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.relativePath}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
                :{item.line}
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
            >
              {item.preview}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
