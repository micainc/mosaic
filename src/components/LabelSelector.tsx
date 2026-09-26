import React, { useState, useEffect, useRef, useMemo } from 'react';
import { rdxo } from '../redux/store';
import { useDispatch } from 'react-redux';

import { setActiveLabel, toggleAnchoredColour, selectActiveLabel, selectLabelList } from '../redux/labelsSlice';
import { getBlackWhiteContrast } from '../utils/rgbUtils';
import { ico } from '../utils/icons';

const LabelSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { activeLabel: activeId, used, anchored } = rdxo(state => state.labels);
  const active = rdxo(selectActiveLabel);
  const records = rdxo(selectLabelList);
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sort: anchored first, then used, then alphabetical.
  const sortedLabels = useMemo(() => {
    return [...records].sort((a, b) => {
      const aAnchored = anchored[a.id] !== undefined;
      const bAnchored = anchored[b.id] !== undefined;
      if (aAnchored !== bAnchored) return aAnchored ? -1 : 1;

      const aUsed = used[a.id] !== undefined;
      const bUsed = used[b.id] !== undefined;
      if (aUsed !== bUsed) return aUsed ? -1 : 1;

      return a.name.localeCompare(b.name);
    });
  }, [records, anchored, used]);

  const filteredLabels = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return sortedLabels;
    return sortedLabels.filter(r => r.name.toLowerCase().includes(query));
  }, [sortedLabels, searchText]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectLabel = (id: number) => {
    dispatch(setActiveLabel(id));
    setIsOpen(false);
    setSearchText('');
  };

  const handleToggleAnchor = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    dispatch(toggleAnchoredColour(id));
  };

  const contrastColour = getBlackWhiteContrast(active?.colour ?? '#000000');

  return (
    <div className="toolbar-list" id="labels" ref={dropdownRef}>
      {/* Active label pill */}
      <div
        className="loadout-label selected"
        style={{
          backgroundColor: active?.colour || '#000',
          color: contrastColour,
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{active?.name || 'Select label'}</span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="toolbar-list-items label-dropdown">
          {/* Search box */}
          <input
            type="text"
            className="label-search"
            placeholder="Search labels..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              height: '24px',
              boxSizing: 'border-box',
              background: '#333',
              color: '#fff',
            }}
          />

          {/* Label list */}
          {filteredLabels.map(({ id, name, colour }) => {
            const textColour = getBlackWhiteContrast(colour);
            const isAnchored = anchored[id] !== undefined;
            const isUsed = used[id] !== undefined;
            const isActive = id === activeId;
            const needsInvert = textColour === '#000000';

            return (
              <div
                key={id}
                className={`loadout-label${isAnchored ? ' anchored' : ''}${isUsed ? ' used' : ''}${isActive ? ' active' : ''}`}
                style={{
                  backgroundColor: colour,
                  color: textColour,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onClick={() => handleSelectLabel(id)}
              >
                <span>{name}</span>
                <img
                  src={ico('anchor.svg')}
                  alt="Anchor"
                  className={`loadout-label-anchor${isAnchored ? ' active' : ''}`}
                  style={{
                    filter: needsInvert ? 'none' : 'invert(1)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  onClick={e => handleToggleAnchor(e, id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LabelSelector;
