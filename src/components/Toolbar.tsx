import React, { useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { setInteractionMode, setDrawDiameter } from '../store/canvasSlice';
import { setActiveLayer } from '../store/imageLayersSlice';
import type { InteractionMode } from '../types';
import LoadoutSelector from './LoadoutSelector';
import LabelSelector from './LabelSelector';

const Toolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { interactionMode, drawDiameter, statusText } = useAppSelector(state => state.canvas);
  const { layers, activeLayerName } = useAppSelector(state => state.imageLayers);
  const activeColour = useAppSelector(state => state.labels.activeDrawLabelColour.colour);

  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

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
        <div id="toolbar-paths">
          <button
            id="save-segmentation-map"
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('save-segmentation-map'))}
            data-tooltip="Download segmentation map..."
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/save_map.png`} alt="Save Segmentation Map" />
          </button>
          <button
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('save-tiles'))}
            data-tooltip="Download segmentation map tiles..."
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/save_folder.png`} alt="Save Tiles" />
          </button>
        </div>

        <div id="toolbar-layers">
          {Object.entries(layers).map(([name, layer]) => (
            <img
              key={name}
              className={`layer-icon${name === activeLayerName ? ' active' : ''}`}
              src={layer.icon}
              alt={name}
              title={name}
              onClick={() => dispatch(setActiveLayer(name))}
              data-tooltip={name}
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
            />
          ))}
        </div>

        <div id="toolbar-note">{statusText}</div>

        <div id="toolbar-right">
          <button
            className="toolbar-button"
            onClick={() => window.dispatchEvent(new CustomEvent('undo'))}
            data-tooltip="Undo..."
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/undo.png`} alt="Undo" />
          </button>

          <button
            className={`toolbar-button tool${interactionMode === 'select' ? ' selected-tool' : ''}`}
            onClick={() => handleToolSelect('select')}
            data-tooltip="Reclass"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <img src={`${import.meta.env.BASE_URL}img/pipette.png`} alt="Reclass" />
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
            <img src={`${import.meta.env.BASE_URL}img/bucket.png`} alt="Fill" />
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
