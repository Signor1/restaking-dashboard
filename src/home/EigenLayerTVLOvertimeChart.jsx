import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { GridColumns, GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { LegendOrdinal } from '@visx/legend';
import { scaleLinear, scaleOrdinal, scaleTime } from '@visx/scale';
import { Circle, LinePath } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { extent, max } from 'd3-array';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { formatDateToVerboseString, formatNumber } from '../utils';
import { useMutativeReducer } from 'use-mutative';
import { reduceState } from '../shared/helpers';

const getNumberOfTicks = (width, axis) => {
  if (axis === 'x') {
    if (width < 500) return 3;
    if (width < 800) return 4;
    if (width > 1000) return 6;
    return 5;
  } else if (axis === 'y') {
    if (width < 500) return 3;
    if (width < 800) return 4;
    return 5;
  }
};

const EigenLayerTVLOvertimeChart = ({ data, width, height }) => {
  const {
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
    showTooltip,
    hideTooltip
  } = useTooltip();
  const rootRef = useRef(null);
  const [state, dispatch] = useMutativeReducer(reduceState, { width: 100 });
  const margin = { top: 40, right: 0, bottom: 40, left: 45 };

  // const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const getEthTVL = useCallback(d => parseFloat(d.ethTVL) / 1e18, []);
  const getLstTVL = useCallback(d => parseFloat(d.lstTVL) / 1e18, []);

  const getTvlByDate = useCallback(
    date => {
      const selectedDate = formatDateToVerboseString(date, 'yyyy-MM-dd');
      const tvl = data.find(
        item =>
          formatDateToVerboseString(new Date(item.timestamp), 'yyyy-MM-dd') ===
          selectedDate
      );
      return tvl;
    },
    [data]
  );

  const dateScale = useMemo(
    () =>
      scaleTime({
        range: [0, state.width],
        domain: extent(data, d => new Date(d.timestamp)),
        nice: true
      }),
    [data, state.width]
  );

  const tvlScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight, 0],
        domain: [0, max(data, d => Math.max(getEthTVL(d), getLstTVL(d)))],
        nice: true
      }),
    [data, innerHeight]
  );

  const handleTooltip = useCallback(
    event => {
      const { x, y } = localPoint(event) || { x: 0, y: 0 };
      const date = dateScale.invert(x - margin.left);

      showTooltip({
        tooltipData: getTvlByDate(date),
        tooltipLeft: x,
        tooltipTop: y
      });
    },
    [dateScale, margin.left, showTooltip]
  );

  const legendColorScale = scaleOrdinal({
    domain: ['ETH TVL', 'LST TVL'],
    range: ['#7828C8', '#C9A9E9']
  });

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === rootRef.current) {
          dispatch({
            width: entry.contentRect.width - margin.left - margin.right
          });
        }
      }
    });

    if (rootRef.current) {
      ro.observe(rootRef.current);
    }

    return () => ro.disconnect();
  }, [dispatch, height, margin.left, margin.right]);

  return (
    <div ref={rootRef}>
      <svg width="100%" height={height} className="overflow-visible">
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          className="fill-content1"
          rx={14}
        />
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={tvlScale}
            width={state.width}
            height={innerHeight}
            stroke="#7A86A5"
            strokeOpacity={0.2}
            numTicks={getNumberOfTicks(width, 'y')}
          />
          <GridColumns
            scale={dateScale}
            width={state.width}
            height={innerHeight}
            stroke="#7A86A5"
            strokeOpacity={0.2}
            numTicks={getNumberOfTicks(width, 'x')}
          />

          <AxisLeft
            scale={tvlScale}
            left={0}
            tickFormat={value => formatNumber(value, true)}
            tickLabelProps={() => ({
              className: 'fill-foreground text-xs',
              fontSize: 11,
              textAnchor: 'end'
            })}
          />

          <AxisBottom
            scale={dateScale}
            tickFormat={date => formatDateToVerboseString(date)}
            top={innerHeight}
            tickLabelProps={() => ({
              className: 'fill-foreground text-xs',
              textAnchor: 'middle'
            })}
            tickValues={data
              .filter(
                (_, i) =>
                  i %
                    Math.max(
                      1,
                      Math.floor(data.length / getNumberOfTicks(width, 'x'))
                    ) ===
                  0
              )
              .map(d => new Date(d.timestamp))}
          />

          <LinePath
            className="stroke-purple-500"
            strokeWidth={2}
            data={data}
            x={d => dateScale(new Date(d.timestamp))}
            y={d => tvlScale(getEthTVL(d))}
          />

          <LinePath
            className="stroke-purple-300"
            strokeWidth={2}
            data={data}
            x={d => dateScale(new Date(d.timestamp))}
            y={d => tvlScale(getLstTVL(d))}
          />

          {tooltipData && (
            <>
              <Circle
                cx={dateScale(new Date(tooltipData.timestamp))}
                cy={tvlScale(getEthTVL(tooltipData))}
                r={4}
                className="fill-purple-500"
                stroke="white"
                strokeWidth={2}
              />
              <Circle
                cx={dateScale(new Date(tooltipData.timestamp))}
                cy={tvlScale(getLstTVL(tooltipData))}
                r={4}
                className="fill-purple-300"
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}
          <rect
            x={0}
            y={0}
            width="100%"
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={hideTooltip}
          />
        </Group>
      </svg>

      <div className="mt-4">
        <LegendOrdinal
          scale={legendColorScale}
          shape="circle"
          direction="row"
          className="text-foreground-active flex w-full items-center justify-between text-sm uppercase"
        />
      </div>
      {tooltipData && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop + 10}
          left={tooltipLeft}
          className="z-10 min-w-40 rounded bg-white p-2 text-foreground shadow-md"
        >
          <div className="text-sm">
            Date: {formatDateToVerboseString(new Date(tooltipData.timestamp))}
          </div>
          <div className="text-base text-purple-500">
            ETH TVL: {formatNumber(getEthTVL(tooltipData), true)}
          </div>
          <div className="text-base text-purple-300">
            LST TVL: {formatNumber(getLstTVL(tooltipData), true)}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default EigenLayerTVLOvertimeChart;
