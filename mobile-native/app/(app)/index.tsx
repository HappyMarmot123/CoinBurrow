import { ButtonAtom } from "@/components/atoms/ButtonAtom";
import { TextAtom } from "@/components/atoms/TextAtom";
import { PageTemplate } from "@/components/templates/PageTemplate";
import { useAuthStore } from "@/core/store/useAuthStore";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function Home() {
  const { user, logout } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const handleScanPress = async () => {
    if (!permission) return;
    const { status } = await requestPermission();
    if (status === "granted") {
      setScannedData(null);
      setIsScanning(true);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setIsScanning(false);
    setScannedData(data);
  };

  if (isScanning) {
    return (
      <View style={styles.container}>
        <CameraView
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={StyleSheet.absoluteFillObject}
        />
        <ButtonAtom title="Cancel Scan" onPress={() => setIsScanning(false)} />
      </View>
    );
  }

  return (
    <PageTemplate headerProps={{ title: "Home" }}>
      <View>
        <TextAtom>Welcome, {user?.username}!</TextAtom>
        <TextAtom>Email: {user?.email}</TextAtom>

        <ButtonAtom
          title="Scan QR Code"
          onPress={handleScanPress}
          className="mt-4"
        />

        {scannedData && <TextAtom>Scanned Data: {scannedData}</TextAtom>}

        <ButtonAtom title="Log Out" onPress={logout} className="mt-8" />
      </View>
    </PageTemplate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
});
