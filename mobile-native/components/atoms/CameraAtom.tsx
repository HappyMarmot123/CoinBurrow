import { CameraProps, CameraView } from "expo-camera";
import React from "react";

export function CameraAtom(props: CameraProps) {
  return <CameraView {...props} />;
}
