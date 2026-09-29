import React, { useState } from 'react';

import { useStage, stage } from '../../redux/store';
import { type DisplayUnit } from '../../redux/stageSlice';
import { toUnit, fmt } from './units';
import '../InputBox/InputBox.css';
import './ScaleControls.css';
import { Popover } from 'react-tiny-popover';

const UNITS: DisplayUnit[] = ['px', '%', 'nm', 'µm', 'mm', 'mil', 'in'];

export const ScaleControls = React.memo(() => {

    const cursorX = useStage.cursorX();
    const cursorY = useStage.cursorY();
    const width = useStage.canvasWidth();
    const height = useStage.canvasHeight();
    const pixelSize = useStage.pixelSize();
    const unit = useStage.displayUnit();

    const [isConversionPopupOpen, setIsConversionPopupOpen] = useState(false);

    const commitPixelSize = (raw: string) => {
        const v = parseFloat(raw);
        stage.setPixelSize(Number.isFinite(v) && v > 0 ? v : null);
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
            <span>{cursorX}<b className='b1'>/</b>{width}<b className='b1'>px</b></span>
            <span>{cursorY}<b className='b1'>/</b>{height}<b className='b1'>px</b></span>
          </span>

        <Popover
              key={'scale-controls-units-conversion-popup'}
              isOpen={isConversionPopupOpen}
              positions={['bottom']}
              align="center"
              padding={10}
              onClickOutside={() => setIsConversionPopupOpen(false)}
              containerClassName="popover-container"
              content={
                <div className="unit-selection-container">
                <>
                    {unit === '%' ? 
                    <>
                        <select
                            className='inputbox scale-controls-select'
                            value={unit}
                            onChange={e => stage.setDisplayUnit(e.currentTarget.value as DisplayUnit)}
                        >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        </>
                    :
                    <>
                        <input
                            className='inputbox scale-controls-input'
                            type='number'
                            min={0}
                            step='any'
                            placeholder='...'
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
                        <select
                            className='inputbox scale-controls-select'
                            value={unit}
                            onChange={e => stage.setDisplayUnit(e.currentTarget.value as DisplayUnit)}
                        >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <span><b className='b1'>/</b>px</span>
                        </>
                    }

                </>
                </div>
              }
            >
                
                <span className='scale-controls-u scale-controls-clickable'
                    onClick={() => setIsConversionPopupOpen(prev => !prev)}
                >
                    {unit === '%' ?
                    <>
                    <span>  {fmt(100*cursorX/width)}<b className='b1'>%</b></span>
                    <span>  {fmt(100*cursorY/height)}<b className='b1'>%</b></span>
                    </>
                    :
                    <>
                    <span>  {show(cursorX, width, true)}<b className='b1'>/</b>{show(width, width)}</span>
                    <span>  {show(cursorY, height, true)}<b className='b1'>/</b>{show(height, height)}</span>
                    </>
                    }
                </span>
            </Popover>
        </div>
    );
  }
);
