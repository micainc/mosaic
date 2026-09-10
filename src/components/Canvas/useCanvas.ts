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
        mode
    }

}
