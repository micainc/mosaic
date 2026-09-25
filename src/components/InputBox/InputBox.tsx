import React from 'react';
import './InputBox.css'
interface InputBoxProps extends React.HTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  classes?: string;

}

export const InputBox = React.memo<InputBoxProps>(({ classes, placeholder, ...props }) => {
    return (
        <input 
            className='inputbox'
            placeholder={placeholder ?? ''}
            {...props}
            // defaultValue={polygon.name} 
            // onKeyDown={e => { 
            //     // console.log("E KEY: ", e.key)
            //     // e.preventDefault();
            //     // e.stopPropagation();
            //     if (e.key === 'Enter') e.currentTarget.blur(); 
            //     if (e.key === 'Escape') {
            //     e.currentTarget.value = polygon.name ?? '';
            //     e.currentTarget.blur(); 
            //     }
            // }}
            // onBlur={e => {
            //     const name = e.currentTarget.value.trim();
            //     if (name !== (polygon.name ?? '')) updatePolygon(polygon.id, { name });
            // }}

        />
    );
  }
);
