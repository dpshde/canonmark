/**
 * Expo-first shell — exercises shared @versemark/core on device.
 * Full play UI (native strip, etc.) lands in later passes.
 */
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import {
  createMemoryKvStore,
  emptyAppState,
  loadState,
  scoreRound,
  setStorageBackend,
  BOOKS,
  formatMiss,
  buildOverallStats,
} from "@versemark/core";

// Session memory store until AsyncStorage hydrate is wired.
setStorageBackend(createMemoryKvStore());

export default function App() {
  const snapshot = useMemo(() => {
    const state = loadState();
    // Non-trivial pure calls from shipped core (verse indices + hint step)
    const exact = scoreRound(100, 100, 1);
    const missSample = scoreRound(100, 140, 1);
    const stats = buildOverallStats(state);
    return {
      emptyRounds: emptyAppState().lifetime.scoredRounds,
      books: BOOKS.length,
      exactTotal: exact.total,
      midMissTotal: missSample.total,
      midDistance: missSample.distance,
      loadedRounds: state.lifetime.scoredRounds,
      exactRate: stats.exactRate,
      medianMissLabel: formatMiss(40),
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>Versemark</Text>
        <Text style={styles.title}>Expo shell</Text>
        <Text style={styles.body}>
          Shared domain from @versemark/core — scoring, books, state shapes.
          Timeline strip and full play UI stay platform-native.
        </Text>

        <View style={styles.card}>
          <Text style={styles.row}>Books in canon · {snapshot.books}</Text>
          <Text style={styles.row}>
            Empty lifetime rounds · {snapshot.emptyRounds}
          </Text>
          <Text style={styles.row}>
            Exact score (same verse, h1) · {snapshot.exactTotal}
          </Text>
          <Text style={styles.row}>
            Mid miss (d={snapshot.midDistance}, h1) · {snapshot.midMissTotal}
          </Text>
          <Text style={styles.row}>
            formatMiss(40) · {snapshot.medianMissLabel}
          </Text>
          <Text style={styles.row}>
            Loaded exact rate · {snapshot.exactRate}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#faf8f4",
  },
  scroll: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#8a7f76",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#2c2825",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#5c554e",
    marginBottom: 24,
    maxWidth: 360,
  },
  card: {
    borderWidth: 1,
    borderColor: "#d4cdc4",
    backgroundColor: "#f5f1ea",
    padding: 16,
    gap: 10,
  },
  row: {
    fontSize: 15,
    color: "#2c2825",
    fontVariant: ["tabular-nums"],
  },
});
