import { Market, Ticker } from "../../../entities/market/types/types";

export const TickerRow = ({
  market,
  ticker,
}: {
  market: Market;
  ticker: Ticker;
}) => {
  const changeRate = (ticker.signed_change_rate * 100).toFixed(2);
  const changePrice = ticker.signed_change_price.toLocaleString("ko-KR");

  const changeClass =
    ticker.change === "RISE"
      ? "text-red-600"
      : ticker.change === "FALL"
      ? "text-blue-600"
      : "text-gray-200";

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-700/50">
      <td className="p-3">
        {market.korean_name} ({market.market})
      </td>
      <td className="p-3">{ticker.trade_price.toLocaleString("ko-KR")}</td>
      <td className="p-3">
        <span className={changeClass}>{changeRate}%</span>
        <br />
        <span className={changeClass}>{changePrice}</span>
      </td>
      <td className="p-3">
        {`${Math.round(ticker.acc_trade_price_24h / 1000000).toLocaleString(
          "ko-KR"
        )} 백만`}
      </td>
    </tr>
  );
};
