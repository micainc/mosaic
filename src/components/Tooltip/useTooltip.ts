import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useRef, useEffect } from 'react';
import {  show, setTarget} from '../../redux/tooltipSlice';
import { TooltipTargetType } from '../../types';

export const useTooltip = () => {
  const dispatch = useDispatch();
  const memoizedCallbacks = useRef(new Map<string, (e: React.MouseEvent | React.FocusEvent) => void>());

  const hideTooltip = useCallback(() => {    
      dispatch(setTarget({target: undefined, id: '%$&*'}))
  }, [dispatch]);

  const _showTooltip = useCallback((
    text: string,
    event: React.MouseEvent | React.FocusEvent,
    direction?: 'top' | 'bottom' | 'left' | 'right',
  ) => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();


  const tooltipTarget: TooltipTargetType = {
      tag: target.tagName,
      classes: Array.from(target.classList),
      bottom: rect.bottom + window.scrollY,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      right: rect.right + window.scrollX,
      w: rect.width,
      h: rect.height,
      x: rect.x + window.scrollX,
      y: rect.y + window.scrollY
  };



    dispatch(show({
        text,
        target: tooltipTarget,
        direction,
    }));


    const persistent = (event as any).persistent === true;                                                                                                                                                                                                                               

    const cleanup = () => {
        dispatch(setTarget({ target: undefined, id: JSON.stringify(tooltipTarget) }));                                                                                                                                                                                                
        clearInterval(hoverCheckId);            
    };                                                                                                                                                                                                                                                                                       
                
    let hoverCheckId: ReturnType<typeof setInterval> | undefined;                                                                                                                                                                                                                        

    if (!persistent) {                                                                                                                                                                                                                                                                   
        // Existing fast paths                                                                                                                                                                                                                                                           
        target.addEventListener('mouseleave', cleanup, { once: true });
        target.addEventListener('blur', cleanup, { once: true });
        window.addEventListener('scroll', cleanup, { once: true });
                                                                                                                                                                                                                                                                                          
        // Hover-loss fallback              
        hoverCheckId = setInterval(() => {                                                                                                                                                                                                                                               
            if (!target.isConnected || !target.matches(':hover')) cleanup();
        }, 200);                                                                                                                                                                                                                                                                         
    }  
    




    // When target is clicked, wait for React re-render then refresh tooltip
    const clickHandler = () => {
      // console.log("TARGET CLICKED - waiting for re-render")
      setTimeout(() => {
        const elementAtPosition = document.elementFromPoint(tooltipTarget.x - window.scrollX, tooltipTarget.y - window.scrollY);
        if (elementAtPosition && elementAtPosition !== document.documentElement && elementAtPosition !== document.body) {
          // console.log("FOUND NEW ELEMENT AT POSITION - triggering mouseover")
          // Use mouseover instead of mouseenter because mouseenter doesn't bubble
          const mouseOverEvent = new MouseEvent('mouseover', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          // console.log("E", elementAtPosition)
          elementAtPosition.dispatchEvent(mouseOverEvent);
        }
      }, 100);
    };

    target.addEventListener('click', clickHandler);
    target.addEventListener('contextmenu', clickHandler);


    // Clean up click handler when tooltip hides
    const cleanupClick = () => {
      target.removeEventListener('click', clickHandler);
      target.removeEventListener('contextmenu', clickHandler);

    };

    
    target.addEventListener('mouseleave', cleanupClick, {once: true});
    window.addEventListener('scroll', cleanupClick, {once: true});

  }, [dispatch]);






  const showTooltip = useCallback((
    text: string,
    event?: React.MouseEvent | React.FocusEvent,
    direction?: 'top' | 'bottom' | 'left' | 'right',
  ) => {
    // If second parameter is an event, use direct behavior
    if (event && typeof event === 'object' && 'currentTarget' in event) {

      _showTooltip(text, event, direction);
      return;
    }

    const key = `${text}-${direction ?? ''}`;

    if (!memoizedCallbacks.current.has(key)) {
      memoizedCallbacks.current.set(key, (e: React.MouseEvent | React.FocusEvent) => {
        _showTooltip(text, e, direction);
      });
    }

    return memoizedCallbacks.current.get(key)!;
  }, [_showTooltip]);

  



  return { showTooltip, hideTooltip };
};