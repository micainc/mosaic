import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout } from 'react-grid-layout';
import { PieChart } from 'react-minimal-pie-chart';
import 'react-grid-layout/css/styles.css';
import type { RootState } from '../../redux/store';
import type { PointType } from '../../types';
import { canvasRegistry } from '../../canvasRegistry';
import { clipToPolygon, loadImage } from '../Polygons/utils';
import { Icon } from '../Icon/Icon';
import { ico } from '../../utils/icons';
import './Report.css';

export type ReportRow = { color: string; title: string; value: number; percent: number };

type ReportProps = {
  rows: ReportRow[];
  total: number;
  /** Polygon outline in canvas pixels; every image tile is clipped to it. */
  points: PointType[];
};

type Tile = { key: string; title: string; src: string };

const COLS = 24; //
const ROWS = 16; // 
const MARGIN: [number, number] = [8, 8];
/** Letter landscape, 75vh tall. */
const PAGE_H = Math.round(window.innerHeight * 0.75);
const PAGE_W = Math.round(PAGE_H * 11 / 8.5);
const ROW_H = Math.floor((PAGE_H - MARGIN[1] * (ROWS + 1)) / ROWS);

function buildLayout(tiles: Tile[]): Layout {
  const tileW = 12;
  const tileH = 4;
  return [
    ...tiles.map((t, i) => ({
      i: t.key,
      x: (i % 2) * tileW,
      y: Math.floor(i / 2) * tileH,
      w: tileW,
      h: tileH,
      minW: 2,
      minH: 2,
    })),
    // { i: 'table', x: 12, y: 8, w: 3, h: 8 },
    // { i: 'pie',   x: 12, y: 0, w: 3, h: 4 },
  ];
}

/**
 * Printable report: image layers + segmentation map tiled on the left half,
 * stats table and pie chart on the right half. Every tile is a draggable,
 * resizable grid item; drag by the tile's title bar.
 */
const Report: React.FC<ReportProps> = ({ rows, total, points }) => {
  const layers = useSelector((s: RootState) => s.imageLayers.layers);
  const canvasWidth = useSelector((s: RootState) => s.canvas.canvasWidth);
  const { width, containerRef, mounted } = useContainerWidth();

  // Polygon-clipped crops of every layer plus the segmentation map. Layers are
  // blob URLs so they load async; the seg map is read straight off the canvas.
  const [images, setImages] = useState<Tile[]>([]);
  const [layout, setLayout] = useState<Layout>(() => buildLayout([]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tiles: Tile[] = [];
      for (const [name, l] of Object.entries(layers)) {
        try {
          const img = await loadImage(l.src);
          const scale = canvasWidth ? l.width / canvasWidth : 1;
          tiles.push({ key: `layer-${name}`, title: l.type || name, src: clipToPolygon(img, points, scale) });
        } catch { /* skip layers that fail to load */ }
      }
      if (canvasRegistry.draw) {
        tiles.push({ key: 'seg', title: 'segmentation', src: clipToPolygon(canvasRegistry.draw, points) });
      }
      if (cancelled) return;
      setImages(tiles);
      setLayout(buildLayout(tiles));
    })();
    return () => { cancelled = true; };
  }, [layers, points, canvasWidth]);

  return (
    <div ref={containerRef} className="report" style={{ width: PAGE_W, height: PAGE_H }}>
      {mounted && (
        <ReactGridLayout
          width={width}
          layout={layout}
          onLayoutChange={setLayout}
          gridConfig={{ cols: COLS, rowHeight: ROW_H, margin: MARGIN, containerPadding: MARGIN, maxRows: ROWS }}
          dragConfig={{ enabled: true, handle: '.report-handle', bounded: true }}
          // compactor={verticalCompactor}
        >
          {images.map(img => (
            <div key={img.key}>
                <img className="report-image" src={img.src} alt={img.title} draggable={false} />
            </div>
          ))}

          {/* <div key="table" className="report-item">
            <table className="stats-table">
              <tbody>
                {rows.map(r => (
                  <tr key={r.color}>
                    <td><Icon src={ico('filled.svg')} classes="fit inset-0 swatch" style={{ marginRight: '8px' }} colour={r.color} /></td>
                    <td className="stats-label">{r.title}</td>
                    <td className="stats-percent">{r.percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div key="pie" className="report-item">
            <PieChart data={rows} />
          </div> */}
        </ReactGridLayout>
      )}
    </div>
  );
};

export default Report;
