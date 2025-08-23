import React from "react";
import { StyleSheet, View } from "react-native";

import { ButtonAtom } from "@/components/atoms/ButtonAtom";
import { CameraAtom } from "@/components/atoms/CameraAtom";
import { BarcodeScanningResult } from "expo-camera";

interface ScannerViewProps {
  onBarCodeScanned: (scanningResult: BarcodeScanningResult) => void;
  onCancel: () => void;
}

export function ScannerView({ onBarCodeScanned, onCancel }: ScannerViewProps) {
  return (
    <>
      <View className="w-60 h-60">
        <CameraAtom
          onBarcodeScanned={onBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <ButtonAtom title="Cancel Scan" onPress={onCancel} />
    </>
  );
}
