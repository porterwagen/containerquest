import type { Lesson } from "./types";
import { CHAPTER_1 } from "./chapter1";

export * from "./types";

export const LESSONS: Lesson[] = [...CHAPTER_1];

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
  return [...map.values()];
}

/** Roughly how long the whole course takes. */
export const TOTAL_MINUTES = LESSONS.reduce((sum, l) => sum + l.minutes, 0);
