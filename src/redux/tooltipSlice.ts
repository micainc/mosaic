import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TooltipType, TooltipTargetType } from '../types';

const initialState: TooltipType & { direction?: 'top' | 'bottom' | 'left' | 'right' } = {
    text: '',
    dimensions: undefined,
    styles: {
        textColor: 'white',
    },
    offsets: {x: 0, y: 0},
    target: undefined,
    direction: undefined,
};

const tooltipSlice = createSlice({
    name: 'tooltip',
    initialState,
    reducers: {
        setDimensions: (state, action: PayloadAction<{w:number, h:number}>) => {
            state.dimensions = action.payload;
        },

        setTarget: (state, action: PayloadAction<{target: TooltipTargetType | undefined, id:string}>) => {
            if(action.payload.id === JSON.stringify(state.target) || action.payload.id === '%$&*') {
                state.target = action.payload.target;
            }
        },

        show: (state, action: PayloadAction<{
            text: string;
            target: TooltipTargetType;
            direction?: 'top' | 'bottom' | 'left' | 'right';
        }>) => {
            const { text, target, direction } = action.payload;
            state.text = text;
            state.target = target;
            state.direction = direction;
        },




    }
});

export const { setDimensions, show, setTarget  } = tooltipSlice.actions;
export default tooltipSlice.reducer;