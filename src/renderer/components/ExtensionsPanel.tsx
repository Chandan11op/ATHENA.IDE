import React, { useEffect, useState } from 'react';
import { Blocks, FolderPlus, ShieldCheck, Trash2 } from 'lucide-react';
import { AthenaExtension } from '@common/types.js';

interface ExtensionsPanelProps {
  onExtensionsChanged?: (list: AthenaExtension[]) => void;
}

export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({
  onExtensionsChanged,
}) => {
  const [extensions, setExtensions] = useState<AthenaExtension[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!window.athenaApi) return;
    const list = await window.athenaApi.listExtensions();
    setExtensions(list);
    onExtensionsChanged?.(list);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    const next = await window.athenaApi.toggleExtension(id, enabled);
    setExtensions(next);
    onExtensionsChanged?.(next);
  };

  const handleInstallManifest = async () => {
    setNotice(null);
    const res = await window.athenaApi.installExtensionFromFile();
    if (res.ok) {
      setNotice(`Installed ${res.extension?.name}`);
      await load();
    } else if (res.error && res.error !== 'Canceled') {
      setNotice(res.error);
    }
  };

  const handleUninstall = async (id: string) => {
    const res = await window.athenaApi.uninstallExtension(id);
    if (res.ok) await load();
    else if (res.error) setNotice(res.error);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {extensions.filter((e) => e.enabled).length} / {extensions.length} enabled
        </span>
        <button
          type="button"
          className="athena-btn-secondary"
          style={{ fontSize: 11, padding: '3px 7px' }}
          onClick={() => void handleInstallManifest()}
        >
          <FolderPlus size={12} />
          Install Manifest
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        Modular Athena extensions stored in <code>athena.data/extensions</code>. Arbitrary VS Code <code>.vsix</code> binaries are not executed.
      </p>

      {notice && <p style={{ fontSize: 11, color: 'var(--accent-cyan)' }}>{notice}</p>}

      {extensions.map((ext) => (
        <div
          key={ext.id}
          style={{
            padding: 8,
            borderRadius: 4,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Blocks size={13} color="var(--accent-violet)" />
              {ext.name}
            </span>
            <input
              type="checkbox"
              aria-label={`Enable ${ext.name}`}
              checked={ext.enabled}
              onChange={(e) => void handleToggle(ext.id, e.target.checked)}
            />
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ext.description}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <ShieldCheck size={11} color="var(--success)" />
              {ext.permissions.join(', ')}
            </span>
            {!ext.builtIn && (
              <button
                type="button"
                title="Uninstall extension"
                onClick={() => void handleUninstall(ext.id)}
                style={{ color: 'var(--danger)', padding: 2 }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
