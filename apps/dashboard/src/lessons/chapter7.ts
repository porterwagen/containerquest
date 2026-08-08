import type { Lesson } from "./types.ts";

/**
 * Chapter 7  -  Ship beyond your laptop (roadmap only).
 *
 * Hands-on lessons are NOT built yet. This chapter is a clear "what is next"
 * list so learners know the deploy path after kind. Companion spirit:
 * small multi-service stack, cloud VM, host .env, tunnel access, GHCR
 * push/pull, version tags, rollback. See docs/CHAPTER7_PLAN.md.
 */

export const CHAPTER_7: Lesson[] = [
  {
    id: "chapter-7-roadmap",
    chapter: 7,
    chapterTitle: "Ship beyond your laptop",
    title: "Coming soon: the deploy path after kind",
    minutes: 8,
    concept: [
      "Chapters 0 through 6 stayed on your machine. That was deliberate: no cloud account, no credit card, no registry credentials. You still learned the hard ideas.",
      "What you have not practiced yet is the missing middle many real jobs care about: getting a versioned image onto another computer and running it there, with config that is not in git, and access that is not \"open port 3000 to the world.\"",
      "This chapter is a ROADMAP, not a full hands-on build yet. Read it as the syllabus for what comes after Container Quest proper. A companion lab (small Compose app, one VM, GHCR) is the intended shape when the lessons are written.",
      "Important: you do not need this chapter to \"finish\" Container Quest. Chapters 0 to 6 are the complete local course. Chapter 7 is optional career/portfolio track.",
      "TWO SHAPES REMINDER:\n• One VM + Compose: legitimate production for many systems.\n• Multi-node Kubernetes: when you need several machines and cluster-native heal/scale/rollout. Kind already taught the ideas; cloud K8s is more of the same with more surface area.",
      "PLANNED LESSONS (not built yet; order is intentional):",
      "7.1 YOUR LAPTOP IS NOT PRODUCTION\nSpin or reuse a small cloud VM. SSH in (IAP or key-based SSH). Install Docker Engine only. Goal: prove a second machine exists and you can reach a shell.",
      "7.2 ONE VM IS A REAL PRODUCTION SHAPE\nDeploy a SMALL multi-service stack (for example web + api + worker), not the full eight-service fleet. Compose up on the VM once, including a first build if needed. Curl health on the VM itself. Goal: Compose works off your laptop.",
      "7.3 CONFIG LIVES ON THE HOST, NOT IN GIT\nCreate a host .env from an example file. Change safe config (greeting, delay, mode). Recreate containers. See the change. Never commit real secrets. Goal: env discipline for real environments.",
      "7.4 REACH IT WITHOUT OPENING THE WORLD\nSSH or IAP tunnel: map laptop port 3000 to the VM's localhost:3000. Use the app from your browser. Goal: private access pattern before public HTTPS.",
      "7.5 HOW THE IMAGE LEAVES YOUR LAPTOP\nOn the laptop: build images, tag them (v1), docker login to a registry (GHCR is a fine start), docker push. Goal: registry write path. Kind load was a classroom shortcut; this is the real analog.",
      "7.6 THE VM CONSUMES A TAG\nOn the VM: login if packages are private, pull images, compose up with a pull-only file (no build). UI or health shows the version. Goal: best-practice deploy unit is the image tag.",
      "7.7 VERSION, DEPLOY, ROLLBACK\nPush v2 (small code or config stamp). Deploy v2 on the VM. Roll back by deploying v1 again without rebuilding on the server. Goal: ship and undo by retag.",
      "7.8 BUILD WHERE?\nCompare build-on-VM (slow or painful on a tiny machine) vs build-on-laptop-or-CI then pull. Optional note on CI building on git tags. Goal: judgment, not dogma.",
      "7.9 AFTER YOU CAN SHIP\nRoadmap beyond this track: public HTTPS and reverse proxy, CORS + token if other sites call your API, CI push on tag, then cloud Kubernetes only if you need it. Goal: know what not to learn yet.",
      "Companion stack intent (when built): lightweight services that build in minutes on a small VM (for example nginx static UI + Python API + worker). The full Container Quest fleet stays the local gym; Chapter 7 uses a smaller app so deploy stays the lesson.",
      "When hands-on Chapter 7 exists, each item above becomes a real lesson with commands and checks. Until then, this page is the map.",
    ],
    steps: [
      {
        instruction:
          "No cluster command required. Confirm you understand Chapter 7 is optional roadmap, and that Chapters 0 to 6 already completed the core course.",
        command: "echo 'Chapter 7 is roadmap only. Core course is Chapters 0-6. Deploy path: VM + env + tunnel + registry tags.'",
        commandParts: [
          {
            piece: "echo '...'",
            meaning: "No fleet change; this chapter is a reading map until lessons are built",
          },
        ],
        saw: "A one-line reminder printed. You are not failing the course by stopping here. When you want the hands-on path, follow the 7.1 to 7.9 list with a small Compose app and a cloud VM (or a companion lab in that spirit).",
        check: { kind: "manual", label: "I understand Chapter 7 is optional roadmap" },
      },
      {
        instruction:
          "Optional: write down which path you will take next (VM + registry, or deeper Kubernetes on kind/cloud). Naming it makes the choice real.",
        command:
          "echo 'My next path: (A) one VM + Compose + registry  OR  (B) deeper Kubernetes (ConfigMaps, Ingress, limits)'",
        commandParts: [
          {
            piece: "echo 'My next path: ...'",
            meaning: "Pick a fork; both are valid careers",
          },
        ],
        saw: "You named a direction. A is what Chapter 7 will build out. B is the Kubernetes list from the end of Chapter 6. Many people do A first for portfolio, then return to B.",
        check: { kind: "manual", label: "I picked a next direction (even if tentative)" },
      },
    ],
    recap: [
      "You read the optional Chapter 7 roadmap: VM, host env, tunnel, GHCR-style push/pull, version tags, rollback, and build-where judgment.",
      "You confirmed the core course ends at Chapter 6; Chapter 7 is the ship-beyond-laptop track, not required to finish Container Quest.",
    ],
    takeaway:
      "After kind, the hireable missing middle is versioned images on another machine with host config and careful access. Chapter 7 lists that path; the hands-on build comes later.",
  },
];
