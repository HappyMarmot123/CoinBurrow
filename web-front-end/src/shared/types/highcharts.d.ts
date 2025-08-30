declare module "highcharts/highcharts-stock" {
  import Highcharts from "highcharts";
  const G: (H: typeof Highcharts) => typeof Highcharts;
  export default G;
}
