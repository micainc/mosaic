import { tooltip } from '../../redux/store';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useRef, useEffect } from 'react';

import { TooltipTargetType } from '../../types';
import { show, setTarget } from '../../redux/tooltipSlice';

export type TooltipDirection = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  direction?: 'top' | 'bottom' | 'left' | 'right';
  event?: React.MouseEvent | React.FocusEvent;
};


export const useTooltip = () => {
  const dispatch = useDispatch();

  const memoizedCallbacks = useRef(new Map<string, (e: React.MouseEvent | React.FocusEvent) => void>());

  const hideTooltip = useCallback(() => {    
      tooltip.setTarget({target: undefined, id: '%$&*'})
  }, []);

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

    let hoverCheckId: ReturnType<typeof setInterval> | undefined;

    const teardown = () => {
      clearInterval(hoverCheckId);
      target.removeEventListener('click', clickHandler);
      target.removeEventListener('contextmenu', clickHandler);
      target.removeEventListener('mouseleave', teardown);
      target.removeEventListener('blur', teardown);
      window.removeEventListener('scroll', teardown);
      if (!persistent) {
        dispatch(setTarget({ target: undefined, id: JSON.stringify(tooltipTarget) }));
      }
    };



    if (!persistent) {
      target.addEventListener('blur', teardown);
      hoverCheckId = setInterval(() => {
        if (!target.isConnected || !target.matches(':hover')) {

          teardown();

        }
      }, 200);
    }

    target.addEventListener('click', clickHandler);
    target.addEventListener('contextmenu', clickHandler);
    target.addEventListener('mouseleave', teardown);
    window.addEventListener('scroll', teardown);

  }, [dispatch]);






const showTooltip = useCallback((text: string, { direction, event }: TooltipProps = {}) => {
  if (event) {
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