/** A restrained native state transition for refine and result chrome. */
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Platform, StyleSheet } from "../design-system";
import { useTheme } from "../theme-context";

export function StageReveal({ children, distance = 8 }: { children: ReactNode; distance?: number }) {
  const { reduceMotion } = useTheme();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0.88)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : distance)).current;

  useEffect(() => {
    opacity.stopAnimation();
    translateY.stopAnimation();
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    opacity.setValue(0.88);
    translateY.setValue(distance);
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.exp),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.exp),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [distance, opacity, reduceMotion, translateY]);

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
});
