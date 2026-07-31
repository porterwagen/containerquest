import type { Lesson } from "./types.ts";
import { experienceCommand } from "@/lib/dashboardExperiments";

/**
 * Chapter 0 - Getting started.
 *
 * The longest chapter, on purpose: it takes someone from never having typed
 * `docker` to having built and debugged their own image. It is split into four
 * `section` arcs so the sidebar reads as four short chapters rather than one
 * wall. Deep process/VM identity continues in Chapter 1 against the live fleet.
 *
 * The fleet does not have to be running until `the-system`. Everything before
 * that needs only Docker.
 *
 * Recording note: `where-the-space-went` depends on `adding-a-dependency`
 * having just built quest-hello:2.0 earlier in the same pass, so this chapter
 * records as a whole (`--only ch0`), not step by step.
 */

export const CHAPTER_0: Lesson[] = [
  {
    id: "why-containers",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 1: what a container is",
    title: "Why any of this exists",
    minutes: 5,
    concept: [
      "Before any tool, the problem. Containers were not invented because someone wanted a new thing to learn. They were invented because of a specific, boring, expensive kind of pain that shows up everywhere software is written.",
      "Picture a few situations you have probably already lived through.",
      "A NEW PERSON JOINS THE TEAM. Their first day is supposed to be writing code. Instead it is three days of installing things: the right language version, a database, some tool nobody remembers needing. The setup guide is nine months out of date. Two steps fail for reasons specific to their laptop.",
      "TWO PROJECTS DISAGREE. One needs Node 18. The other needs Node 24. They are both on your machine. You now maintain a version manager and think about it every time you switch folders.",
      "IT WORKS HERE BUT NOT THERE. The tests pass on your machine and fail in CI. Nobody can explain why, so someone spends an afternoon adding print statements to a build server.",
      "THE HANDOFF. You finish something and give it to whoever runs the servers. They ask what it needs. You write a list. The list is wrong, because you have forgotten the four things you installed months ago and now take for granted.",
      "Every one of these is the same problem wearing different clothes: a program needs a specific world around it to run, that world is mostly invisible to the person who built it, and describing it in prose does not work.",
      "A container is that world, captured. Not described in a README, not reproduced by hand, but packaged into one thing that behaves the same wherever it runs. That is genuinely the whole idea. Everything else in this course is detail.",
      "The next lessons assume you have never run a Docker command. You will run someone else's container, pause to understand what that was, keep one running so you can look at it, then build one of your own. If you already know Docker and only want this project's fleet, skip ahead to \"The system you're about to learn on\".",
    ],
    steps: [
      {
        instruction:
          "Think of one time you hit a version of the problem above. It genuinely helps to have a real memory attached before the abstractions arrive.",
        check: { kind: "manual", label: "Got one" },
      },
      {
        instruction:
          "Install Docker if you have not already. On a Mac, OrbStack is the lighter option and what this project was built against; Docker Desktop works identically for everything in this course. You need this before the next lesson.",
        check: { kind: "manual", label: "Docker is installed" },
      },
    ],
    recap: [
      "You put a name to the problem: a program needs a whole invisible world around it, and prose does not transfer that world reliably.",
      "You have Docker installed, which is the only tool you need until Chapter 5.",
    ],
    takeaway:
      "A program needs an invisible world around it to run. A container captures that world so it travels with the program instead of being rebuilt by hand.",
  },

  {
    id: "the-map",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 1: what a container is",
    title: "The map: how all these words fit together",
    minutes: 5,
    concept: [
      "A few words get used together so often that they blur. You only need a light map now. You will earn each piece by using it.",
      "A CONTAINER is one running instance of a packaged program: closer to a process than to a full computer. An IMAGE is the template that instance is made from (files + how to start). Images sit on disk. Containers run (or sit stopped after they exit).",
      "Think recipe and meal, or class and object. One image, many containers.",
      "A REGISTRY (like Docker Hub) stores images so other machines can download them. DOCKER is the tool on your machine that builds images and runs containers.",
      "Later in this course you will meet DOCKER COMPOSE (several containers defined together on one machine) and, much later, KUBERNETES (keeping many containers healthy across machines). You do not need those tools yet. For the next few lessons, Docker alone is enough.",
      "Next: actually run one container so the words stop being abstract.",
    ],
    steps: [
      {
        instruction:
          "Confirm Docker is installed and running. This prints the version of the tool you will use for the next few chapters.",
        command: "docker --version",
        commandParts: [
          { piece: "docker --version", meaning: "Print the Docker CLI version (proves Docker is installed and on your PATH)" },
        ],
        ifItFails:
          "\"Cannot connect to the Docker daemon\" means the CLI is installed but nothing is running behind it. Docker is two pieces: a command you type and a background engine that does the work. Open OrbStack or Docker Desktop, wait for it to finish starting, and run this again.",
        saw: "A version number. That is the tool that builds images and runs containers on this machine. If this failed, Docker is either not installed or not running: open OrbStack or Docker Desktop and try again.",
        check: { kind: "manual", label: "I saw a version number" },
      },
      {
        instruction:
          "You do not need Kubernetes for Getting Started, and you will not need it until Chapter 5. When you get there, its first lesson checks for the two extra tools (`kubectl` and `kind`) and builds the cluster with one command, so there is nothing to install now. For now, just confirm you are ready to use Docker.",
        check: { kind: "manual", label: "Ready to use Docker only" },
      },
    ],
    recap: [
      "You have the vocabulary you need for the next few lessons: image, container, registry, Docker. Four words, not six.",
      "You confirmed Docker answers on your machine, which is the only prerequisite for everything in Part 1 and Part 2.",
    ],
    takeaway:
      "Image = template on disk. Container = one instance. Docker runs those on your machine. Compose and Kubernetes come later.",
  },

  {
    id: "first-container",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 1: what a container is",
    title: "Run your first container",
    minutes: 8,
    concept: [
      "The fastest way to feel what Docker is for is to use someone else's package before you build your own. You are about to run Python 3.13 without installing Python on your Mac.",
      "That is not a Python you set up, and not a version manager. You type one command, a working Python exists for a moment, and when it finishes you still do not have a system-wide Python install from this exercise.",
      "Here is the movie in slow motion. Docker looks for an IMAGE locally. If it is missing, it downloads it from a registry (Docker Hub). Then it starts a CONTAINER from that image, runs your command inside, and the container exits.",
      "Two flags matter in the first commands:",
      "• `--rm` deletes the container the moment it finishes, so you do not collect stopped leftovers.\n• Words after the image name are the command to run INSIDE the container, instead of whatever the image would start by default.",
      "You will still feel a gap after this lesson (\"I ran something, but what was it?\"). That is expected. The next two lessons answer it before you write a Dockerfile.",
    ],
    steps: [
      {
        instruction:
          "Run Python without installing Python. The first time takes a moment because the image has to download. Read the breakdown under the command first.",
        command: 'docker run --rm python:3.13-alpine python -c "print(2**100)"',
        commandParts: [
          { piece: "docker run", meaning: "Start a container from an image" },
          {
            piece: "--rm",
            meaning: "Delete the container when it exits (no leftover clutter)",
          },
          {
            piece: "python:3.13-alpine",
            meaning: "Which image: Python 3.13 on a tiny Linux (Alpine)",
          },
          {
            piece: 'python -c "print(2**100)"',
            meaning: "What to run inside the container (instead of the image default)",
          },
        ],
        saw: "First the download, layer by layer, then the answer: 1267650600228229401496703205376. A working Python 3.13 existed for about a second and computed that. Nothing permanent was installed on your Mac's system Python.",
        check: { kind: "manual", label: "I saw the number" },
      },
      {
        instruction:
          "Same image, different command inside: ask what operating system the container thinks it is running on.",
        command: "docker run --rm python:3.13-alpine cat /etc/os-release",
        commandParts: [
          { piece: "docker run --rm", meaning: "Same as before: start a throwaway container" },
          { piece: "python:3.13-alpine", meaning: "Same image (already downloaded, so this is fast)" },
          { piece: "cat /etc/os-release", meaning: "Read the OS identity file inside the container's filesystem" },
        ],
        saw: "Alpine Linux. Not macOS. Inside the container there is a private view of a small Linux system, with its own files. That is the \"world\" from the first lesson, packaged. The host (your Mac) is still underneath; Docker arranged this view.",
        check: { kind: "manual", label: "I saw Alpine Linux" },
      },
      {
        instruction:
          "Those containers used --rm, so they vanished when they finished. Check whether the IMAGE stayed.",
        predict: {
          question:
            "--rm deleted both containers you just ran. What happened to the Python image they were made from?",
          options: ["It was deleted too", "It is still on disk"],
          answer: 1,
          because:
            "The image and the container are separate things, and --rm only ever talks about the container. This is the distinction the whole next lesson is about, and it is the one people most often have backwards.",
        },
        command: "docker images python:3.13-alpine",
        commandParts: [
          { piece: "docker images", meaning: "List images stored on this machine (templates, not running containers)" },
          { piece: "python:3.13-alpine", meaning: "Filter to this image name:tag only" },
        ],
        saw: "The image is still there, tens of MB. CONTAINERS were deleted by --rm. The IMAGE (the template) stayed. One template on disk, as many short-lived containers from it as you like.",
        check: { kind: "manual", label: "The image is still listed" },
      },
      {
        instruction:
          "Now run once WITHOUT --rm, and give the container a name so you can find it afterward. It will exit after printing, but Docker will keep a stopped record of it.",
        command:
          'docker rm -f quest-py-once >/dev/null 2>&1; docker run --name quest-py-once python:3.13-alpine python -c "print(\'finished, but the container record remains\')"',
        commandParts: [
          { piece: "docker rm -f quest-py-once", meaning: "Clean up any old container with this name" },
          { piece: "docker run --name quest-py-once", meaning: "Start a container with a name you chose (no --rm)" },
          { piece: "python:3.13-alpine python -c \"...\"", meaning: "Same image, a one-shot command inside" },
        ],
        saw: "You saw the print line, then your shell came back. The process inside is done. Because you did not pass --rm, the container object still exists in a stopped state.",
        check: { kind: "manual", label: "I saw the print line" },
      },
      {
        instruction:
          "List containers including stopped ones, filtered to that name.",
        command:
          "docker ps -a --filter name=quest-py-once --format 'table {{.Names}}\\t{{.Status}}\\t{{.Image}}'",
        commandParts: [
          { piece: "docker ps -a", meaning: "List containers, including stopped (-a = all)" },
          { piece: "--filter name=quest-py-once", meaning: "Only the one we named" },
          { piece: "--format 'table ...'", meaning: "Readable columns: name, status, image" },
        ],
        saw: "Status will look like Exited. That row is the container. The image column points at the template it came from. Image and container are not the same row of the same list.",
        check: { kind: "manual", label: "I saw Exited (or similar)" },
      },
      {
        instruction: "Delete that stopped container so the name is free later.",
        command: "docker rm quest-py-once",
        commandParts: [
          { piece: "docker rm quest-py-once", meaning: "Remove the stopped container by name" },
        ],
        saw: "Gone from docker ps -a. The python:3.13-alpine image is still on disk. Next lesson: name these pieces in plain English and fix the \"is it a tiny VM?\" confusion.",
        check: { kind: "manual", label: "I removed it" },
      },
    ],
    recap: [
      "You ran Python 3.13 without installing Python, by using an image someone else published.",
      "You ran a second command against the same image and saw Alpine Linux, which is the packaged world from lesson 1 made visible.",
      "You proved --rm deletes the container and leaves the image, then ran one without --rm and found the stopped container still listed.",
      "You removed that stopped container by name, so nothing is left over.",
    ],
    takeaway:
      "docker run starts a container from an image. --rm deletes the instance when it exits; without --rm you can still see a stopped container. The image can remain either way.",
  },

  {
    id: "what-you-just-ran",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 1: what a container is",
    title: "What you just ran",
    minutes: 5,
    concept: [
      "You ran Docker successfully. This lesson is only about what the nouns mean, before you write a Dockerfile.",
      "An IMAGE is a package on disk: files plus a default way to start. A CONTAINER is one instance created from that package. Instances can be running or stopped. Deleting an instance does not have to delete the package.",
      "A container is not a full virtual machine. A VM boots a guest operating system and pretends to be hardware. That is heavy. A container is much closer to an ordinary process on your machine that Docker has given a private view of files, process list, and network. It starts in a blink because nothing is \"booting a computer.\"",
      "When the Python container said Alpine Linux, that meant: inside its private filesystem view, the files look like Alpine. Your Mac is still the real host. Docker is the coordinator in between.",
      "You do not need namespaces, cgroups, or kernel details yet. If you can say the five sentences in the takeaway, you are ready to keep a container running and then build your own image.",
    ],
    steps: [
      {
        instruction:
          "One command that shows both halves at once: make an instance from the package, then list the package and the instance side by side.",
        command:
          'docker rm -f quest-py-once >/dev/null 2>&1; docker run --name quest-py-once python:3.13-alpine python -c "print(1+1)"; echo "--- the package (image) ---"; docker images python:3.13-alpine --format \'{{.Repository}}:{{.Tag}}  {{.Size}}\'; echo "--- the instance (container) ---"; docker ps -a --filter name=quest-py-once --format \'{{.Names}}  {{.Status}}\'; docker rm quest-py-once >/dev/null',
        commandParts: [
          { piece: "docker run --name quest-py-once ...", meaning: "Make one instance from the package and let it exit" },
          { piece: "docker images ...", meaning: "The package: one line, sitting on disk" },
          { piece: "docker ps -a --filter name=...", meaning: "The instance: exists, and is Exited" },
          { piece: "docker rm quest-py-once", meaning: "Tidy up, leaving the package untouched" },
        ],
        saw: "Two lists, two different things. The image line is a template with a size. The container line is an instance with a STATUS, and its status is Exited: the program finished but the object outlived it. That is why `docker ps` alone would not have shown it, and why `-a` exists.\n\nThe last command removed the instance. The image is still there, which is the whole point: one package, as many instances as you want, and deleting an instance costs you nothing.",
        check: { kind: "manual", label: "I saw both lists" },
      },
      {
        instruction:
          "Say it out loud in your own words: what is the difference between an image and a container, and why is a container not a small virtual machine? Nothing to type. This is the lesson.",
        check: { kind: "manual", label: "I can explain image vs container" },
      },
    ],
    recap: [
      "You saw the package and the instance listed separately, from one command, and watched the instance outlive the program that ran in it.",
      "You can now say why `docker ps` did not show it and `docker ps -a` did.",
      "You have a working answer to \"is this a small virtual machine?\", which is no: it is a process with a private view, and that is why it starts instantly.",
    ],
    takeaway:
      "Image = package on disk. Container = one instance (running or stopped). Closer to a process with a private view than to a VM. Deleting the instance need not delete the package. Next: keep one running so you can look at a live service.",
  },

  {
    id: "stays-up",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 2: running real services",
    title: "A container that stays up",
    minutes: 8,
    concept: [
      "So far every container exited as soon as its command finished. Real services stay up: a web server, an API, a worker. Same image idea, different lifespan.",
      "You will start a tiny public web server image (nginx) in the background, open it from your Mac, read its logs, then stop and remove it. Port 8089 is used on purpose so you do not fight with other local apps on 80 or 8080.",
      "This is still someone else's image. After this, you will package a program of your own with a Dockerfile. Same loop: image on disk, container instance, ports, logs, stop.",
    ],
    steps: [
      {
        instruction:
          "Start nginx in the background with a name and a published port. First time may download the image.",
        command:
          "docker rm -f quest-web >/dev/null 2>&1; docker run -d --name quest-web -p 8089:80 nginx:alpine",
        commandParts: [
          { piece: "docker run -d", meaning: "Start in the background (detached); your terminal stays free" },
          { piece: "--name quest-web", meaning: "Stable name for later commands" },
          { piece: "-p 8089:80", meaning: "Your Mac port 8089 maps to port 80 inside the container" },
          { piece: "nginx:alpine", meaning: "Official small nginx image" },
        ],
        predict: {
          question: "You are about to start a web server with -d. What does your terminal do?",
          options: ["Hangs, showing server logs", "Prints an id and returns immediately"],
          answer: 1,
          because:
            "-d means detached. Docker starts the process in the background and hands you back your prompt with the new container's id. Without -d the server would hold your terminal until you pressed Ctrl+C, which is why every long-running service you start uses it.",
        },
        ifItFails:
          "\"port is already allocated\" means something else on your Mac is already using 8089. Find it with `lsof -nP -iTCP:8089 -sTCP:LISTEN`, or just pick another number: `-p 8091:80` works exactly as well, and only the left-hand number has to be free.",
        saw: "Docker prints a long container id. The process keeps running. You did not get an interactive shell; that is correct for -d.",
        check: { kind: "running", container: "quest-web" },
      },
      {
        instruction: "Confirm it is running.",
        command: "docker ps --filter name=quest-web --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
        commandParts: [
          { piece: "docker ps", meaning: "List running containers only" },
          { piece: "--filter name=quest-web", meaning: "Just our demo" },
          { piece: "Ports", meaning: "Should show 0.0.0.0:8089->80/tcp or similar" },
        ],
        saw: "Status Up, and a port mapping. This is a live container instance, not only an image on disk.",
        check: { kind: "manual", label: "I see quest-web Up" },
      },
      {
        instruction: "Request the default nginx page through the published port.",
        command: "curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:8089/",
        commandParts: [
          { piece: "curl ... localhost:8089", meaning: "Hit your Mac's port; Docker forwards into the container" },
          { piece: "-w 'HTTP %{http_code}'", meaning: "Print the status code (expect 200)" },
        ],
        saw: "HTTP 200. Traffic path: browser/curl on the host -> published port -> process inside the container.",
        check: { kind: "manual", label: "I got HTTP 200" },
      },
      {
        instruction: "Read recent logs from the web server process.",
        command: "docker logs --tail 20 quest-web",
        commandParts: [
          { piece: "docker logs", meaning: "Stdout/stderr from the main process in the container" },
          { piece: "--tail 20", meaning: "Last twenty lines" },
          { piece: "quest-web", meaning: "Container name" },
        ],
        saw: "You should see an access line from your curl (or similar). When something breaks in production, logs are usually the first place to look.",
        check: { kind: "manual", label: "I saw log lines" },
      },
      {
        instruction: "Stop the container, then remove it. Confirm it is gone.",
        command:
          "docker stop quest-web && docker rm quest-web && docker ps -a --filter name=quest-web --format '{{.Names}}' | grep . && echo 'still listed' || echo 'quest-web is gone'",
        commandParts: [
          { piece: "docker stop quest-web", meaning: "Ask the process to shut down cleanly" },
          { piece: "docker rm quest-web", meaning: "Delete the stopped container instance" },
          { piece: "docker ps -a ... || echo gone", meaning: "Confirm the name no longer appears" },
        ],
        saw: "quest-web is gone. The nginx:alpine image may still be on your machine (docker images nginx:alpine). Next you will build an image for a tiny Node program you control.",
        check: { kind: "manual", label: "quest-web is gone" },
      },
    ],
    recap: [
      "You started a long-running service in the background with -d and got your terminal back.",
      "You published a port with -p and reached a program inside a container from your own browser or curl.",
      "You read that container's logs, which is the first thing to do when anything misbehaves.",
      "You stopped and removed it, and confirmed the name was free again.",
    ],
    takeaway:
      "A service-shaped container runs in the background (-d), publishes ports (-p), and is inspected with ps, curl, and logs. Stop and rm end the instance; the image can remain.",
  },

  {
    id: "publishing-ports",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 2: running real services",
    title: "Why -p exists, by leaving it out",
    minutes: 7,
    concept: [
      "You typed `-p 8089:80` last lesson and it worked. This lesson is about what happens without it, because that is the failure you will actually hit, and \"it is running but I cannot reach it\" is one of the most common hours lost in this whole subject.",
      "A container gets its own private network. A server inside it can be listening perfectly, answering every request it receives, and still be completely unreachable from your Mac. Nothing is broken. Nothing is in a bad state. There is simply no route in.",
      "PUBLISHING is opt-in. `-p` is you saying: connect this port on my machine to that port inside the container. Left side is yours, right side is the container's. They do not have to match, and it is worth seeing them differ at least once so the order stops being something you guess at.",
      "You are going to start a web server with no `-p`, fail to reach it, then prove from inside the container that it was serving the entire time. That last step is the one that makes this stick: the problem was never the server.",
    ],
    steps: [
      {
        instruction:
          "Start nginx again, but with no published port at all. Everything else is the same as last lesson.",
        command:
          "docker rm -f quest-closed >/dev/null 2>&1; docker run -d --name quest-closed nginx:alpine",
        commandParts: [
          { piece: "docker run -d --name quest-closed", meaning: "Background container, named so we can poke at it" },
          { piece: "(no -p flag)", meaning: "Deliberately omitted: nothing is connected to your Mac" },
          { piece: "nginx:alpine", meaning: "Same image as last lesson, already on disk" },
        ],
        saw: "A container id, exactly like last time. Docker gives no warning and no hint that anything is different. From here it looks identical to a working setup.",
        check: { kind: "running", container: "quest-closed" },
      },
      {
        instruction:
          "Now confirm two things at once: that it is genuinely running, and that you cannot reach it. Look at the PORTS column, which will be empty.",
        predict: {
          question: "The server is running. Will curl on port 8090 reach it?",
          options: ["Yes, it is running", "No, nothing connects them"],
          answer: 1,
          because:
            "Running and reachable are different properties. Without -p there is no route from your Mac into the container's private network, so the request has nowhere to land. The PORTS column being empty is the visible tell.",
        },
        command:
          "docker ps --filter name=quest-closed --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'; curl -s --max-time 3 http://localhost:8090/ >/dev/null 2>&1 && echo 'REACHABLE' || echo 'NOT REACHABLE from your Mac: nothing is published'",
        commandParts: [
          { piece: "docker ps --format '... {{.Ports}}'", meaning: "Status says Up; watch what the Ports column does and does not say" },
          { piece: "curl --max-time 3", meaning: "Try to reach it, giving up after 3 seconds" },
          { piece: "&& echo ... || echo ...", meaning: "Print which of the two happened, either way" },
        ],
        saw: "Status Up, and NOT REACHABLE. That combination is the entire lesson: a healthy running process you have no path to.\n\nLook closely at the Ports column. It says `80/tcp` and nothing else. Compare that with last lesson's, which read `0.0.0.0:8089->80/tcp`. The arrow is the whole difference. Without it, that 80 is a port the container is listening on internally, with no route from your machine to it.",
        check: { kind: "manual", label: "I saw: NOT REACHABLE" },
      },
      {
        instruction:
          "Prove the server was fine the whole time by asking it from inside its own network, where no publishing is needed.",
        command: "docker exec quest-closed wget -q -O - http://127.0.0.1:80/ 2>&1 | head -5",
        commandParts: [
          { piece: "docker exec quest-closed", meaning: "Run a command inside the running container" },
          { piece: "wget -q -O - http://127.0.0.1:80/", meaning: "Fetch the page from inside, where it IS reachable" },
          { piece: "head -5", meaning: "Just the first few lines of HTML" },
        ],
        saw: "HTML. The nginx welcome page. The server has been answering requests this whole time; there was simply no way in from outside. Nothing needed fixing in the container. The missing piece was on your side of the boundary.",
        check: { kind: "manual", label: "I saw HTML from inside the container" },
      },
      {
        instruction:
          "Now publish it, and use deliberately different numbers on each side so the order becomes obvious.",
        command:
          "docker rm -f quest-open >/dev/null 2>&1; docker run -d --name quest-open -p 8090:80 nginx:alpine && sleep 1 && curl -s -o /dev/null -w 'HTTP %{http_code} from localhost:8090\\n' http://localhost:8090/",
        commandParts: [
          { piece: "-p 8090:80", meaning: "LEFT is your Mac (8090), RIGHT is inside the container (80)" },
          { piece: "curl localhost:8090", meaning: "You connect to the left-hand number" },
        ],
        ifItFails:
          "If you get \"port is already allocated\", something else owns 8090 on your Mac. Any free number works: try `-p 8092:80` and curl 8092 instead. Only the left-hand number has to be free, because the right-hand one lives inside the container where nothing else is running.",
        saw: "HTTP 200. Same image, same server, same port 80 inside. The only thing that changed is that you asked Docker to connect one of your ports to it. Note you curled 8090 and nginx never knew: inside the container it is still serving on 80, exactly as before.",
        check: { kind: "running", container: "quest-open" },
      },
      {
        instruction: "Remove both containers.",
        command:
          "docker rm -f quest-closed quest-open >/dev/null 2>&1; docker ps -a --filter name=quest-closed --filter name=quest-open --format '{{.Names}}' | grep . || echo 'both removed'",
        commandParts: [
          { piece: "docker rm -f a b", meaning: "Force-remove both by name in one command" },
          { piece: "| grep . || echo", meaning: "Print nothing left, or confirm they are gone" },
        ],
        saw: "Both removed. You now have the two-number mental model, and more importantly you have seen the failure it prevents.",
        check: { kind: "manual", label: "Both are gone" },
      },
    ],
    recap: [
      "You ran a server with no published port and watched it be perfectly healthy and completely unreachable at the same time.",
      "You proved from inside the container that the server was serving all along, so you know that symptom does not mean the program is broken.",
      "You published with mismatched numbers and can now read `-p 8090:80` as \"my 8090 goes to its 80\" without guessing the order.",
    ],
    takeaway:
      "Publishing is opt-in. Without -p a container is running and unreachable, which is not the same as broken. The left number is yours, the right one is the container's.",
  },

  {
    id: "env-vars",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 2: running real services",
    title: "Same image, different settings",
    minutes: 5,
    concept: [
      "Open the Docker Hub page for almost any database or service and you will see something like `-e POSTGRES_PASSWORD=secret` in the very first example. This short lesson is so that line stops being noise.",
      "An image should be the same everywhere it runs. That is the whole promise: the thing you tested is the thing you ship. But a password, a database address, or a log level obviously has to differ between your laptop and production.",
      "So the settings are not baked in. They are handed to the container when it starts, as ENVIRONMENT VARIABLES: named values the program can read. `-e NAME=value` sets one. The image stays identical; only the run changes.",
      "This is also why you can use the same official Postgres image everyone else uses, with your own password, without building anything.",
    ],
    steps: [
      {
        instruction:
          "Pass a value in, and have the program inside read it back. Nothing is built and nothing is written to disk.",
        command:
          "docker run --rm -e GREETING='hello from outside' alpine:3.23 sh -c 'echo \"the container sees: $GREETING\"'",
        commandParts: [
          { piece: "-e GREETING='hello from outside'", meaning: "Set an environment variable for this run only" },
          { piece: "alpine:3.23", meaning: "A tiny Linux image, about 8 MB" },
          { piece: "sh -c 'echo \"... $GREETING\"'", meaning: "Read the variable back from inside the container" },
        ],
        saw: "The container printed the value you passed in. You did not edit a file, rebuild an image, or restart anything. The value crossed the boundary at startup because you asked it to.",
        check: { kind: "manual", label: "I saw my value echoed back" },
      },
      {
        instruction:
          "Every image ships with some variables already set. Look at what the Python image brings with it.",
        command: "docker run --rm python:3.13-alpine env",
        commandParts: [
          { piece: "env", meaning: "Print every environment variable visible inside the container" },
        ],
        saw: "A short list. PATH tells the shell where to find programs. PYTHON_VERSION was set by whoever built this image. HOSTNAME is the container's id, which is why it looks random. These are defaults the image carries; anything you pass with -e is added on top or overrides one.",
        check: { kind: "manual", label: "I saw the variable list" },
      },
      {
        instruction:
          "Run the same image again with no -e at all, and see what a program gets when a setting is simply absent.",
        command:
          "docker run --rm python:3.13-alpine sh -c 'echo \"GREETING is: [${GREETING:-not set}]\"'",
        commandParts: [
          { piece: "(no -e this time)", meaning: "Deliberately omitted, to see the empty case" },
          { piece: "${GREETING:-not set}", meaning: "Shell shorthand: use GREETING, or this fallback if it is missing" },
        ],
        saw: "not set. The variable from two steps ago did not persist: it belonged to that one container, which is already gone. This is why a service that needs a password will refuse to start when you forget the -e, and why that error message is usually telling you the exact truth.",
        check: { kind: "manual", label: "I saw: not set" },
      },
    ],
    recap: [
      "You changed a container's behavior without rebuilding anything, by passing a value at startup.",
      "You looked at the variables an image ships with by default, and saw that yours are layered on top.",
      "You can now read the `-e SOMETHING=value` line in any Docker Hub README and know exactly what it does.",
    ],
    takeaway:
      "Build one image, configure it per run. Environment variables are how the same bytes behave differently in development and production.",
  },

  {
    id: "reading-errors",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 2: running real services",
    title: "Reading the errors you are going to hit",
    minutes: 7,
    concept: [
      "Everything so far worked. That is not what your first week looks like. The difference between someone who finds Docker frustrating and someone who does not is mostly whether they can read the error and tell which of four things went wrong.",
      "Almost every early error is one of these:",
      "1. THE ENGINE IS NOT RUNNING. \"Cannot connect to the Docker daemon.\" The command exists but nothing is behind it. Start OrbStack or Docker Desktop.\n2. THE NAME IS WRONG. \"No such container.\" You typed a name Docker does not know about, or the container is gone.\n3. THE IMAGE DOES NOT EXIST. \"pull access denied\" or \"not found.\" Usually a typo in the name or tag, occasionally a private image you cannot read.\n4. SOMETHING IS IN THE WAY. \"port is already allocated.\" Another program owns that port on your Mac.",
      "You are going to cause three of these deliberately. The fourth, the daemon one, cannot be demonstrated here for an obvious reason: Docker has to be running for any of this to work at all.",
      "The habit worth building: read the LAST line first. Docker tends to put the actual reason at the end, after whatever it was attempting.",
    ],
    steps: [
      {
        instruction:
          "Ask for logs from a container that does not exist. Expect this to fail. Read the message rather than skimming it.",
        command: "docker logs quest-does-not-exist",
        commandParts: [
          { piece: "docker logs <name>", meaning: "Normally prints a container's output" },
          { piece: "quest-does-not-exist", meaning: "A name nothing is using" },
        ],
        saw: "\"No such container: quest-does-not-exist\". Blunt and accurate. In real life this usually means a typo, or a container that exited and was removed. `docker ps -a` is the fix: it lists stopped ones too, so you can see whether the name is wrong or the container simply died.",
        check: { kind: "manual", label: "I saw: No such container" },
      },
      {
        instruction:
          "Now ask for an image that was never published. This one prints several lines before the real reason.",
        command: "docker run --rm quest-nonexistent-image:9.9.9",
        commandParts: [
          { piece: "quest-nonexistent-image:9.9.9", meaning: "An image name nobody has ever pushed" },
        ],
        saw: "Docker looks locally, does not find it, tries the registry, and fails there too. The wording mentions pull access denied or not found, and both mean the same practical thing here: the name you gave does not resolve to anything you can read. Nine times in ten it is a typo in the name or the tag. The tenth is a private image you have not logged in for.",
        check: { kind: "manual", label: "I saw it fail to find the image" },
      },
      {
        instruction:
          "Cause a port collision on purpose: start one container on a port, then try to start a second on the same one.",
        command:
          "docker rm -f quest-port-a quest-port-b >/dev/null 2>&1; docker run -d --name quest-port-a -p 8090:80 nginx:alpine >/dev/null && echo 'first container started on 8090'; docker run -d --name quest-port-b -p 8090:80 nginx:alpine",
        commandParts: [
          { piece: "first docker run -p 8090:80", meaning: "Takes port 8090 on your Mac" },
          { piece: "second docker run -p 8090:80", meaning: "Tries to take the same one, and cannot" },
        ],
        saw: "The first starts. The second fails with \"Bind for 0.0.0.0:8090 failed: port is already allocated\". Two programs cannot own the same port on one machine, which is a rule of your Mac and not of Docker. The fix is always the same: pick a different left-hand number, or stop whatever has it. Remember this one, because Chapter 4 shows it is exactly why Compose cannot run several copies of a service.",
        check: { kind: "manual", label: "I saw: port is already allocated" },
      },
      {
        instruction: "Clean up both containers.",
        command:
          "docker rm -f quest-port-a quest-port-b >/dev/null 2>&1; echo 'cleaned up'",
        commandParts: [
          { piece: "docker rm -f a b", meaning: "Remove both, ignoring the one that never started" },
        ],
        saw: "Cleaned up. Note the second container was created even though it failed to start, which is why removing it is not a no-op.",
        check: { kind: "manual", label: "Cleaned up" },
      },
    ],
    recap: [
      "You made Docker fail three different ways on purpose and read what it actually said each time.",
      "You can tell a wrong name from a missing image from an occupied port, which covers most of what goes wrong early.",
      "You know to read the last line first, and that `docker ps -a` answers the \"no such container\" case.",
    ],
    takeaway:
      "Most early Docker errors are one of four things: the engine is not running, the name is wrong, the image does not exist, or something already owns that port. The last line of the message usually says which.",
  },

  {
    id: "first-dockerfile",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 3: building your own images",
    title: "Write a Dockerfile, one line at a time",
    minutes: 12,
    concept: [
      "You have run someone else's images (Python one-shots and a long-lived nginx). Now you package your own program, which is the part that makes all of this useful at work.",
      "A DOCKERFILE is a plain text file listing the steps to build an image. It is not a programming language and there is not much to it. Most real ones are under twenty lines, and they all answer the same four questions:",
      "1. What does this need to run on? (a base image)\n2. What files does it need? (copy them in)\n3. How do you install its dependencies? (skipped here, we have none yet)\n4. How do you start it? (the startup command)",
      "The program below is a tiny web server in about eight lines of Node. It answers any request with JSON saying which container it is. That shape is deliberate: the five real services you meet later answer the same way, so this is a miniature of the thing you are heading toward.",
      "One detail to get right immediately, because it is the single most common beginner mistake with containers: the server listens on `0.0.0.0`, not `localhost`. Inside a container, `localhost` means only that container, so a server bound to it is unreachable from anywhere else while insisting it is running perfectly. Chapter 3 covers why in depth. For now, just notice it is there.",
      "The steps below write the files for you, so nothing depends on your editor. Read what each one contains before you run it.",
    ],
    steps: [
      {
        instruction:
          "Create a folder with one ordinary Node program in it. Look at the layout and the file below first - that is what you are making. Then run the command (or create the same file in any editor you like).",
        scaffold: {
          root: "~/quest-hello",
          note: "One folder, one file. No Docker yet - just a tiny web server.",
          files: [
            {
              path: "server.js",
              language: "js",
              content: `const http = require("http");
const os = require("os");

http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ service: "quest-hello", host: os.hostname() }));
}).listen(4300, "0.0.0.0", () => console.log("listening on 4300"));
`,
            },
          ],
        },
        command: `mkdir -p ~/quest-hello
cat > ~/quest-hello/server.js <<'EOF'
const http = require("http");
const os = require("os");

http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ service: "quest-hello", host: os.hostname() }));
}).listen(4300, "0.0.0.0", () => console.log("listening on 4300"));
EOF
cat ~/quest-hello/server.js`,
        commandParts: [
          { piece: "mkdir -p ~/quest-hello", meaning: "Create the folder (and parents if needed)" },
          { piece: "cat > .../server.js <<'EOF' ... EOF", meaning: "Write the file contents (heredoc: paste multi-line text safely)" },
          { piece: "cat ~/quest-hello/server.js", meaning: "Print the file back so you can read it" },
        ],
        saw: "Eight lines of ordinary Node. No Docker anything in it. That is the point: your program does not know or care that it is about to be containerized. Note the \"0.0.0.0\" on the listen line.",
        check: { kind: "manual", label: "I read the program" },
      },
      {
        instruction:
          "Now add a Dockerfile next to server.js. That is the whole recipe for turning your program into an image. Look at the layout and file below, then run the command (or create the file in an editor).",
        scaffold: {
          root: "~/quest-hello",
          note: "Same folder as before. Two files total after this step.",
          files: [
            {
              path: "Dockerfile",
              language: "dockerfile",
              content: `FROM node:24-alpine
WORKDIR /app
COPY server.js .
CMD ["node", "server.js"]
`,
            },
          ],
        },
        command: `cat > ~/quest-hello/Dockerfile <<'EOF'
FROM node:24-alpine
WORKDIR /app
COPY server.js .
CMD ["node", "server.js"]
EOF
cat ~/quest-hello/Dockerfile`,
        commandParts: [
          { piece: "cat > ~/quest-hello/Dockerfile <<'EOF' ... EOF", meaning: "Write the Dockerfile next to server.js" },
          { piece: "cat ~/quest-hello/Dockerfile", meaning: "Print it so you can read the four lines" },
        ],
        saw: "Four lines, and each one answers one of the four questions. FROM node:24-alpine picks the base: a small Linux with Node already on it, so you inherit a working Node instead of installing one. WORKDIR /app sets the folder inside the image where the following commands happen, and creates it. COPY server.js . copies your file from your machine into that folder in the image. CMD is the command to run when a container starts from this image. That is a complete, valid Dockerfile.",
        check: { kind: "manual", label: "I read the Dockerfile" },
      },
      {
        instruction:
          "Build the image. The last argument is the build context: the folder Docker is allowed to copy files from.",
        command: "docker build -t quest-hello:1.0 ~/quest-hello",
        commandParts: [
          { piece: "docker build", meaning: "Build an image from a Dockerfile" },
          { piece: "-t quest-hello:1.0", meaning: "Tag (name:version) so you can refer to it later" },
          { piece: "~/quest-hello", meaning: "Build context: folder Docker may copy files from" },
        ],
        ifItFails:
          "\"COPY failed\" or \"file not found\" almost always means the file is not inside the build context. COPY can only reach files under the folder you named at the end of the command, which is why `COPY ../something` never works. Check that server.js is really in ~/quest-hello.",
        saw: "Docker worked through your four lines in order, pulled the node:24-alpine base if it did not have it, copied your file in, and tagged the result quest-hello:1.0. You now have your own image sitting next to python:3.13-alpine, made the same way every image on Docker Hub was made. The part after the colon is the TAG, which is normally a version.",
        check: { kind: "manual", label: "The build finished" },
      },
      {
        instruction:
          "Run it. This starts a container in the background, connects port 4300 on your machine to port 4300 inside it, and then asks it who it is.",
        command:
          "docker rm -f quest-hello >/dev/null 2>&1; docker run -d --name quest-hello -p 4300:4300 quest-hello:1.0 && sleep 1 && curl -s localhost:4300",
        commandParts: [
          { piece: "docker rm -f quest-hello", meaning: "Remove any old container with this name (-f = force if running)" },
          { piece: ">/dev/null 2>&1", meaning: "Hide \"not found\" noise if nothing to remove" },
          { piece: "docker run -d", meaning: "Start a container in the background (detached)" },
          { piece: "--name quest-hello", meaning: "Human name instead of a random id" },
          { piece: "-p 4300:4300", meaning: "Map host port 4300 to container port 4300" },
          { piece: "quest-hello:1.0", meaning: "Image to run (the one you just built)" },
          { piece: "sleep 1 && curl -s localhost:4300", meaning: "Wait a second, then request the app on your Mac" },
        ],
        saw: "Your own program, answering from inside a container you built. The \"host\" value is the container's id, which is why it looks like nothing you chose. Two new flags: -d runs it in the background instead of taking over your terminal, and --name gives it a name so you can refer to it later instead of copying a random id. This container is still running, unlike the --rm ones earlier.",
        check: { kind: "running", container: "quest-hello" },
      },
    ],
    recap: [
      "You wrote an ordinary Node program that knows nothing about Docker, which is the point: your code does not change to be containerized.",
      "You wrote a four-line Dockerfile and can say what each line does and which of the four questions it answers.",
      "You built it into a tagged image of your own, made exactly the way every image on Docker Hub was made.",
      "You ran it and reached your own program through a published port.",
    ],
    takeaway:
      "A Dockerfile answers four questions: what to build on, what files to bring, how to install dependencies, and how to start. Four lines is a real image.",
    source: {
      path: "apps/dashboard/Dockerfile",
      note: "The real version of this, for the Next.js app you are reading right now, is about forty lines and every one is commented.",
    },
  },

  {
    id: "adding-a-dependency",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 3: building your own images",
    title: "When your app needs a package",
    minutes: 12,
    concept: [
      "Real programs use libraries. This is where most people's first Dockerfile breaks, so we are going to break it on purpose and then fix it, because the failure teaches more than the fix.",
      "You are going to rewrite the server to use `express`, the most common web framework for Node. Then you will rebuild the image without changing the Dockerfile, and try to run it.",
      "Watch what happens carefully, because the timing is the lesson: the BUILD will succeed and the CONTAINER will fail. Those are two different moments and people conflate them constantly. A build only runs the instructions in your Dockerfile; it never runs your program. Your program not working is something you find out later, when a container starts.",
      "The reason is simple once you see it. Your Dockerfile says `COPY server.js .` and nothing else. So the image contains your code and no libraries. Node starts, hits `require(\"express\")`, and there is nothing there.",
      "The fix has two parts, and the order of the lines matters more than it looks. You will see why at the end.",
    ],
    steps: [
      {
        instruction:
          "Rewrite the server to use express, keep the same simple Dockerfile, and rebuild. Nothing about the Dockerfile changes yet. Expect this build to SUCCEED. Look at the files below first.",
        scaffold: {
          root: "~/quest-hello",
          note: "server.js now needs express. The Dockerfile still only copies server.js (on purpose).",
          files: [
            {
              path: "server.js",
              language: "js",
              content: `const express = require("express");
const os = require("os");

const app = express();
app.get("/", (req, res) =>
  res.json({ service: "quest-hello", host: os.hostname(), framework: "express" }),
);
app.listen(4300, "0.0.0.0", () => console.log("listening on 4300"));
`,
            },
            {
              path: "Dockerfile",
              language: "dockerfile",
              content: `FROM node:24-alpine
WORKDIR /app
COPY server.js .
CMD ["node", "server.js"]
`,
            },
          ],
        },
        command: `cat > ~/quest-hello/server.js <<'EOF'
const express = require("express");
const os = require("os");

const app = express();
app.get("/", (req, res) =>
  res.json({ service: "quest-hello", host: os.hostname(), framework: "express" }),
);
app.listen(4300, "0.0.0.0", () => console.log("listening on 4300"));
EOF
cat > ~/quest-hello/Dockerfile <<'EOF'
FROM node:24-alpine
WORKDIR /app
COPY server.js .
CMD ["node", "server.js"]
EOF
docker build -t quest-hello:2.0 ~/quest-hello`,
        commandParts: [
          { piece: "cat > .../server.js <<'EOF' ... EOF", meaning: "Overwrite server.js with the express version" },
          { piece: "cat > .../Dockerfile <<'EOF' ... EOF", meaning: "Keep the simple Dockerfile (still no npm install)" },
          { piece: "docker build -t quest-hello:2.0 ~/quest-hello", meaning: "Build and tag this version 2.0" },
        ],
        predict: {
          question:
            "server.js now requires express, but the Dockerfile only copies server.js and never installs anything. What does the BUILD do?",
          options: ["Fails: express is missing", "Succeeds"],
          answer: 1,
          because:
            "A build runs the instructions in your Dockerfile and nothing else. It never executes your program, so it has no way to discover that a library is missing. Everything you asked for did happen. The trouble shows up one step later, when something actually tries to run.",
        },
        saw: "The build succeeded, exactly as promised. Docker did everything you asked: it copied server.js into the image. You never told it about express, so it has no reason to think anything is missing. A successful build means your instructions ran, not that your program works.",
        check: { kind: "manual", label: "The build succeeded" },
      },
      {
        instruction:
          "Now try to run it. This is the failure. It is supposed to happen, and reading the actual error is the whole point of this step.",
        command: "docker run --rm quest-hello:2.0",
        commandParts: [
          { piece: "docker run --rm", meaning: "Start throwaway container (same pattern as Chapter 0's first run)" },
          { piece: "quest-hello:2.0", meaning: "Image tag 2.0 (the broken express build)" },
          { piece: "(no extra command)", meaning: "Uses the image default CMD: node server.js" },
        ],
        saw: "Error: Cannot find module 'express'. Node started, read your first line, went looking for express, and found nothing. The image contains your code and a Node runtime, and that is all. This exact error, at this exact moment, is one of the most common first-container experiences there is. Now you know what it means: the Dockerfile never installed anything.",
        check: { kind: "manual", label: "I saw: Cannot find module 'express'" },
      },
      {
        instruction:
          "Fix it: add a package.json that lists the dependency, and a Dockerfile that installs it during the build. Read both files below carefully before you run the command.",
        scaffold: {
          root: "~/quest-hello",
          note: "Three files now. Order in the Dockerfile matters: install deps before copying server.js.",
          files: [
            {
              path: "package.json",
              language: "json",
              content: `{
  "name": "quest-hello",
  "version": "2.1.0",
  "dependencies": { "express": "^5.1.0" }
}
`,
            },
            {
              path: "Dockerfile",
              language: "dockerfile",
              content: `FROM node:24-alpine
WORKDIR /app
COPY package.json .
RUN npm install --no-fund --no-audit --no-update-notifier --loglevel=error
COPY server.js .
CMD ["node", "server.js"]
`,
            },
          ],
        },
        command: `cat > ~/quest-hello/package.json <<'EOF'
{
  "name": "quest-hello",
  "version": "2.1.0",
  "dependencies": { "express": "^5.1.0" }
}
EOF
cat > ~/quest-hello/Dockerfile <<'EOF'
FROM node:24-alpine
WORKDIR /app
COPY package.json .
RUN npm install --no-fund --no-audit --no-update-notifier --loglevel=error
COPY server.js .
CMD ["node", "server.js"]
EOF
cat ~/quest-hello/Dockerfile`,
        commandParts: [
          { piece: "cat > .../package.json", meaning: "List express as a dependency" },
          { piece: "cat > .../Dockerfile", meaning: "New recipe: COPY package.json, RUN npm install, then COPY server.js" },
          { piece: "cat ~/quest-hello/Dockerfile", meaning: "Print the Dockerfile to read the order of lines" },
        ],
        saw: "Two new lines, and one moved. COPY package.json . brings in the list of dependencies. RUN npm install executes a command DURING THE BUILD, and whatever it produces becomes part of the image: this is how node_modules gets in there. Note that npm ran inside the image, so you never needed npm on your own machine. And notice server.js is now copied AFTER the install, not before. That ordering is deliberate and the last step explains what it buys you.",
        check: { kind: "manual", label: "I read the new Dockerfile" },
      },
      {
        instruction: "Rebuild with the fixed Dockerfile.",
        command: "docker build -t quest-hello:2.1 ~/quest-hello",
        commandParts: [
          { piece: "docker build -t quest-hello:2.1", meaning: "Rebuild and tag a new version (2.1)" },
          { piece: "~/quest-hello", meaning: "Same folder; Dockerfile now installs dependencies" },
        ],
        saw: "This build has an extra step the last one did not: npm install running inside the image, downloading express. That is the RUN line doing its work. The result is an image that contains your code AND its dependencies.",
        check: { kind: "manual", label: "The build finished" },
      },
      {
        instruction: "Run the fixed image, and confirm it works.",
        command:
          "docker rm -f quest-hello >/dev/null 2>&1; docker run -d --name quest-hello -p 4300:4300 quest-hello:2.1 && sleep 1 && curl -s localhost:4300",
        commandParts: [
          { piece: "docker rm -f ...; docker run -d ... -p ...", meaning: "Same run recipe as before: clean name, background, publish port" },
          { piece: "quest-hello:2.1", meaning: "Fixed image with express installed" },
          { piece: "curl -s localhost:4300", meaning: "Confirm the app answers on your machine" },
        ],
        saw: "It answers, and the JSON now says framework: express. Same program that failed a moment ago, now with its dependency present.",
        check: { kind: "running", container: "quest-hello" },
      },
    ],
    recap: [
      "You built an image that succeeded and then failed to start, so you know a green build says nothing about whether your program runs.",
      "You read \"Cannot find module\" and can name the cause: the Dockerfile copied your code and never installed anything.",
      "You fixed it by copying the dependency list and running npm install during the build, which means npm ran inside the image and never had to exist on your machine.",
      "On ordering: dependencies change rarely and your source changes constantly, so COPY package.json comes BEFORE COPY server.js. Editing your code then does not re-run npm install, and rebuilds stay fast. Flip those two lines and every one-character edit re-downloads everything. Chapter 2 measures exactly this.",
      "On files: you wrote three by hand (server.js, Dockerfile, package.json). node_modules and package-lock.json were generated for you. Keeping generated things out of images is what a .dockerignore is for.",
    ],
    takeaway:
      "A build runs your Dockerfile, not your program, so a green build proves nothing about whether it starts. Copy your dependency list and install it before copying source.",
    source: {
      path: ".dockerignore",
      note: "This project keeps generated folders like node_modules out of its images with a .dockerignore, and it is commented as a teaching file.",
    },
  },

  {
    id: "where-the-space-went",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 3: building your own images",
    title: "Where the disk space went",
    minutes: 7,
    concept: [
      "You have now built three images from the same tiny program: 1.0, 2.0, and 2.1. One of them is the broken one. You have also created and removed a handful of containers. None of that was free, and nothing has been cleaning up behind you.",
      "This is the part of Docker nobody warns beginners about. A few weeks in, someone notices tens of gigabytes have vanished and has no idea what is safe to delete. The confusion is almost always the same one from Part 1: images and containers are different things, and they take up space separately.",
      "Three things accumulate. IMAGES, which are the biggest and are shared between everything built from the same base. CONTAINERS, including stopped ones, which keep a small writable layer of whatever changed while they ran. And BUILD CACHE, the intermediate layers Docker keeps so your next build is fast.",
      "Docker will not remove any of it on its own, because it cannot know what you still want. So the skill is being able to look, and knowing which of the three you are looking at.",
    ],
    steps: [
      {
        instruction:
          "Ask Docker for the summary. This is the one command worth remembering from this lesson.",
        command: "docker system df",
        commandParts: [
          { piece: "docker system df", meaning: "Disk usage, split by what is using it (df = disk free, as in Unix)" },
        ],
        saw: "Four rows: Images, Containers, Local Volumes, Build Cache. The RECLAIMABLE column is the interesting one, because it is Docker's own estimate of what you could free without losing anything you are actively using. Your numbers will be larger than you expect, and that is normal.",
        check: { kind: "manual", label: "I saw the four rows" },
      },
      {
        instruction:
          "Look at just your own images from the last two lessons. Three tags, all built from the same eight-line program.",
        command:
          "docker images --filter reference='quest-hello' --format 'table {{.Repository}}:{{.Tag}}\\t{{.Size}}\\t{{.CreatedSince}}'",
        commandParts: [
          { piece: "--filter reference='quest-hello'", meaning: "Only the images you built, by name" },
          { piece: "{{.CreatedSince}}", meaning: "How long ago each was built" },
        ],
        saw: "Three tags. Note the sizes are each around the size of the Node base image, and they are all roughly the same. They are not really taking three times that much disk, because they share the base layers underneath. This is the layer sharing Chapter 2 explains properly. The 2.1 one is slightly larger, because it has express inside it.",
        check: { kind: "manual", label: "I saw three tags" },
      },
      {
        instruction:
          "Now the containers. Create one that runs and exits, then look at its size, which is a column `docker ps` does not show you by default.",
        command:
          "docker rm -f quest-cruft >/dev/null 2>&1; docker run --name quest-cruft alpine:3.23 echo 'I ran once and stopped'; docker ps -a -s --filter name=quest-cruft --format 'table {{.Names}}\\t{{.Status}}\\t{{.Size}}'",
        commandParts: [
          { piece: "docker run --name quest-cruft ...", meaning: "A container that prints once and exits, without --rm" },
          { piece: "docker ps -a -s", meaning: "-s adds the SIZE column, which is off by default" },
        ],
        saw: "Something like \"0B (virtual 8MB)\". Two numbers, and the difference is the whole point. The first is this container's own writable layer: what it changed, which for a container that only printed is nothing. The virtual figure includes the image underneath, which it SHARES rather than owns. Ten stopped containers from one image cost you ten small writable layers, not ten images.",
        check: { kind: "manual", label: "I saw the size column" },
      },
      {
        instruction:
          "Delete the broken image on purpose. You know 2.0 is the one that could not start, so it is genuinely safe to remove.",
        command:
          "docker image rm quest-hello:2.0 && docker images --filter reference='quest-hello' --format 'table {{.Repository}}:{{.Tag}}\\t{{.Size}}'",
        commandParts: [
          { piece: "docker image rm quest-hello:2.0", meaning: "Remove one image by tag" },
          { piece: "docker images ...", meaning: "Confirm the other two are untouched" },
        ],
        ifItFails:
          "\"image is being used by running container\" means something is still running from it. Docker is protecting you. Find it with `docker ps -a --filter ancestor=quest-hello:2.0`, remove the container first, then the image.",
        saw: "Untagged, then deleted, and the other two tags are still there. Deleting an image is not like deleting a folder: because layers are shared, Docker only reclaims the layers that nothing else needs. That is why the space freed is often less than the size shown.",
        check: { kind: "manual", label: "2.0 is gone, the others remain" },
      },
      {
        instruction:
          "One more thing worth seeing: build without a tag and watch what Docker calls it.",
        command:
          "docker build -q -t quest-hello ~/quest-hello >/dev/null && docker images --filter reference='quest-hello' --format 'table {{.Repository}}:{{.Tag}}'",
        commandParts: [
          { piece: "-t quest-hello", meaning: "A name with no :version after it" },
          { piece: "-q", meaning: "Quiet: skip the build log, we only care about the tag" },
        ],
        saw: "A tag called `latest` appeared. This is the single most misleading default in Docker: `latest` is not the newest version of anything. It is just the word Docker uses when you do not supply one. Deploying `latest` means nobody can tell which code is running, which is why real projects always tag with a version or a commit id.",
        check: { kind: "manual", label: "I saw the latest tag appear" },
      },
      {
        instruction:
          "Finally, the command you will be tempted to reach for, and the one to be careful with. Nothing to run here: read it and move on.\n\n`docker system prune` deletes all stopped containers, all networks nothing is using, and dangling images. Adding `-a` also deletes every image not currently used by a running container, which will happily throw away things you wanted. Adding `--volumes` deletes data, which is how people lose databases. Start with plain `docker system prune`, read what it says it will remove, and only then confirm.",
        check: { kind: "manual", label: "I understand what prune deletes" },
      },
      {
        instruction: "Clean up the throwaway container from earlier.",
        command: "docker rm quest-cruft",
        commandParts: [{ piece: "docker rm quest-cruft", meaning: "Remove the stopped container by name" }],
        saw: "Gone. You are leaving this lesson tidier than you found it, which is the habit worth keeping.",
        check: { kind: "manual", label: "Removed" },
      },
    ],
    recap: [
      "You can see where Docker's disk usage goes, split into images, containers, volumes, and build cache.",
      "You know a stopped container costs only its own writable layer, not a whole copy of the image.",
      "You deleted an image by tag for a real reason, and saw that shared layers mean the space freed is often less than the size listed.",
      "You know `latest` is just the default word for \"no tag given\", not the newest version of anything.",
      "You know what `docker system prune` removes before you ever run it, including the two flags that can lose you data.",
    ],
    takeaway:
      "Images, containers, and build cache take up space separately and Docker never cleans up on its own. `docker system df` shows you which is which, and `latest` means no tag was given.",
  },

  {
    id: "the-system",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 4: the real system",
    title: "The system you're about to learn on",
    minutes: 7,
    concept: [
      "You have built one container. Now meet eight of them working together, because a single container is never the hard part. Everything difficult about this subject starts when programs have to find each other, survive each other's failures, and be updated without downtime.",
      "So the rest of this course runs against a small but genuinely real system, and every lesson pokes at it. If it is not running yet, start it now with `make up` from the project folder. That builds all eight containers and starts them, which takes a couple of minutes the first time.",
      "It's deliberately built the way real systems are: several separate programs, each doing one job, talking to each other over the network. That shape has a name: microservices, and it's why container tooling exists at all. One program on one machine never needed any of this.",
      "Here's the cast. FIVE of them are services written by this project, each in a different programming language on purpose:",
      "• Dashboard (TypeScript): the web page you're reading right now. It watches everything else and draws the cards and graphs.\n• Worker (TypeScript): does slow background jobs. When work piles up, it chews through the queue.\n• AI service (Python): pretends to be a machine-learning service. Slow and memory-hungry, like the real thing.\n• Utility (Go): asks the other services how they're doing and reports back.\n• Compute (C): does raw number-crunching. It's the smallest and strangest of the five.",
      "THREE more are standard off-the-shelf software that nearly every real system has:",
      "• PostgreSQL: the database, where things that must survive get written.\n• Redis: a fast temporary store, used here as the job queue.\n• A socket proxy: a small security helper. The dashboard needs to ask Docker what is running, but handing a container direct access to Docker is equivalent to handing it root on your Mac. This proxy sits in between and forwards only the few read-only questions the dashboard is allowed to ask.",
      "Why five different languages? Because it proves the central point of this entire course: none of this tooling cares what your program is written in. The C service was packaged with the same four questions your Node app was. Kubernetes runs them with the same configuration. The languages are as different as software gets, and the infrastructure treats them identically.",
      "That's genuinely useful to you beyond this project. Whatever you end up working on (someone else's Java service, a Rust tool, a Node API), the container skills transfer unchanged.",
    ],
    steps: [
      {
        instruction: "See all eight running, with how long each has been up.",
        command: "docker compose -f ~/Documents/containerquest/infra/compose/docker-compose.yml ps",
        commandParts: [
          { piece: "docker compose", meaning: "Manage a multi-container project from a compose file" },
          { piece: "-f .../docker-compose.yml", meaning: "Path to this project's compose file" },
          { piece: "ps", meaning: "List services in that project and whether they are up" },
        ],
        saw: "Eight rows. Note the STATUS column: several say \"healthy\", which means something is actively checking them and getting a good answer. That checking is a whole lesson in Chapter 4. If you got an error or an empty list, the fleet is not up yet: run `make up` first.",
        check: { kind: "manual", label: "I saw the eight services" },
      },
      {
        instruction:
          "Open Request Path in another tab, then ask the Go service to report on its neighbors. Keep the dashboard open while the command runs so it can capture the fan-out.",
        dashboard: {
          view: "request-path",
          label: "Open Request Path",
        },
        command: experienceCommand("request-path", "action"),
        commandParts: [
          { piece: "curl -s", meaning: "HTTP request; -s = silent (no progress meter)" },
          { piece: "localhost:8080/aggregate", meaning: "Host port published by the util service" },
        ],
        ifItFails:
          "If curl returns data but Request Path stays empty, check for an `npm run dev` still running on port 3000 from earlier. Both it and the fleet's dashboard want that port, and Docker publishes 3000 without warning you, so the page you are reading is being served by that older process — which cannot reach the other containers to read the trace. Stop it with Ctrl-C, or `kill $(lsof -ti tcp:3000)`, then run `make up` again. `make doctor` reports this too.",
        saw: "One request from you turned into several requests between services. That's the shape of a real system, and it's why you need tooling to see inside it, because a single request now touches multiple programs and any one of them can be the problem.",
        check: { kind: "requests", service: "util", delta: 1 },
      },
      {
        instruction:
          "Open Overview. Confirm the five application service cards look ready, then find the request counts that moved when util called its neighbors.",
        dashboard: {
          view: "overview",
          focus: "util",
          label: "Open Overview",
        },
        saw: "Overview is the fleet scoreboard. It shows the five application services; PostgreSQL, Redis, and the socket proxy complete the eight-container Compose project but are infrastructure rather than application cards.",
        check: { kind: "manual", label: "I checked Overview" },
      },
    ],
    recap: [
      "You started the eight-container fleet the rest of the course runs against.",
      "You made one request that fanned out into several between services, which is the shape that makes tooling necessary.",
      "You saw the same numbers you fetched by hand appear on the live dashboard.",
    ],
    takeaway:
      "This project is eight containers in five languages, and the tooling treats all of them identically, which is exactly why container skills transfer to any codebase.",
  },

  {
    id: "toolkit",
    chapter: 0,
    chapterTitle: "Getting started",
    section: "Part 4: the real system",
    title: "The five commands you'll actually use",
    minutes: 10,
    concept: [
      "One idea first, because it makes the rest of these commands make sense: when you run a command inside a container, you are working in a different world than your terminal is. Same keyboard, same screen, two completely separate filesystems. Seeing that side by side is the fastest way to stop finding `docker exec` mysterious.",
      "You have already used `docker run`, `docker ps`, `docker logs`, `docker images`, and `docker build` in earlier lessons. Time to formalize the small set you will reach for constantly, especially when something is wrong.",
      "Docker has dozens of commands. In practice, people use about five of them constantly and look the rest up when needed. Learn these now and you'll be able to follow along comfortably for the rest of the course.",
      "1. `docker ps`: what's running. Your first move, always.\n2. `docker logs`: what a program printed. Your first move when something is broken.\n3. `docker exec`: run a command inside a running container. Your way in when logs aren't enough.\n4. `docker inspect`: every detail about a container, in exhaustive JSON.\n5. `docker stats`: live CPU and memory, like Activity Monitor for containers.",
      "That's genuinely most of it. The practical rhythm when something misbehaves is: `ps` to see if it's even running, `logs` to see what it said before it broke, then `exec` to go in and look around.",
      "Try each one now, on a system that isn't broken, so the output is familiar later when something is.",
    ],
    steps: [
      {
        instruction:
          "Start a container to poke at, so the next two steps have somewhere to look. No published port this time: you will not be reaching it over the network.",
        command:
          "docker rm -f quest-inside >/dev/null 2>&1; docker run -d --name quest-inside nginx:alpine",
        commandParts: [
          { piece: "docker run -d --name quest-inside", meaning: "Background container to explore" },
          { piece: "(no -p)", meaning: "Not needed: docker exec does not go over the network" },
        ],
        saw: "A container id. Nothing published, nothing to curl. This one exists purely to look inside.",
        check: { kind: "running", container: "quest-inside" },
      },
      {
        instruction:
          "Two filesystems, one command. The top half runs inside the container, the bottom half runs on your Mac.",
        command:
          "echo '--- inside the container ---'; docker exec quest-inside ls /; echo '--- on your Mac ---'; ls /",
        commandParts: [
          { piece: "docker exec quest-inside ls /", meaning: "Run ls INSIDE the container" },
          { piece: "ls /", meaning: "The same command, on your own machine" },
        ],
        saw: "Two different lists. The container's root has the ordinary Linux folders: bin, etc, usr, var. Yours has Applications, Library, System, Users. Neither can see the other. When a lesson says a container has \"its own filesystem\", this is the concrete thing that means. Nothing was virtualized to achieve it: the process is simply being shown a different root.",
        check: { kind: "manual", label: "I saw two different listings" },
      },
      {
        instruction: "Same idea for the operating system itself.",
        command:
          "docker exec quest-inside cat /etc/os-release | head -3; echo '--- your Mac ---'; sw_vers",
        commandParts: [
          { piece: "docker exec ... cat /etc/os-release", meaning: "What Linux the container believes it is" },
          { piece: "sw_vers", meaning: "What your actual machine is" },
        ],
        saw: "Alpine Linux inside, macOS outside, at the same moment, on one machine. The container is not running a copy of macOS and your Mac is not running Alpine. Containers are a Linux feature, so on a Mac there is a small Linux VM in the background (that is what OrbStack or Docker Desktop is actually doing) and your containers are processes inside it. One VM, booted once, shared by all of them: not one per container, which is the whole point. On a Linux machine that layer isn't there at all and the container runs directly on the machine's own kernel. What travels in the image either way is the files, never the kernel.",
        check: { kind: "manual", label: "I saw Alpine inside and macOS outside" },
      },
      {
        instruction:
          "Worth knowing but not runnable here: at your own terminal you can get an interactive shell inside a container with `docker exec -it quest-inside sh`, then look around with cd and ls and type `exit` when done. The -i keeps input open and the -t gives you a terminal. This page cannot replay that, because a recording has no keyboard. Try it in your terminal if you have one open.",
        check: { kind: "manual", label: "Noted, I'll try it in a terminal" },
      },
      {
        instruction: "Remove that container before moving on to the fleet commands.",
        command: "docker rm -f quest-inside >/dev/null 2>&1 && echo 'quest-inside removed'",
        commandParts: [
          { piece: "docker rm -f quest-inside", meaning: "Stop and remove in one step" },
        ],
        saw: "Removed. The rest of this lesson uses the fleet containers instead.",
        check: { kind: "manual", label: "Removed" },
      },
      {
        instruction:
          "Read what the Python service has printed recently. Every line a program writes goes here.",
        command: "docker logs --tail 15 container-quest-ai-1",
        commandParts: [
          { piece: "docker logs", meaning: "Print what the process wrote to stdout/stderr" },
          { piece: "--tail 15", meaning: "Only the last 15 lines" },
          { piece: "container-quest-ai-1", meaning: "Container name (from docker ps)" },
        ],
        saw: "Its recent output. When a container refuses to start, this is where the reason is, almost always. Reaching for logs first will save you more time than any other habit in this course.",
        check: { kind: "manual", label: "I saw some log lines" },
      },
      {
        instruction:
          "Step inside a running container and look at its filesystem. You are now running a command in a different computer's world.",
        command: "docker exec container-quest-worker-1 ls /app",
        commandParts: [
          { piece: "docker exec", meaning: "Run a command inside an already-running container" },
          { piece: "container-quest-worker-1", meaning: "Which container" },
          { piece: "ls /app", meaning: "Command to run inside it" },
        ],
        saw: "The files that make up that service. You just ran a command inside a running container: the same trick you'd use in production to check whether a config file really is where you think it is.",
        check: { kind: "manual", label: "I saw a file listing" },
      },
      {
        instruction:
          "Look at live resource use. `--no-stream` takes one snapshot and exits; without it the display refreshes until you press Ctrl+C.",
        command: "docker stats --no-stream",
        commandParts: [
          { piece: "docker stats", meaning: "Live CPU/memory for containers" },
          { piece: "--no-stream", meaning: "Print one snapshot and exit (otherwise it refreshes forever)" },
        ],
        saw: "CPU and memory for every container. Notice how little most of them use: a few megabytes each. That's the practical argument for containers over virtual machines: you can run dozens on a laptop.",
        check: { kind: "manual", label: "I saw the resource table" },
      },
      {
        instruction:
          "Ask for one specific detail rather than the whole JSON dump. This prints just the restart count.",
        command:
          "docker inspect container-quest-ai-1 --format 'restarts={{.RestartCount}} status={{.State.Status}}'",
        commandParts: [
          { piece: "docker inspect", meaning: "Full metadata for a container (huge JSON by default)" },
          { piece: "--format '...'", meaning: "Print only the fields you ask for (Go template)" },
          { piece: "RestartCount / Status", meaning: "How many times it restarted, and if it is running" },
        ],
        saw: "Two values pulled out of a very large JSON document. `inspect` on its own prints hundreds of lines; the --format flag is how you get the one field you want. Remember restart count: it becomes important in Chapter 4.",
        check: { kind: "manual", label: "I saw restarts and status" },
      },
    ],
    recap: [
      "You saw the container's filesystem and your Mac's side by side, and can now say what \"its own filesystem\" concretely means.",
      "You ran a command inside a running container with docker exec, and know how to get an interactive shell with -it when you are at a real terminal.",
      "You have the five commands: ps, logs, exec, inspect, stats.",
      "You have the routine for when something breaks: is it running, what did it say, then go inside and look.",
    ],
    takeaway:
      "ps, logs, exec, inspect, stats. When something breaks: is it running, what did it say, then go inside and look.",
  },
];
