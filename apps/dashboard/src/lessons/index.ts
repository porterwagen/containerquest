import type { Lesson } from "./types.ts";
import { CHAPTER_0 } from "./chapter0.ts";
import { CHAPTER_1 } from "./chapter1.ts";
import { CHAPTER_2 } from "./chapter2.ts";
import { CHAPTER_3 } from "./chapter3.ts";
import { CHAPTER_4 } from "./chapter4.ts";
import { CHAPTER_5 } from "./chapter5.ts";
import { CHAPTER_6 } from "./chapter6.ts";

export * from "./types.ts";

export const LESSONS: Lesson[] = [
  ...CHAPTER_0,
  ...CHAPTER_1,
  ...CHAPTER_2,
  ...CHAPTER_3,
  ...CHAPTER_4,
  ...CHAPTER_5,
  ...CHAPTER_6,
];

/**
 * The chapters, and what finishing one means.
 *
 * `summary` is shown when you complete a chapter's last lesson: the point at
 * which someone has earned a moment of "here is what you can now do", and the
 * only place in the course that zooms out past a single lesson.
 */
export interface ChapterMeta {
  number: number;
  title: string;
  /** What you can do now, shown on completing the chapter. */
  summary: string[];
  /** One line on where the next chapter goes. */
  nextUp: string;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    number: 0,
    title: "Getting started",
    summary: [
      "You can run a container from someone else's image, and you know an image is a template while a container is one instance of it.",
      "You can keep a service running in the background, publish a port to reach it, read its logs, and stop it cleanly.",
      "You can write a Dockerfile from scratch, build it, and fix it when a dependency is missing.",
      "You can read the errors Docker gives you and tell which ones are about your machine, your image, or your program.",
    ],
    nextUp:
      "Next: the same ideas against a real eight-container fleet, where a process claims to be pid 1 and your Mac disagrees.",
  },
  {
    number: 1,
    title: "What a container actually is",
    summary: [
      "You proved a container is an ordinary process with a restricted view, not a small virtual machine.",
      "You saw one program report two different identities depending on where you asked from.",
      "You know restarting a container keeps its files while replacing it does not.",
    ],
    nextUp: "Next: why one image is 187 kB and another is 300 MB, and how to control that.",
  },
  {
    number: 2,
    title: "Images and how they're built",
    summary: [
      "You know an image is a stack of layers, and why identical layers are stored once.",
      "You can explain a multi-stage build and why it makes images orders of magnitude smaller.",
      "You can order a Dockerfile so rebuilds stay fast instead of re-downloading everything.",
    ],
    nextUp: "Next: how containers reach each other, and where data goes when one is destroyed.",
  },
  {
    number: 3,
    title: "Networking, Compose, and data",
    summary: [
      "You know why a running service can still be unreachable, and how to fix it.",
      "You know containers find each other by name, because names survive restarts and IPs do not.",
      "You can keep one image and change its behavior per environment, and make data outlive a container.",
      "You can read a Compose file as a recipe, drive services by name (logs, exec, recreate), and write a small multi-service stack of your own.",
    ],
    nextUp: "Next: breaking things on purpose, and the health checks that decide what happens.",
  },
  {
    number: 4,
    title: "When things break",
    summary: [
      "You have a routine for a container that will not start: is it running, what did it say, what was the exit code.",
      "You know the difference between liveness and readiness, and why checking a database in liveness can take down a fleet.",
      "You know exactly which four things Compose cannot do, which is the entire case for Kubernetes.",
    ],
    nextUp: "Next: Kubernetes, and the single idea the whole of it follows from.",
  },
  {
    number: 5,
    title: "Kubernetes",
    summary: [
      "You can explain the declarative loop: you state a desired state and Kubernetes makes reality match it, continuously.",
      "You deleted a pod and watched a replacement appear unprompted, scaled a service to five copies, and rolled a new version out with no downtime.",
      "You can read probes, events, and `describe` output when a deployment misbehaves.",
    ],
    nextUp: "Next: your own application, containerized and deployed to that same cluster.",
  },
  {
    number: 6,
    title: "Ship your own app",
    summary: [
      "You containerized a program you wrote and put it on a real cluster.",
      "You know how the image gets there, what a Deployment and a Service each do, and why port-forward is not how real traffic arrives.",
      "You know when NOT to reach for Kubernetes, which is as useful as knowing how to use it.",
    ],
    nextUp: "From here: ConfigMaps and Secrets, Ingress, resource limits, and CI/CD.",
  },
];

export function chapterMeta(number: number): ChapterMeta | undefined {
  return CHAPTERS.find((c) => c.number === number);
}

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

/** True when this lesson is the last one in its chapter. */
export function isChapterEnd(id: string): boolean {
  const lesson = lessonById(id);
  if (!lesson) return false;
  const next = nextLesson(id);
  return next === undefined || next.chapter !== lesson.chapter;
}

/** Chapters in order, for the sidebar. */
export function chapters(): Array<{ number: number; title: string; lessons: Lesson[] }> {
  const map = new Map<number, { number: number; title: string; lessons: Lesson[] }>();
  for (const l of LESSONS) {
    if (!map.has(l.chapter)) {
      map.set(l.chapter, {
        number: l.chapter,
        title: chapterMeta(l.chapter)?.title ?? l.chapterTitle,
        lessons: [],
      });
    }
    map.get(l.chapter)!.lessons.push(l);
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
}
