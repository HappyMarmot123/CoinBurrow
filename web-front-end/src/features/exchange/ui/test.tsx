import React, { useRef, useState, useEffect } from "react";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import Indicators from "highcharts/indicators/indicators";
import Accessibility from "highcharts/modules/accessibility";
import PriceIndicator from "highcharts/modules/price-indicator";
import StockModule from "highcharts/modules/stock";
import Exporting from "highcharts/modules/exporting";

// Initialize Highcharts modules
Indicators(Highcharts);
Accessibility(Highcharts);
PriceIndicator(Highcharts);
Exporting(Highcharts);
StockModule(Highcharts);

type SeriesOptionsTypeWithData = {
  data: [number[]];
} & Highcharts.SeriesOptionsType;

const DynamicChart = () => {
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const pointValueRef = useRef({ pointValue: false });
  const [options] = useState({
    chart: {
      backgroundColor: "transparent",
      height: 400,
    },
    xAxis: {
      overscroll: 500000,
      range: 4 * 200000,
      gridLineWidth: 1,
      lineWidth: 0,
      tickLength: 0,
      labels: {
        style: {
          fontSize: "13",
        },
      },
    },
    yAxis: {
      labels: {
        style: {
          fontSize: "13",
        },
      },
    },
    rangeSelector: {
      buttons: [
        { type: "minute", count: 15, text: "15m" },
        { type: "hour", count: 1, text: "1h" },
        { type: "all", count: 1, text: "All" },
      ],
      selected: 1,
      buttonSpacing: 2,
      allButtonsEnabled: true,
      inputEnabled: false,
      verticalAlign: "top",
      buttonTheme: {
        width: 34,
        height: 24,
        borderRadius: 1,
        fill: "transparent",
        stroke: "none",
        strokeWidth: 1,
        r: 4,
        style: {
          fontFamily: "Poppins",
          textTransform: "uppercase",
          fontWeight: "400",
          fontSize: "13",
        },
        states: {
          hover: {
            style: {
              color: "#fff",
            },
          },
          focus: {
            fill: "#73a8f837",
          },
          select: {
            style: {
              color: "#fff",
              fontFamily: "Poppins",
              textTransform: "uppercase",
              fontWeight: 400,
            },
          },
        },
      },
    },
    series: [
      {
        type: "candlestick",
        color: "#FF7F7F",
        upColor: "#90EE90",
        lineColor: "#FF7F7F",
        upLineColor: "#90EE90",
        lastPrice: {
          enabled: true,
          color: "#FF7F7F",
          label: {
            enabled: true,
            backgroundColor: "#FF7F7F",
          },
        },
        data: [],
      },
    ],
    scrollbar: {
      enabled: false,
    },
    credits: {
      enabled: false,
    },
  });

  function getNewPoint(i: number, data: number[][]) {
    const lastPoint = data[data.length - 1];

    if (i === 0 || i % 10 === 0) {
      return [
        lastPoint[0] + 60000,
        lastPoint[4],
        lastPoint[4],
        lastPoint[4],
        lastPoint[4],
      ];
    }

    const updatedLastPoint = data[data.length - 1],
      newClose = Highcharts.correctFloat(
        lastPoint[4] + Highcharts.correctFloat(Math.random() - 0.5, 2),
        4
      );
    pointValueRef.current.pointValue = updatedLastPoint[4] > newClose;

    return [
      updatedLastPoint[0],
      data[data.length - 2][4],
      newClose >= updatedLastPoint[2] ? newClose : updatedLastPoint[2],
      newClose <= updatedLastPoint[3] ? newClose : updatedLastPoint[3],
      newClose,
    ];
  }

  useEffect(() => {
    const series = chartComponentRef.current?.chart.series[0];
    if (!series) return;
    let i = 0;
    const updateInterval = setInterval(() => {
      const options = series.options as SeriesOptionsTypeWithData;
      const data = options.data;

      const newPoint = getNewPoint(i, data);
      const lastPoint = data[data.length - 1];

      const color = "#FF7F7F";
      const colorUp = "#90EE90";
      const colorLabel = pointValueRef.current.pointValue ? color : colorUp;

      if (lastPoint[0] !== newPoint[0]) {
        series.addPoint(newPoint);
      } else {
        data[data.length - 1] = newPoint;
        series.setData(data);

        series.update({
          lastPrice: {
            color: colorLabel,
            label: {
              backgroundColor: colorLabel,
            },
          },
        } as SeriesOptionsTypeWithData);
      }

      i++;
    }, 333);

    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  return (
    <div className="stock-dynamic ">
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={"stockChart"}
        options={options}
        ref={chartComponentRef}
      />
    </div>
  );
};

export default DynamicChart;
