import type { Lesson } from "./types";

/**
 * Chapter 4 — When things break.
 *
 * The most practical chapter. Everything here is a move you'd make during a
 * real incident, practised on a system where breaking things is free.
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
      "STEP 1 — Is it running at all? `docker ps` shows running containers. `docker ps -a` shows stopped ones too. If your container is in the second list and not the first, it started and died, which is very different from never starting.",
      "STEP 2 — What did it say? `docker logs <name>` shows everything the program printed, including after it died. The reason is almost always right here. People skip this step constantly and lose hours to it.",
      "STEP 3 — Why did it exit? An exit code of 0 means it finished normally and had nothing more to do — usually a configuration mistake where you ran a one-shot command instead of a server. Anything non-zero means it crashed. Code 137 specifically means it was killed for using too much memory, which is worth memorising because it's otherwise baffling.",
      "STEP 4 — Go inside and look. `docker exec -it <name> sh` gives you a shell in a RUNNING container. If it's already dead you can't do this, which is why you sometimes start it with a shell as its command instead, just to poke around.",
      "You're going to run through this on a container that's genuinely broken.",
    ],
    steps: [
      {
        instruction:
          "Start a container that will immediately fail, the way a misconfigured service does.",
        command: "docker run --name quest-broken alpine:3.23 sh -c 'echo \"connecting to database...\"; sleep 1; echo \"FATAL: no such host: db\" >&2; exit 1'",
        saw: "It printed a couple of lines and stopped. In real life you often won't see this output — it scrolls past in a deploy log, or the container restarts before you look.",
        check: { kind: "manual", label: "It ran and exited" },
      },
      {
        instruction:
          "It's not in `docker ps` any more. Find it among the stopped containers, with its exit code.",
        command: "docker ps -a --filter name=quest-broken --format 'table {{.Names}}\\t{{.Status}}'",
        saw: "\"Exited (1)\". The 1 means it crashed rather than finished cleanly. If this said Exited (0), you'd be looking for a configuration problem instead — something told it to do a task and stop, when you wanted a long-running server.",
        check: { kind: "manual", label: "I saw Exited (1)" },
      },
      {
        instruction: "Now read what it said before it died. This is the step that matters.",
        command: "docker logs quest-broken",
        saw: "\"FATAL: no such host: db\". There's your answer — it couldn't resolve a hostname. From Chapter 3 you already know what to check: is the other container running, is it on the same network, is the name spelled right. Logs first, always.",
        check: { kind: "manual", label: "I saw the FATAL line" },
      },
      {
        instruction: "Clean it up.",
        command: "docker rm quest-broken",
        saw: "Gone. Stopped containers stick around until removed — which is useful for exactly the investigation you just did, but they do accumulate.",
        check: { kind: "manual", label: "Removed" },
      },
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
      "There's a second limitation that bites in practice: a crash loop. If your program crashes instantly on startup because of a bad config, the policy restarts it, it crashes again, forever. Docker backs off progressively, but nothing fixes it. You'll see this pattern constantly — in Kubernetes it even has a name, CrashLoopBackOff, and it almost always means a configuration problem rather than a code problem.",
      "You'll now watch a restart happen, counted.",
    ],
    steps: [
      {
        instruction: "Check how many times the Python service has restarted so far.",
        command: "docker inspect container-quest-ai-1 --format 'restarts: {{.RestartCount}}'",
        saw: "A number — probably small. This counter is one of the most useful health signals there is. A service with hundreds of restarts is telling you something is badly wrong, even if it looks fine right now.",
        check: { kind: "manual", label: "I noted the number" },
      },
      {
        instruction:
          "Now make it crash on purpose. This asks the service to kill its own process, exactly as a real crash would.",
        command:
          "curl -s -XPOST localhost:8000/chaos -H 'content-type: application/json' -d '{\"action\":\"crash\"}'",
        saw: "The service acknowledged, then killed itself. Nothing you did stopped the container — the program inside exited on its own, which is how real crashes happen.",
        check: { kind: "restarted", service: "ai" },
      },
      {
        instruction: "Wait a moment, then check the counter again.",
        command:
          "sleep 6 && docker inspect container-quest-ai-1 --format 'restarts: {{.RestartCount}} status: {{.State.Status}}'",
        saw: "The count went up by one and the status is running again. Nobody intervened. The restart policy noticed the exit and started it back up — and the service is already serving requests. That's the simplest possible form of self-healing, and Kubernetes is essentially this idea taken much further.",
        check: { kind: "manual", label: "The count went up and it's running" },
      },
    ],
    takeaway:
      "A restart policy revives a crashed container on the same machine. If the machine dies, nothing revives it — which is the gap Kubernetes fills.",
  },

  {
    id: "probes",
    chapter: 4,
    chapterTitle: "When things break",
    title: "Health checks: the two questions that look identical",
    minutes: 10,
    concept: [
      "This lesson is worth slowing down for. It's the single most commonly misunderstood idea in this whole area, and getting it right prevents a specific and very nasty kind of outage.",
      "A crashed program is easy — it exits, and something restarts it. The hard case is a program that is still running but no longer working. Deadlocked, out of connections, stuck waiting on something that will never answer. From the outside it looks perfectly alive. Nothing restarts it, because nothing died.",
      "So systems ask health questions. And there are TWO different questions, which is the part people miss:",
      "LIVENESS — \"are you alive?\" If the answer is no, KILL AND RESTART. Restarting is the only remedy.",
      "READINESS — \"should I send you traffic right now?\" If no, STOP SENDING TRAFFIC, but leave it alone. The program is fine; it just isn't able to serve at the moment. Maybe it's still warming up, or a dependency is down.",
      "Here is why the distinction matters enormously. Imagine your liveness check verifies the database is reachable. The database has a five-second hiccup. Now every single one of your services fails its liveness check simultaneously, and all of them get killed and restarted at once — turning a five-second blip into a full outage that takes minutes to recover from. Your health check caused the incident.",
      "The rule that avoids this: liveness should only check whether YOU are working. Readiness is where dependency checks belong.",
      "You'll now trigger both and watch them behave completely differently.",
    ],
    steps: [
      {
        instruction:
          "Make the Go service report itself NOT READY — while leaving the process completely healthy.",
        command:
          "curl -s -XPOST localhost:8080/chaos -H 'content-type: application/json' -d '{\"action\":\"unready\"}'",
        saw: "It accepted. The program is running perfectly and is now declining traffic. On the Dashboard, its card just turned amber rather than red.",
        check: { kind: "unready", service: "util" },
      },
      {
        instruction:
          "Ask both health questions and compare the answers. This is the whole lesson in one command.",
        command:
          "echo \"liveness (am I alive?):    $(curl -s -o /dev/null -w '%{http_code}' localhost:8080/healthz)\"; echo \"readiness (send traffic?): $(curl -s -o /dev/null -w '%{http_code}' localhost:8080/readyz)\"",
        saw: "Liveness 200, readiness 503. Two different answers from the same running program at the same instant. A system reading these would keep the container alive and simply route around it. Nothing gets restarted, nothing is lost, and when it recovers traffic returns automatically.",
        check: { kind: "manual", label: "I saw 200 and 503" },
      },
      {
        instruction:
          "Confirm nothing was restarted — compare with the crash you caused in the previous lesson.",
        command:
          "docker inspect container-quest-util-1 --format 'restarts: {{.RestartCount}} uptime-status: {{.State.Status}}'",
        saw: "The restart count did not move. That's the entire point: crash kills and restarts, unready merely diverts traffic. Same-looking buttons, completely different mechanisms — and in Chapter 5 you'll configure both of these explicitly.",
        check: { kind: "manual", label: "Restart count unchanged" },
      },
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
      "You now know enough Docker to run a real system. So it's worth being precise about what Compose genuinely cannot do, because that list is exactly the argument for Kubernetes — and if you don't hit these problems, you may not need Kubernetes at all.",
      "ONE MACHINE. Everything runs on one computer. That machine is a single point of failure, and you can only grow by buying a bigger one.",
      "NO REAL SCALING. You can ask Compose for multiple copies of a service, but there's nothing to spread traffic across them, and if the service publishes a fixed port they'll collide — two programs can't both own port 3001.",
      "NO ROLLING UPDATES. Updating means stopping the old container and starting the new one. There's a gap in between, and during that gap requests fail.",
      "NO RESCHEDULING. If the machine dies, everything on it is gone. The restart policy died along with it.",
      "Kubernetes exists to solve those four things, and it charges you a lot of complexity for them. That's a real trade, not a free upgrade. Plenty of good production systems run on Compose or a single server and are absolutely fine. Reach for Kubernetes when you actually have these problems.",
      "Let's prove the scaling limitation rather than assert it.",
    ],
    steps: [
      {
        instruction:
          "Ask Compose for three copies of the worker, which publishes a fixed port.",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --scale worker=3 2>&1 | tail -4",
        saw: "It fails, and the error mentions the port being allocated or already in use. Three containers all tried to claim port 3001 on your machine, and only one can have it. There is no load balancer in Compose to sit in front of them — the concept doesn't exist.",
        check: { kind: "manual", label: "I saw it fail on the port" },
      },
      {
        instruction: "Put things back to a single worker.",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --scale worker=1 2>&1 | tail -2",
        saw: "Back to one. In Chapter 5 you'll scale a service to five copies with a single command and no port conflicts at all — because Kubernetes puts a load balancer in front by default, and that's the difference.",
        check: { kind: "manual", label: "Back to one worker" },
      },
    ],
    takeaway:
      "Compose runs on one machine, can't load-balance copies, and can't update without downtime. Those four gaps are the entire case for Kubernetes.",
  },
];
