
import React, { useRef, useState, useLayoutEffect, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import './Tooltip.css';


type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';




const Tooltip = () => {
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const { text, styles, target, direction: preferredDirection} = useSelector((state: RootState) => state.tooltip );
    const [dimensions, setDimensions] = useState<{w: number, h: number} | null>(null);

    /* SO LONG AS I HAVE TEXT, I CAN RENDER AND MEASURE THE DIMENSIONS */
    const tooltipText = useMemo(() => {
        
        // First, handle <ascii> tags by replacing spaces with non-breaking spaces
        let processedText = text;
        const asciiRegex = /<ascii>(.*?)<\/ascii>/g;
        let match;

        while ((match = asciiRegex.exec(text)) !== null) {
            const content = match[1];
            // Replace spaces with non-breaking spaces and preserve formatting
            const preservedContent = content.replace(/ /g, '\u00A0');
            processedText = processedText.replace(match[0], `<ascii>${preservedContent}</ascii>`);
        }

        // Replace &nbsp; with actual non-breaking space
        processedText = processedText.replace(/&nbsp;/g, '\u00A0');

        // Replace <s> with non-breaking space (shorthand for single space)
        processedText = processedText.replace(/<s>/g, '\u00A0');

        // Split by existing tags, svg references, ascii tags, AND color tags
        const parts = processedText.split(/(<b>|<\/b>|<i>|<\/i>|<u>|<\/u>|<strike>|<\/strike>|<ascii>|<\/ascii>|<wide>|<\/wide>|<line>|<red>|<\/red>|<maroon>|<\/maroon>|<green>|<\/green>|<emerald>|<\/emerald>|<blue>|<\/blue>|<indigo>|<\/indigo>|<yellow>|<\/yellow>|<amber>|<\/amber>|<gold>|<\/gold>|<orange>|<\/orange>|<purple>|<\/purple>|<pink>|<\/pink>|<rose>|<\/rose>|<teal>|<\/teal>|<cyan>|<\/cyan>|<grey>|<\/grey>|<dim>|<\/dim>|<white>|<\/white>|<svg:[^>]+>|<br\s*\/?>)/g);

        const result: React.ReactNode[] = [];
        let line: React.ReactNode[] = []

        let isBold = false;
        let isItalic = false;
        let isUnderline = false;
        let isStrike = false;
        let isAscii = false;
        let isWide = false;
        let textColour: string[] = []
        let key = 0;
        
        parts.forEach(part => {
            if (part === '<b>') {
            isBold = true;
            } else if (part === '</b>') {
            isBold = false;
            } else if (part === '<i>') {
            isItalic = true;
            } else if (part === '</i>') {
                isItalic = false;
            } else if (part === '<u>') {
                isUnderline = true;
            } else if (part === '</u>') {
                isUnderline = false;
            } else if (part === '<strike>') {
                isStrike = true;
            } else if (part === '</strike>') {
                isStrike = false;
            } else if (part === '<ascii>') {
                isAscii = true;
            } else if (part === '</ascii>') {
                isAscii = false;
            } else if (part === '<wide>') {
                isWide = true;
            } else if (part === '</wide>') {
                isWide = false;
                const style: React.CSSProperties = {};

                style.display = 'flex';
                style.justifyContent = 'space-between';
                style.alignItems='center';
                style.width = '100%';
                style.marginBottom = '2px';
                if (isBold) style.fontWeight = 'bold';
                if (isItalic) style.fontStyle = 'italic';
                if (isUnderline) {
                    style.textDecoration = 'underline';
                    // style.textDecorationThickness = '1px';
                    style.textUnderlineOffset = '2px';
                }
                // Apply monospace font and preserve whitespace for ASCII content
                if (isAscii) {
                    style.fontFamily = 'monospace';
                    style.whiteSpace = 'pre';
                }

                if (textColour.length > 0) {
                    style.color = textColour[textColour.length - 1];
                }

                // console.log("LINE: ", line)
                result.push(
                    <span key={key++} style={style}>
                        {line}
                    </span>
                );
                line = [];
            } else if (part === '<line>') {
                const style: React.CSSProperties = {};
                style.border = `0.5px solid ${textColour}`
                    if(isWide) {
                        line.push(
                            <hr key={key++} style={style}/>
                        )

                    }  else {
                        result.push(
                            <hr key={key++} style={style}/>
                        );
                    }
                


            // Earth tone palette (One Dark inspired, good contrast on #323232 background)
            } else if (part === '<red>') {
                textColour.push('#E06C75')  // terracotta
            } else if (part === '</red>') {
                textColour.pop();
            } else if (part === '<maroon>') {
                textColour.push('#BE5046')  // rust/clay
            } else if (part === '</maroon>') {
                textColour.pop();
            } else if (part === '<green>') {
                textColour.push('#98C379')  // olive/leaf
            } else if (part === '</green>') {
                textColour.pop();
            } else if (part === '<emerald>') {
                textColour.push('#4CAF7C')  // forest
            } else if (part === '</emerald>') {
                textColour.pop();
            } else if (part === '<blue>') {
                textColour.push('#61AFEF')  // clear sky
            } else if (part === '</blue>') {
                textColour.pop();
            } else if (part === '<indigo>') {
                textColour.push('#5C6BC0')  // deep indigo
            } else if (part === '</indigo>') {
                textColour.pop();
            } else if (part === '<yellow>') {
                textColour.push('#E5C07B')  // sand/wheat
            } else if (part === '</yellow>') {
                textColour.pop();
            } else if (part === '<amber>') {
                textColour.push('#D19A66')  // copper
            } else if (part === '</amber>') {
                textColour.pop();
            } else if (part === '<gold>') {
                textColour.push('#E5A84B')  // rich gold
            } else if (part === '</gold>') {
                textColour.pop();
            } else if (part === '<orange>') {
                textColour.push('#CC8844')  // burnt sienna
            } else if (part === '</orange>') {
                textColour.pop();
            } else if (part === '<purple>') {
                textColour.push('#C678DD')  // orchid
            } else if (part === '</purple>') {
                textColour.pop();
            } else if (part === '<pink>') {
                textColour.push('#E06C9A')  // rose
            } else if (part === '</pink>') {
                textColour.pop();
            } else if (part === '<rose>') {
                textColour.push('#E06C9A')  // alias for pink
            } else if (part === '</rose>') {
                textColour.pop();
            } else if (part === '<teal>') {
                textColour.push('#56B6C2')  // ocean
            } else if (part === '</teal>') {
                textColour.pop();
            } else if (part === '<cyan>') {
                textColour.push('#4DD0D8')  // bright aqua
            } else if (part === '</cyan>') {
                textColour.pop();
            } else if (part === '<grey>') {
                textColour.push('#FFFFFFC0')  // neutral
            } else if (part === '</grey>') {
                textColour.pop();
            } else if (part === '<dim>') {
                textColour.push('#FFFFFF7F')  // charcoal
            } else if (part === '</dim>') {
                textColour.pop();
            } else if (part === '<white>') {
                textColour.push('#FFFFFF')
            } else if (part === '</white>') {
                textColour.pop();
            } else if (/^<br\s*\/?>$/i.test(part)) {  // More robust br detection
                result.push(<br key={key++} />);
            } else if (part.startsWith('<svg:') && part.endsWith('>')) {
                // Parse SVG reference: <svg:filename.svg:16x16:#FF0000>
                const svgContent = part.slice(5, -1); 
                const [filename, ...params] = svgContent.split(':');
                
                try {
                    let width: number | undefined, height: number | undefined, color: string | undefined;

                    params.forEach(param => {
                    if (param.includes('x')) {
                        // Size parameter: "16x16"
                        const [w, h] = param.split('x').map(s => parseInt(s));
                        width = w || undefined;
                        height = h || undefined;
                    } else if (param.startsWith('#') || param.startsWith('rgb') || param.startsWith('hsl')) {
                        // Color parameter: "#FF0000", "rgb(255,0,0)", "hsl(0,100%,50%)"
                        color = param;
                    } 
                    });
                    
                    // Generate CSS filter for color (if specified)
                    const getColorFilter = (targetColor: string): string | undefined => {
                        if (!targetColor) return undefined;
                        
                        if (targetColor === '#FFFFFF' || targetColor === 'white') {
                            return 'invert(1)';
                        } else if (targetColor === '#000000' || targetColor === 'black') {
                            return 'invert(0)';
                        } else if (targetColor.startsWith('#')) {
                            // For other hex colors, create a more complex filter
                            const r = parseInt(targetColor.slice(1, 3), 16);
                            const g = parseInt(targetColor.slice(3, 5), 16);
                            const b = parseInt(targetColor.slice(5, 7), 16);
                            
                            // Convert to hue-rotate and brightness approximation
                            const brightness = (r + g + b) / (3 * 255);
                            return `brightness(${brightness}) contrast(1.2)`;
                        }
                        return undefined;
                    };
                    

                    if(isWide) {
                        line.push(
                            <img
                                key={key++}
                                src={`/${filename}`}
                                alt=""
                                style={{
                                ...(width && { width: `${width}px` }),
                                // ...(height && { height: `${height}px` }), // dont set height - leave as is - better centers the image on the line
                                filter: color ? getColorFilter(color) : 'invert(1)'
                                }}
                                onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                // e.currentTarget.insertAdjacentText('afterend', `[${filename}]`);
                                }}
                            />
                        )

                    }  else {
                        result.push(
                            <img
                                key={key++}
                                src={`/${filename}`}
                                alt=""
                                style={{
                                ...(width && { width: `${width}px` }),
                                ...(height && { height: `${height}px` }),
                                filter: color ? getColorFilter(color) : 'invert(1)'
                                }}
                                onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                // e.currentTarget.insertAdjacentText('afterend', `[${filename}]`);
                                }}
                            />
                        );
                    }

                } catch (error) {
                    // Fallback to text if parsing fails
                    result.push(
                        <span key={key++} style={{ 
                            fontWeight: isBold ? 'bold' : 'normal',
                            fontStyle: isItalic ? 'italic' : 'normal',
                        }}>
                            {part}
                        </span>
                    );
                }
            } else if (part) {  // Process all parts, including those with only spaces
                // Don't skip parts that are just non-breaking spaces
                if (!part.trim() && part !== '\u00A0' && !part.includes('\u00A0')) {
                    return;
                }

                // Regular text or ASCII text
                const style: React.CSSProperties = {};
                if (isBold) style.fontWeight = 'bold';
                if (isItalic) style.fontStyle = 'italic';
                if (isUnderline || isStrike) {
                    const decorations: string[] = [];
                    if (isUnderline) decorations.push('underline');
                    if (isStrike) decorations.push('line-through');
                    style.textDecoration = decorations.join(' ');
                    style.textDecorationThickness = '1px';
                    if (isUnderline) style.textUnderlineOffset = '2px';
                }
                // Apply monospace font and preserve whitespace for ASCII content
                if (isAscii) {
                    style.fontFamily = 'monospace';
                    style.whiteSpace = 'pre';
                }

                if (textColour.length > 0) {
                    style.color = textColour[textColour.length - 1];
                }

                if(isWide) {
                    line.push(
                        <span key={key++} style={style}>
                            {part}
                        </span>
                    )

                }  else {
                    result.push(
                        <span key={key++} style={style}>
                            {part}
                        </span>
                    );
                }


            }
        });
        
        return result;
    }, [text]);





    // Calculate direction and anchor based on target and dimensions
    const {anchor, direction} = useMemo((): {anchor:{x:number, y:number} | undefined, direction:TooltipPosition | undefined} => {
        if (!target || !dimensions) {
            return {anchor: undefined, direction: undefined};
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 16;

        // Target center for calculating anchors
        const targetCenterX = target.left + target.w / 2;
        const targetCenterY = target.top + target.h / 2;

        // Check if tooltip fits in this direction (checking both axes)
        const wouldFit = (direction: TooltipPosition, anchorX: number, anchorY: number): boolean => {
            // Convert page-relative anchor to viewport-relative
            const anchorViewportX = anchorX - window.scrollX;
            const anchorViewportY = anchorY - window.scrollY;

            switch (direction) {
                case 'top':
                case 'bottom':
                    // Check vertical space AND horizontal space (tooltip centered horizontally)
                    const verticalFits = direction === 'top'
                        ? anchorViewportY - dimensions.h >= padding
                        : anchorViewportY + dimensions.h <= viewportHeight - padding;
                    const horizontalFits =
                        anchorViewportX - dimensions.w / 2 >= padding &&
                        (anchorViewportX + (dimensions.w / 2) <= viewportWidth - padding);
                    return verticalFits && horizontalFits;
                case 'left':
                case 'right':
                    // Check horizontal space AND vertical space (tooltip centered vertically)
                    const horizontalFits2 = direction === 'left'
                        ? anchorViewportX - dimensions.w >= padding
                        : anchorViewportX + dimensions.w <= viewportWidth - padding;
                    const verticalFits2 =
                        anchorViewportY - dimensions.h / 2 >= padding &&
                        anchorViewportY + dimensions.h / 2 <= viewportHeight - padding;
                    return horizontalFits2 && verticalFits2;
            }
        };

        // Helper: get anchor for a given direction
        const anchorFor = (dir: TooltipPosition) => {
            if (dir === 'top') return { x: targetCenterX, y: target.top };
            if (dir === 'bottom') return { x: targetCenterX, y: target.bottom };
            if (dir === 'left') return { x: target.left, y: targetCenterY };
            return { x: target.right, y: targetCenterY };
        };

        // If preferred direction is set, try it first
        if (preferredDirection) {
            const anchor = anchorFor(preferredDirection);
            if (wouldFit(preferredDirection, anchor.x, anchor.y)) {
                return { anchor, direction: preferredDirection };
            }
        }

        // Auto-detect: prefer direction away from viewport center
        const windowCenterX = viewportWidth / 2 + window.scrollX;
        const windowCenterY = viewportHeight / 2 + window.scrollY;
        const preferUp = targetCenterY > windowCenterY;
        const preferLeft = targetCenterX > windowCenterX;

        const dirs: TooltipPosition[] = [
            preferUp ? 'top' : 'bottom',
            preferUp ? 'bottom' : 'top',
            preferLeft ? 'left' : 'right',
            preferLeft ? 'right' : 'left',
        ];

        for (const dir of dirs) {
            const anchor = anchorFor(dir);
            if (wouldFit(dir, anchor.x, anchor.y)) {
                return { anchor, direction: dir };
            }
        }

        // Fallback
        const fallbackDir = dirs[0];
        return { anchor: anchorFor(fallbackDir), direction: fallbackDir };
    }, [target, dimensions]);





    // when tooltip changes size, record it
    useLayoutEffect(() => {
        if (!tooltipRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ w: width, h: height });
            }
        });

        resizeObserver.observe(tooltipRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [tooltipRef.current]);
    

        const offset = useMemo(():{x:number, y:number} => {
            if (!anchor || !direction || !dimensions) return {x:0, y:0};

            // Convert anchor to viewport coordinates
            const anchorViewportX = anchor.x - window.scrollX;
            const anchorViewportY = anchor.y - window.scrollY;

            const padding = 16; // Min distance from viewport edge
            let slideOffset = 0;

            if (direction === 'left' || direction === 'right') {
                // Direction is left/right - check vertical overflow
                const tooltipTop = anchorViewportY - dimensions.h / 2;
                const tooltipBottom = anchorViewportY + dimensions.h / 2;

                if (tooltipTop < padding) {
                    // Tooltip goes off top - slide down
                    slideOffset = padding - tooltipTop;
                } else if (tooltipBottom > window.innerHeight - padding) {
                    // Tooltip goes off bottom - slide up
                    slideOffset = (window.innerHeight - padding) - tooltipBottom;
                }

                return {x:0, y:slideOffset}

            } else {
                // Direction is top/bottom - check horizontal overflow
                const tooltipLeft = anchorViewportX - dimensions.w / 2;
                const tooltipRight = anchorViewportX + dimensions.w / 2;

                if (tooltipLeft < padding) {
                    // Tooltip goes off left - slide right
                    slideOffset = padding - tooltipLeft;
                } else if (tooltipRight > window.innerWidth - padding) {
                    // Tooltip goes off right - slide left
                    slideOffset = (window.innerWidth - padding) - tooltipRight;
                }

                return {x:slideOffset, y:0}

            }
        }, [anchor, direction, dimensions]);




    const getTooltipStyles = useCallback((): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            visibility: (target && anchor && direction) ? 'visible' : 'hidden',
            color: styles.textColor,
            position: 'absolute',
            outlineColor: '#323232',
            // Hide tooltip until dimensions are measured
        };

        if (!anchor || !direction) return baseStyles;

        const arrowGap = 8; // Gap between tt and parent (arrow is ~6px, add small buffer)
        let _styles: React.CSSProperties = {};

        switch (direction) {
            case 'top':
                // Position tooltip above anchor point, centered horizontally, with gap for arrow
                _styles = {
                    ...baseStyles,
                    left: `${anchor.x+offset.x}px`,
                    top: `${anchor.y+offset.y}px`,
                    transform: `translate(-50%, calc(-100% - ${arrowGap}px))`
                };
                break;
            case 'bottom':
                // Position tooltip below anchor point, centered horizontally, with gap for arrow
                _styles = {
                    ...baseStyles,
                    left: `${anchor.x+offset.x}px`,
                    top: `${anchor.y+offset.y}px`,
                    transform: `translate(-50%, ${arrowGap}px)`
                };
                break;
            case 'left':
                // Position tooltip left of anchor point, centered vertically, with gap for arrow
                _styles = {
                    ...baseStyles,
                    left: `${anchor.x+offset.x-1}px`,
                    top: `${anchor.y+offset.y}px`,
                    transform: `translate(calc(-100% - ${arrowGap}px), -50%)`
                };
                break;
            case 'right':
                // Position tooltip right of anchor point, centered vertically, with gap for arrow
                _styles = {
                    ...baseStyles,
                    left: `${anchor.x+offset.x+1}px`,
                    top: `${anchor.y+offset.y}px`,
                    transform: `translate(${arrowGap}px, -50%)`
                };
                break;
        }

        return _styles;
    }, [ anchor, direction, styles]);



    const getArrowStyles = useCallback((): React.CSSProperties => {
        const baseArrowStyles: React.CSSProperties = {
            // width: 0,
            // height: 0,
            // borderStyle: 'solid',
            // position: 'absolute',
            // pointerEvents: 'none',
        };

        if (!anchor || !direction) return baseArrowStyles;
        
        switch (direction) {
            case 'top':
                // Tooltip is above anchor, arrow points down from bottom of tooltip
                return {
                    ...baseArrowStyles,
                    borderColor: `black transparent transparent transparent`,
                    borderWidth: '6px 6px 0 6px',
                    bottom: '-4px',
                    left: `calc(50% - ${offset.x}px)`,
                    transform: 'translateX(-50%)',
                    filter:`drop-shadow(0px 1px 0px #323232 )`,

                };
            case 'bottom':
                // Tooltip is below anchor, arrow points up from top of tooltip
                return {
                    ...baseArrowStyles,
                    borderColor: `transparent transparent black transparent`,
                    borderWidth: '0 6px 6px 6px',
                    top: '-4px',
                    left: `calc(50% - ${offset.x}px)`,
                    transform: 'translateX(-50%)',
                    filter:`drop-shadow(0px -1px 0px #323232 )`,
                };
            case 'left':
                // Tooltip is left of anchor, arrow points right from right edge of tooltip
                return {
                    ...baseArrowStyles,
                    borderColor: `transparent transparent transparent black`,
                    borderWidth: '6px 0 6px 6px',
                    right: '-5px',
                    top: `calc(50% - ${offset.y}px)`,
                    transform: 'translateY(-50%)',
                    filter:`drop-shadow(1px 0px 0px #323232)`

                };
            case 'right':
                // Tooltip is right of anchor, arrow points left from left edge of tooltip
                return {
                    ...baseArrowStyles,
                    borderColor: `transparent black transparent transparent`,
                    borderWidth: '6px 6px 6px 0',
                    left: '-5px',
                    top: `calc(50% - ${offset.y}px)`,
                    transform: 'translateY(-50%)',
                    filter:`drop-shadow(-1px 0px 0px #323232 )`

                };
            default:
                return baseArrowStyles;
        }
    }, [anchor, direction]);

    
    return (
        <>
        {/* <div className='tooltip-debug'>
            <span>TARGET: {target ? JSON.stringify(target) : '--'}</span>
            <span>DIR: {direction}</span>
            <span>ORIGIN: {JSON.stringify(origin)}</span>
            <span style={{color:'green'}}>ANCHOR: {JSON.stringify(anchor)}</span>
            <span style={{color:'black'}}>DIMENSIONS: {JSON.stringify(dimensions)}</span>
            <span style={{color:'black'}}>DIRECTION: {direction}</span>
            <span style={{color:'black'}}>VISIBLE? {String(visible)}</span>
            <span style={{color:'black'}}>VP WIDTH: {window.innerWidth}</span>
            <span style={{color:'black'}}>VP HEIGHT: {window.innerHeight}</span>


        </div> */}
        
        <div ref={tooltipRef} className="tooltip" style={getTooltipStyles()}>

            {tooltipText}
            <div className="tooltip-arrow" style={getArrowStyles()}></div>

        </div>
        </>
    );
};

export default Tooltip;
