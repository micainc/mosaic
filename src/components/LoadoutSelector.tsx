import React, { useEffect, useState } from 'react';
import { useLabels, labels } from '../redux/store';

import { Popover } from 'react-tiny-popover';



const LoadoutSelector: React.FC = () => {
  const loadouts = useLabels.loadouts();
  const activeLoadout = useLabels.activeLoadoutName();
  const [isOpen, setIsOpen] = useState(false);

  // Zooming widens document.body past the viewport, so the popover's default
  // boundary never reports overflow. The fixed toolbar is always viewport-wide.
  const [boundary, setBoundary] = useState<HTMLElement>();
  useEffect(() => { setBoundary(document.getElementById('toolbar') ?? undefined); }, []);

  const handleSelect = (loadoutName: string) => {
    labels.setActiveLoadout(loadoutName);
    setIsOpen(false);
  };

  return (

      <Popover
        key={'loadout-popover'}
        isOpen={isOpen}
        positions={['bottom']}
        align="center"
        padding={10}
        reposition
        boundaryElement={boundary}
        boundaryInset={16}
        onClickOutside={() => setIsOpen(false)}
        containerClassName="popover-container"
        content={
          <div className="loadout-popover">
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
        }
      >


      <div className="toolbar-list" id="loadouts">
        <div
          className="loadout-label selected"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{activeLoadout}</span>
        </div>
      </div>
    </Popover>
  );
};

export default LoadoutSelector;
