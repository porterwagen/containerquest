import type { Lesson } from "./types";
import { CHAPTER_0 } from "./chapter0";
import { CHAPTER_1 } from "./chapter1";
import { CHAPTER_2 } from "./chapter2";
import { CHAPTER_3 } from "./chapter3";
import { CHAPTER_4 } from "./chapter4";
import { CHAPTER_5 } from "./chapter5";
import { CHAPTER_6 } from "./chapter6";

export * from "./types";

export const LESSONS: Lesson[] = [
  ...CHAPTER_0,
  ...CHAPTER_1,
  ...CHAPTER_2,
  ...CHAPTER_3,
  ...CHAPTER_4,
  ...CHAPTER_5,
  ...CHAPTER_6,
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

/** Chapters in order, for the sidebar. */
export function chapters(): Array<{ number: number; title: string; lessons: Lesson[] }> {
  const map = new Map<number, { number: number; title: string; lessons: Lesson[] }>();
  for (const l of LESSONS) {
    if (!map.has(l.chapter)) {
      map.set(l.chapter, { number: l.chapter, title: l.chapterTitle, lessons: [] });
    }
    map.get(l.chapter)!.lessons.push(l);
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
}

export const TOTAL_MINUTES = LESSONS.reduce((sum, l) => sum + l.minutes, 0);
