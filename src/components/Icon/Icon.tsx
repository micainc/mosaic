import React from 'react';
import './Icon.css'
interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  src: string;
  colour?: string;
  classes?: string;
  width?: string | number;
  height?: string | number;
}

export const Icon = React.memo(React.forwardRef<HTMLSpanElement, IconProps>(
  ({ src, colour, classes, style, width, height, className, ...props }, ref) => {
    const resolvedSrc = !src.startsWith('/') && !src.includes('://') && !src.startsWith('data:') ? `/${src}` : src;
    return (
      <span
        ref={ref}
        className={'icon '+(classes ?? '')}
        style={{
          display: 'inline-block',
          ...(width && {width}),
          ...(height && {height}),
          '--icon-src': `url(${resolvedSrc})`,
          ...(colour && { '--icon-color': colour }),
          ...style,
        } as React.CSSProperties}
        {...props}
      >
        <span style={{ display: 'block', width: '100%', height: '100%', position: 'relative' }} />
      </span>
    );
  }
));
