import { qrLogin } from "@/core/api/auth";
import { useAuthStore } from "@/core/store/useAuthStore";
import { useMutation } from "@tanstack/react-query";
import { BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import React, { useState } from "react";
import { Alert, View } from "react-native";
import { ButtonAtom } from "../atoms/ButtonAtom";
import { TextAtom } from "../atoms/TextAtom";
import { ScannerView } from "../molecules/ScannerView";

export function QrLoginScanner() {
  const { user, mobileToken } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: qrLogin,
    onSuccess: () => {
      setScannedData(null);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleScanPress = async () => {
    if (!permission) return;
    const { status } = await requestPermission();
    if (status === "granted") {
      setScannedData(null);
      setIsScanning(true);
    } else {
      Alert.alert(
        "Permission Denied",
        "Camera permission is required to scan QR codes."
      );
    }
  };

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    const data = scanningResult.data;
    setIsScanning(false);
    setScannedData(data);
    if (user && mobileToken) {
      mutate({
        sessionToken: data,
        mobileToken: mobileToken,
        user: { id: user.id },
      });
    }
  };

  if (isScanning) {
    return (
      <ScannerView
        onBarCodeScanned={handleBarCodeScanned}
        onCancel={() => setIsScanning(false)}
      />
    );
  }

  return (
    <View>
      <ButtonAtom
        title="Scan QR Code"
        onPress={handleScanPress}
        className="mt-4"
        isLoading={isPending}
      />
      {scannedData && <TextAtom>Scanned Data: {scannedData}</TextAtom>}
    </View>
  );
}
