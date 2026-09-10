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
    // const polygons = useSelector((state: RootState) => state.polygons.polygons);
    // const selected = useSelector((state: RootState) => state.polygons.selected);

    // const getPolygonById = useCallback((id: string) => polygons.find(p => p.id === id), [polygons])
    // const toggleSelectedPolygon = useCallback((id:string) => dispatch(toggleSelected(id)), [dispatch])
    // const onlySelectPolygon = useCallback((id:string) => dispatch(selectOnly(id)), [dispatch])
    // const getSelectedPolygons = useCallback(() => polygons.filter(p => selected.includes(p.id)), [polygons, selected])
    // const deleteSelectedPolygons = useCallback(() => dispatch(deleteSelected()), [dispatch])
    // const deselectAllPolygons = useCallback(() => dispatch(clearSelection()), [dispatch])
    // const selectAllPolygons =  useCallback(() => dispatch(selectAll()), [dispatch])
    // const addPolygon = useCallback((polygon:PolygonType) => {
    //     dispatch(add(polygon))
    // }, [dispatch])

    // const updatePolygon = useCallback((id:string, polygon:Partial<PolygonType>) => {
    //     dispatch(update({...polygon, id}))
    // }, [dispatch])

    return {
        label, loadout
    }
}
