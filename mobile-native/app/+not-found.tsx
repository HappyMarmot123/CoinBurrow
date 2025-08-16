import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";

import { TextAtom } from "@/components/atoms/TextAtom";
import { ViewAtom } from "@/components/atoms/ViewAtom";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <ViewAtom style={styles.container}>
        <TextAtom type="title">This screen does not exist.</TextAtom>
        <Link href="/" style={styles.link}>
          <TextAtom type="link">Go to home screen!</TextAtom>
        </Link>
      </ViewAtom>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
