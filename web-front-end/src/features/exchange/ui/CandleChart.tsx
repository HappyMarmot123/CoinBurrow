import React, { useEffect, useMemo, useRef, useState } from "react";
import { useExchangeStore } from "@/app/store/useExchangeStore";
import { useShallow } from "zustand/react/shallow";
import { CandleDto } from "@/entities/market/types/types";
// import { useExchangeSocketWorker } from "@/features/exchange/hooks/useExchangeSocketWorker"; // Removed as unused

import Highcharts from "highcharts/highstock"; // Using highstock
import HighchartsReact from "highcharts-react-official";
// import { TooltipShapeValue } from "highcharts"; // Removed as unused

// Import Highcharts modules
import indicatorsAll from "highcharts/indicators/indicators-all";
import annotationsAdvanced from "highcharts/modules/annotations-advanced";
import PriceIndicator from "highcharts/modules/price-indicator";
import fullScreen from "highcharts/modules/full-screen";
import HighchartsExporting from "highcharts/modules/exporting"; // Added for exporting module

if (typeof Highcharts === "object") {
  // 넥스트 SSR 모듈 이니셜
  HighchartsExporting(Highcharts); // Initialize exporting module
  indicatorsAll(Highcharts);
  annotationsAdvanced(Highcharts);
  PriceIndicator(Highcharts);
  fullScreen(Highcharts);
}

const colorTemplate = "{#ge point.open point.close}#ff6e6e{else}#51af7b{/ge}";

export const CandleChart = () => {
  const chartComponentRef = useRef<HighchartsReact.RefObject>(null);
  const candleData = useExchangeStore(useShallow((state) => state.candleData));
  const selectedCoin = useExchangeStore(
    useShallow((state) => state.selectedCoin)
  );

  // Highcharts 데이터 형식으로 가공
  const ohlcAndVolumeData = useMemo(() => {
    if (!candleData || candleData.length === 0) {
      return { ohlc: [], volume: [] };
    }

    const ohlc: number[][] = [];
    const volume: (number | string)[][] = [];

    candleData.forEach((candle: CandleDto) => {
      const x = new Date(candle.candle_date_time_kst).getTime();
      const open = candle.opening_price;
      const high = candle.high_price;
      const low = candle.low_price;
      const close = candle.trade_price;
      const vol = candle.candle_acc_trade_volume;

      ohlc.push([x, open, high, low, close]);
      volume.push([
        x,
        vol,
        (open as number) < (close as number)
          ? "highcharts-point-up"
          : "highcharts-point-down",
      ]);
    });

    console.log("ohlc", ohlc[0]);
    console.log("volume", volume[0]);
    return { ohlc, volume };
  }, [candleData]);

  useEffect(() => {
    const chart = chartComponentRef.current?.chart;
    if (!chart || !ohlcAndVolumeData.ohlc.length) return;

    const ohlcSeries = chart.series[0] as Highcharts.Series; // Highcharts.Series 타입 단언
    const volumeSeries = chart.series[1] as Highcharts.Series; // Highcharts.Series 타입 단언

    // 첫 렌더링 또는 전체 데이터 교체 시 setData 사용
    if (
      ohlcSeries.points.length === 0 ||
      ohlcSeries.points.length < ohlcAndVolumeData.ohlc.length
    ) {
      ohlcSeries.setData(ohlcAndVolumeData.ohlc, false);
      volumeSeries.setData(ohlcAndVolumeData.volume, false);
    } else {
      // 실시간 업데이트: 마지막 캔들이 변경되었거나 새 캔들이 추가된 경우
      const lastExistingCandle =
        ohlcSeries.points[ohlcSeries.points.length - 1];
      const newLastCandle =
        ohlcAndVolumeData.ohlc[ohlcAndVolumeData.ohlc.length - 1];

      if (lastExistingCandle && lastExistingCandle.x === newLastCandle[0]) {
        // 마지막 캔들 업데이트
        ohlcSeries.points[ohlcSeries.points.length - 1].update(
          newLastCandle,
          false
        );
        volumeSeries.points[volumeSeries.points.length - 1].update(
          ohlcAndVolumeData.volume[ohlcAndVolumeData.volume.length - 1],
          false
        );
      } else if (
        lastExistingCandle &&
        lastExistingCandle.x < newLastCandle[0]
      ) {
        // 새로운 캔들 추가
        ohlcSeries.addPoint(newLastCandle, false, true, true);
        volumeSeries.addPoint(
          ohlcAndVolumeData.volume[ohlcAndVolumeData.volume.length - 1],
          false,
          true,
          true
        );
      }
    }

    const lastTimestamp = ohlcAndVolumeData.ohlc[
      ohlcAndVolumeData.ohlc.length - 1
    ]?.[0] as number;
    if (lastTimestamp) {
      const thirtyMinutesAgo = lastTimestamp - 30 * 60 * 1000; // 30분 전
      chart.xAxis[0].setExtremes(thirtyMinutesAgo, lastTimestamp, true, false);
    }

    chart.redraw();
  }, [ohlcAndVolumeData]);

  const [options] = useState<Highcharts.Options>({
    rangeSelector: {
      enabled: false, // 날짜 선택기 비활성화
    },
    chart: {
      styledMode: false,
      backgroundColor: "#1e2939",
      height: 490,
    },
    exporting: {
      enabled: false, // 햄버거 메뉴 버튼 비활성화
    },
    navigator: {
      enabled: false, // 네비게이터 비활성화
    },
    xAxis: {
      crosshair: {
        className: "highcharts-crosshair-custom",
      },
      gridLineColor: "#21323f",
      gridLineWidth: 1,
      lineColor: "#999999",
      tickColor: "#999999",
      tickLength: 5,
      labels: {
        style: {
          color: "#c5c7c9",
          fontSize: "12px",
        },
      },
    },
    yAxis: [
      {
        title: {
          text: null,
        },
        crosshair: {
          snap: false,
          className: "highcharts-crosshair-custom",
          label: {
            enabled: true,
            format: "{value:.2f}",
            backgroundColor: "#364153",
          },
        },
        gridLineColor: "#364153",
        lineWidth: 1,
        labels: {
          align: "left",
          style: {
            color: "#c5c7c9",
            fontSize: "12px",
          },
        },
        height: "70%",
      },
      {
        title: {
          text: null,
        },
        crosshair: {
          snap: false,
          className: "highcharts-crosshair-custom",
          label: {
            format: "{(divide value 1000):.2f} k",
            enabled: true,
            backgroundColor: "#364153",
          },
        },
        labels: {
          align: "left",
          style: {
            color: "#c5c7c9",
            fontSize: "12px",
          },
        },
        top: "70%",
        height: "30%",
        offset: 0,
      },
    ],
    plotOptions: {
      candlestick: {
        pointPadding: 0.1, // 캔들 스틱 사이의 여백
      },
    },
    tooltip: {
      shape: "square" as Highcharts.TooltipShapeValue,
      backgroundColor: "#364153",
      split: false,
      shared: true,
      headerShape: "callout",
      positioner: function () {
        const x = 0;
        const y = 0;
        return { x: x, y: y };
      },
      format: `
        <span style="font-size: 1.4em; color: #e0e0e0;">{point.series.name}</span><br/>
        O<span style="color:${colorTemplate}";>{point.open}</span>
        H<span style="color:${colorTemplate}";>{point.high}</span>
        L<span style="color:${colorTemplate}";>{point.low}</span>
        C<span style="color:${colorTemplate}";>{point.close}</span><br/>
        <p style="font-size: 12px; color:#e0e0e0">{point.candle_date_time_kst}</p>
        Volume<span style="color:${colorTemplate}";>{point.volume}</span>
      `,
    },
    series: [
      {
        type: "candlestick",
        name: selectedCoin.korean_name || selectedCoin.market,
        id: "ohlc",
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
        dataGrouping: {
          enabled: false,
        },
      },
      {
        type: "line",
        name: "Volume",
        id: "volume",
        yAxis: 1,
        color: "#2b7fff",
        lastPrice: {
          enabled: true,
          color: "#2b7fff",
          label: {
            enabled: true,
            format: "{(divide value 1000):.2f} k",
            backgroundColor: "#2b7fff",
          },
        },
        dataGrouping: {
          enabled: false,
        },
      },
    ],
  });

  return (
    <div className="rounded-lg overflow-hidden">
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={"stockChart"}
        options={options}
        ref={chartComponentRef}
      />
    </div>
  );
};
