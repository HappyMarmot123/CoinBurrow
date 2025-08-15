import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ViewAtom } from "@/components/atoms/ViewAtom";
import { Header, HeaderProps } from "@/components/organisms/Header";
import { PropsWithChildren } from "react";

type PageTemplateProps = PropsWithChildren<{
  headerProps: HeaderProps;
}>;

export function PageTemplate({ headerProps, children }: PageTemplateProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header {...headerProps} />
      <ScrollView contentContainerStyle={styles.container}>
        <ViewAtom style={styles.content}>{children}</ViewAtom>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
});
