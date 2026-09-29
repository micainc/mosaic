import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Popover, ArrowContainer } from 'react-tiny-popover';
import { useLabels, useLayers, useStage, layers, stage } from '../redux/store';

import type { InteractionMode } from '../types';
import LoadoutSelector from './LoadoutSelector';
import LabelSelector from './LabelSelector';
import './Toolbar.css';
import { Icon } from './Icon/Icon';
import { useTooltip } from './Tooltip/useTooltip';

import { ico } from '../utils/icons';
import { ScaleControls } from './Scaling/ScaleControls';
import { Slider } from './Slider/Slider';

const Toolbar: React.FC = () => {
    const status = useStage.status(); 
    const interactionMode = useStage.mode(); 
    const drawDiameter= useStage.drawDiameter();
    
    const layerMap = useLayers.layers();
    const activeLayerName = useLayers.activeLayerName();
    const activeColour = useLabels.activeLabel().colour;

  const {showTooltip} = useTooltip();
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [popoverLayer, setPopoverLayer] = useState<string | null>(null);
  const popoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToolSelect = useCallback((mode: InteractionMode) => {
    stage.setMode(mode);
  }, []);

  useEffect(() => {
    console.log("TOOLBAR INTERACTION MODE: ", interactionMode)
  }, [interactionMode])
  return (
    <>
      {tooltip && (
        <div className="tooltip show" style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}>
          {tooltip.text}
        </div>
      )}

      <div id="toolbar">
        <div id="toolbar-left">
          <span className='app-name'><b>MOSAIC</b></span>

          <button
            id="save-segmentation-map"
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('save-segmentation-map'))}
            data-tooltip="Download segmentation map..."
            onMouseEnter={showTooltip('"Download segmentation map..."')}
          >
            <img src={ico('segmentation_map.svg')} alt="Save Segmentation Map" />
          </button>
          <button
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('save-tiles'))}
            data-tooltip="Download segmentation map tiles..."
            onMouseEnter={showTooltip('Download segmentation map tiles...')}
          >
            <img src={ico('download.svg')} alt="Save Tiles" />
          </button>
        </div>

        <div id="toolbar-layers">
          {Object.entries(layerMap).map(([name, layer], index) => (
            <Popover
              key={name}
              isOpen={popoverLayer === name}
              // isOpen = {index=== 0}
              positions={['bottom']}
              align="center"
              padding={10}
              onClickOutside={() => setPopoverLayer(null)}
              containerClassName="popover-container"
              content={
                <div
                  className="layer-controls"
                  onMouseEnter={() => {
                    if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
                  }}
                  onMouseLeave={() => {
                    popoverTimeout.current = setTimeout(() => setPopoverLayer(null), 150);
                  }}
                >
                  <div className="layer-controls-row"  style={{paddingRight:'8px', paddingLeft:'4px'}}>
                    <Icon
                      src={ico('delete.svg')}
                      colour='#FF0000'
                      classes='button fit inset-2'
                      // width='0.75em'
                      // height='0.75em'
                      onClick={() => {
                      layers.removeLayer(name);
                      setPopoverLayer(null);
                    }}
                    />
                    <span className="layer-name">{name}</span>
                  </div>
                  <Slider 
                    value={layer.opacity}
                    min={0} 
                    max={1} 
                    step={0.01}
                    onChange={(e) => layers.setLayerOpacity({ name, opacity: Number(e.target.value) })}
                  />
                </div>
              }
            >
              <img
                className={`layer-icon${name === activeLayerName ? ' active' : ''}`}
                src={layer.icon}
                alt={name}
                onClick={() => layers.setActiveLayer(name)}
                onMouseEnter={() => {
                  if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
                  setPopoverLayer(name);
                }}
                onMouseLeave={() => {
                  popoverTimeout.current = setTimeout(() => setPopoverLayer(null), 150);
                }}
              />
            </Popover>
          ))}
        </div>

        <div id="toolbar-note">{status} | {interactionMode}</div>

        <div id="toolbar-right">


          <ScaleControls/>

          <Icon
            classes={`button fit inset-8`}
            onClick={() => window.dispatchEvent(new CustomEvent('undo'))}
            onMouseEnter={showTooltip('Undo')}
            src={ico('undo.svg')}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'select' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('select')}
            onMouseEnter={showTooltip('Select')}
            src={ico('pointer.svg')}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'pipette' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('pipette')}
            onMouseEnter={showTooltip('Reclass')}
            src={ico('pipette.svg')}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'draw' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('draw')}
            onMouseEnter={showTooltip('Pencil')}
            src={ico('pencil.svg')}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'pen' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('pen')}
            onMouseEnter={showTooltip('Pen')}
            src={ico('pen.svg')}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'fill' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('fill')}
            onMouseEnter={showTooltip('Fill')}
            src={ico('bucket.svg')}
          />

          <Slider 
            value={drawDiameter} 
            min={5}
            max={100}
            step={1}
            color={activeColour}
            onChange={(e) => {
              // console.log("VALUE: ", e.target.value)
              stage.setDrawDiameter(Number(e.target.value));}}

          />
          <LoadoutSelector />
          <LabelSelector />
        </div>
      </div>
    </>
  );
};

export default Toolbar;
