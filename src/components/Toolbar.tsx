import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Popover, ArrowContainer } from 'react-tiny-popover';
import { rdxo } from '../redux/store';
import { setInteractionMode, setDrawDiameter } from '../redux/canvasSlice';
import { setActiveLayer, removeLayer, setLayerOpacity } from '../redux/imageLayersSlice';
import type { InteractionMode } from '../types';
import LoadoutSelector from './LoadoutSelector';
import LabelSelector from './LabelSelector';
import './Toolbar.css';
import { Icon } from './Icon/Icon';
import { useTooltip } from './Tooltip/useTooltip';
import { useDispatch } from 'react-redux';
import { ico } from '../utils/icons';
import { ScaleControls } from './Scaling/ScaleControls';
import { selectActiveLabel } from '../redux/labelsSlice';

const Toolbar: React.FC = () => {
  const dispatch = useDispatch();
  const { interactionMode, drawDiameter, statusText } = rdxo(state => state.canvas);
  const { layers, activeLayerName } = rdxo(state => state.imageLayers);
  const activeColour = rdxo(selectActiveLabel).colour;
  const cursorX = rdxo(state => state.canvas.cursorX)
  const cursorY = rdxo(state => state.canvas.cursorY)
  const width = rdxo(state => state.canvas.canvasWidth)
  const height = rdxo(state => state.canvas.canvasHeight)

  const {showTooltip} = useTooltip();
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [popoverLayer, setPopoverLayer] = useState<string | null>(null);
  const popoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToolSelect = useCallback((mode: InteractionMode) => {
    dispatch(setInteractionMode(mode));
  }, [dispatch]);

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
          {Object.entries(layers).map(([name, layer], index) => (
            <Popover
              key={name}
              isOpen={popoverLayer === name}
              // isOpen = {index=== 0}
              positions={['bottom']}
              align="center"
              padding={10}
              onClickOutside={() => setPopoverLayer(null)}
              containerClassName="layer-popover-container"
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
                  <div className="layer-controls-row">
                    <Icon
                      src={ico('delete.svg')}
                      colour='#FF0000'
                      classes='button fit unpadded'
                      // width='0.75em'
                      // height='0.75em'
                      onClick={() => {
                      dispatch(removeLayer(name));
                      setPopoverLayer(null);
                    }}
                    />
                    <span className="layer-name">{name}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={layer.opacity}
                    onChange={(e) => dispatch(setLayerOpacity({ name, opacity: Number(e.target.value) }))}
                  />
                </div>
              }
            >
              <img
                className={`layer-icon${name === activeLayerName ? ' active' : ''}`}
                src={layer.icon}
                alt={name}
                onClick={() => dispatch(setActiveLayer(name))}
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

        <div id="toolbar-note">{statusText} | {interactionMode}</div>

        <div id="toolbar-right">


          <ScaleControls/>

          <Icon
            classes={`button fit inset-8`}
            onClick={() => window.dispatchEvent(new CustomEvent('undo'))}
            onMouseEnter={showTooltip('Undo')}
            src={ico('undo.svg')}
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
{/* 
          <Icon
            classes={`button fit inset-8 ${interactionMode === 'roi' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('roi')}
            onMouseEnter={showTooltip('ROI')}
            src={ico('crop.svg')}
          /> */}

          <input
            className="slider"
            id="cursor-size-slider"
            type="range"
            min={5}
            max={100}
            value={drawDiameter}
            onChange={(e) => dispatch(setDrawDiameter(Number(e.target.value)))}
            style={{ '--color': activeColour } as React.CSSProperties}
          />

          <LoadoutSelector />
          <LabelSelector />
        </div>
      </div>
    </>
  );
};

export default Toolbar;
