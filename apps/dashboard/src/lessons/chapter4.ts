import type { Lesson } from "./types.ts";
import { experienceCommand } from "@/lib/dashboardExperiments";

/**
 * Chapter 4  -  When things break.
 *
 * The most practical chapter. Everything here is a move you'd make during a
 * real incident, practiced on a system where breaking things is free.
 */

export const CHAPTER_4: Lesson[] = [
  {
    id: "debugging",
    chapter: 4,
    chapterTitle: "When things break",
    title: "Debugging a container that won't start",
    minutes: 9,
    concept: [
      "This is the situation you'll hit most often in real work: you deploy something, and it doesn't come up. Here is the routine, in order. It resolves the large majority of cases.",
      "STEP 1: Is it running at all? `docker ps` shows running containers. `docker ps -a` shows stopped ones too. If your container is in the second list and not the first, it started and died, which is very different from never starting.",
      "STEP 2: What did it say? `docker logs <name>` shows everything the program printed, including after it died. The reason is almost always right here. People skip this step constantly and lose hours to it.",
      "STEP 3: Why did it exit? An exit code of 0 means it finished normally and had nothing more to do, usually a configuration mistake where you ran a one-shot command instead of a server. Anything non-zero means it stopped early.",
      "Two codes are worth memorizing, because they are otherwise baffling. 137 means the process was killed with SIGKILL (128 + 9): it was not asked to stop, it was destroyed mid-instruction. Out of memory is the most common reason, but `docker kill`, a stray `kill -9`, and a `docker stop` whose grace period expired all produce exactly the same 137, so confirm rather than assume: `docker inspect <name> --format '{{.State.OOMKilled}}'` answers the memory question specifically. And 143 (128 + 15) is a plain SIGTERM: something asked it to stop politely and it did.",
      "STEP 4: Go inside and look. `docker exec -it <name> sh` gives you a shell in a RUNNING container. If it's already dead you can't do this, which is why you sometimes start it with a shell as its command instead, just to poke around.",
      "You're going to run through this on a container that's genuinely broken.",
    ],
    steps: [
      {
        instruction:
          "Start a container that will immediately fail, the way a misconfigured service does.",
        command: "docker run --name quest-broken alpine:3.23 sh -c 'echo \"connecting to database...\"; sleep 1; echo \"FATAL: no such host: db\" >&2; exit 1'",
        commandParts: [
          { piece: "docker run --name quest-broken", meaning: "Start a named container (no --rm so it stays when it exits)" },
          { piece: "alpine:3.23", meaning: "Tiny base image" },
          { piece: "sh -c '... exit 1'", meaning: "Fake a crash: print an error and exit non-zero" },
        ],
        saw: "It printed a couple of lines and stopped. In real life you often won't see this output: it scrolls past in a deploy log, or the container restarts before you look.",
        check: { kind: "manual", label: "It ran and exited" },
      },
      {
        instruction:
          "It's not in `docker ps` any more. Find it among the stopped containers, with its exit code.",
        command: "docker ps -a --filter name=quest-broken --format 'table {{.Names}}\\t{{.Status}}'",
        commandParts: [
          { piece: "docker ps -a", meaning: "Include stopped containers (not just running)" },
          { piece: "--filter name=quest-broken", meaning: "Only this demo container" },
          { piece: "--format ... Status", meaning: "See Exited and the exit code" },
        ],
        saw: "\"Exited (1)\". The 1 means it crashed rather than finished cleanly. If this said Exited (0), you'd be looking for a configuration problem instead: something told it to do a task and stop, when you wanted a long-running server.",
        check: { kind: "manual", label: "I saw Exited (1)" },
      },
      {
        instruction: "Now read what it said before it died. This is the step that matters.",
        command: "docker logs quest-broken",
        commandParts: [
          { piece: "docker logs", meaning: "What the process printed before it died" },
          { piece: "quest-broken", meaning: "The stopped container" },
        ],
        saw: "\"FATAL: no such host: db\". There's your answer: it couldn't resolve a hostname. From Chapter 3 you already know what to check: is the other container running, is it on the same network, is the name spelled right. Logs first, always.",
        check: { kind: "manual", label: "I saw the FATAL line" },
      },
      {
        instruction:
          "Now ask HOW it died rather than only that it did. This is the check that stops you fixing the wrong problem.",
        command:
          "docker inspect quest-broken --format 'exit={{.State.ExitCode}} oomkilled={{.State.OOMKilled}} error={{.State.Error}}'",
        commandParts: [
          { piece: "docker inspect --format", meaning: "Pull specific fields out of the container's metadata" },
          { piece: "State.ExitCode", meaning: "The number you saw in docker ps -a, on its own" },
          { piece: "State.OOMKilled", meaning: "Did the kernel kill it for using too much memory?" },
        ],
        saw: "exit=1 and oomkilled=false: this container chose to exit, nothing killed it. Remember this field for the day you see exit=137. Everyone's reflex there is \"out of memory\", and it often is, but 137 only tells you SIGKILL arrived: OOMKilled true means memory and the fix is a limit or a leak; false means something else sent it, like a `docker kill`, a `kill -9`, or a stop that ran out of patience. One field's difference between raising a memory limit that was never the problem and finding what is actually killing your container.",
        check: { kind: "manual", label: "I saw the exit code and OOM flag" },
      },
      {
        instruction: "Clean it up.",
        command: "docker rm quest-broken",
        commandParts: [
          { piece: "docker rm", meaning: "Delete a stopped container" },
          { piece: "quest-broken", meaning: "Cleanup so the name is free next time" },
        ],
        saw: "Gone. Stopped containers stick around until removed, which is useful for exactly the investigation you just did, but they do accumulate.",
        check: { kind: "manual", label: "Removed" },
      },
    ],
    recap: [
      "You started a container that failed on purpose and watched it disappear from the running list.",
      "You found it among stopped containers with its exit code, then read the logs it left before dying.",
      "You inspected how it died (not only that it did), then cleaned the broken container up.",
    ],
    takeaway:
      "Is it running, what did it say, what was the exit code, then go inside. Logs answer most of it.",
  },

  {
    id: "restart-policies",
    chapter: 4,
    chapterTitle: "When things break",
    title: "Restart policies: who brings it back",
    minutes: 7,
    concept: [
      "A container that crashes stays dead unless something is watching it. That something is a restart policy, and it's one line of configuration.",
      "The useful settings: `no` is the default and means exactly what it says. `on-failure` restarts only on a non-zero exit. `unless-stopped` restarts whenever it dies and also brings it back after a reboot, unless you deliberately stopped it. That last one is what this project uses and what most long-running services want.",
      "Here's the important limitation, and it's the reason Chapter 5 exists. A restart policy only restarts the container ON THIS MACHINE. If the machine itself dies, the policy dies with it and nothing comes back anywhere. There's nobody watching from outside.",
      "There's a second limitation that bites in practice: a crash loop. If your program crashes instantly on startup because of a bad config, the policy restarts it, it crashes again, forever. Docker backs off progressively, but nothing fixes it. You'll see this pattern constantly: in Kubernetes it even has a name, CrashLoopBackOff, and it almost always means a configuration problem rather than a code problem.",
      "You'll now watch a restart happen, counted.",
    ],
    steps: [
      {
        instruction: "Open Crash recovery in another tab, then check how many times the Python service has restarted so far.",
        dashboard: {
          view: "experiment",
          experiment: "crash-recovery",
          label: "Open Crash recovery",
        },
        command: "docker inspect container-quest-ai-1 --format 'restarts: {{.RestartCount}}'",
        commandParts: [
          { piece: "docker inspect --format", meaning: "Read one field of container metadata" },
          { piece: "RestartCount", meaning: "How many times Docker has restarted this container" },
        ],
        saw: "A number, probably small. This counter is one of the most useful health signals there is. A service with hundreds of restarts is telling you something is badly wrong, even if it looks fine right now.",
        check: { kind: "manual", label: "I noted the number" },
      },
      {
        instruction:
          "Now make it crash on purpose. This asks the service to kill its own process, exactly as a real crash would. Keep Crash recovery visible so it can compare before and after.",
        command: experienceCommand("crash-recovery", "action"),
        commandParts: [
          { piece: "curl -s -XPOST .../chaos", meaning: "Ask the service to crash itself (teaching endpoint)" },
          { piece: "-d '{\"action\":\"crash\"}'", meaning: "JSON body selecting the crash action" },
        ],
        saw: "The service acknowledged, then killed itself. Nothing you did stopped the container: the program inside exited on its own, which is how real crashes happen. On Overview, uptime for ai should reset within a few seconds.",
        check: { kind: "restarted", service: "ai" },
      },
      {
        instruction: "Wait a moment, then check the counter again.",
        command:
          "sleep 6 && docker inspect container-quest-ai-1 --format 'restarts: {{.RestartCount}} status: {{.State.Status}}'",
        commandParts: [
          { piece: "sleep 6", meaning: "Wait for restart policy to bring it back" },
          { piece: "docker inspect ... RestartCount", meaning: "Confirm the counter went up" },
        ],
        saw: "The count went up by one and the status is running again. Nobody intervened. The restart policy noticed the exit and started it back up, and the service is already serving requests. That's the simplest possible form of self-healing, and Kubernetes is essentially this idea taken much further.",
        check: { kind: "manual", label: "The count went up and it's running" },
      },
    ],
    recap: [
      "You noted a service's restart count before anything went wrong.",
      "You crashed that service on purpose and watched the restart policy bring the same container role back.",
      "You confirmed the restart counter moved, which is how Compose and Docker show recovery on one machine.",
    ],
    takeaway:
      "A restart policy revives a crashed container on the same machine. If the machine dies, nothing revives it, which is the gap Kubernetes fills.",
  },

  {
    id: "probes",
    chapter: 4,
    chapterTitle: "When things break",
    title: "Health checks: the two questions that look identical",
    minutes: 10,
    concept: [
      "This lesson is worth slowing down for. It's the single most commonly misunderstood idea in this whole area, and getting it right prevents a specific and very nasty kind of outage.",
      "A crashed program is easy: it exits, and something restarts it. The hard case is a program that is still running but no longer working. Deadlocked, out of connections, stuck waiting on something that will never answer. From the outside it looks perfectly alive. Nothing restarts it, because nothing died.",
      "So systems ask health questions. And there are TWO different questions, which is the part people miss:",
      "LIVENESS: \"are you alive?\" If the answer is no, KILL AND RESTART. Restarting is the only remedy.",
      "READINESS: \"should I send you traffic right now?\" If no, STOP SENDING TRAFFIC, but leave it alone. The program is fine; it just isn't able to serve at the moment. Maybe it's still warming up, or a dependency is down.",
      "Here is why the distinction matters enormously. Imagine your liveness check verifies the database is reachable. The database has a five-second hiccup. Now every single one of your services fails its liveness check simultaneously, and all of them get killed and restarted at once, turning a five-second blip into a full outage that takes minutes to recover from. Your health check caused the incident.",
      "The rule that avoids this: liveness should only check whether YOU are working. Readiness is where dependency checks belong.",
      "You'll now trigger both and watch them behave completely differently.",
    ],
    steps: [
      {
        instruction:
          "Open the readiness experiment, then make the Go service report itself NOT READY while leaving the process completely healthy.",
        dashboard: {
          view: "experiment",
          experiment: "readiness",
          label: "Open readiness experiment",
        },
        command: experienceCommand("readiness", "action"),
        commandParts: [
          { piece: "curl -XPOST .../chaos", meaning: "Teaching endpoint again" },
          { piece: "action: unready", meaning: "Fail readiness while the process stays alive" },
        ],
        saw: "It accepted. The program is running perfectly and is now declining traffic. On Overview, the util card should turn amber rather than red. The readiness experiment records the same identity and uninterrupted uptime before and after.",
        check: { kind: "unready", service: "util" },
      },
      {
        instruction:
          "Ask both health questions and compare the answers. This is the whole lesson in one command.",
        command:
          "echo \"liveness (am I alive?):    $(curl -s -o /dev/null -w '%{http_code}' localhost:8080/healthz)\"; echo \"readiness (send traffic?): $(curl -s -o /dev/null -w '%{http_code}' localhost:8080/readyz)\"",
        commandParts: [
          { piece: "curl .../healthz", meaning: "Liveness: is the process up?" },
          { piece: "curl .../readyz", meaning: "Readiness: should traffic be sent?" },
          { piece: "echo both", meaning: "Compare the two status codes side by side" },
        ],
        saw: "Liveness 200, readiness 503. Two different answers from the same running program at the same instant. A system reading these would keep the container alive and simply route around it. Nothing gets restarted, nothing is lost, and when it recovers traffic returns automatically.",
        check: { kind: "manual", label: "I saw 200 and 503" },
      },
      {
        instruction:
          "Confirm nothing was restarted: compare with the crash you caused in the previous lesson.",
        command:
          "docker inspect container-quest-util-1 --format 'restarts: {{.RestartCount}} uptime-status: {{.State.Status}}'",
        commandParts: [
          { piece: "docker inspect util", meaning: "Process still running (restart count)" },
          { piece: "State.Status", meaning: "Confirm it did not need a full restart for unready" },
        ],
        saw: "The restart count did not move. That's the entire point: crash kills and restarts, unready merely diverts traffic. Same-looking buttons, completely different mechanisms, and in Chapter 5 you'll configure both of these explicitly.",
        check: { kind: "manual", label: "Restart count unchanged" },
      },
    ],
    recap: [
      "You made a service report itself not ready while leaving the process completely healthy.",
      "You asked both health questions at the same instant and got two different answers from one running program: liveness 200, readiness 503.",
      "You confirmed the restart count did not move, so you have seen that unready diverts traffic while a crash restarts the container.",
      "You can explain why putting a database check in a liveness probe turns a five-second blip into a fleet-wide outage.",
    ],
    takeaway:
      "Liveness failing restarts you; readiness failing just stops traffic. Never check dependencies in liveness, or one slow database restarts your entire fleet.",
  },

  {
    id: "compose-limits",
    chapter: 4,
    chapterTitle: "When things break",
    title: "Where Compose runs out of road",
    minutes: 7,
    concept: [
      "You now know enough Docker, and enough Compose, to run a real system. Chapter 3 showed you how to read and write the recipe. So it's worth being precise about what Compose genuinely cannot do, because that list is exactly the argument for Kubernetes, and if you don't hit these problems, you may not need Kubernetes at all.",
      "ONE MACHINE. Everything runs on one computer. That machine is a single point of failure, and you can only grow by buying a bigger one.",
      "NO LOAD BALANCING OF ITS OWN. Compose will happily run several copies of a service, and other containers that reach it by service name get simple DNS round-robin across them. What it has no concept of is a load balancer object you can put in front: no health-aware routing, and no way to publish one address for the group. Any service that publishes a fixed host port is capped at one copy, because two programs cannot both own port 3001. Getting past that means dropping the fixed port and running a proxy you configure and maintain yourself, which is precisely the work Kubernetes does for you.",
      "NO ROLLING UPDATES. Updating means stopping the old container and starting the new one. There's a gap in between, and during that gap requests fail.",
      "NO RESCHEDULING. If the machine dies, everything on it is gone. The restart policy died along with it.",
      "Kubernetes exists to solve those four things, and it charges you a lot of complexity for them. That's a real trade, not a free upgrade. Plenty of good production systems run on Compose or a single server and are absolutely fine. Reach for Kubernetes when you actually have these problems.",
      "Let's prove the port limitation rather than assert it, on a service that publishes one.",
    ],
    steps: [
      {
        instruction:
          "Ask Compose for three copies of the worker, which publishes a fixed port.",
        dashboard: {
          view: "experiment",
          experiment: "compose-limits",
          label: "Open the Compose capability note",
        },
        command: experienceCommand("compose-limits", "action"),
        commandParts: [
          { piece: "docker compose ... up -d", meaning: "Apply the compose project" },
          { piece: "--scale worker=N", meaning: "Run N copies of the worker service" },
        ],
        saw: "It fails, and the error mentions the port being allocated or already in use. Three containers all tried to claim port 3001 on your machine, and only one can have it. Be precise about what that proves: not that Compose cannot run replicas at all, but that THIS topology cannot, because the worker publishes a fixed host port. Remove that port and the three copies would start; you would then have three containers, one DNS name round-robining between them, and still nothing that checks whether a copy is healthy before sending it traffic.",
        check: { kind: "manual", label: "I saw it fail on the port" },
      },
      {
        instruction: "Put things back to a single worker.",
        command: experienceCommand("compose-limits", "reset"),
        commandParts: [
          { piece: "docker compose ... up -d", meaning: "Apply the compose project" },
          { piece: "--scale worker=N", meaning: "Run N copies of the worker service" },
        ],
        saw: "Back to one. In Chapter 5 you'll scale a service to five copies with a single command and no port conflicts at all. Not because Kubernetes does it automatically, but because you declare a Service alongside the Deployment, and that Service is a real load balancer: one stable address, health-aware, updated every time a pod appears or disappears. This project's manifests declare one for each service, which is why scaling there is a number and nothing else.",
        check: { kind: "manual", label: "Back to one worker" },
      },
    ],
    recap: [
      "You asked Compose to run three workers with a fixed published host port and saw the scale fail on port collision.",
      "You put the stack back to a single worker so the fleet was healthy again, with a clear picture of what Compose will not solve for you.",
    ],
    takeaway:
      "Compose runs on one machine, has no load balancer to put in front of copies, and can't update without downtime. Those four gaps are the entire case for Kubernetes.",
  },
];
