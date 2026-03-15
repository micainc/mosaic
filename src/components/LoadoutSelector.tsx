import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { setActiveLoadout, setColourLabelMap } from '../store/labelsSlice';
import { drawColors, mapLabelsToColors } from '../utils/drawColors';

const LoadoutSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loadouts, activeLoadout } = useAppSelector(state => state.labels);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (loadoutName: string) => {
    dispatch(setActiveLoadout(loadoutName));
    const labels = loadouts[loadoutName];
    if (labels) {
      const map = mapLabelsToColors(labels, drawColors);
      dispatch(setColourLabelMap(map));
    }
    setIsOpen(false);
  };

  return (
    <div className="toolbar-list" id="loadouts">
      <div
        className="loadout-label selected"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{activeLoadout}</span>
      </div>
      {isOpen && (
        <div className="toolbar-list-items">
          {Object.keys(loadouts).map(name => (
            <div
              key={name}
              className="loadout-label"
              onClick={() => handleSelect(name)}
            >
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoadoutSelector;
