import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Popover, ArrowContainer } from 'react-tiny-popover';
import { useAppSelector } from '../redux/store';
import { setInteractionMode, setDrawDiameter } from '../redux/canvasSlice';
import { setActiveLayer, removeLayer, setLayerOpacity } from '../redux/imageLayersSlice';
import type { InteractionMode } from '../types';
import LoadoutSelector from './LoadoutSelector';
import LabelSelector from './LabelSelector';
import './Toolbar.css';
import { Icon } from './Icon/Icon';
import { useTooltip } from './Tooltip/useTooltip';
import { useDispatch } from 'react-redux';

const Toolbar: React.FC = () => {
  const dispatch = useDispatch();
  const { interactionMode, drawDiameter, statusText } = useAppSelector(state => state.canvas);
  const { layers, activeLayerName } = useAppSelector(state => state.imageLayers);
  const activeColour = useAppSelector(state => state.labels.activeDrawLabelColour.colour);
  const cursorX = useAppSelector(state => state.canvas.cursorX)
  const cursorY = useAppSelector(state => state.canvas.cursorY)

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
            <img src={`${import.meta.env.BASE_URL}img/segmentation_map.svg`} alt="Save Segmentation Map" />
          </button>
          <button
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('save-tiles'))}
            data-tooltip="Download segmentation map tiles..."
            onMouseEnter={showTooltip('Download segmentation map tiles...')}
          >
            <img src={`${import.meta.env.BASE_URL}img/download.svg`} alt="Save Tiles" />
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
                      src={`${import.meta.env.BASE_URL}img/delete.svg`}
                      colour='#FF0000'
                      width='0.75em'
                      height='0.75em'
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
                  <button
                    className="layer-delete"
                    onClick={() => {
                      dispatch(removeLayer(name));
                      setPopoverLayer(null);
                    }}
                  >

                  </button>
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
          <span style={{padding:'0px 8px'}}>{cursorX}, {cursorY}</span> 

          <Icon
            classes={`button fit inset-8`}
            onClick={() => window.dispatchEvent(new CustomEvent('undo'))}
            onMouseEnter={showTooltip('Undo')}
            src={`${import.meta.env.BASE_URL}img/undo.svg`}
          />


          <Icon
            classes={`button fit inset-8 ${interactionMode === 'pipette' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('pipette')}
            onMouseEnter={showTooltip('Reclass')}
            src={`${import.meta.env.BASE_URL}img/pipette.svg`}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'draw' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('draw')}
            onMouseEnter={showTooltip('Pencil')}
            src={`${import.meta.env.BASE_URL}img/pencil.svg`}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'pen' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('pen')}
            onMouseEnter={showTooltip('Pen')}
            src={`${import.meta.env.BASE_URL}img/pen.svg`}
          />

          {/* <Icon
            classes={`button fit inset-8 ${interactionMode === 'stats' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('stats')}
            onMouseEnter={showTooltip('Stats')}
            src={`${import.meta.env.BASE_URL}img/stats.svg`}
          /> */}

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'fill' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('fill')}
            onMouseEnter={showTooltip('Fill')}
            src={`${import.meta.env.BASE_URL}img/bucket.svg`}
          />

          <Icon
            classes={`button fit inset-8 ${interactionMode === 'roi' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('roi')}
            onMouseEnter={showTooltip('ROI')}
            src={`${import.meta.env.BASE_URL}img/crop.svg`}
          />

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
