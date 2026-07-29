import type { Lesson } from "./types.ts";

/**
 * Chapter 0 — Orientation.
 *
 * Before any hands-on work: what all these words mean and how they relate.
 * Beginners are usually handed six unfamiliar terms at once — Docker, image,
 * container, Compose, Kubernetes, pod — with no map showing which sits inside
 * which. This chapter draws the map first.
 */

export const CHAPTER_0: Lesson[] = [
  {
    id: "the-map",
    chapter: 0,
    chapterTitle: "Getting oriented",
    title: "The map: how all these words fit together",
    minutes: 6,
    concept: [
      "The hardest part of learning this isn't any single idea — it's that six unfamiliar words arrive at once and nobody says which contains which. Here is the map. You don't need to memorize it; you'll build the real understanding by doing. But it helps to know roughly where you're going.",
      "Start with the thing at the center: a CONTAINER is one running program, wrapped so it can't see the rest of your machine. That's the atom. Everything else is either how you make one, or how you manage a lot of them.",
      "An IMAGE is the template a container is made from — a frozen snapshot of files plus a startup command. Images sit on disk. Containers run. Same relationship as a recipe and a meal, or a class and an object.",
      "A REGISTRY is a shared place to store images, so a machine that has never seen your code can download and run it. Docker Hub is the public one; most companies run a private one. This is how an image gets from your laptop to a server.",
      "DOCKER is the tool that builds images and runs containers on one machine. When you type `docker`, you're talking to it. It handles a single computer and has no opinion about anything beyond that.",
      "DOCKER COMPOSE is a small step up: one file describing several containers that should run together, on one machine. This project uses it — eight containers, one file, one command. Compose is where most people stop, and it's genuinely enough for a lot of real work.",
      "KUBERNETES is what you reach for when one machine isn't enough, or when you need the system to repair itself without you. You stop saying \"start this container\" and start saying \"three copies of this should always exist.\" Kubernetes then makes that true, continuously — restarting things that die, moving work off machines that fail, and updating without downtime. A POD is its smallest unit: usually just one container, plus the bookkeeping Kubernetes needs.",
      "One sentence for the whole map: Docker builds and runs containers on one machine, Compose runs a group of them together, and Kubernetes keeps a group running across many machines even when things break.",
      "You'll do all three in this course, in that order — which is also the order they were invented, and the order in which each one's problems make the next one make sense.",
    ],
    steps: [
      {
        instruction:
          "Confirm Docker is installed and running. This prints the version of the tool you'll be using for the next few chapters.",
        command: "docker --version",
        saw: "A version number. That's the tool that builds images and runs containers on this machine. Everything in Chapters 1 through 4 goes through it.",
        check: { kind: "manual", label: "I saw a version number" },
      },
      {
        instruction:
          "Now confirm the Kubernetes tool is here too. You won't use it until Chapter 5, but it's worth knowing it's a completely separate program.",
        command: "kubectl version --client",
        saw: "A different tool, with its own version. Note that Docker and Kubernetes are not versions of each other and not competitors in the way people sometimes suggest — Kubernetes runs containers, and something has to have built them first. They sit at different layers.",
        check: { kind: "manual", label: "I saw the kubectl version" },
      },
    ],
    takeaway:
      "Docker builds and runs containers on one machine; Compose runs a group together; Kubernetes keeps a group running across many machines even when things break.",
  },

  {
    id: "the-system",
    chapter: 0,
    chapterTitle: "Getting oriented",
    title: "The system you're about to learn on",
    minutes: 7,
    concept: [
      "You're not going to learn this on a toy hello-world. There's a small but genuinely real system running on your Mac right now, and every lesson pokes at it.",
      "It's deliberately built the way real systems are: several separate programs, each doing one job, talking to each other over the network. That shape has a name — microservices — and it's why container tooling exists at all. One program on one machine never needed any of this.",
      "Here's the cast. FIVE of them are services written by this project, each in a different programming language on purpose:",
      "• Dashboard (TypeScript) — the web page you're reading right now. It watches everything else and draws the cards and graphs.\n• Worker (TypeScript) — does slow background jobs. When work piles up, it chews through the queue.\n• AI service (Python) — pretends to be a machine-learning service. Slow and memory-hungry, like the real thing.\n• Utility (Go) — asks the other services how they're doing and reports back.\n• Compute (C) — does raw number-crunching. It's the smallest and strangest of the five.",
      "THREE more are standard off-the-shelf software that nearly every real system has:",
      "• PostgreSQL — the database, where things that must survive get written.\n• Redis — a fast temporary store, used here as the job queue.\n• A tiny security helper, which you'll meet properly in Chapter 4.",
      "Why five different languages? Because it proves the central point of this entire course: none of this tooling cares what your program is written in. Docker packages a C program and a Python program using the same commands. Kubernetes runs them with the same configuration. The languages are as different as software gets, and the infrastructure treats them identically.",
      "That's genuinely useful to you beyond this project. Whatever you end up working on — someone else's Java service, a Rust tool, a Node API — the container skills transfer unchanged.",
    ],
    steps: [
      {
        instruction: "See all eight running, with how long each has been up.",
        command: "docker compose -f ~/Documents/containerquest/infra/compose/docker-compose.yml ps",
        saw: "Eight rows. Note the STATUS column — several say \"healthy\", which means something is actively checking them and getting a good answer. That checking is a whole lesson in Chapter 4.",
        check: { kind: "manual", label: "I saw the eight services" },
      },
      {
        instruction:
          "Ask the Go service to report on its neighbors. It calls the Python and C services and collects their answers.",
        command: "curl -s localhost:8080/aggregate",
        saw: "One request from you turned into several requests between services. That's the shape of a real system — and it's why you need tooling to see inside it, because a single request now touches multiple programs and any one of them can be the problem.",
        check: { kind: "requests", service: "util", delta: 1 },
      },
      {
        instruction:
          "Now switch to the Dashboard tab at the top of this page and look at the cards, then come back.",
        saw: "Those cards are the same information you just fetched by hand, refreshed continuously. For now most of the numbers won't mean much — that's fine and expected. Each lesson explains one more of them.",
        check: { kind: "manual", label: "I looked at the Dashboard" },
      },
    ],
    takeaway:
      "This project is eight containers in five languages, and the tooling treats all of them identically — which is exactly why container skills transfer to any codebase.",
  },

  {
    id: "toolkit",
    chapter: 0,
    chapterTitle: "Getting oriented",
    title: "The five commands you'll actually use",
    minutes: 8,
    concept: [
      "Docker has dozens of commands. In practice, people use about five of them constantly and look the rest up when needed. Learn these now and you'll be able to follow along comfortably for the rest of the course.",
      "1. `docker ps` — what's running. Your first move, always.\n2. `docker logs` — what a program printed. Your first move when something is broken.\n3. `docker exec` — run a command inside a running container. Your way in when logs aren't enough.\n4. `docker inspect` — every detail about a container, in exhaustive JSON.\n5. `docker stats` — live CPU and memory, like Activity Monitor for containers.",
      "That's genuinely most of it. The practical rhythm when something misbehaves is: `ps` to see if it's even running, `logs` to see what it said before it broke, then `exec` to go in and look around.",
      "Try each one now, on a system that isn't broken, so the output is familiar later when something is.",
    ],
    steps: [
      {
        instruction:
          "Read what the Python service has printed recently. Every line a program writes goes here.",
        command: "docker logs --tail 15 container-quest-ai-1",
        saw: "Its recent output. When a container refuses to start, this is where the reason is — almost always. Reaching for logs first will save you more time than any other habit in this course.",
        check: { kind: "manual", label: "I saw some log lines" },
      },
      {
        instruction:
          "Step inside a running container and look at its filesystem. You are now running a command in a different computer's world.",
        command: "docker exec container-quest-worker-1 ls /app",
        saw: "The files that make up that service. You just ran a command inside a running container — the same trick you'd use in production to check whether a config file really is where you think it is.",
        check: { kind: "manual", label: "I saw a file listing" },
      },
      {
        instruction: "Watch live resource use. Press Ctrl+C to stop it.",
        command: "docker stats --no-stream",
        saw: "CPU and memory for every container. Notice how little most of them use — a few megabytes each. That's the practical argument for containers over virtual machines: you can run dozens on a laptop.",
        check: { kind: "manual", label: "I saw the resource table" },
      },
      {
        instruction:
          "Ask for one specific detail rather than the whole JSON dump. This prints just the restart count.",
        command:
          "docker inspect container-quest-ai-1 --format 'restarts={{.RestartCount}} status={{.State.Status}}'",
        saw: "Two values pulled out of a very large JSON document. `inspect` on its own prints hundreds of lines; the --format flag is how you get the one field you want. Remember restart count — it becomes important in Chapter 4.",
        check: { kind: "manual", label: "I saw restarts and status" },
      },
    ],
    takeaway:
      "ps, logs, exec, inspect, stats. When something breaks: is it running, what did it say, then go inside and look.",
  },
];
