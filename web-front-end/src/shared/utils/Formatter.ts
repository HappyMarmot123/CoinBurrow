export const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) {
    return "Invalid Price";
  }

  const integerPrice = Math.floor(numPrice);
  return integerPrice.toLocaleString("ko-KR");
};

export const formatSignedChangeRate = (
  rate?: number
): { displayRate: string; colorClass: string } => {
  const actualRate = rate ?? 0;
  const signedChangeRate = (actualRate * 100).toFixed(2);
  const changeRateColor = signedChangeRate.startsWith("-")
    ? "text-blue-400"
    : "text-red-400";
  const changeRateSign = signedChangeRate.startsWith("-") ? "" : "+";

  return {
    displayRate: `${changeRateSign}${signedChangeRate}%`,
    colorClass: changeRateColor,
  };
};

export const formatTradePrice = (price?: number): string => {
  if (price === undefined) {
    return "0";
  }
  return formatPrice(price); // Reusing the existing formatPrice function
};
