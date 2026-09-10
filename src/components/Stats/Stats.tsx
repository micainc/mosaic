import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import type { PointType } from '../../types';
import { polygonStats } from '../Polygons/utils';
import { downloadBlob } from '../../utils/fileUtils';
import { Icon } from '../Icon/Icon';
import { ico } from '../../utils/icons';
import './Stats.css';

type StatsProps = {
  points: PointType[];
  /** Used for the download filename. */
  name?: string;
};

type Row = { colour: string; label: string; count: number; percent: number };

/** Percent makeup of each pixel class under a polygon. */
const Stats: React.FC<StatsProps> = ({ points, name = 'polygon' }) => {
  const colourLabelMap = useSelector((s: RootState) => s.labels.colourLabelMap);

  const { rows, total } = useMemo(() => {
    const stats = polygonStats(points);
    if (!stats || stats.total === 0) return { rows: [] as Row[], total: 0 };

    const rows: Row[] = Object.entries(stats.counts).map(([colour, count]) => ({
      colour,
      label: colourLabelMap[colour] ?? colour,
      count,
      percent: (100 * count) / stats.total,
    }));
    if (stats.unclassified > 0) {
      rows.push({
        colour: 'transparent',
        label: 'unclassified',
        count: stats.unclassified,
        percent: (100 * stats.unclassified) / stats.total,
      });
    }
    rows.sort((a, b) => b.count - a.count);
    return { rows, total: stats.total };
  }, [points, colourLabelMap]);

  const download = () => {
    const lines = ['label,colour,pixels,percent'];
    for (const r of rows) lines.push(`${r.label},${r.colour},${r.count},${r.percent.toFixed(2)}`);
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), `${name}-stats.csv`);
  };

  if (total === 0) return <div className="stats stats-empty">No pixels under polygon.</div>;

  return (
    <div className="stats">
      <div className="stats-header">
        <span>{total.toLocaleString()} px</span>
        <Icon
          src={ico('download.svg')}
          classes="button fit"
          onClick={download}
          title="Download CSV"
        />
      </div>
      <table className="stats-table">
        <tbody>
          {rows.map(r => (
            <tr key={r.colour}>
              <td><span className="stats-swatch" style={{ background: r.colour }} /></td>
              <td className="stats-label">{r.label}</td>
              <td className="stats-percent">{r.percent.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Stats;
