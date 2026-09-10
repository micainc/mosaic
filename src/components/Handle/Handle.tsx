import React, { useCallback, useRef } from 'react';
import { Icon } from '../Icon/Icon';
import './Handle.css';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface HandleProps {
  classes?:string,
  targetRef: React.RefObject<HTMLElement | null>;
  resize?: string; // e.g. 'bottom', 'bottom right', 'top bottom left right'
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function Handle({classes, targetRef, resize = 'bottom', minWidth = 50, maxWidth = Infinity, minHeight = 50, maxHeight = Infinity }: HandleProps) {
  const parsedSides: Side[] = resize.split(/\s+/).filter((s): s is Side => ['top', 'bottom', 'left', 'right'].includes(s));
  const category = classes?.includes('chevron-handle') ? 'chevron-handle' : 'edge-handle'
  const startX = useRef(0);
  const startY = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);

  const onMouseDown = useCallback((side: Side, e: React.MouseEvent) => {
    e.preventDefault();
    const el = targetRef.current;
    if (!el) return;

    startX.current = e.clientX;
    startY.current = e.clientY;
    startWidth.current = el.offsetWidth;
    startHeight.current = el.offsetHeight;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (side === 'bottom') {
        el.style.height = Math.min(maxHeight, Math.max(minHeight, startHeight.current + dy)) + 'px';
      } else if (side === 'top') {
        el.style.height = Math.min(maxHeight, Math.max(minHeight, startHeight.current - dy)) + 'px';
      } else if (side === 'right') {
        el.style.width = Math.min(maxWidth, Math.max(minWidth, startWidth.current + dx)) + 'px';
      } else if (side === 'left') {
        el.style.width = Math.min(maxWidth, Math.max(minWidth, startWidth.current - dx)) + 'px';
      }
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', cleanup);
      window.removeEventListener('scroll', cleanup);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', cleanup);
    window.addEventListener('scroll', cleanup);
  }, [targetRef, minWidth, maxWidth, minHeight, maxHeight]);

  return (
    <>
      {parsedSides.map(side => (
        <div
          key={side}
          className={`${category}  ${category}-${side}`}
          onMouseDown={(e) => onMouseDown(side, e)}
        >
          {classes?.includes('chevron-handle') ? <Icon src="/chevron.svg" classes="resize-chevron" /> : <></>}
          {/* { classes?.includes('chevron-handle') ? <Icon src="/chevron.svg" classes="resize-chevron" /> 
          :
            <Icon src="/chevron.svg" classes="" /> 
          } */}
        </div>
      ))}
    </>
  );
}
