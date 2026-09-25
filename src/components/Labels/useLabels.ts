import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../redux/store';
import {  
  setActiveLoadout,
  setColourLabelMap,
  setActiveLabel,
  toggleAnchoredColour,
  clearAnchoredColours,
 } from '../../redux/labelsSlice';


export function useLabels() {
    const dispatch = useDispatch()
    const loadout = useSelector((state: RootState) => state.labels.activeLoadout);
    const label = useSelector((state: RootState) => state.labels.activeLabel);

    return {
        label, loadout
    }
}
