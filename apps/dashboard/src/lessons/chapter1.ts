import type { Lesson } from "./types.ts";
import { experienceCommand } from "@/lib/dashboardExperiments";

/**
 * Chapter 1 - What a container actually is.
 *
 * Chapter 0 already ran images, named image vs container, and kept a service
 * up. This chapter goes deeper against the live multi-service fleet: process
 * identity (pid 1 vs host pid), image vs container with project images, and
 * restart vs replace.
 *
 * Every command in here has been run as written. If one of them fails for you,
 * that is a bug in the lesson, not in you. The fleet should be up (`make up`).
 */

export const CHAPTER_1: Lesson[] = [
  {
    id: "what-problem",
    chapter: 1,
    chapterTitle: "What a container actually is",
    title: "From demo containers to a real fleet",
    minutes: 4,
    concept: [
      "In Getting Started you already did the important first loop: pull or build an image, run a container, see that the instance is not the same thing as the package, keep one service up with -d and ports, then stop it.",
      "You also met the reason containers exist: a program needs a whole world around it (language, libraries, files, settings), and shipping that world beats a fragile README.",
      "This chapter does not re-teach that from zero. It uses the eight containers of this project (if they are not up, run `make up` from the project folder) to show what \"a process with a private view\" looks like when you can poke real services.",
      "You will list the fleet, talk to a C service, then catch the same process claiming to be pid 1 inside while your Mac sees a normal host pid. That is the deepest version of \"not a tiny computer.\"",
    ],
    steps: [
      {
        instruction: "List everything currently running in a container for this project.",
        command: "docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'",
        commandParts: [
          { piece: "docker ps", meaning: "List running containers" },
          { piece: "--format 'table ...'", meaning: "Pretty columns: name, image, status" },
        ],
        saw: "You should see the quest fleet (dashboard, worker, ai, util, compute, postgres, redis, and friends). Each row is a separate isolated program. If the list is empty, run `make up` first.",
        check: { kind: "manual", label: "I ran it and saw the fleet" },
      },
      {
        instruction:
          "Talk to the C compute service. It answers questions about itself over HTTP.",
        dashboard: {
          view: "overview",
          focus: "compute",
          label: "Open Compute on Overview",
        },
        command: "curl -s localhost:9000/meta",
        commandParts: [
          { piece: "curl -s", meaning: "HTTP request; -s = silent" },
          { piece: "localhost:9000/meta", meaning: "Compute service on host port 9000, identity endpoint" },
        ],
        saw: "A blob of JSON came back. Same pattern as curling nginx on 8089 in Getting Started, but this process is part of the learning platform. Switch to the Dashboard tab: the Compute card's request count should have ticked up.",
        check: { kind: "requests", service: "compute", delta: 1 },
      },
    ],
    takeaway:
      "Same image/container ideas as Getting Started, now applied to a multi-service fleet you will use for the rest of the course.",
  },

  {
    id: "just-a-process",
    chapter: 1,
    chapterTitle: "What a container actually is",
    title: "It's a program, not a tiny computer",
    minutes: 7,
    concept: [
      "You already heard that a container is closer to a process than a VM. Here is the proof you can feel in your hands.",
      "A virtual machine is a fake computer. It boots an entire guest operating system that thinks it is talking to real hardware. That is why it takes a long time to start and costs a lot of memory.",
      "A container has none of that boot. It is an ordinary program running on the host kernel: the same kind of thing as your editor. The operating system has been told to limit what that program can see: its filesystem root, its process list, its network view.",
      "That restricted view is the whole trick. The program is told: this folder is the entire filesystem, these are the only other programs that exist, this is your network. It believes all of it, because it has no way to check.",
      "You can catch the lie in the act. You are about to look at one single program from two different angles and get two different answers.",
    ],
    steps: [
      {
        instruction: "Ask the Python service who it thinks it is.",
        command: "curl -s localhost:8000/meta",
        commandParts: [
          { piece: "curl -s localhost:8000/meta", meaning: "AI service on host port 8000, same /meta idea" },
        ],
        saw: "Find \"pid\":1 in the output. Every program on Linux gets a number, and #1 is special: it's the first process, the one that starts when a machine boots and launches everything else. This service believes it is that program. It thinks it booted the computer.",
        check: { kind: "requests", service: "ai", delta: 1 },
      },
      {
        instruction:
          "Now look at that exact same program from outside, from your Mac's point of view.",
        command: "docker top container-quest-ai-1",
        commandParts: [
          { piece: "docker top", meaning: "Show the real host process(es) for this container" },
          { piece: "container-quest-ai-1", meaning: "Container name" },
        ],
        saw: "A number like 148018 instead of 1. This is the same running program (one process, one place in memory) and it has two completely different identities depending on where you stand. Neither number is wrong. Inside its restricted view it genuinely is #1. From your machine it's just another process among hundreds. That gap is the entire trick.",
        check: { kind: "manual", label: "I saw a big number, not 1" },
      },
    ],
    takeaway:
      "A container is a normal process that's been given a restricted view of the system, which is why it starts in milliseconds instead of half a minute.",
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
        commandParts: [
          { piece: "docker images", meaning: "List images on disk" },
          { piece: "--filter reference='quest/*'", meaning: "Only this project's images" },
          { piece: "--format 'table ...'", meaning: "Show repository and size columns" },
        ],
        saw: "Look at the sizes. The dashboard is about 308 MB. The C service is 187 kB, roughly 1,600 times smaller. Same project, same job of answering web requests, wildly different sizes. Chapter 2 is entirely about why, and it is one of the most practically useful things in this whole course.",
        check: { kind: "manual", label: "I saw five images and their sizes" },
      },
      {
        instruction:
          "Make a brand new container from the Python template, ask its name, and throw it away, all in one command.",
        command: "docker run --rm --entrypoint hostname quest/ai:dev",
        commandParts: [
          { piece: "docker run --rm", meaning: "Throwaway container" },
          { piece: "--entrypoint hostname", meaning: "Replace the image's normal start command with hostname" },
          { piece: "quest/ai:dev", meaning: "Image template (same as the long-running AI service)" },
        ],
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
      "This catches people out because restarting and replacing look identical from the outside (the service disappears for a moment and comes back) but one keeps your files and the other doesn't.",
      "You're about to prove both halves yourself, which is considerably more convincing than being told.",
    ],
    steps: [
      {
        instruction: "Write a file inside the running AI service.",
        command: experienceCommand("restart-vs-replace", "setup"),
        commandParts: [
          { piece: "docker exec", meaning: "Run a command in a running container" },
          { piece: "sh -c '...'", meaning: "Shell so we can write a file and print it in one go" },
          { piece: "> /tmp/note.txt", meaning: "Write inside the container's scratch filesystem" },
        ],
        saw: "It printed the text back, so that file genuinely exists inside that container right now.",
        check: { kind: "manual", label: "It printed: I was here" },
      },
      {
        instruction:
          "Open the identity experiment, then restart the service and check whether your file survived. This prints a plain answer either way.",
        dashboard: {
          view: "experiment",
          experiment: "restart-vs-replace",
          label: "Open identity experiment",
        },
        command: experienceCommand("restart-vs-replace", "restart"),
        commandParts: [
          { piece: "docker restart ...", meaning: "Stop and start the same container (keeps its filesystem)" },
          { piece: "sleep 4", meaning: "Wait for the service to come back" },
          { piece: "docker exec ... cat /tmp/note.txt", meaning: "Check if the file survived" },
          { piece: "&& echo STILL THERE || echo GONE", meaning: "Print a clear yes/no" },
        ],
        saw: "STILL THERE. Restarting stopped and started the program, but the container around it is the same one as before, scratch files and all. On the Dashboard the AI card's uptime just reset to zero, while its container ID stayed exactly the same. Remember that pairing.",
        check: { kind: "restarted", service: "ai" },
      },
      {
        instruction:
          "Now destroy the container completely and build a replacement from the template. This one command moves into the project folder first, so it works from anywhere.",
        dashboard: {
          view: "experiment",
          experiment: "restart-vs-replace",
          label: "Return to identity experiment",
        },
        command: experienceCommand("restart-vs-replace", "replace"),
        commandParts: [
          { piece: "cd ~/Documents/containerquest", meaning: "Work from the project folder" },
          { piece: "docker compose ... up -d", meaning: "Start/update services in the background" },
          { piece: "--force-recreate ai", meaning: "Destroy and recreate only the ai container from its image" },
          { piece: "cat /tmp/note.txt ... GONE?", meaning: "File is gone: this is a new container, not a restart" },
        ],
        saw: "GONE, and that is the correct answer. The old container was destroyed. This is a different one, built fresh from a template that never contained your note. Check the Dashboard: this time the container ID changed too, which is exactly how you tell a replacement from a restart.",
        check: { kind: "replaced", service: "ai" },
      },
    ],
    recap: [
      "You wrote a file inside a running container, restarted it, and found the file still there.",
      "You then replaced the container and found the file gone, proving restart and replace are different operations that look identical from outside.",
      "You know which signal tells them apart: a restart keeps the container id, a replacement cannot.",
    ],
    takeaway:
      "Restarting keeps a container's files; replacing it does not. Anything you actually need to keep (a database, uploads) has to live outside the container.",
    source: {
      path: "infra/compose/docker-compose.yml",
      note: "The database in this project has one extra line telling it to store its data outside its container, for exactly this reason.",
    },
  },
];
