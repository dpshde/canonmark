/** A tiny canon bookmark: product identity without illustrative decoration. */
import { StyleSheet, View } from "../design-system";
import { useTheme } from "../theme-context";

const BANDS = [
  ["law", 0.19],
  ["history", 0.23],
  ["poetry", 0.15],
  ["prophets", 0.18],
  ["gospels", 0.15],
  ["epistles", 0.1],
] as const;

export function CanonRibbon({
  height = 68,
  width = 20,
  horizontal = false,
  markerAt,
}: {
  height?: number;
  width?: number;
  horizontal?: boolean;
  markerAt?: number;
}) {
  const { colors } = useTheme();
  const axisLength = horizontal ? width : height;
  const markerOffset = markerAt == null
    ? null
    : Math.max(5, Math.min(axisLength - 5, Math.max(0, Math.min(1, markerAt)) * axisLength));

  return (
    <View
      style={[styles.wrap, { width, height }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.rail,
          horizontal ? styles.railHorizontal : styles.railVertical,
          { backgroundColor: colors.rail },
        ]}
      >
        {BANDS.map(([genre, flex]) => (
          <View key={genre} style={{ flex, backgroundColor: colors.genre[genre] }} />
        ))}
      </View>
      {markerOffset != null ? (
        <View
          style={[
            styles.marker,
            horizontal
              ? { left: markerOffset, top: 5, marginLeft: -5 }
              : { top: markerOffset, left: 5, marginTop: -5 },
            { backgroundColor: colors.accent, borderColor: colors.bg },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  rail: { overflow: "hidden" },
  railVertical: { width: 7, height: "100%" },
  railHorizontal: { width: "100%", height: 7, flexDirection: "row" },
  marker: {
    position: "absolute",
    width: 10,
    height: 10,
    borderWidth: 1.5,
    transform: [{ rotate: "45deg" }],
  },
});
