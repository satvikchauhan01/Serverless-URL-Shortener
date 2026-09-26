import { useId, useState } from 'react';
import { useElementWidth } from '../hooks/useElementWidth.js';
import { formatCount } from '../lib/format.js';
import { Button } from './Button.jsx';
import styles from './ClicksChart.module.css';

const HEIGHT = 240;
const MARGIN = { top: 24, right: 8, bottom: 30, left: 40 };
const MAX_BAR_WIDTH = 24;
const CORNER = 4;

// The days are UTC calendar days, so they are labelled in UTC too.
const dayLabel = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const dayLong = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

function clicksLabel(count) {
  return `${formatCount(count)} ${count === 1 ? 'click' : 'clicks'}`;
}

// A y-axis top that is a round number, with 3-5 gridlines under it.
function niceScale(max) {
  if (max <= 4) return { top: 4, step: 1 };
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= rough) * magnitude;
  return { top: Math.ceil(max / step) * step, step };
}

// A column with a rounded data end and a square foot on the baseline.
function columnPath(x, y, width, height) {
  const r = Math.min(CORNER, height, width / 2);
  const bottom = y + height;
  return `M${x},${bottom} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} H${x + width - r} A${r},${r} 0 0 1 ${x + width},${y + r} V${bottom} Z`;
}

export function ClicksChart({ daily }) {
  const [holder, width] = useElementWidth();
  const [active, setActive] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const liveId = useId();

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const counts = daily.map((day) => day.clicks);
  const peak = Math.max(...counts);
  const { top, step } = niceScale(peak);
  const band = plotWidth / daily.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, band * 0.62);
  const y = (value) => MARGIN.top + plotHeight - (value / top) * plotHeight;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const peakIndex = peak > 0 ? counts.lastIndexOf(peak) : -1;
  const activeDay = active === null ? null : daily[active];

  function onKeyDown(event) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const from = active ?? daily.length - 1;
    setActive(Math.min(daily.length - 1, Math.max(0, from + moves[event.key])));
  }

  return (
    <section className={styles.card} aria-labelledby={`${liveId}-title`}>
      <div className={styles.head}>
        <div>
          <h2 id={`${liveId}-title`} className={styles.title}>
            Clicks per day
          </h2>
          <p className={styles.subtitle}>Last 30 days, UTC</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setAsTable((shown) => !shown)}>
          {asTable ? 'Show chart' : 'Show as table'}
        </Button>
      </div>

      {asTable ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((day) => (
                <tr key={day.date}>
                  <td>{dayLong.format(new Date(day.date))}</td>
                  <td>{formatCount(day.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={holder}
          className={styles.plot}
          tabIndex={0}
          role="group"
          aria-label="Clicks per day chart. Use the left and right arrow keys to read each day."
          aria-describedby={liveId}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {width > 0 && (
            <svg width={width} height={HEIGHT} aria-hidden="true">
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    className={styles.grid}
                    x1={MARGIN.left}
                    x2={width - MARGIN.right}
                    y1={y(tick)}
                    y2={y(tick)}
                  />
                  <text className={styles.tick} x={MARGIN.left - 8} y={y(tick)} dy="0.32em">
                    {formatCount(tick)}
                  </text>
                </g>
              ))}

              {daily.map((day, i) => {
                const x = MARGIN.left + i * band;
                const height = plotHeight - (y(day.clicks) - MARGIN.top);
                return (
                  <g key={day.date}>
                    {active === i && (
                      <rect
                        className={styles.hover}
                        x={x}
                        y={MARGIN.top}
                        width={band}
                        height={plotHeight}
                      />
                    )}
                    {day.clicks > 0 && (
                      <path
                        className={styles.bar}
                        d={columnPath(x + (band - barWidth) / 2, y(day.clicks), barWidth, height)}
                      />
                    )}
                    {i === peakIndex && active !== i && (
                      <text className={styles.peak} x={x + band / 2} y={y(day.clicks) - 8}>
                        {formatCount(day.clicks)}
                      </text>
                    )}
                    {(daily.length - 1 - i) % 7 === 0 && (
                      <text className={styles.day} x={x + band / 2} y={HEIGHT - 8}>
                        {dayLabel.format(new Date(day.date))}
                      </text>
                    )}
                    {/* The hover target is the whole day column, not just the painted bar. */}
                    <rect
                      className={styles.hit}
                      x={x}
                      y={MARGIN.top}
                      width={band}
                      height={plotHeight + MARGIN.bottom}
                      onPointerEnter={() => setActive(i)}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {activeDay && (
            <div
              className={styles.tooltip}
              style={{
                left: Math.min(Math.max(MARGIN.left + (active + 0.5) * band, 70), width - 70),
                top: y(activeDay.clicks),
              }}
            >
              <strong>{clicksLabel(activeDay.clicks)}</strong>
              <span>{dayLong.format(new Date(activeDay.date))}</span>
            </div>
          )}
          <p id={liveId} className="visually-hidden" aria-live="polite">
            {activeDay &&
              `${dayLong.format(new Date(activeDay.date))}: ${clicksLabel(activeDay.clicks)}`}
          </p>
        </div>
      )}
    </section>
  );
}
