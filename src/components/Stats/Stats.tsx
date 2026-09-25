import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import type { PointType } from '../../types';
import { polygonStats } from '../Polygons/utils';
import { downloadBlob } from '../../utils/fileUtils';
import { Icon } from '../Icon/Icon';
import { ico } from '../../utils/icons';
import './Stats.css';
import { PieChart } from 'react-minimal-pie-chart';
import Report, { type ReportRow } from '../Report/Report';
import { useTooltip } from '../Tooltip/useTooltip';

type StatsProps = {
  points: PointType[];
  /** Used for the download filename. */
  name?: string;
};

type Row = ReportRow;

/** Percent makeup of each pixel class under a polygon. */
const Stats: React.FC<StatsProps> = ({ points, name = 'polygon' }) => {
  const {showTooltip} = useTooltip();
  const colourLabelMap = useSelector((s: RootState) => s.labels.colourLabelMap);
  const [showReport, setShowReport] = useState<boolean>(false); 

  const { rows, total } = useMemo(() => {
    const stats = polygonStats(points);
    if (!stats || stats.total === 0) return { rows: [] as Row[], total: 0 };

    const rows: Row[] = Object.entries(stats.counts).map(([colour, count]) => ({
      color: colour,
      title: colourLabelMap[colour] ?? colour,
      value: count,
      percent: (100 * count) / stats.total,
    }));
    if (stats.unclassified > 0) {
      rows.push({
        color: 'transparent',
        title: 'unclassified',
        value: stats.unclassified,
        percent: (100 * stats.unclassified) / stats.total,
      });
    }
    rows.sort((a, b) => b.value - a.value);
    return { rows, total: stats.total };
  }, [points, colourLabelMap]);

  const download = () => {
    const lines = ['label,colour,pixels,percent'];
    for (const r of rows) lines.push(`${r.title},${r.color},${r.value},${r.percent.toFixed(2)}`);
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), `${name}-stats.csv`);
  };

  if (total === 0) return <div className="stats stats-empty">No pixels under polygon.</div>;

  return (
    <div className="stats">
      <div className="stats-header">
        {total.toLocaleString()}px
        <span>
        <Icon
          src={ico('download.svg')}
          classes="button fit inset-3"
          onClick={download}
          onMouseEnter={showTooltip("Download CSV")}
        />
        <Icon
          src={ico('report.svg')}
          classes="button fit inset-3"
          onClick={() => {
            setShowReport(prev => !prev)
            console.log("SHOWING REPORT")
          }}
          onMouseEnter={showTooltip("To Report...")}

        />
        </span>
      </div>

      {!showReport ?
      <>
        <table className="stats-table">
          <tbody>
            {rows.map(r => (
              <tr key={r.color}>
                <td>
                  <Icon
                    src={ico('filled.svg')}
                    classes="fit inset-0 swatch"
                    style={{marginRight:'8px'}}
                    colour={r.color}
                  />
                  
                  </td>
                <td className="stats-label">{r.title}</td>
                <td className="stats-percent">{r.percent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* <div className='stats-pie'> */}
          <PieChart
            data={rows}
            style={{
              padding:'4px',
              boxSizing:'border-box',
              border:'1px solid white', 
              borderRadius:'100%',
            }}
          />
        {/* </div> */}
      </>
      :

      <Report rows={rows} total={total} points={points} />
    }
    </div>
  );
};

export default Stats;
