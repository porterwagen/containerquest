import { AppHeader } from "@/components/AppHeader";
import { Course } from "@/components/Course";

/**
 * The course. Reads no telemetry on the server, so this route stays static:
 * the lessons are the same bytes for everyone, and the per-step verification
 * happens client-side against the live services.
 */
export default function LearnPage() {
  const mode = process.env.NEXT_PUBLIC_QUEST_MODE === "demo" ? "demo" : "live";

  return (
    <main className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8">
      <AppHeader current="learn" mode={mode} />
      <Course mode={mode} />
    </main>
  );
}
