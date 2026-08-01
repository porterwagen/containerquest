import type { Lesson } from "./types.ts";
import { experienceCommand } from "@/lib/dashboardExperiments";

/**
 * Chapter 5  -  Kubernetes.
 *
 * The first lesson is the setup gate: Chapters 0-4 need nothing but Docker, so
 * a learner arriving here has no cluster, no kubectl, and no images loaded.
 * Every command after that assumes `make k8s` has run, and every one of them
 * was run against that three-node kind cluster before being written down.
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
      "Kill a pod and it doesn't ask permission to replace it: reality no longer matches the declaration, so it acts. Unplug a machine and everything that was on it gets recreated elsewhere, for the same reason. Ask for five copies instead of three and two more appear. It's a loop that never stops running.",
      "That's genuinely it. Self-healing isn't a feature bolted on; it's an unavoidable consequence of continuously enforcing a declaration.",
      "The vocabulary you need, and no more:",
      "• A POD is the smallest unit: almost always one container plus Kubernetes bookkeeping. Where you'd say \"container\", Kubernetes says \"pod\".\n• A DEPLOYMENT is the declaration: which image, how many copies, how to update them. This is what you actually write.\n• A SERVICE is a stable name and address in front of a changing set of pods. Pods come and go; the service name doesn't.\n• A NODE is one machine in the cluster.",
      "Everything so far ran on Docker alone. This chapter needs two more tools and an actual cluster, so the first two steps build one: three machines' worth, each machine itself a container, which is a pleasant thing to think about. The first run takes a few minutes; after that it is already there.",
    ],
    steps: [
      {
        instruction:
          "Chapter 0 said Kubernetes tools would come later. Later is now: check you have both.",
        command:
          "for t in kubectl kind; do printf '  %-8s ' $t; command -v $t >/dev/null && echo ok || echo MISSING; done",
        commandParts: [
          { piece: "kubectl", meaning: "The Kubernetes client: every command in this chapter is kubectl" },
          { piece: "kind", meaning: "Runs a cluster as containers on your machine, no cloud account" },
          { piece: "command -v", meaning: "Is this program on your PATH?" },
        ],
        ifItFails:
          "MISSING on either one means it is not installed yet. On a Mac: `brew install kubectl kind`. Both are single binaries and neither needs an account, a cloud provider, or a credit card. `make doctor` from the project root checks these plus everything else the project uses.",
        saw: "Two \"ok\" lines. kubectl is the client you will type for the rest of the course; kind is what builds the cluster it talks to.",
        check: { kind: "manual", label: "Both tools are installed" },
      },
      {
        instruction:
          "Now build the cluster and put this project on it. One command does all three parts, and it is safe to re-run at any point in this chapter.",
        command: "cd ~/Documents/containerquest && make k8s",
        commandParts: [
          { piece: "cd ~/Documents/containerquest", meaning: "Project root" },
          { piece: "make k8s", meaning: "Three steps in one: create the cluster, load the images, apply the manifests" },
          { piece: "(create)", meaning: "kind creates a 3-node cluster, or skips if you already have one" },
          { piece: "(load)", meaning: "Builds the images and hands them straight to the cluster, so no registry is involved" },
          { piece: "(apply)", meaning: "kubectl apply -k infra/k8s/base: the declaration itself" },
        ],
        ifItFails:
          "\"connection refused\" or \"couldn't get current server API group list\" means there is no cluster yet, so run this step again and watch the create phase. Pods stuck in ImagePullBackOff mean the cluster has the manifests but not the images: `make load` fixes exactly that, because these images exist only on your machine and were never pushed anywhere.",
        saw: "The cluster is created (or reported as already existing), three images are copied onto each node, and each item comes back \"created\" or \"unchanged\". That last word is the point: running it twice is harmless, because you described what should exist rather than issuing commands. That is the declarative idea in its simplest form, and it is why this is the step to re-run whenever anything in this chapter looks wrong.",
        check: { kind: "manual", label: "Cluster is up and the manifests applied" },
      },
      {
        instruction: "See the machines in your cluster.",
        command: "kubectl get nodes",
        commandParts: [
          { piece: "kubectl get nodes", meaning: "List machines (nodes) in the cluster" },
        ],
        saw: "Three nodes: one control plane and two workers. The control plane is the brain running the comparison loop: it decides what should happen. The workers actually run your containers. In a real cluster these would be separate physical or cloud machines.",
        check: { kind: "manual", label: "I saw three nodes" },
      },
      {
        instruction: "Now see what's running, and importantly, where.",
        command: "kubectl get pods -n container-quest -o wide",
        commandParts: [
          { piece: "kubectl get pods", meaning: "List pods in a namespace" },
          { piece: "-n container-quest", meaning: "This project's namespace" },
          { piece: "-o wide", meaning: "Also show which node each pod runs on" },
        ],
        saw: "Five pods, and the NODE column shows them sitting across both workers. Nobody chose that placement: you declared how many copies you wanted, and the scheduler decided where they'd fit. It prefers to spread copies of the same deployment around, which is why you usually see this, but it is a preference among several, not a promise; when you need spreading guaranteed you say so explicitly with topology spread constraints or anti-affinity rules. Note the pod names too: a deployment name, then two random-looking parts. Pods are disposable and never reuse a name.",
        check: { kind: "manual", label: "I saw pods on different nodes" },
      },
      {
        instruction: "Look at a deployment: the declaration itself.",
        command: "kubectl get deployments -n container-quest",
        commandParts: [
          { piece: "kubectl get deployments", meaning: "List Deployments (desired replica counts and images)" },
          { piece: "-n container-quest", meaning: "Namespace" },
        ],
        saw: "READY shows actual versus desired. Those two numbers matching is Kubernetes' entire job. When they don't match, something somewhere is working to fix it.",
        check: { kind: "manual", label: "I saw the deployments" },
      },
    ],
    recap: [
      "You confirmed kubectl and kind were installed, then built (or reused) the local cluster and loaded this project onto it.",
      "You listed nodes and pods and saw work placed across workers without choosing machines by hand.",
      "You inspected a Deployment as a declaration of desired state, which is the loop everything else in the chapter uses.",
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
      "Every time you have asked a service about itself in this course, the JSON came back with two fields sitting empty: podName and nodeName. Under plain Docker there was no pod and no cluster, so there was nothing to put in them.",
      "The same code is running in your cluster right now: the identical image, unchanged. But now those fields have values, because Kubernetes injects them.",
      "This is done through something called the Downward API, which is a grand name for a simple thing: Kubernetes passes facts about a pod's own placement into the container as environment variables. A pod can learn its own name, which node it landed on, and which namespace it's in.",
      "That sounds like a small convenience. In practice it's how virtually all observability works: every log line and metric a pod emits can be tagged with exactly which pod and machine it came from. When one instance out of forty is misbehaving, this is how you find out which.",
      "Worth appreciating what's being demonstrated: the exact same bytes, running under two different systems, reporting richer information under one of them. The program didn't change. Its environment did.",
    ],
    steps: [
      {
        instruction:
          "Ask the C service in the CLUSTER about itself. This opens a tunnel to it, asks, and closes the tunnel.",
        command:
          "kubectl port-forward -n container-quest svc/compute 9900:9000 >/dev/null 2>&1 & PF=$!; sleep 4; curl -s localhost:9900/meta; echo; kill $PF 2>/dev/null",
        commandParts: [
          { piece: "kubectl port-forward ... svc/compute 9900:9000", meaning: "Tunnel local 9900 to the compute Service" },
          { piece: "curl ... /meta", meaning: "Hit the service through the tunnel" },
          { piece: "kill $PF", meaning: "Stop the background port-forward" },
        ],
        saw: "podName and nodeName now have real values: something like compute-f78b5cb74-7kgxk on container-quest-worker. Compare with the same service under Docker, where both were null. Same image, same code, more context.",
        check: { kind: "manual", label: "I saw a pod name and node name" },
      },
      {
        instruction:
          "That command used port-forward, which is the everyday way to reach something inside a cluster from your laptop. Here it is again against a different service.",
        command:
          "kubectl port-forward -n container-quest svc/ai 9901:8000 >/dev/null 2>&1 & PF=$!; sleep 4; curl -s -o /dev/null -w 'status %{http_code}\\n' localhost:9901/healthz; kill $PF 2>/dev/null",
        commandParts: [
          { piece: "kubectl port-forward ... svc/ai 9901:8000", meaning: "Tunnel local 9901 to the AI Service" },
          { piece: "curl ... /healthz", meaning: "Check health through the tunnel" },
        ],
        saw: "status 200. Cluster networks are private by default: nothing inside is reachable from outside unless deliberately exposed. port-forward punches a temporary hole for you, and it's the single command you'll use most while debugging a real cluster.",
        check: { kind: "manual", label: "I saw status 200" },
      },
    ],
    recap: [
      "You reached compute inside the cluster through a port-forward and read /meta with real podName and nodeName filled in.",
      "You contrasted that with Compose, where those fields were null: same image, more identity injected by the platform.",
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
      "Time to see the comparison loop work. You're going to delete a pod deliberately, not crash the program inside it, but destroy the pod entirely, the way a failing machine would.",
      "Under Docker this would be permanent. The container is gone; a restart policy has nothing to restart. Something has to notice and act, and under Docker nothing is watching from outside the machine.",
      "In Kubernetes your deployment says two copies should exist. Delete one and reality says one. That mismatch is detected in under a second, and a replacement is scheduled immediately, possibly onto a different machine.",
      "Note carefully what does NOT happen: the old pod does not come back. Pods are never resurrected. A brand new one is created with a brand new name. This is the difference between a restart and a replacement you proved in Chapter 1, now happening at cluster scale and completely unprompted.",
      "That distinction is why you should never store anything important inside a pod, and why pods are described as cattle rather than pets.",
    ],
    steps: [
      {
        instruction: "Open the pod replacement experiment, then note the current pods and their names.",
        dashboard: {
          view: "experiment",
          experiment: "k8s-selfheal",
          label: "Open pod replacement",
        },
        command: "kubectl get pods -n container-quest -l app=compute",
        commandParts: [
          { piece: "kubectl get pods -l app=compute", meaning: "Only pods labeled as compute" },
          { piece: "-n container-quest", meaning: "Namespace" },
        ],
        saw: "Two pods with random-suffixed names. Remember roughly what they look like.",
        check: { kind: "manual", label: "I noted the names" },
      },
      {
        instruction:
          "Delete one. This destroys it outright: no warning to the program, nothing graceful.",
        command: experienceCommand("k8s-selfheal", "action"),
        commandParts: [
          { piece: "kubectl delete pod ...", meaning: "Kill one compute pod on purpose" },
          { piece: "$(kubectl get pods ... jsonpath=...)", meaning: "Pick a current pod name dynamically" },
        ],
        saw: "Deleted. For a moment your system is running at half capacity.",
        check: { kind: "manual", label: "I deleted a pod" },
      },
      {
        instruction: "Now look immediately, within a couple of seconds.",
        command: "kubectl get pods -n container-quest -l app=compute",
        commandParts: [
          { piece: "kubectl get pods -l app=compute", meaning: "Only pods labeled as compute" },
          { piece: "-n container-quest", meaning: "Namespace" },
        ],
        saw: "Two pods again. One has a name you have not seen before, and its age is a few seconds. Nobody told Kubernetes to do that. You declared two, reality became one, and the loop closed the gap on its own. Notice the deleted pod did not return: a NEW pod was created. Pods are replaced, never revived.",
        check: { kind: "manual", label: "A new pod appeared on its own" },
      },
    ],
    recap: [
      "You noted the current compute pods and their names before changing anything.",
      "You deleted one pod outright and, within seconds, saw a replacement appear without running a start command.",
      "You proved the controller was matching desired replica count, not resurrecting the old pod by name.",
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
      "In Chapter 4 you tried to run three copies of a service under Compose and it failed on a port collision. Two containers cannot both own port 3001 on one machine, and Compose has no load-balancer object to put in front of them: you would have to drop the fixed host port and run a proxy you configured yourself.",
      "Kubernetes solves this with the SERVICE object. A service is a stable name with a load balancer behind it. Requests to that name get distributed across whichever pods are currently healthy and ready. Pods appear and disappear; the service tracks them automatically.",
      "So scaling really is one number. Change the replica count and Kubernetes creates or removes pods, registers them with the service, and starts routing to them. No ports to allocate, no load balancer to configure, no config to update anywhere.",
      "The readiness probe from Chapter 4 becomes important here. A brand new pod isn't added to the load balancer until it reports ready. That's what makes scaling up safe: traffic never reaches a pod that's still starting.",
      "This is also the mechanism behind autoscaling: something watches CPU and adjusts that number for you. Same machinery, adjusted automatically.",
    ],
    steps: [
      {
        instruction: "Open the scaling experiment, then scale from two copies to five with one command.",
        dashboard: {
          view: "experiment",
          experiment: "k8s-scaling",
          label: "Open scaling experiment",
        },
        command: experienceCommand("k8s-scaling", "action"),
        commandParts: [
          { piece: "kubectl scale deployment compute", meaning: "Change desired replica count" },
          { piece: "--replicas=5", meaning: "Ask for five copies" },
        ],
        saw: "\"scaled\". That's the whole operation: no ports, no load balancer configuration, no restarts of anything already running.",
        check: { kind: "manual", label: "I scaled it" },
      },
      {
        instruction: "Watch them appear, and note which machines they landed on.",
        command:
          "sleep 8; kubectl get pods -n container-quest -l app=compute -o wide --no-headers | awk '{print $1, $3, $7}'",
        commandParts: [
          { piece: "sleep 8", meaning: "Wait for new pods to schedule" },
          { piece: "kubectl get pods -l app=compute -o wide", meaning: "See names and nodes" },
          { piece: "awk ...", meaning: "Print a compact name + node list" },
        ],
        saw: "Five pods, and you never said a word about where they should go: the scheduler placed each one on a worker with room for it, and its scoring prefers to spread copies of the same deployment, so they normally land on both. If you need that spread guaranteed rather than merely likely, that is what topology spread constraints and anti-affinity rules are for. Compare with Compose, where the second copy could not even start.",
        check: { kind: "manual", label: "I saw five pods across nodes" },
      },
      {
        instruction:
          "Confirm the service is now load-balancing across all of them. This lists the pod addresses it's routing to.",
        command: "kubectl get endpoints compute -n container-quest",
        commandParts: [
          { piece: "kubectl get endpoints compute", meaning: "Which pod IPs currently back the compute Service" },
        ],
        saw: "Five addresses behind one service name. Anything in the cluster that talks to `compute` gets spread across all five, automatically, with no configuration. Those five joined the pool the moment their readiness probes passed.",
        check: { kind: "manual", label: "I saw five endpoints" },
      },
      {
        instruction: "Scale back down to two.",
        command: experienceCommand("k8s-scaling", "reset"),
        commandParts: [
          { piece: "kubectl scale ... --replicas=2", meaning: "Scale back down to two" },
        ],
        saw: "Three pods are marked for termination and pulled out of the Service's endpoint list, so new requests stop being routed to them almost immediately. \"Almost\" is doing real work in that sentence: the removal and the shutdown signal happen in parallel, so a pod that quits the instant it is told to can still drop a request it had already accepted. Handle the stop signal and finish what you started, and scaling down is as safe as scaling up.",
        check: { kind: "manual", label: "Scaled back to two" },
      },
    ],
    recap: [
      "You scaled a Deployment to five replicas with one command and watched new pods schedule without host port collisions.",
      "You listed Service endpoints and saw multiple pod IPs behind one stable name.",
      "You scaled back down to two, proving replica count is just another part of the desired state.",
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
      "maxSurge: how many EXTRA pods may exist during the update. Set to 1, you may temporarily run one more than you asked for.",
      "maxUnavailable: how many fewer than desired you'll tolerate. Set to 0, capacity never drops below the target.",
      "With surge 1 and unavailable 0, the sequence is: start one new pod, WAIT for its readiness probe to pass, then retire one old pod, repeat. The number of ready pods never drops below what you asked for. Old and new run side by side for a few seconds, which is worth knowing, because it means your two versions must be able to coexist briefly. Database migrations in particular need care for exactly this reason.",
      "If a new pod never becomes ready, the rollout stops and waits rather than continuing to destroy working pods. A broken deploy stalls instead of taking you down: that behavior alone justifies a lot of the complexity.",
      "This is the payoff for the readiness probe from Chapter 4. Without it Kubernetes couldn't tell whether a new pod was actually working, and holding capacity steady would be a guess.",
      "One honest caveat, because \"zero downtime\" gets said far too casually. Kubernetes holds capacity steady; it cannot make YOUR program finish the requests it already has. When a pod is retired it is pulled from the Service and sent SIGTERM, and what happens next is your code's business: an app that finishes in-flight requests and then exits drops nothing, while one that dies instantly on SIGTERM fails every request it was mid-way through. The rollout mechanism is half of no-downtime deploys; graceful shutdown in the application is the other half.",
    ],
    steps: [
      {
        instruction:
          "Trigger an update by changing the version the pods report. This changes the declaration, so every pod must be replaced.",
        dashboard: {
          view: "experiment",
          experiment: "k8s-rollout",
          label: "Open rolling update",
        },
        command: experienceCommand("k8s-rollout", "action"),
        commandParts: [
          { piece: "kubectl set env deployment/compute", meaning: "Change env on the pod template" },
          { piece: "SERVICE_VERSION=2.0.0", meaning: "Triggers a rolling update to a new 'version'" },
        ],
        saw: "\"updated\". The declaration changed, so the current pods no longer match it, and the replacement process starts immediately.",
        check: { kind: "manual", label: "I triggered the update" },
      },
      {
        instruction: "Watch the replacement happen. This samples the pod states a few times.",
        command:
          "for i in 1 2 3 4 5; do echo \"$(date +%H:%M:%S)  $(kubectl get pods -n container-quest -l app=compute --no-headers | awk '{print $3}' | sort | uniq -c | tr '\\n' ' ')\"; sleep 3; done",
        commandParts: [
          { piece: "for i in 1..5", meaning: "Poll a few times while the rollout runs" },
          { piece: "kubectl get pods ...", meaning: "Watch old pods terminate and new ones start" },
        ],
        saw: "A mix of Running and Terminating, and briefly MORE pods than you asked for: that's maxSurge in action. New ones came up before old ones went down. At no point did the number of working pods drop below your target.",
        check: { kind: "manual", label: "I watched the pods cycle" },
      },
      {
        instruction: "Confirm the rollout finished cleanly.",
        command: "kubectl rollout status deployment/compute -n container-quest --timeout=90s",
        commandParts: [
          { piece: "kubectl rollout status deployment/compute", meaning: "Block until the rollout finishes (or times out)" },
          { piece: "--timeout=90s", meaning: "Fail clearly if it takes too long" },
        ],
        saw: "\"successfully rolled out\". Every pod now runs the new configuration. Be precise about what that proves: the deployment converged, and because maxUnavailable is 0 the count of ready pods never fell below the target. It does not prove that zero requests failed, because nothing was sending any. Demonstrating that claim takes traffic running through the Service for the whole rollout plus an app that drains on SIGTERM, which is exactly what a load test during a deploy is for.",
        check: { kind: "manual", label: "I saw successfully rolled out" },
      },
      {
        instruction:
          "One more thing worth knowing: Kubernetes keeps the previous version, so undoing a bad deploy is one command.",
        command: experienceCommand("k8s-rollout", "reset"),
        commandParts: [
          { piece: "kubectl rollout undo deployment/compute", meaning: "Roll back to the previous ReplicaSet" },
        ],
        saw: "\"rolled back\". Same gradual, no-downtime process in reverse. This is the command you want to have practiced before the day you actually need it at 2am.",
        check: { kind: "manual", label: "I rolled it back" },
      },
    ],
    recap: [
      "You changed a deployment's declaration and watched Kubernetes replace every pod without being told how.",
      "You sampled the pods mid-rollout and saw MORE than you asked for, which is maxSurge: new ones come up before old ones go down.",
      "You confirmed the rollout converged, with maxUnavailable 0 keeping the ready count from dropping below the target the whole way through.",
      "You rolled it back with one command, which is the thing worth having practiced before the day you need it.",
    ],
    takeaway:
      "Rolling updates add new pods before removing old ones, gated on readiness, so capacity holds through a deploy and a broken deploy stalls instead of taking you down. Whether a request actually survives also depends on your app draining on SIGTERM.",
  },

  {
    id: "k8s-probes",
    chapter: 5,
    chapterTitle: "Kubernetes",
    title: "Probes, declared explicitly",
    minutes: 7,
    concept: [
      "In Chapter 4 you saw liveness and readiness as an idea. In Kubernetes they're explicit configuration, and getting them right is most of the difference between a deployment that heals itself and one that flaps.",
      "Every pod in your cluster right now has both. Liveness asks the health endpoint every ten seconds: if it fails repeatedly, the container is killed and restarted. Readiness asks a different endpoint every five seconds: if it fails, the pod is pulled out of the load balancer and gets no traffic, but is left running.",
      "Crucially, Kubernetes runs these checks from OUTSIDE the container. That's why the C service can have health checks at all despite having no shell and no tools inside it: nothing needs to run in there. This is a genuine improvement over Compose health checks, which have to execute a command inside the container and therefore need something in the image to execute.",
      "The failure mode to avoid, one more time because it causes real outages: never check dependencies in liveness. If your liveness probe fails whenever the database is slow, a brief database hiccup restarts every pod you have simultaneously. You've turned a small problem into a large one, and the restarts often make recovery slower.",
      "Rule of thumb: liveness answers \"am I broken beyond repair?\" Readiness answers \"can I serve right now?\"",
    ],
    steps: [
      {
        instruction: "Look at the probes configured on a running pod.",
        command:
          "kubectl get deployment compute -n container-quest -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}{\"\\n\"}{.spec.template.spec.containers[0].readinessProbe}{\"\\n\"}'",
        commandParts: [
          { piece: "kubectl get deployment ... -o jsonpath=", meaning: "Extract probe config from the live Deployment" },
          { piece: "livenessProbe / readinessProbe", meaning: "How Kubernetes checks the container" },
        ],
        saw: "Two probes, hitting two different paths on different schedules. Note they point at /healthz and /readyz, different endpoints, because they answer different questions.",
        check: { kind: "manual", label: "I saw both probes" },
      },
      {
        instruction:
          "Check the events Kubernetes has recorded for this namespace. This is where probe failures and scheduling decisions show up.",
        command:
          "kubectl get events -n container-quest --sort-by=.lastTimestamp 2>/dev/null | tail -12",
        commandParts: [
          { piece: "kubectl get events", meaning: "Cluster event log for the namespace" },
          { piece: "--sort-by=.lastTimestamp | tail -12", meaning: "Most recent dozen events" },
        ],
        saw: "A log of what the cluster has actually done: pods scheduled, images pulled, containers started, and any probe failures. This is the first place to look when a deployment isn't behaving, and it's much more informative than staring at pod status.",
        check: { kind: "manual", label: "I saw the event log" },
      },
      {
        instruction:
          "Look at the full story for one pod, including its probe configuration and recent events.",
        command:
          "kubectl describe pod -n container-quest $(kubectl get pods -n container-quest -l app=compute -o jsonpath='{.items[0].metadata.name}') | tail -25",
        commandParts: [
          { piece: "kubectl describe pod ...", meaning: "Full pod config + recent events (first stop when debugging)" },
          { piece: "$(kubectl get pods ...)", meaning: "Pick one compute pod by label" },
        ],
        saw: "`describe` is the workhorse command for debugging Kubernetes. It shows the pod's configuration, its current state, and the events affecting it, all in one place. When something is wrong and you don't know why, this is the command.",
        check: { kind: "manual", label: "I saw the pod description" },
      },
    ],
    recap: [
      "You read the liveness and readiness probes declared on a running compute pod.",
      "You checked namespace events, where probe failures and restarts show up when something goes wrong.",
      "You described a full pod and saw probe config and recent history in one place, including how checks run from outside the container.",
    ],
    takeaway:
      "Kubernetes probes run from outside the container, so even an image with no shell can be health-checked. Liveness restarts; readiness diverts.",
  },
];
