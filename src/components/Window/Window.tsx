import React, { useState, useEffect, useCallback, useMemo, PropsWithChildren, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTooltip } from '../Tooltip/useTooltip';
import { Handle } from '../Handle/Handle';
import './Window.css';
import { Icon } from '../Icon/Icon';
import { ico } from '../../utils/icons';
import { useAppSelector } from '../../redux/store';
// Track mouse position globally so Window can use it as default origin
// Uses document coordinates (includes scroll offset) so windows appear correctly when scrolled



type WindowProps = {
    id?: string,
    origin?: { x: number; y: number },

    // ⚠️ MUST BE MEMOIZED! Use useMemo with proper dependencies
    // ❌ Bad: <Window dims={{w: width, h: height}} />
    // ✅ Good: const dims = useMemo(() => ({w: width, h: height}), [width, height]);
    width?: string | number,
    height?:string | number,
    resizable?: boolean,
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
        width = 'min-content',
        height = 'min-content',
        resizable = false,
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

    const cursorX = useAppSelector(state => state.canvas.cursorX);
    const cursorY = useAppSelector(state => state.canvas.cursorY);

    const origin =  _origin ?? {x:cursorX, y:cursorY};


    const initDims = useMemo(() => {
        const wType = typeof(width)
        const hType = typeof(height)
        const d = {
            w: wType === 'string' ? width : (wType === 'number' && Number(width) > 0) ? width+'px' : null, 
            h: wType === 'string' ? height : (hType === 'number' && Number(height) > 0) ? height+'px' : null
        }
        console.log("_DIMS: ", d)
        return d
    }, [width, height])
    const [initDimsPx, setInitDimsPx] = useState<{ w: number; h: number }>();
    const currDimsPx = useRef<{ w: number; h: number } | null>(null);



    const windowRef = useRef<HTMLDivElement|null>(null);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const [position, setPosition] = useState<{ x: number; y: number } >(origin)
    // const [dimensions, setDimensions] = useState<{ w: number; h: number }>({w:0, h:0});
    // const autoSize = useRef<{ w: number; h: number }>(undefined); // at initialization, try to autosize using input dims provided 
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } >({x: 0, y: 0})
    const [isDragging, setIsDragging] = useState(false);
    const isResizing = useRef(false);
    
    const {showTooltip} = useTooltip();

    const onWheel = (e: WheelEvent) => {
        // console.log("WINDOW WHEELING")
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation()
    };

    

    const windowCallbackRef = useCallback((node: HTMLDivElement | null) => {

        // requestAnimationFrame(() => {
        //     if (node !== null) { // && !manualSize.current
        //         // console.log("WINDOW RENDERED => SETTING NODE")
        //         windowRef.current = node;
        //     }
        // });

        if (node !== null) { // && !manualSize.current
            // console.log("WINDOW RENDERED => SETTING NODE")
            windowRef.current = node;
        }

        if(!windowRef.current) return

        // const bcr = windowRef.current.getBoundingClientRect();
        let w = windowRef.current.clientWidth;
        let h = windowRef.current.clientHeight;

        // console.log("WINDOW | INITIAL DIMS: ", w + ", "+ h)
        // console.log("WINDOW | BCR: ", bcr)




        
        windowRef.current.addEventListener('wheel', onWheel)

        setInitDimsPx(prev => !prev ? {w, h} : prev)
        console.log("INIT DIMS: ", initDimsPx)
        // console.log(" SETTING DIMENSIONS: " + w + ", " + h)
    }, []);

    // }, [_dims, dimensions, setDimensions, parent]);

        React.useLayoutEffect(() => {
            if(!windowRef.current || !resizable ) return
            const win = windowRef.current;

            const fit = () => {
                if(win) {
                    const bcr = win.getBoundingClientRect();
                    currDimsPx.current = {w: bcr.width, h: bcr.height}
                    // if (!autoSize.current  || !windowRef.current) return
                    if (!isResizing.current && win) {
                        console.log("BCR JUMPED: ", bcr)

                    }
                }



                // if(bcr.width < initDims.w ) windowRef.current.style.width =initDims.w+'px'
                // if(bcr.height < initDims.h ) windowRef.current.style.height =initDims.h+'px'

                // const contents = win.getElementsByClassName('window-content')[0] as HTMLDivElement;
                // if(!contents) return
                // console.log("SETTING PX CONTENT W H: ", bcr.width+", "+ bcr.height)
                // contents.style.width = Math.max(bcr.width, autoSize.current?.w ?? 0)+'px';
                // contents.style.height = Math.min(bcr.height, autoSize.current?.h ?? Infinity)+'px';
            };





            // Catches zoomAround rewriting the inline width, plus window resizes.
            const ro = new ResizeObserver(fit);
            ro.observe(win);
            win.addEventListener('resize', fit);


            return () => { 
                ro.disconnect(); 
                win.removeEventListener('resize', fit); 
            };
        }, [resizable]);


    useEffect(() => {                                                                                                                        
        if (!onClickOutside) return;                                                                                                         
        const handlePointerDown = (e: PointerEvent) => {                                                                                     
            if (windowRef.current && !windowRef.current.contains(e.target as Node)) {    
                console.log("CLICKED OUTSIDE")                                                    
                onClickOutside();                                                                                                            
            }                                                                                                                                
        };                                                                                                                                   
        // Use capture phase so this fires before any stopPropagation in the tree                                                            
        document.addEventListener('pointerdown', handlePointerDown, true);                                                                   
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);                                                   
    }, [onClickOutside]);   

    useEffect(() => {
        // console.log("ORIGIN CHANGED...")
        setPosition({
            x: origin.x + dragOffset.x,
            y: origin.y + dragOffset.y
        })
    }, [origin, dragOffset.x, dragOffset.y]);


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
                // width: (dimensions.w > 0) ? (dimensions.w + "px") : (_dims.w !== null) ? _dims.w : 'min-content' , // use OR operator, since we are comparing dimension value 0 
                // height: (dimensions.h > 0) ? (dimensions.h + "px") : (_dims.h !== null) ? _dims.h : 'min-content', 
                width: (initDims.w !== null) ? initDims.w : 'min-content' , // use OR operator, since we are comparing dimension value 0 
                height: (initDims.h !== null) ? initDims.h : 'min-content', 
                maxWidth: '', // Apparently this is just insanely freaking important. likely dont touch this, even if you think its dumb
                maxHeight: '',
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
            // onWheel={(e) => {
            //     console.log("WINDOW WHEELING")
            //     e.preventDefault()
            //     e.stopPropagation()
            // }}
        >

                {resizable && initDimsPx &&
                    <Handle 
                        targetRef={windowRef} 
                        resize='right bottom' 
                        minWidth={initDimsPx.w} 
                        minHeight={initDimsPx.h}
                        onHandle={b => isResizing.current = b}
                    />
                }


            {/* <div className='debug outside' >
                         {autoSize.current && <span>A W/H: {autoSize.current.w + "/"+autoSize.current.h}</span>}<br/>
                         {manualSize.current && <span>M W/H: {Math.round(manualSize.current.w) + "/"+Math.round(manualSize.current.h)}</span>}<br/>
                        {parentSize.current && <span>P W/H: {Math.round(parentSize.current.w) + "/"+Math.round(parentSize.current.h)}</span> }
            </div> */}
                <div className={`window-controls`}
                    // style={{
                    //     transform: classes.includes('settings') ? 'unset': 'translate(0px, -100%)',
                    // }}
                >

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

                    <div 
                        className='window-handle' 
                        style={{cursor:'grab'}} 
                        onPointerDown={(e) => {onPointerDown(e) }} 
                        onMouseEnter={(e)=> {
                            // showTooltip(`
                            //     INIT DIMS: ${initDims.w} + ", "+ ${initDims.h}<br>
                            //     INIT DIMS PX: ${(initDimsPx?.w + ", "+ initDimsPx?.h)}<br>
                            // `, {event:e, direction:'top'})
                        }} 
                    >


                            <button className='window-title inert' >
                                {title} 
                            </button>
            

                    
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
