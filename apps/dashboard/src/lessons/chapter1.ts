import type { Lesson } from "./types";

/**
 * Chapter 1 — What a container actually is.
 *
 * Written for someone who has never used Docker. No term is used before it is
 * defined, and every claim is something you verify yourself in a terminal
 * rather than take on faith.
 *
 * Every command in here has been run as written. If one of them fails for you,
 * that is a bug in the lesson, not in you.
 */

export const CHAPTER_1: Lesson[] = [
  {
    id: "what-problem",
    chapter: 1,
    chapterTitle: "What a container actually is",
    title: "The problem this solves",
    minutes: 4,
    concept: [
      "Say you write a program. It works perfectly on your laptop. You send it to a colleague and it immediately breaks.",
      "Why? Your laptop has Python 3.13; theirs has 3.9. You installed a library six months ago and forgot about it. You have a setting in your environment you don't remember setting. Your program doesn't just need your code — it needs the entire world around your code, and most of that world is invisible to you.",
      "For decades the fix was a README: \"install these fourteen things, in this order, and good luck.\" It never worked reliably.",
      "A container is that entire world — your code, the language it runs on, the libraries, the settings — packaged into one unit that behaves the same on any machine. It is not a copy of your laptop. It's only the parts your program actually touches.",
      "Eight of them are running on your Mac right now. Let's look at them.",
    ],
    steps: [
      {
        instruction: "List everything currently running in a container.",
        command: "docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'",
        saw: "Eight rows. Each one is a separate, isolated program with its own files and its own idea of what machine it's on. Five are the services on this dashboard; the rest are a database, a cache, and a small security helper you'll meet later.",
        check: { kind: "manual", label: "I ran it and saw the list" },
      },
      {
        instruction:
          "Now talk to one of them. This one is written in C and does almost nothing except answer questions about itself.",
        command: "curl -s localhost:9000/meta",
        saw: "A blob of JSON came back. You just made a network request to a program running inside a container on your own machine. Switch to the Dashboard tab and look at the Compute card — its request count went up by one. That was you.",
        check: { kind: "requests", service: "compute", delta: 1 },
      },
    ],
    takeaway:
      "A container packages a program together with everything it needs to run, so it behaves the same everywhere.",
  },

  {
    id: "just-a-process",
    chapter: 1,
    chapterTitle: "What a container actually is",
    title: "It's a program, not a tiny computer",
    minutes: 7,
    concept: [
      "Almost everyone's first mental model is \"a container is a really lightweight virtual machine.\" This is the most useful thing to unlearn, because it isn't one.",
      "A virtual machine is a fake computer. It boots an entire operating system that thinks it's talking to real hardware. That's why it takes thirty seconds to start and costs you a gigabyte of memory.",
      "A container has none of that. It's an ordinary program running directly on your machine — the same kind of thing as your text editor. The only difference is that the operating system has been told to lie to it about what it can see.",
      "That lie is the whole technology. The program is told: this folder is the entire filesystem, these are the only other programs that exist, this is your network. It believes all of it, because it has no way to check.",
      "You can catch the lie in the act. You're about to look at one single program from two different angles and get two different answers.",
    ],
    steps: [
      {
        instruction: "Ask the Python service who it thinks it is.",
        command: "curl -s localhost:8000/meta",
        saw: "Find \"pid\":1 in the output. Every program on Linux gets a number, and #1 is special — it's the first process, the one that starts when a machine boots and launches everything else. This service believes it is that program. It thinks it booted the computer.",
        check: { kind: "requests", service: "ai", delta: 1 },
      },
      {
        instruction:
          "Now look at that exact same program from outside, from your Mac's point of view.",
        command: "docker top container-quest-ai-1",
        saw: "A number like 148018 instead of 1. This is the same running program — one process, one place in memory — and it has two completely different identities depending on where you stand. Neither number is wrong. Inside its restricted view it genuinely is #1. From your machine it's just another process among hundreds. That gap is the entire trick.",
        check: { kind: "manual", label: "I saw a big number, not 1" },
      },
    ],
    takeaway:
      "A container is a normal process that's been given a restricted view of the system — which is why it starts in milliseconds instead of half a minute.",
  },

  {
    id: "image-vs-container",
    chapter: 1,
    chapterTitle: "What a container actually is",
    title: "Images and containers are different things",
    minutes: 6,
    concept: [
      "These two words get mixed up constantly, including by people who know better. They are not the same, and the difference matters the moment something goes wrong.",
      "An image is a frozen template. It's a complete set of files plus a note saying which command to run. It sits on disk doing nothing at all. Think of a recipe.",
      "A container is one running instance made from that template. Think of the meal you cooked from the recipe.",
      "One image, many containers. They all start from identical files, but each gets its own identity, its own memory, its own scratch space. Change one and the others don't notice.",
      "The fastest way to feel the difference is to conjure a brand new container out of an image you're already running.",
    ],
    steps: [
      {
        instruction: "List the five templates built for this project.",
        command:
          "docker images --filter reference='quest/*' --format 'table {{.Repository}}\\t{{.Size}}'",
        saw: "Look at the sizes. The dashboard is about 308 MB. The C service is 187 kB — roughly 1,600 times smaller. Same project, same job of answering web requests, wildly different sizes. Chapter 2 is entirely about why, and it is one of the most practically useful things in this whole course.",
        check: { kind: "manual", label: "I saw five images and their sizes" },
      },
      {
        instruction:
          "Make a brand new container from the Python template, ask its name, and throw it away — all in one command.",
        command: "docker run --rm --entrypoint hostname quest/ai:dev",
        saw: "A short random string you've never seen. That was a completely fresh container, born from the same template as the AI service that's been running this whole time. It lived for about half a second. The --rm flag deleted it the moment it finished, and the original service never noticed it existed.",
        check: { kind: "manual", label: "I saw a new random name" },
      },
    ],
    takeaway:
      "An image is the template sitting on disk; a container is one running copy of it. You can make as many containers as you like from a single image.",
  },

  {
    id: "disposable",
    chapter: 1,
    chapterTitle: "What a container actually is",
    title: "What survives, and what doesn't",
    minutes: 8,
    concept: [
      "Containers get described as \"disposable.\" That's true but vague, and the vagueness is exactly where people lose data they cared about.",
      "The precise rule: a container gets a private scratch filesystem when it is created. Anything written there lives as long as that specific container. Restarting the program inside does not touch it. Destroying the container erases it permanently.",
      "This catches people out because restarting and replacing look identical from the outside — the service disappears for a moment and comes back — but one keeps your files and the other doesn't.",
      "You're about to prove both halves yourself, which is considerably more convincing than being told.",
    ],
    steps: [
      {
        instruction: "Write a file inside the running AI service.",
        command:
          "docker exec container-quest-ai-1 sh -c 'echo \"I was here\" > /tmp/note.txt && cat /tmp/note.txt'",
        saw: "It printed the text back, so that file genuinely exists inside that container right now.",
        check: { kind: "manual", label: "It printed: I was here" },
      },
      {
        instruction:
          "Restart the service and check whether your file survived. This prints a plain answer either way.",
        command:
          "docker restart container-quest-ai-1 && sleep 4 && docker exec container-quest-ai-1 cat /tmp/note.txt 2>/dev/null && echo \"--> STILL THERE\" || echo \"--> GONE\"",
        saw: "STILL THERE. Restarting stopped and started the program, but the container around it is the same one as before, scratch files and all. On the Dashboard the AI card's uptime just reset to zero — while its container ID stayed exactly the same. Remember that pairing.",
        check: { kind: "restarted", service: "ai" },
      },
      {
        instruction:
          "Now destroy the container completely and build a replacement from the template. This one command moves into the project folder first, so it works from anywhere.",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --force-recreate ai && sleep 6 && docker exec container-quest-ai-1 cat /tmp/note.txt 2>/dev/null && echo \"--> STILL THERE\" || echo \"--> GONE\"",
        saw: "GONE — and that is the correct answer. The old container was destroyed. This is a different one, built fresh from a template that never contained your note. Check the Dashboard: this time the container ID changed too, which is exactly how you tell a replacement from a restart.",
        check: { kind: "replaced", service: "ai" },
      },
    ],
    takeaway:
      "Restarting keeps a container's files; replacing it does not. Anything you actually need to keep — a database, uploads — has to live outside the container.",
    source: {
      path: "infra/compose/docker-compose.yml",
      note: "The database in this project has one extra line telling it to store its data outside its container, for exactly this reason.",
    },
  },
];
