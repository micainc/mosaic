import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { setActiveDrawLabelColour, toggleAnchoredColour, setColourLabelMap } from '../store/labelsSlice';
import { drawColors, mapLabelsToColors } from '../utils/drawColors';
import { getBlackWhiteContrast } from '../utils/rgbUtils';

const LabelSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loadouts, activeLoadout, colourLabelMap, activeDrawLabelColour, anchoredColours } = useAppSelector(state => state.labels);
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [usedLabels, setUsedLabels] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recompute colourLabelMap when active loadout changes, and select the first label
  useEffect(() => {
    const labels = loadouts[activeLoadout];
    if (labels && labels.length > 0) {
      const map = mapLabelsToColors(labels, drawColors);
      dispatch(setColourLabelMap(map));
      handleSelectLabel(labels[0], map[labels[0]])
    }
  }, [activeLoadout, loadouts, dispatch]);

  // Build the list of labels from colourLabelMap
  // Labels are entries where the key does NOT start with '#'
  const labels = useMemo(() => {
    const result: { label: string; colour: string }[] = [];
    for (const [key, value] of Object.entries(colourLabelMap)) {
      if (!key.startsWith('#')) {
        result.push({ label: key, colour: value });
      }
    }
    return result;
  }, [colourLabelMap]);

  // Sort labels: anchored first, then used, then alphabetical
  const sortedLabels = useMemo(() => {
    return [...labels].sort((a, b) => {
      const aAnchored = !!anchoredColours[a.colour];
      const bAnchored = !!anchoredColours[b.colour];
      if (aAnchored !== bAnchored) return aAnchored ? -1 : 1;

      const aUsed = usedLabels.has(a.label);
      const bUsed = usedLabels.has(b.label);
      if (aUsed !== bUsed) return aUsed ? -1 : 1;

      return a.label.localeCompare(b.label);
    });
  }, [labels, anchoredColours, usedLabels]);

  // Filter by search text
  const filteredLabels = useMemo(() => {
    if (!searchText.trim()) return sortedLabels;
    const query = searchText.toLowerCase();
    return sortedLabels.filter(item => item.label.toLowerCase().includes(query));
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

  const handleSelectLabel = (label: string, colour: string) => {
    dispatch(setActiveDrawLabelColour({ colour, label }));
    setUsedLabels(prev => new Set(prev).add(label));
    setIsOpen(false);
    setSearchText('');
  };

  const handleToggleAnchor = (e: React.MouseEvent, label: string, colour: string) => {
    e.stopPropagation();
    dispatch(toggleAnchoredColour({ colour, label }));
  };

  const activeColour = activeDrawLabelColour.colour;
  const activeLabel = activeDrawLabelColour.label;
  const contrastColour = activeColour ? getBlackWhiteContrast(activeColour) : '#FFFFFF';

  return (
    <div className="toolbar-list" id="labels" ref={dropdownRef}>
      {/* Active label pill */}
      <div
        className="loadout-label selected"
        style={{
          backgroundColor: activeColour || '#000',
          color: contrastColour,
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{activeLabel || 'Select label'}</span>
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
              height:'24px',
              boxSizing: 'border-box',
              background: '#333',
              color: '#fff',
            }}
          />

          {/* Label list */}
          {filteredLabels.map(({ label, colour }) => {
            const textColour = getBlackWhiteContrast(colour);
            const isAnchored = !!anchoredColours[colour];
            const isUsed = usedLabels.has(label);
            const isActive = colour === activeColour;
            const needsInvert = textColour === '#000000';

            return (
              <div
                key={label}
                className={`loadout-label${isAnchored ? ' anchored' : ''}${isUsed ? ' used' : ''}${isActive ? ' active' : ''}`}
                style={{
                  backgroundColor: colour,
                  color: textColour,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onClick={() => handleSelectLabel(label, colour)}
              >
                <span>{label}</span>
                <img
                  src="/img/anchor.svg"
                  alt="Anchor"
                  className={`loadout-label-anchor${isAnchored ? ' active' : ''}`}
                  style={{
                    filter: needsInvert ? 'none' : 'invert(1)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  onClick={(e) => handleToggleAnchor(e, label, colour)}
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
