import type { Lesson } from "./types.ts";

/**
 * Chapter 2  -  Images: what's inside, and why size matters.
 *
 * The most practically useful chapter in the course. Build times and image
 * sizes are the two things developers feel every single day, and both come
 * down to a handful of rules about layers and ordering.
 */

export const CHAPTER_2: Lesson[] = [
  {
    id: "layers",
    chapter: 2,
    chapterTitle: "Images and how they're built",
    title: "An image is a stack of layers",
    minutes: 7,
    concept: [
      "An image isn't one big blob. It's a stack of layers, each one recording the changes made on top of the layer beneath it. Install a package: that's a layer. Copy your code in: another layer. Set a setting: another.",
      "This matters for two very practical reasons.",
      "First, SHARING. Layers are content-addressed, so identical layers are stored once and reused everywhere. If ten of your images all start from the same base, that base is downloaded and stored a single time. This is why pulling your second image from a registry is usually much faster than the first.",
      "Second, CACHING. When you rebuild, Docker reuses every layer whose inputs haven't changed and only redoes the rest. Structure your build well and a rebuild takes two seconds; structure it badly and the same rebuild takes two minutes. That difference is entirely under your control, and it's the subject of the next lesson.",
      "One consequence catches everyone eventually: layers are additive, so deleting a file in a later layer doesn't shrink the image. The file is still sitting in the earlier layer, just hidden. If you copy a secret in and then delete it, it's still in there and anyone with the image can dig it out.",
    ],
    steps: [
      {
        instruction:
          "Look at the layers of the Go service's image. Each row is one build instruction.",
        command: "docker history quest/util:dev --format 'table {{.Size}}\\t{{.CreatedBy}}' | head -12",
        commandParts: [
          { piece: "docker history", meaning: "Show the layers that make up an image" },
          { piece: "quest/util:dev", meaning: "Which image" },
          { piece: "--format 'table ...'", meaning: "Size and how each layer was created" },
          { piece: "| head -12", meaning: "Only the first dozen lines" },
        ],
        saw: "A handful of layers, most of them 0 B. The 0 B ones are metadata: setting a port or a startup command changes no files, so there's nothing to store. Only the layers that actually add files have a size.",
        check: { kind: "manual", label: "I saw the layer list" },
      },
      {
        instruction: "Now compare total sizes across all five services.",
        command:
          "docker images --filter reference='quest/*' --format 'table {{.Repository}}\\t{{.Size}}'",
        commandParts: [
          { piece: "docker images", meaning: "List images on disk" },
          { piece: "--filter reference='quest/*'", meaning: "Only this project's images" },
          { piece: "--format 'table ...'", meaning: "Repository and size columns" },
        ],
        saw: "From about 187 kB to over 300 MB, a spread of more than 1,500x. All five do essentially the same job: listen on a port and answer HTTP requests. The next lesson is entirely about where that difference comes from, and it is the single most useful thing in this chapter.",
        check: { kind: "manual", label: "I compared the sizes" },
      },
    ],
    takeaway:
      "An image is a stack of layers. Identical layers are shared between images, and unchanged layers are reused on rebuild, which is why build structure determines build speed.",
  },

  {
    id: "multi-stage",
    chapter: 2,
    chapterTitle: "Images and how they're built",
    title: "Why one image is 187 kB and another is 300 MB",
    minutes: 9,
    concept: [
      "Here's the trap almost everyone falls into. To build a program you need a lot of tools: a compiler, package managers, build scripts, development libraries. To RUN the finished program you usually need almost none of that.",
      "But if you build inside your image the naive way, all those tools ship to production with you. Your 5 MB program arrives inside a 900 MB image, 99% of which is a compiler that will never be used again.",
      "The fix is called a MULTI-STAGE BUILD, and it's the most valuable single technique in this chapter. You use one image to do the building, then start a second, clean image and copy only the finished program into it. The toolchain stays behind.",
      "The C service in this project takes it to the extreme. It's built inside a full Linux system with a compiler (around 250 MB) and then the finished program is copied into a completely empty image. Not a small Linux. Empty. No shell, no package manager, no operating system files at all. Just one program, 187 kB.",
      "This isn't a stunt. Smaller images deploy faster, cost less to store, and importantly have less in them to be vulnerable. An image with no shell is one an attacker can't get a shell in.",
      "Why is the dashboard 300 MB then? Because JavaScript genuinely needs its runtime present to run. Same for Python. This isn't sloppiness; some languages compile to a self-contained program and some don't. Knowing which you're dealing with tells you what's achievable.",
    ],
    steps: [
      {
        instruction:
          "Confirm the C service really is that small, and see how much bigger its build tools were.",
        command:
          "docker images --format 'table {{.Repository}}:{{.Tag}}\\t{{.Size}}' | grep -E 'quest/compute|alpine|REPO'",
        commandParts: [
          { piece: "docker images --format ...", meaning: "List name:tag and size" },
          { piece: "| grep -E 'quest/compute|alpine'", meaning: "Compare the tiny C image to Alpine" },
        ],
        saw: "The finished image next to the Alpine base its build stage used. The build environment is well over a hundred times larger than the result. All of it was thrown away.",
        check: { kind: "manual", label: "I compared build vs final size" },
      },
      {
        instruction:
          "Prove there's genuinely no operating system in the C service's image. This tries to open a shell inside it.",
        command: "docker exec container-quest-compute-1 sh",
        commandParts: [
          { piece: "docker exec", meaning: "Run a command in a running container" },
          { piece: "container-quest-compute-1", meaning: "The C service container" },
          { piece: "sh", meaning: "Try to open a shell (this image has none - that is the point)" },
        ],
        saw: "It failed: there is no `sh` to run. That error IS the correct result. There is no shell in that image because there are no operating-system files in it at all: just the one program. Practically: you can't debug it by going inside, and an attacker can't either. That's the trade.",
        check: { kind: "manual", label: "I saw it fail to find a shell" },
      },
      {
        instruction: "Compare with the Python service, which does have a full OS inside it.",
        command: "docker exec container-quest-ai-1 sh -c 'cat /etc/os-release | head -2'",
        commandParts: [
          { piece: "docker exec ... sh -c", meaning: "Run a shell one-liner inside the AI container" },
          { piece: "cat /etc/os-release | head -2", meaning: "Show which Linux the container thinks it is" },
        ],
        saw: "Debian. The Python image carries a whole Linux distribution's files because the Python interpreter needs them: libraries, a package manager, /etc, a shell. Worth naming the one thing even this image does NOT contain, though: a kernel. No image ever does. Both of these containers borrow the same Linux kernel from underneath, which is exactly why one can hold a distribution's worth of files and the other a single 187 kB binary, and both start in milliseconds.",
        check: { kind: "manual", label: "I saw the Debian version" },
      },
    ],
    recap: [
      "You compared a finished image against the build environment it came from, and saw the toolchain was over a hundred times larger than the result.",
      "You tried to open a shell in the C service and it failed, because there are no operating-system files in that image at all.",
      "You saw the Python service does carry a full Debian userspace, and know why: an interpreter needs one and a compiled binary does not. Neither image contains a kernel; that comes from underneath.",
      "You can now explain why an image with no shell is harder to attack and harder to debug, which is the same fact from two directions.",
    ],
    takeaway:
      "Build with one image, ship with another. Keep the compiler out of production and images shrink by orders of magnitude.",
    source: {
      path: "services/compute/Dockerfile",
      note: "Twelve lines, and the whole technique is visible in them if you ever want to look.",
    },
  },

  {
    id: "build-cache",
    chapter: 2,
    chapterTitle: "Images and how they're built",
    title: "Build caching, and why instruction order matters",
    minutes: 9,
    concept: [
      "This is the lesson that will save you the most time per week in real work.",
      "When Docker rebuilds an image, it walks the instructions in order and reuses each layer whose inputs are unchanged. The moment it hits one that HAS changed, it rebuilds that layer and every single layer after it: no exceptions, even if those later ones would have been identical.",
      "So one rule follows from that: put the things that rarely change EARLY, and the things that change constantly LATE.",
      "Your dependency list changes maybe once a month. Your source code changes every few minutes. So you copy the dependency list in and install dependencies FIRST, and only then copy your source. Now editing a file rebuilds one fast layer, and the slow dependency install stays cached.",
      "Get this backwards (copy everything in at once, then install) and every one-character change to any file re-downloads all your dependencies. That's the difference between a 3-second rebuild and a 3-minute one, and it's an extremely common mistake.",
      "You're going to feel this directly, by timing two rebuilds.",
    ],
    steps: [
      {
        instruction:
          "Rebuild the Go service with nothing changed. Everything should come from cache.",
        command:
          "cd ~/Documents/containerquest && time docker build -q -t quest/util:dev services/util",
        commandParts: [
          { piece: "cd ~/Documents/containerquest", meaning: "Work from the project root" },
          { piece: "time", meaning: "Print how long the build took" },
          { piece: "docker build -q -t quest/util:dev", meaning: "Rebuild util quietly and retag" },
          { piece: "services/util", meaning: "Build context for that service" },
        ],
        saw: "Under a second or so, and the time is mostly Docker starting up. Nothing changed, so nothing was rebuilt: every layer was reused.",
        check: { kind: "manual", label: "It finished almost instantly" },
      },
      {
        instruction:
          "Now change one line of source code (just a comment) and rebuild. This copies the file aside first, appends a comment, rebuilds, then restores the original byte for byte.",
        command:
          "cd ~/Documents/containerquest && cp -p services/util/main.go /tmp/quest-main.go.bak && echo \"// cache test $(date +%s)\" >> services/util/main.go; time docker build -q -t quest/util:dev services/util; mv /tmp/quest-main.go.bak services/util/main.go && echo 'main.go restored'",
        commandParts: [
          { piece: "cp -p ... /tmp/quest-main.go.bak", meaning: "Keep the exact original, so restoring cannot lose your own edits" },
          { piece: "echo \"// cache test $(date +%s)\" >>", meaning: "Append a comment with the current timestamp: unique every run, so the cache really is invalidated" },
          { piece: "; (not &&)", meaning: "Semicolons: the restore runs even if the build fails" },
          { piece: "mv ... services/util/main.go", meaning: "Put the original back" },
        ],
        ifItFails:
          "If anything goes wrong mid-way, your original file is still at /tmp/quest-main.go.bak: `mv /tmp/quest-main.go.bak services/util/main.go` puts it back. Note what this deliberately does NOT do: `git checkout` on that file would also throw away any uncommitted work of your own in it.",
        saw: "Noticeably slower: several seconds against well under one. Changing the source invalidated the layer that copies source in, so the compile had to run again. The timestamp in that comment is what makes this honest: append the same text twice and the second build hits the cache for the changed layer too, and you would measure nothing. Notice also what did NOT happen: it didn't re-download the Go dependencies, because that layer sits earlier in the file and its inputs were untouched. That's the ordering rule paying off. \"main.go restored\" at the end confirms your working tree is exactly as it was.",
        check: { kind: "manual", label: "The second build took longer" },
      },
    ],
    recap: [
      "You timed a rebuild with nothing changed and watched it finish almost instantly, entirely from cache.",
      "You changed one line of source, rebuilt, and measured the difference yourself rather than being told about it, then watched the file get restored exactly as it was.",
      "You saw what did NOT happen: the dependency download did not repeat, because that layer sits earlier and its inputs were untouched.",
      "This is the same ordering rule you applied by hand in Chapter 0 when package.json was copied before server.js. Now you have the timings behind it.",
    ],
    takeaway:
      "Docker rebuilds from the first changed instruction onward. Put rarely-changing things first, frequently-changing things last, and rebuilds stay fast.",
  },

  {
    id: "registries",
    chapter: 2,
    chapterTitle: "Images and how they're built",
    title: "Registries: how an image leaves your laptop",
    minutes: 6,
    concept: [
      "You've been building images locally. Real deployment needs them somewhere a server can fetch them from, and that place is a REGISTRY.",
      "A registry is just a store for images. Docker Hub is the big public one; AWS, Google, and GitHub all run their own; most companies have a private registry that only their machines can reach.",
      "The workflow is short: you `push` an image up, and any machine that needs it `pull`s it down. That's the whole mechanism by which code gets from your laptop to production.",
      "Names carry the location. `postgres:18-alpine` is shorthand for a public image on Docker Hub. Something like `ghcr.io/yourname/app:1.2.0` names the registry explicitly. The part after the colon is the TAG, usually a version.",
      "A practical warning about tags. `latest` is not special and means nothing; it's just the default tag when you don't specify one. Deploying `latest` means nobody can tell which code is actually running, and two servers can be running different things while claiming the same version. Use real version numbers.",
      "This project never pushes anywhere: the images stay on your machine and, in Chapter 5, get handed directly to the cluster. That's a normal way to work locally, and it's why you haven't needed an account anywhere.",
    ],
    steps: [
      {
        instruction:
          "Pull a real image from Docker Hub. This is a tiny official Linux image, about 8 MB.",
        command: "docker pull alpine:3.23",
        commandParts: [
          { piece: "docker pull", meaning: "Download an image from a registry (Docker Hub)" },
          { piece: "alpine:3.23", meaning: "Image name:tag to fetch" },
        ],
        saw: "Watch it fetch layers. If any layer is one your machine already has from another image, it's skipped instantly: that's layer sharing from the first lesson doing real work.",
        check: { kind: "manual", label: "It downloaded" },
      },
      {
        instruction:
          "Run it and print its version. This image is a complete Linux system, and it's smaller than most photos.",
        command: "docker run --rm alpine:3.23 cat /etc/alpine-release",
        commandParts: [
          { piece: "docker run --rm", meaning: "Throwaway container" },
          { piece: "alpine:3.23", meaning: "Image you just pulled" },
          { piece: "cat /etc/alpine-release", meaning: "Command inside: print Alpine version" },
        ],
        saw: "A version number, printed by a Linux system that started, ran one command, and vanished, in well under a second. That speed is the entire practical argument for containers.",
        check: { kind: "manual", label: "I saw the version" },
      },
    ],
    takeaway:
      "A registry stores images so other machines can pull them. Tag with real version numbers, never rely on `latest`.",
  },
];
