/** Compact tab bar used by the web preview; native builds use OS-owned tabs. */
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View, useSafeAreaInsets } from "../design-system";
import { hapticLight } from "../lib/haptics";
import { useTheme } from "../theme-context";

function PlayIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.playIcon} accessible={false}>
      <View style={[styles.playRail, { backgroundColor: color }]} />
      <View style={[styles.playMarker, { borderColor: color }, focused ? { backgroundColor: color } : null]} />
    </View>
  );
}

function ProgressIcon({ color }: { color: string }) {
  return (
    <View style={styles.progressIcon} accessible={false}>
      {[7, 12, 18].map((height) => (
        <View key={height} style={[styles.progressBar, { height, backgroundColor: color }]} />
      ))}
    </View>
  );
}

export function MobileTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
      <View style={styles.inner} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = typeof options?.tabBarLabel === "string"
            ? options.tabBarLabel
            : options?.title ?? route.name;
          const color = focused ? colors.accentDeep : colors.ink3;
          const badge = options?.tabBarBadge;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              testID={options?.tabBarButtonTestID}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  hapticLight();
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
            >
              {focused ? <View style={[styles.activeRule, { backgroundColor: colors.accent }]} /> : null}
              <View style={styles.iconWrap}>
                {route.name === "Play" ? <PlayIcon color={color} focused={focused} /> : <ProgressIcon color={color} />}
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.badgeText, { color: colors.onAccent }]}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[typography.section, styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  inner: { width: "100%", maxWidth: 360, minHeight: 62, alignSelf: "center", flexDirection: "row" },
  item: { flex: 1, minHeight: 62, alignItems: "center", justifyContent: "center", gap: 3, position: "relative" },
  pressed: { opacity: 0.68 },
  activeRule: { position: "absolute", top: 0, width: 28, height: 2 },
  iconWrap: { width: 28, height: 22, alignItems: "center", justifyContent: "center", position: "relative" },
  playIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  playRail: { position: "absolute", width: 2, height: 20, opacity: 0.34 },
  playMarker: { width: 10, height: 10, borderWidth: 1.5, transform: [{ rotate: "45deg" }] },
  progressIcon: { height: 20, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  progressBar: { width: 3 },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 0.3, textTransform: "none" },
  badge: { position: "absolute", right: -6, top: -5, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: "700" },
});
