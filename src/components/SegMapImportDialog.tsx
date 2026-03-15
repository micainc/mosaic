import React, { useState } from 'react';
import { getBlackWhiteContrast } from '../utils/rgbUtils';

export interface SegMapColorEntry {
  hex: string;       // e.g. '#3F007F'
  label: string;     // e.g. 'quartz'
  pixelCount: number;
}

interface Props {
  colors: SegMapColorEntry[];
  onConfirm: (selectedHexes: Set<string>) => void;
  onCancel: () => void;
}

const SegMapImportDialog: React.FC<Props> = ({ colors, onConfirm, onCancel }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    colors.forEach(c => { init[c.hex] = c.label !== 'unknown'; });
    return init;
  });

  const allChecked = colors.every(c => checked[c.hex]);

  const handleToggle = (hex: string) => {
    setChecked(prev => ({ ...prev, [hex]: !prev[hex] }));
  };

  const handleToggleAll = () => {
    const newVal = !allChecked;
    const next: Record<string, boolean> = {};
    colors.forEach(c => { next[c.hex] = newVal; });
    setChecked(next);
  };

  const handleConfirm = () => {
    const selected = new Set<string>();
    for (const [hex, isChecked] of Object.entries(checked)) {
      if (isChecked) selected.add(hex);
    }
    onConfirm(selected);
  };

  // Sort by pixel count descending
  const sorted = [...colors].sort((a, b) => b.pixelCount - a.pixelCount);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.85)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#1a1a1a', border: '1px solid #323232', borderRadius: 4,
          padding: 12, minWidth: 300, maxWidth: 500, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>Import segmentation map</span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, opacity: 0.7 }}>x</button>
        </div>

        <label style={{ color: '#aaa', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={allChecked} onChange={handleToggleAll} />
          Select all ({colors.length} classes)
        </label>

        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 12 }}>
          {sorted.map(entry => {
            const isTransparent = entry.hex === '#000000' && entry.label === 'undefined';
            const textColour = getBlackWhiteContrast(entry.hex);
            return (
              <label
                key={entry.hex}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '3px 6px', cursor: 'pointer',
                  opacity: checked[entry.hex] ? 1 : 0.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checked[entry.hex]}
                  onChange={() => handleToggle(entry.hex)}
                />
                <span
                  style={{
                    width: 16, height: 16, flexShrink: 0,
                    backgroundColor: isTransparent ? '#000' : entry.hex,
                    border: '1px solid #555',
                    
                  }}
                />
                <span style={{ color: '#fff', flex: 1, textAlign:'left'}}>{entry.label}</span>
                <span style={{ color: '#666', fontSize: 11 }}>{entry.pixelCount.toLocaleString()}px</span>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '4px 16px', background: '#333', border: '1px solid #555', color: '#fff', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{ padding: '4px 16px', background: '#4CAF50', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegMapImportDialog;
