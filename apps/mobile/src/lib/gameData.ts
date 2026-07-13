/**
 * Bundle pool + BSB verse texts for offline play.
 */
import type { PoolItem, PoolFile, TextBundle } from "@versemark/core";
import poolFile from "../data/pool.json";
import verses from "../data/verses.json";
import paragraphs from "../data/paragraphs.json";
import versesKjv from "../data/verses-kjv.json";
import paragraphsKjv from "../data/paragraphs-kjv.json";

export function loadPool(): PoolItem[] {
  return (poolFile as PoolFile).items;
}

export function loadTexts(): TextBundle {
  return {
    verses: verses as Record<string, string>,
    paragraphs: paragraphs as TextBundle["paragraphs"],
  };
}

export function loadTextBundles(): Record<"bsb" | "kjv", TextBundle> {
  return {
    bsb: loadTexts(),
    kjv: {
      verses: versesKjv as Record<string, string>,
      paragraphs: paragraphsKjv as TextBundle["paragraphs"],
    },
  };
}
