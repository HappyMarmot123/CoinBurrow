import { ButtonAtom } from "@/components/atoms/ButtonAtom";
import { TextAtom } from "@/components/atoms/TextAtom";
import { QrLoginScanner } from "@/components/organisms/QrLoginScanner";
import { PageTemplate } from "@/components/templates/PageTemplate";
import { useAuthStore } from "@/core/store/useAuthStore";
import { View } from "react-native";

export default function Home() {
  const { user, logout } = useAuthStore();

  return (
    <PageTemplate headerProps={{ title: "Home" }}>
      <View>
        <TextAtom>Welcome, {user?.username}!</TextAtom>
        <TextAtom>Email: {user?.email}</TextAtom>

        <QrLoginScanner />

        <ButtonAtom title="Log Out" onPress={logout} className="mt-8" />
      </View>
    </PageTemplate>
  );
}
