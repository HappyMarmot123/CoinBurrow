import { SymbolView } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";
import { IconProps } from "./Icon";

export function Icon({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: IconProps & { style?: StyleProp<ViewStyle> }) {
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
