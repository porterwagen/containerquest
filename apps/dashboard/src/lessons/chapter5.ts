import type { Lesson } from "./types.ts";

/**
 * Chapter 5 — Kubernetes.
 *
 * A real three-node cluster is already running locally, with this project's
 * services deployed to it. Every command here was run against that cluster
 * before being written down.
 */

export const CHAPTER_5: Lesson[] = [
  {
    id: "k8s-why",
    chapter: 5,
    chapterTitle: "Kubernetes",
    title: "The one idea behind all of Kubernetes",
    minutes: 8,
    concept: [
      "Kubernetes has a reputation for being enormous and confusing. It is large. But almost all of it follows from one idea, and once that idea lands the rest is vocabulary.",
      "THE IDEA: you stop giving instructions and start declaring a desired state. You never say \"start this container.\" You say \"three copies of this should exist, always.\" Kubernetes then compares reality against that statement, forever, and takes whatever action closes the gap.",
      "Kill a pod and it doesn't ask permission to replace it — reality no longer matches the declaration, so it acts. Unplug a machine and everything that was on it gets recreated elsewhere, for the same reason. Ask for five copies instead of three and two more appear. It's a loop that never stops running.",
      "That's genuinely it. Self-healing isn't a feature bolted on; it's an unavoidable consequence of continuously enforcing a declaration.",
      "The vocabulary you need, and no more:",
      "• A POD is the smallest unit — almost always one container plus Kubernetes bookkeeping. Where you'd say \"container\", Kubernetes says \"pod\".\n• A DEPLOYMENT is the declaration: which image, how many copies, how to update them. This is what you actually write.\n• A SERVICE is a stable name and address in front of a changing set of pods. Pods come and go; the service name doesn't.\n• A NODE is one machine in the cluster.",
      "You have a real cluster running locally right now — three machines' worth, each one itself a container, which is a pleasant thing to think about. Let's look at it.",
    ],
    steps: [
      {
        instruction:
          "First make sure the cluster has this project's services on it. Safe to run even if they are already there — it just confirms the desired state.",
        command:
          "cd ~/Documents/containerquest && kubectl apply -k infra/k8s/base",
        saw: "Either \"created\" or \"unchanged\" next to each item. Note that running it twice is harmless — you described what should exist, and Kubernetes compared that against reality. That is the declarative idea in its simplest form.",
        check: { kind: "manual", label: "Applied without errors" },
      },
      {
        instruction: "See the machines in your cluster.",
        command: "kubectl get nodes",
        saw: "Three nodes: one control plane and two workers. The control plane is the brain running the comparison loop — it decides what should happen. The workers actually run your containers. In a real cluster these would be separate physical or cloud machines.",
        check: { kind: "manual", label: "I saw three nodes" },
      },
      {
        instruction: "Now see what's running, and importantly, where.",
        command: "kubectl get pods -n container-quest -o wide",
        saw: "Five pods spread across the two worker nodes. Nobody chose that placement — you declared how many copies you wanted, and the scheduler decided where they'd fit. Note the pod names: a deployment name, then two random-looking parts. Pods are disposable and never reuse a name.",
        check: { kind: "manual", label: "I saw pods on different nodes" },
      },
      {
        instruction: "Look at a deployment — the declaration itself.",
        command: "kubectl get deployments -n container-quest",
        saw: "READY shows actual versus desired. Those two numbers matching is Kubernetes' entire job. When they don't match, something somewhere is working to fix it.",
        check: { kind: "manual", label: "I saw the deployments" },
      },
    ],
    takeaway:
      "You declare the desired state; Kubernetes continuously makes reality match it. Everything else follows from that one loop.",
  },

  {
    id: "k8s-identity",
    chapter: 5,
    chapterTitle: "Kubernetes",
    title: "Pods know where they are",
    minutes: 6,
    concept: [
      "Back in Chapter 1, when you asked a service about itself, two fields came back empty: pod name and node name. Under plain Docker there was no pod and no cluster, so there was nothing to report.",
      "The same code is running in your cluster right now — the identical image, unchanged. But now those fields have values, because Kubernetes injects them.",
      "This is done through something called the Downward API, which is a grand name for a simple thing: Kubernetes passes facts about a pod's own placement into the container as environment variables. A pod can learn its own name, which node it landed on, and which namespace it's in.",
      "That sounds like a small convenience. In practice it's how virtually all observability works — every log line and metric a pod emits can be tagged with exactly which pod and machine it came from. When one instance out of forty is misbehaving, this is how you find out which.",
      "Worth appreciating what's being demonstrated: the exact same bytes, running under two different systems, reporting richer information under one of them. The program didn't change. Its environment did.",
    ],
    steps: [
      {
        instruction:
          "Ask the C service in the CLUSTER about itself. This opens a tunnel to it, asks, and closes the tunnel.",
        command:
          "kubectl port-forward -n container-quest svc/compute 9900:9000 >/dev/null 2>&1 & PF=$!; sleep 4; curl -s localhost:9900/meta; echo; kill $PF 2>/dev/null",
        saw: "podName and nodeName now have real values — something like compute-f78b5cb74-7kgxk on container-quest-worker. Compare with the same service under Docker, where both were null. Same image, same code, more context.",
        check: { kind: "manual", label: "I saw a pod name and node name" },
      },
      {
        instruction:
          "That command used port-forward, which is the everyday way to reach something inside a cluster from your laptop. Here it is again against a different service.",
        command:
          "kubectl port-forward -n container-quest svc/ai 9901:8000 >/dev/null 2>&1 & PF=$!; sleep 4; curl -s -o /dev/null -w 'status %{http_code}\\n' localhost:9901/healthz; kill $PF 2>/dev/null",
        saw: "status 200. Cluster networks are private by default — nothing inside is reachable from outside unless deliberately exposed. port-forward punches a temporary hole for you, and it's the single command you'll use most while debugging a real cluster.",
        check: { kind: "manual", label: "I saw status 200" },
      },
    ],
    takeaway:
      "Kubernetes injects a pod's own identity and location into it, which is what makes it possible to trace behavior back to one specific instance.",
  },

  {
    id: "k8s-selfheal",
    chapter: 5,
    chapterTitle: "Kubernetes",
    title: "Self-healing: delete a pod and watch",
    minutes: 7,
    concept: [
      "Time to see the comparison loop work. You're going to delete a pod deliberately — not crash the program inside it, but destroy the pod entirely, the way a failing machine would.",
      "Under Docker this would be permanent. The container is gone; a restart policy has nothing to restart. Something has to notice and act, and under Docker nothing is watching from outside the machine.",
      "In Kubernetes your deployment says two copies should exist. Delete one and reality says one. That mismatch is detected in under a second, and a replacement is scheduled immediately — possibly onto a different machine.",
      "Note carefully what does NOT happen: the old pod does not come back. Pods are never resurrected. A brand new one is created with a brand new name. This is the difference between a restart and a replacement you proved in Chapter 1, now happening at cluster scale and completely unprompted.",
      "That distinction is why you should never store anything important inside a pod, and why pods are described as cattle rather than pets.",
    ],
    steps: [
      {
        instruction: "Note the current pods and their names.",
        command: "kubectl get pods -n container-quest -l app=compute",
        saw: "Two pods with random-suffixed names. Remember roughly what they look like.",
        check: { kind: "manual", label: "I noted the names" },
      },
      {
        instruction:
          "Delete one. This destroys it outright — no warning to the program, nothing graceful.",
        command:
          "kubectl delete pod -n container-quest $(kubectl get pods -n container-quest -l app=compute -o jsonpath='{.items[0].metadata.name}')",
        saw: "Deleted. For a moment your system is running at half capacity.",
        check: { kind: "manual", label: "I deleted a pod" },
      },
      {
        instruction: "Now look immediately — within a couple of seconds.",
        command: "kubectl get pods -n container-quest -l app=compute",
        saw: "Two pods again. One has a name you have not seen before, and its age is a few seconds. Nobody told Kubernetes to do that. You declared two, reality became one, and the loop closed the gap on its own. Notice the deleted pod did not return — a NEW pod was created. Pods are replaced, never revived.",
        check: { kind: "manual", label: "A new pod appeared on its own" },
      },
    ],
    takeaway:
      "Delete a pod and a new one appears unprompted, because the declaration still says how many should exist. Pods are replaced, never resurrected.",
  },

  {
    id: "k8s-scaling",
    chapter: 5,
    chapterTitle: "Kubernetes",
    title: "Scaling: one number, no port conflicts",
    minutes: 7,
    concept: [
      "In Chapter 4 you tried to run three copies of a service under Compose and it failed on a port collision. Two containers cannot both own port 3001 on one machine, and Compose has nothing to put in front of them.",
      "Kubernetes solves this with the SERVICE object. A service is a stable name with a load balancer behind it. Requests to that name get distributed across whichever pods are currently healthy and ready. Pods appear and disappear; the service tracks them automatically.",
      "So scaling really is one number. Change the replica count and Kubernetes creates or removes pods, registers them with the service, and starts routing to them. No ports to allocate, no load balancer to configure, no config to update anywhere.",
      "The readiness probe from Chapter 4 becomes important here. A brand new pod isn't added to the load balancer until it reports ready. That's what makes scaling up safe — traffic never reaches a pod that's still starting.",
      "This is also the mechanism behind autoscaling: something watches CPU and adjusts that number for you. Same machinery, adjusted automatically.",
    ],
    steps: [
      {
        instruction: "Scale from two copies to five, with one command.",
        command: "kubectl scale deployment compute -n container-quest --replicas=5",
        saw: "\"scaled\". That's the whole operation — no ports, no load balancer configuration, no restarts of anything already running.",
        check: { kind: "manual", label: "I scaled it" },
      },
      {
        instruction: "Watch them appear, and note which machines they landed on.",
        command:
          "sleep 8; kubectl get pods -n container-quest -l app=compute -o wide --no-headers | awk '{print $1, $3, $7}'",
        saw: "Five pods, spread across both worker nodes. The scheduler placed them based on available resources — you never specified where. Compare with Compose, where three copies couldn't even start.",
        check: { kind: "manual", label: "I saw five pods across nodes" },
      },
      {
        instruction:
          "Confirm the service is now load-balancing across all of them. This lists the pod addresses it's routing to.",
        command: "kubectl get endpoints compute -n container-quest",
        saw: "Five addresses behind one service name. Anything in the cluster that talks to `compute` gets spread across all five, automatically, with no configuration. Those five joined the pool the moment their readiness probes passed.",
        check: { kind: "manual", label: "I saw five endpoints" },
      },
      {
        instruction: "Scale back down to two.",
        command: "kubectl scale deployment compute -n container-quest --replicas=2",
        saw: "Three pods are terminated and removed from the load balancer first, so no request is ever sent to a pod that's shutting down. Scaling down is as safe as scaling up.",
        check: { kind: "manual", label: "Scaled back to two" },
      },
    ],
    takeaway:
      "A Service is a stable name with load balancing behind it, so scaling is one number and pods can come and go freely.",
  },

  {
    id: "k8s-rollout",
    chapter: 5,
    chapterTitle: "Kubernetes",
    title: "Rolling updates: deploying without downtime",
    minutes: 9,
    concept: [
      "Under Compose, updating means stopping the old container and starting the new one. Between those two moments, requests fail. For a personal project that's fine. For anything with users, it isn't.",
      "Kubernetes replaces pods gradually instead, governed by two settings you get to choose:",
      "maxSurge — how many EXTRA pods may exist during the update. Set to 1, you may temporarily run one more than you asked for.",
      "maxUnavailable — how many fewer than desired you'll tolerate. Set to 0, capacity never drops below the target.",
      "With surge 1 and unavailable 0, the sequence is: start one new pod, WAIT for its readiness probe to pass, then retire one old pod, repeat. Capacity never dips. Old and new run side by side for a few seconds — which is worth knowing, because it means your two versions must be able to coexist briefly. Database migrations in particular need care for exactly this reason.",
      "If a new pod never becomes ready, the rollout stops and waits rather than continuing to destroy working pods. A broken deploy stalls instead of taking you down — that behavior alone justifies a lot of the complexity.",
      "This is the payoff for the readiness probe from Chapter 4. Without it Kubernetes couldn't tell whether a new pod was actually working, and the whole no-downtime guarantee would be a guess.",
    ],
    steps: [
      {
        instruction:
          "Trigger an update by changing the version the pods report. This changes the declaration, so every pod must be replaced.",
        command:
          "kubectl set env deployment/compute -n container-quest SERVICE_VERSION=2.0.0",
        saw: "\"updated\". The declaration changed, so the current pods no longer match it — and the replacement process starts immediately.",
        check: { kind: "manual", label: "I triggered the update" },
      },
      {
        instruction: "Watch the replacement happen. This samples the pod states a few times.",
        command:
          "for i in 1 2 3 4 5; do echo \"$(date +%H:%M:%S)  $(kubectl get pods -n container-quest -l app=compute --no-headers | awk '{print $3}' | sort | uniq -c | tr '\\n' ' ')\"; sleep 3; done",
        saw: "A mix of Running and Terminating, and briefly MORE pods than you asked for — that's maxSurge in action. New ones came up before old ones went down. At no point did the number of working pods drop below your target.",
        check: { kind: "manual", label: "I watched the pods cycle" },
      },
      {
        instruction: "Confirm the rollout finished cleanly.",
        command: "kubectl rollout status deployment/compute -n container-quest --timeout=90s",
        saw: "\"successfully rolled out\". Every pod now runs the new configuration, and no request failed at any point during the process.",
        check: { kind: "manual", label: "I saw successfully rolled out" },
      },
      {
        instruction:
          "One more thing worth knowing: Kubernetes keeps the previous version, so undoing a bad deploy is one command.",
        command: "kubectl rollout undo deployment/compute -n container-quest",
        saw: "\"rolled back\". Same gradual, no-downtime process in reverse. This is the command you want to have practiced before the day you actually need it at 2am.",
        check: { kind: "manual", label: "I rolled it back" },
      },
    ],
    takeaway:
      "Rolling updates add new pods before removing old ones, gated on readiness — so deploys have no downtime and a broken deploy stalls instead of taking you down.",
  },

  {
    id: "k8s-probes",
    chapter: 5,
    chapterTitle: "Kubernetes",
    title: "Probes, declared explicitly",
    minutes: 7,
    concept: [
      "In Chapter 4 you saw liveness and readiness as an idea. In Kubernetes they're explicit configuration, and getting them right is most of the difference between a deployment that heals itself and one that flaps.",
      "Every pod in your cluster right now has both. Liveness asks the health endpoint every ten seconds — if it fails repeatedly, the container is killed and restarted. Readiness asks a different endpoint every five seconds — if it fails, the pod is pulled out of the load balancer and gets no traffic, but is left running.",
      "Crucially, Kubernetes runs these checks from OUTSIDE the container. That's why the C service can have health checks at all despite having no shell and no tools inside it — nothing needs to run in there. This is a genuine improvement over Compose health checks, which have to execute a command inside the container and therefore need something in the image to execute.",
      "The failure mode to avoid, one more time because it causes real outages: never check dependencies in liveness. If your liveness probe fails whenever the database is slow, a brief database hiccup restarts every pod you have simultaneously. You've turned a small problem into a large one, and the restarts often make recovery slower.",
      "Rule of thumb: liveness answers \"am I broken beyond repair?\" Readiness answers \"can I serve right now?\"",
    ],
    steps: [
      {
        instruction: "Look at the probes configured on a running pod.",
        command:
          "kubectl get deployment compute -n container-quest -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}{\"\\n\"}{.spec.template.spec.containers[0].readinessProbe}{\"\\n\"}'",
        saw: "Two probes, hitting two different paths on different schedules. Note they point at /healthz and /readyz — different endpoints, because they answer different questions.",
        check: { kind: "manual", label: "I saw both probes" },
      },
      {
        instruction:
          "Check the events Kubernetes has recorded for this namespace. This is where probe failures and scheduling decisions show up.",
        command:
          "kubectl get events -n container-quest --sort-by=.lastTimestamp 2>/dev/null | tail -12",
        saw: "A log of what the cluster has actually done — pods scheduled, images pulled, containers started, and any probe failures. This is the first place to look when a deployment isn't behaving, and it's much more informative than staring at pod status.",
        check: { kind: "manual", label: "I saw the event log" },
      },
      {
        instruction:
          "Look at the full story for one pod, including its probe configuration and recent events.",
        command:
          "kubectl describe pod -n container-quest $(kubectl get pods -n container-quest -l app=compute -o jsonpath='{.items[0].metadata.name}') | tail -25",
        saw: "`describe` is the workhorse command for debugging Kubernetes. It shows the pod's configuration, its current state, and the events affecting it, all in one place. When something is wrong and you don't know why, this is the command.",
        check: { kind: "manual", label: "I saw the pod description" },
      },
    ],
    takeaway:
      "Kubernetes probes run from outside the container, so even an image with no shell can be health-checked. Liveness restarts; readiness diverts.",
  },
];
