import type { Lesson } from "./types.ts";

/**
 * Chapter 0 - Getting started.
 *
 * Arc: why containers exist -> a light map -> run one -> understand what that
 * was -> keep one running -> build your own image -> dependencies -> meet the
 * fleet -> toolkit. Deep process/VM identity continues in Chapter 1 with the
 * live multi-service system.
 *
 * The fleet does not have to be running until `the-system`.
 */

export const CHAPTER_0: Lesson[] = [
  {
    id: "why-containers",
    chapter: 0,
    chapterTitle: "Getting started",
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
    takeaway:
      "A program needs an invisible world around it to run. A container captures that world so it travels with the program instead of being rebuilt by hand.",
  },

  {
    id: "the-map",
    chapter: 0,
    chapterTitle: "Getting started",
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
        saw: "A version number. That is the tool that builds images and runs containers on this machine. If this failed, Docker is either not installed or not running: open OrbStack or Docker Desktop and try again.",
        check: { kind: "manual", label: "I saw a version number" },
      },
      {
        instruction:
          "You do not need Kubernetes for Getting Started. When we reach Chapter 5 we will install or confirm kubectl then. For now, just confirm you are ready to use Docker.",
        check: { kind: "manual", label: "Ready to use Docker only" },
      },
    ],
    takeaway:
      "Image = template on disk. Container = one instance. Docker runs those on your machine. Compose and Kubernetes come later.",
  },

  {
    id: "first-container",
    chapter: 0,
    chapterTitle: "Getting started",
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
    takeaway:
      "docker run starts a container from an image. --rm deletes the instance when it exits; without --rm you can still see a stopped container. The image can remain either way.",
  },

  {
    id: "what-you-just-ran",
    chapter: 0,
    chapterTitle: "Getting started",
    title: "What you just ran",
    minutes: 7,
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
          "List the Python image again. This is the template (package), not a running program.",
        command: "docker images python:3.13-alpine",
        commandParts: [
          { piece: "docker images python:3.13-alpine", meaning: "Show the image you already pulled" },
        ],
        saw: "One image line. Nothing here is \"running Python\" by itself. It is the recipe sitting on disk.",
        check: { kind: "manual", label: "I see the image" },
      },
      {
        instruction:
          "Create a short-lived named container again (no --rm), then list all containers with that name.",
        command:
          'docker rm -f quest-py-once >/dev/null 2>&1; docker run --name quest-py-once python:3.13-alpine python -c "print(1+1)" && docker ps -a --filter name=quest-py-once --format "table {{.Names}}\\t{{.Status}}"',
        commandParts: [
          { piece: "docker run --name quest-py-once ...", meaning: "Create a container instance from the image" },
          { piece: "docker ps -a --filter name=...", meaning: "Show that instance even after it exited" },
        ],
        saw: "You should see Status Exited. The program finished; the container object still exists until you remove it. That object is what people mean by \"a container\" even when it is not running.",
        check: { kind: "manual", label: "I saw the exited container" },
      },
      {
        instruction: "Remove the instance. Confirm the image is still there.",
        command:
          "docker rm quest-py-once && docker images python:3.13-alpine --format '{{.Repository}}:{{.Tag}} still on disk, size={{.Size}}'",
        commandParts: [
          { piece: "docker rm quest-py-once", meaning: "Delete the container instance" },
          { piece: "docker images ...", meaning: "Confirm the image template remains" },
        ],
        saw: "Instance gone, template remains. If Docker were only \"install Python,\" removing a container would not leave a reusable image like this.",
        check: { kind: "manual", label: "Image still listed" },
      },
      {
        instruction:
          "In your own words (no need to type anything fancy): image vs container, and process-vs-VM. Mark done when you can say it out loud.",
        check: { kind: "manual", label: "I can explain image vs container" },
      },
    ],
    takeaway:
      "Image = package on disk. Container = one instance (running or stopped). Closer to a process with a private view than to a VM. Deleting the instance need not delete the package. Next: keep one running so you can look at a live service.",
  },

  {
    id: "stays-up",
    chapter: 0,
    chapterTitle: "Getting started",
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
    takeaway:
      "A service-shaped container runs in the background (-d), publishes ports (-p), and is inspected with ps, curl, and logs. Stop and rm end the instance; the image can remain.",
  },

  {
    id: "first-dockerfile",
    chapter: 0,
    chapterTitle: "Getting started",
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
          { piece: "docker build -t quest-hello:2.0 ~/quest-hello", meaning: "Build tag 2.0 (succeeds even though express is missing at runtime)" },
        ],
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
        saw: "It answers, and the JSON now says framework: express. Same program that failed a moment ago, now with its dependency present.\n\nTwo things worth taking away. First, on the ordering: dependencies change rarely, your source changes constantly. Because COPY package.json comes before COPY server.js, editing your code does not force npm install to run again, and rebuilds stay fast. Flip those lines and every one-character edit re-downloads everything. Chapter 2 measures this.\n\nSecond, on files: you wrote three by hand (server.js, Dockerfile, package.json). Inside the image there is also a node_modules folder and possibly a package-lock.json, which npm generated. That distinction matters constantly. Generated things should not be copied into images or committed, which is what a .dockerignore file is for.",
        check: { kind: "running", container: "quest-hello" },
      },
    ],
    takeaway:
      "A build runs your Dockerfile, not your program, so a green build proves nothing about whether it starts. Copy your dependency list and install it before copying source.",
    source: {
      path: ".dockerignore",
      note: "This project keeps generated folders like node_modules out of its images with a .dockerignore, and it is commented as a teaching file.",
    },
  },

  {
    id: "the-system",
    chapter: 0,
    chapterTitle: "Getting started",
    title: "The system you're about to learn on",
    minutes: 7,
    concept: [
      "You have built one container. Now meet eight of them working together, because a single container is never the hard part. Everything difficult about this subject starts when programs have to find each other, survive each other's failures, and be updated without downtime.",
      "So the rest of this course runs against a small but genuinely real system, and every lesson pokes at it. If it is not running yet, start it now with `make up` from the project folder. That builds all eight containers and starts them, which takes a couple of minutes the first time.",
      "It's deliberately built the way real systems are: several separate programs, each doing one job, talking to each other over the network. That shape has a name: microservices, and it's why container tooling exists at all. One program on one machine never needed any of this.",
      "Here's the cast. FIVE of them are services written by this project, each in a different programming language on purpose:",
      "• Dashboard (TypeScript): the web page you're reading right now. It watches everything else and draws the cards and graphs.\n• Worker (TypeScript): does slow background jobs. When work piles up, it chews through the queue.\n• AI service (Python): pretends to be a machine-learning service. Slow and memory-hungry, like the real thing.\n• Utility (Go): asks the other services how they're doing and reports back.\n• Compute (C): does raw number-crunching. It's the smallest and strangest of the five.",
      "THREE more are standard off-the-shelf software that nearly every real system has:",
      "• PostgreSQL: the database, where things that must survive get written.\n• Redis: a fast temporary store, used here as the job queue.\n• A tiny security helper, which you'll meet properly in Chapter 4.",
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
          "Ask the Go service to report on its neighbors. It calls the Python and C services and collects their answers.",
        command: "curl -s localhost:8080/aggregate",
        commandParts: [
          { piece: "curl -s", meaning: "HTTP request; -s = silent (no progress meter)" },
          { piece: "localhost:8080/aggregate", meaning: "Host port published by the util service" },
        ],
        saw: "One request from you turned into several requests between services. That's the shape of a real system, and it's why you need tooling to see inside it, because a single request now touches multiple programs and any one of them can be the problem.",
        check: { kind: "requests", service: "util", delta: 1 },
      },
      {
        instruction:
          "Now switch to the Dashboard tab at the top of this page and look at the cards, then come back.",
        saw: "Those cards are the same information you just fetched by hand, refreshed continuously. For now most of the numbers won't mean much. That's fine and expected. Each lesson explains one more of them.",
        check: { kind: "manual", label: "I looked at the Dashboard" },
      },
    ],
    takeaway:
      "This project is eight containers in five languages, and the tooling treats all of them identically, which is exactly why container skills transfer to any codebase.",
  },

  {
    id: "toolkit",
    chapter: 0,
    chapterTitle: "Getting started",
    title: "The five commands you'll actually use",
    minutes: 8,
    concept: [
      "You have already used `docker run`, `docker ps`, `docker logs`, `docker images`, and `docker build` in earlier lessons. Time to formalize the small set you will reach for constantly, especially when something is wrong.",
      "Docker has dozens of commands. In practice, people use about five of them constantly and look the rest up when needed. Learn these now and you'll be able to follow along comfortably for the rest of the course.",
      "1. `docker ps`: what's running. Your first move, always.\n2. `docker logs`: what a program printed. Your first move when something is broken.\n3. `docker exec`: run a command inside a running container. Your way in when logs aren't enough.\n4. `docker inspect`: every detail about a container, in exhaustive JSON.\n5. `docker stats`: live CPU and memory, like Activity Monitor for containers.",
      "That's genuinely most of it. The practical rhythm when something misbehaves is: `ps` to see if it's even running, `logs` to see what it said before it broke, then `exec` to go in and look around.",
      "Try each one now, on a system that isn't broken, so the output is familiar later when something is.",
    ],
    steps: [
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
        instruction: "Watch live resource use. Press Ctrl+C to stop it.",
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
    takeaway:
      "ps, logs, exec, inspect, stats. When something breaks: is it running, what did it say, then go inside and look.",
  },
];
