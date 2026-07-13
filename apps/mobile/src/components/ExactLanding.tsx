/** One quiet success flourish: a mark settles and its echo disappears. */
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "../design-system";
import { useTheme } from "../theme-context";

export function ExactLanding() {
  const { colors, reduceMotion } = useTheme();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.exp),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <View style={styles.wrap} accessible={false} importantForAccessibility="no-hide-descendants">
      {!reduceMotion ? (
        <Animated.View
          style={[
            styles.echo,
            {
              borderColor: colors.success,
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0] }),
              transform: [
                { rotate: "45deg" },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.75] }) },
              ],
            },
          ]}
        />
      ) : null}
      <View style={[styles.mark, { backgroundColor: colors.success, borderColor: colors.bg }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  echo: { position: "absolute", width: 17, height: 17, borderWidth: 1 },
  mark: { width: 12, height: 12, borderWidth: 1.5, transform: [{ rotate: "45deg" }] },
});
