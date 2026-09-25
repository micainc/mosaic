import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../redux/store';
import {  
  setInteractionMode,
  setDrawDiameter,
  setScale,
  setCanvasDimensions,
  setHasLayers,
  setStatusText,
  setCursorXY
 } from '../../redux/canvasSlice';


export function useCanvas() {
    const dispatch = useDispatch()
    const mode = useSelector((state: RootState) => state.canvas.interactionMode);

    return {
        mode
    }

}
