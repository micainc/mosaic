import React from "react"
import './Slider.css'

interface SliderProps extends React.HTMLAttributes<HTMLInputElement> {
  value: number;
  min:number;
  max:number;
  step:number|string;
  color?:string;
}

export const Slider = React.memo((slider:SliderProps) => {

    const {value, min, max, step='any', color='#FFFFFF', ...props} = slider;

    return (
        <div className="slider-container">
            <input
                className="slider"
                id="cursor-size-slider"
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                style={{ '--color': color } as React.CSSProperties}
                {...props}
            />
            <span className="slider-value">{value}</span>
        </div>
    )
})

