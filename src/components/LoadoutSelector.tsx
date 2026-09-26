import React, { useState } from 'react';
import { rdxo } from '../redux/store';
import { setActiveLoadout } from '../redux/labelsSlice';
import { useDispatch } from 'react-redux';



const LoadoutSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { loadouts, activeLoadout } = rdxo(state => state.labels);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (loadoutName: string) => {
    dispatch(setActiveLoadout(loadoutName));
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
