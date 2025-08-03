import { SymbolView } from "expo-symbols";

import { IconPropsIOS } from "./type";

export function Icon({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: IconPropsIOS) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
