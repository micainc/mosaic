import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { rdxo } from '../../redux/store';
import { setPixelSize, setDisplayUnit, UNIT_IN_UM, type DisplayUnit } from '../../redux/canvasSlice';
import '../InputBox/InputBox.css';
import './ScaleControls.css';
import { Popover } from 'react-tiny-popover';

const UNITS: DisplayUnit[] = ['px', '%', 'nm', 'µm', 'mm', 'mil', 'in'];

/**
 * Convert a pixel length to the display unit. `total` is the canvas extent along
 * the same axis, used only for %. Null when uncalibrated or unit is px.
 */
const toUnit = (px: number, total: number, pixelSize: number | null, unit: DisplayUnit): number | null => {
    if (unit === 'px') return null;
    if (unit === '%') return total > 0 ? (100 * px) / total : 0;
    if (pixelSize === null) return null;
    return (px * pixelSize) / UNIT_IN_UM[unit];
};

/** Fewer decimals as the magnitude grows. */
const fmt = (v: number): string => {
    const a = Math.abs(v);
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toPrecision(3);
};

export const ScaleControls = React.memo(() => {
    const dispatch = useDispatch();
    const cursorX = rdxo(state => state.canvas.cursorX);
    const cursorY = rdxo(state => state.canvas.cursorY);
    const width = rdxo(state => state.canvas.canvasWidth);
    const height = rdxo(state => state.canvas.canvasHeight);
    const pixelSize = rdxo(state => state.canvas.pixelSize);
    const unit = rdxo(state => state.canvas.displayUnit);
    const [isConversionPopupOpen, setIsConversionPopupOpen] = useState(false);

    const commitPixelSize = (raw: string) => {
        const v = parseFloat(raw);
        dispatch(setPixelSize(Number.isFinite(v) && v > 0 ? v : null));
    };

    const show = (px: number, total: number, raw:boolean = false) => {
        const v = toUnit(px, total, pixelSize, unit);
        console.log("V: ", v)
        return v === null ? (raw ? px :`${px}px`) : (raw ? fmt(v) : `${fmt(v)} ${unit}`);
    };

    return (
        <div className='scale-controls'>

        <span className='scale-controls-xy'>
            <b>X</b> 
            <b>Y</b>
          </span>

        <span className='scale-controls-px'>
            <span>{cursorX} /{width} px</span>
            <span>{cursorY} /{height} px</span>
          </span>

        <Popover
              key={'scale-controls-units-conversion-popup'}
              isOpen={isConversionPopupOpen}
              positions={['bottom']}
              align="center"
              padding={10}
              onClickOutside={() => setIsConversionPopupOpen(false)}
              containerClassName="layer-popover-container"
              content={
                <div className="unit-selection-container">
                  <div className="layer-controls-row">
                    <input
                        className='inputbox scale-controls-input'
                        type='number'
                        min={0}
                        step='any'
                        placeholder='µm/px'
                        defaultValue={pixelSize ?? ''}
                        onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') {
                                e.currentTarget.value = pixelSize === null ? '' : String(pixelSize);
                                e.currentTarget.blur();
                            }
                        }}
                        onBlur={e => commitPixelSize(e.currentTarget.value)}
                    />
                    <span>µm/px</span>
                    <select
                        className='inputbox scale-controls-select'
                        value={unit}
                        onChange={e => dispatch(setDisplayUnit(e.currentTarget.value as DisplayUnit))}
                    >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              }
            >
                
                <span className='scale-controls-u scale-controls-clickable'
                    onClick={() => setIsConversionPopupOpen(prev => !prev)}
                >
                    {unit === '%' ?
                    <>
                    <span>  {fmt(100*cursorX/width)}%</span>
                    <span>  {fmt(100*cursorY/height)}%</span>
                    </>
                    :
                    <>
                    <span>  {show(cursorX, width, true)} /{show(width, width)}</span>
                    <span>  {show(cursorY, height, true)} /{show(height, height)}</span>
                    </>
                    }
                </span>
            </Popover>
        </div>
    );
  }
);
