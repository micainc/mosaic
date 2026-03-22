import React, { useState, useCallback, useRef } from 'react';
import { Popover, ArrowContainer } from 'react-tiny-popover';
import { useAppSelector, useAppDispatch } from '../store';
import { setInteractionMode, setDrawDiameter } from '../store/canvasSlice';
import { setActiveLayer, removeLayer, setLayerOpacity } from '../store/imageLayersSlice';
import type { InteractionMode } from '../types';
import LoadoutSelector from './LoadoutSelector';
import LabelSelector from './LabelSelector';
import './Toolbar.css';
import { Icon } from './Icon/Icon';

const Toolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { interactionMode, drawDiameter, statusText } = useAppSelector(state => state.canvas);
  const { layers, activeLayerName } = useAppSelector(state => state.imageLayers);
  const activeColour = useAppSelector(state => state.labels.activeDrawLabelColour.colour);
  const cursorX = useAppSelector(state => state.canvas.cursorX)
  const cursorY = useAppSelector(state => state.canvas.cursorY)

  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [popoverLayer, setPopoverLayer] = useState<string | null>(null);
  const popoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleToolSelect = useCallback((mode: InteractionMode) => {
    dispatch(setInteractionMode(mode));
  }, [dispatch]);

  const showTooltip = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const text = e.currentTarget.getAttribute('data-tooltip');
    if (!text) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

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
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/segmentation_map.svg`} alt="Save Segmentation Map" />
          </button>
          <button
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('save-tiles'))}
            data-tooltip="Download segmentation map tiles..."
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
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

        <div id="toolbar-note">{statusText}</div>

        <div id="toolbar-right">
          <span style={{padding:'0px 8px'}}>{cursorX}, {cursorY}</span> 
          <button
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('undo'))}
            data-tooltip="Undo..."
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/undo.svg`} alt="Undo" />
          </button>

          <button
            className={`toolbar-button tool${interactionMode === 'select' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('select')}
            data-tooltip="Reclass"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/pipette.svg`} alt="Reclass" />
          </button>
          <button
            className={`toolbar-button tool${interactionMode === 'draw' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('draw')}
            data-tooltip="Pencil"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/pencil.svg`} alt="Pencil" />
          </button>
          <button
            className={`toolbar-button tool${interactionMode === 'pen' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('pen')}
            data-tooltip="Pen"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/pen.svg`} alt="Pen" />
          </button>
          <button
            className={`toolbar-button tool${interactionMode === 'fill' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('fill')}
            data-tooltip="Fill"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/bucket.svg`} alt="Fill" />
          </button>

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
