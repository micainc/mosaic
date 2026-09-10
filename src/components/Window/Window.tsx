import React, { useState, useEffect, useCallback, useMemo, PropsWithChildren, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTooltip } from '../Tooltip/useTooltip';
import { Handle } from '../Handle/Handle';
import './Window.css';
import { Icon } from '../Icon/Icon';
import { ico } from '../../utils/icons';
// Track mouse position globally so Window can use it as default origin
// Uses document coordinates (includes scroll offset) so windows appear correctly when scrolled

type WindowProps = {
    id?: string,
    origin?: { x: number; y: number },

    // ⚠️ MUST BE MEMOIZED! Use useMemo with proper dependencies
    // ❌ Bad: <Window dims={{w: width, h: height}} />
    // ✅ Good: const dims = useMemo(() => ({w: width, h: height}), [width, height]);
    dims?: { w: number | string; h: number | string},

    // Portal to #windows-root by default. Set to false to render in place.
    portal?: boolean,

    classes?: string,
    title?: string,
    icon?: string,
    onLocate?:  () => void;
    onDisplay?: (target: string, value:string) => void;
    onClose?: () => void;
    onClickOutside?: () => void;
    onResize?: (width: number, height: number) => void;
    zoom?:number;
};

// pass in currently active/open mapp, selected mapp points, toggles for settings window, and functions to set these states
// Window primary function to display charts of mapp point data
export const Window = React.memo<PropsWithChildren<WindowProps>>((props) => {

    const {
        id, 
        origin : _origin,
        dims,
        portal = true,
        classes = '',
        title,
        icon,
        onDisplay,
        onLocate,
        onClose,
        onClickOutside,
        onResize,
        zoom = 1,
        children,
    } = props;

    const defaultOrigin = useRef(_origin ?? { 
        x: window.innerWidth/2,
        y: window.innerHeight/2,
    });
    const origin = _origin ?? defaultOrigin.current;

    const _dims = useMemo(() => {
        if(!dims) {
            return {w:0, h:0}
        } else {
            return dims
        }
    }, [dims])
    const windowRef = useRef<HTMLDivElement|null>(null);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const [position, setPosition] = useState<{ x: number; y: number } >(origin)
    const [dimensions, setDimensions] = useState<{ w: number; h: number }>();
    const autoSize = useRef<{ w: number; h: number }>(undefined); // at initialization, try to autosize using input dims provided 
    const manualSize = useRef<{ w: number; h: number }>(undefined);
    const [isHandleHovered, setHandleHovered] = useState<boolean >(false)
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } >({x: 0, y: 0})
    const [isDragging, setIsDragging] = useState(false);
    
    const {showTooltip} = useTooltip();

    const windowCallbackRef = useCallback((node: HTMLDivElement | null) => {

        if(dimensions) return
        // console.log("WINDOW | INITIAL DIMS: ", _dims)

        requestAnimationFrame(() => {
            if (node !== null) { // && !manualSize.current
                // console.log("WINDOW RENDERED => SETTING NODE")
                windowRef.current = node;
            }
        });

        // console.log("NODE: ", node)

        if(!windowRef.current) return

        // Use _dims if provided, otherwise measure
        let w = (typeof _dims.w === 'number' && _dims.w !== 0) ? _dims.w : windowRef.current.clientWidth;
        let h = (typeof _dims.h === 'number' && _dims.h !== 0) ? _dims.h : windowRef.current.clientHeight;

        autoSize.current = {w, h}
        // console.log(String(windowId) +" SETTING DIMENSIONS: " + w + ", " + h)
        setDimensions({w, h});

    }, [_dims, dimensions, setDimensions, parent]);


    useEffect(() => {                                                                                                                        
        if (!onClickOutside) return;                                                                                                         
        const handlePointerDown = (e: PointerEvent) => {                                                                                     
            if (windowRef.current && !windowRef.current.contains(e.target as Node)) {    
                // console.log("CLICKED OUTSIDE")                                                    
                onClickOutside();                                                                                                            
            }                                                                                                                                
        };                                                                                                                                   
        // Use capture phase so this fires before any stopPropagation in the tree                                                            
        document.addEventListener('pointerdown', handlePointerDown, true);                                                                   
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);                                                   
    }, [onClickOutside]);   

    useEffect(() => {
        if(manualSize.current) return
        // console.log("_DIMS CHANGED... ", _dims)

        setDimensions((prev) => {
            if(prev && (typeof _dims.w === 'number' && typeof _dims.h === 'number')) {
                // console.log("SETTING DIMENSIONS: ", _dims)

                return {
                    w: _dims.w !== 0 ? _dims.w : prev.w,  // Only update if not 0
                    h: _dims.h !== 0 ? _dims.h : prev.h   // Only update if not 0
                }
            }
            return prev; // Return prev if conditions not met
        })
    }, [_dims]);

    useEffect(() => {
        // console.log("ORIGIN CHANGED...")
        setPosition((prev) => {
            const next = {...prev};
            next.x = origin.x + dragOffset.x;
            next.y = origin.y + dragOffset.y;
            return next
        })
    }, [origin, dragOffset.x, dragOffset.y]);

    const onResizePointerDown = useCallback((e: React.PointerEvent, direction: 'e'|'w'|'n'|'s'|'ne'|'nw'|'se'|'sw') => {
        e.preventDefault();
        e.stopPropagation();
        
        if(!dimensions) {
            console.log("DIMENSIONS UNSET")
            return
        }
        // Capture the pointer to prevent events from leaking to parent
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = dimensions.w;
        const startHeight = dimensions.h;
        let newWidth = startWidth;
        let newHeight = startHeight;

        const handleMove = (e: PointerEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            

            // Handle width changes
            if (direction.includes('e')) newWidth = startWidth + deltaX;
            if (direction.includes('w')) newWidth = startWidth - deltaX;
            
            // Handle height changes
            if (direction.includes('n')) newHeight = startHeight - deltaY;
            if (direction.includes('s')) newHeight = startHeight + deltaY;
            manualSize.current = {w: newWidth, h:newHeight}

            setDimensions({
                w: newWidth,
                h: newHeight
            });

        };

        const handleUp = (e: PointerEvent) => {
            // Stop propagation to prevent Mapp from handling this
            e.stopPropagation();
            e.preventDefault();

            if (onResize) {
                console.log("PROPAGATING WINDOW RESIZE")
                onResize(newWidth, newHeight);
            }

            // Release pointer capture
            const target = e.target as HTMLElement;
            if (target && typeof target.hasPointerCapture === 'function' && target.hasPointerCapture(e.pointerId)) {
                try {
                    target.releasePointerCapture(e.pointerId);
                } catch (err) {
                    // Pointer might already be released
                }
            }

            document.removeEventListener('pointermove', handleMove, true);
            document.removeEventListener('pointerup', handleUp, true);
        };

        document.addEventListener('pointermove', handleMove, true);
        document.addEventListener('pointerup', handleUp, true);
    }, [onResize, dimensions]);
    




    const onPointerDown = useCallback((e: React.PointerEvent) => {

        // e.preventDefault();
        e.stopPropagation();

        // console.log("E TARGET: ", e.target)
        // console.log("E CURRENT TARGET: ", e.currentTarget)
        // console.log("E CLIENT: "+ e.clientX + ", " + e.clientY)
        console.log("ON POINTER DOWN DRAG OFFSET:  " + dragOffset.x + ", " + dragOffset.y)

        if(dragOffset.x === 0) {
            dragStart.current = {x: e.clientX, y:e.clientY }      

        } else {
            dragStart.current = {x: e.clientX - dragOffset.x, y:e.clientY - dragOffset.y}      

        }
        setIsDragging(true)
        if (e.button === 0) {
            // // do not drag window when click-drag/selecting uplot charts or input fields

            const handlePointerMove = (e: MouseEvent) => {  
                // console.log("handleMouseMove...")                                                                                                                                                                                                                              
                if(!dragStart.current) return;

                const deltaX = e.clientX - dragStart.current.x;
                const deltaY = e.clientY - dragStart.current.y;
                // console.log("FINAL DELTA: "+ deltaX + ", " + deltaY)
                                                                                                                                                                                                                                
                setDragOffset({x: deltaX, y: deltaY} )      
            };        

            const handlePointerUp = () => {                                                                                                                                                                                                                                  
                // console.log("WINDOW POINTER UP")                                                                                                                                                                                                                                                    
                setIsDragging(false)
                if(!dragStart.current) return;
                                                                                                                                                                                                                                    
                // Clean up listeners (must match capture phase)
                document.removeEventListener('pointermove', handlePointerMove, true);
                document.removeEventListener('pointerup', handlePointerUp, true);
            };

            // Use capture phase so these fire before bubbling stopPropagation
            document.addEventListener('pointermove', handlePointerMove, true);
            document.addEventListener('pointerup', handlePointerUp, true);
        }
        // Store the initial mouse position and current canvas drag offset

    }, [zoom, dragOffset]);

// | Value                | Behavior                                                   |
// |----------------------|------------------------------------------------------------|
// | 'auto'               | Default browser sizing based on content and context        |
// | 'min-content'        | Shrink to smallest content width (wraps text aggressively) |
// | 'max-content'        | Expand to fit all content without wrapping                 |
// | 'fit-content'        | Like min-content but stretches up to available space       |
// | 'fit-content(300px)' | Like fit-content but capped at 300px                       |
// | '100%'               | Fill parent's width/height                                 |
// | 'inherit'            | Use parent's value                                         |
// | 'unset'              | Reset to natural value                                     |

    const windowContent = (
        <div
            // id = {windowId}
            ref = {windowCallbackRef}
            className={`window ${classes}`}
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px)`,
                cursor: isDragging ? 'grabbing' : undefined,
                // Add width and height when any selected point has a chart or carousel
                width: (dimensions && dimensions.w !== 0) ? dimensions.w : (_dims.w !== 0 && _dims.w !== null) ? _dims.w : 'min-content' , // use OR operator, since we are comparing dimension value 0 
                height: (dimensions && dimensions.h !== 0) ? dimensions.h : (_dims.h !== 0 && _dims.h !== null) ? _dims.h : 'min-content', 
                maxWidth: (classes.includes('preview') || classes.includes('mini'))  ? 'max-content' : '', // Apparently this is just insanely freaking important. likely dont touch this, even if you think its dumb
                maxHeight: (classes.includes('preview') || classes.includes('mini')) ? 'max-content' : '',
            }}
            /* ========================================================================
             * EVENT CONTAINMENT - Window acts as an event boundary
             * ========================================================================
             * These stopPropagation calls prevent events inside Window from bubbling
             * up to parent components (e.g., MappPoint, Mapp, Tracers).
             *
             * Without this, clicking a button/dropdown inside Window would bubble up
             * and potentially trigger parent actions like:
             * - Creating new points on Mapp canvas
             * - Deselecting items
             * - Starting drag operations
             *
             * NOTE: onPointerUp is intentionally NOT stopped here - it needs to bubble
             * for chart drag-end (right-click pan) to work properly inside Windows.
             * ======================================================================== */
            // onMouseEnter={(e) => e.stopPropagation()} // reenabled to allow showTooltip to work for interior buttons
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >

                {!classes.includes('preview') && !classes.includes('settings') && !classes.includes('reading')  &&
                    <Handle targetRef={windowRef} resize='right bottom'/>
                }


            {/* <div className='debug outside' >
                         {autoSize.current && <span>A W/H: {autoSize.current.w + "/"+autoSize.current.h}</span>}<br/>
                         {manualSize.current && <span>M W/H: {Math.round(manualSize.current.w) + "/"+Math.round(manualSize.current.h)}</span>}<br/>
                        {parentSize.current && <span>P W/H: {Math.round(parentSize.current.w) + "/"+Math.round(parentSize.current.h)}</span> }
            </div> */}
                <div className={`window-wing`}
                    // style={{
                    //     transform: classes.includes('settings') ? 'unset': 'translate(0px, -100%)',
                    // }}
                >

                {!classes.includes('preview') && 
                <>

                    { onClose &&
                        <Icon 
                            classes='button fit no-shadow outline-unset'
                            src ={ ico('xx.svg')}
                            color='#FFFFFF'
                            onPointerUp={(e:any) => { e.stopPropagation(); onClose(); }}
                        />
                    }

                    {onDisplay && classes.includes('mini') &&
                        <Icon
                            classes='button fit no-shadow outline-unset'
                            onPointerDown={() => { onDisplay('display', 'full')}}
                            // onMouseEnter={showTooltip('<b>EXPAND</b>')}
                            src={ico("expand.svg")}
                        />
                    }

                    {onDisplay && classes.includes('full') &&
                        <Icon
                            classes='button fit no-shadow outline-unset'
                            onPointerDown={() => { onDisplay('display', 'mini')}}
                            // onMouseEnter={showTooltip('<b>MINIMIZE</b>')}
                            src={ico("minimize.svg")}
                        />
                    }

                </>
                }
                    {/* {onLocate &&
                        <button
                            onPointerDown={() => { onLocate()}}
                            onMouseEnter={showTooltip('LOCATE')}
                            >
                            <img className="svg-white" src="radar.svg" alt=""/>
                        </button>
                    } */}



                    <div 
                        className='window-handle' 
                        style={{cursor:'grab'}} 
                        onPointerDown={(e) => {onPointerDown(e) }} 
                        onMouseEnter={()=> setHandleHovered(true)} 
                        onMouseLeave={() => setHandleHovered(false)} 
                    >


                            <button className='window-title inert' >
                                {title}
                            </button>
                        {
                            <button className="inert">
                                <img src={(isHandleHovered || !icon) ? "drag.svg" : icon} alt=""/>
                            </button>
                        }
                                            

                    
                    </div>

                </div>


            <div className='window-content'>
            {children}
            </div>




        </div>
    );

    // Portal to #windows-root by default, or render in place if portal=false
    if (portal) {
        const portalRoot = document.getElementById('foreground');
        if (portalRoot) {
            return createPortal(windowContent, portalRoot);
        }
    }

    return windowContent;
});


export default Window;
