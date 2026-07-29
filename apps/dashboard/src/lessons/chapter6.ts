import type { Lesson } from "./types";

/**
 * Chapter 6 — Ship something of your own.
 *
 * The transfer chapter. Everything so far has been on a system someone else
 * built; here you containerise a program you wrote and put it on the cluster.
 * The lessons deliberately create a throwaway app so the steps work for
 * everyone, and then explain how to swap in your real project.
 */

export const CHAPTER_6: Lesson[] = [
  {
    id: "own-dockerfile",
    chapter: 6,
    chapterTitle: "Ship your own app",
    title: "Containerise a program you wrote",
    minutes: 12,
    concept: [
      "Everything so far has been someone else's system. Now you'll take a program, write the instructions to package it, and get a container running from it.",
      "The recipe for packaging anything is always the same four questions. Whatever language you use, you're answering these:",
      "1. What does it need to run? That's your base image — node, python, golang, or a bare Linux if your program is self-contained.\n2. What files does it need? Copy them in — dependency list first, source code after, for the caching reasons from Chapter 2.\n3. How do you install its dependencies? One command, run at build time.\n4. How do you start it? The startup command.",
      "That's a Dockerfile. Five or six lines for a simple program.",
      "To make this work identically for everyone, the first step creates a tiny web app in a scratch folder. If you'd rather use a real project of your own, skip to the notes at the end of this lesson — the steps are the same, only the base image and start command change.",
      "One thing to get right immediately, because it's the mistake everyone makes: make your program listen on 0.0.0.0, not localhost. From Chapter 3 you know why — inside a container, localhost means only that container, and your app will be unreachable while insisting it's running.",
    ],
    steps: [
      {
        instruction:
          "Create a small app and its Dockerfile in a scratch folder. This writes both files for you.",
        command:
          "mkdir -p ~/quest-myapp && cd ~/quest-myapp && printf 'const http = require(\"http\");\\nconst PORT = process.env.PORT || 4000;\\nhttp.createServer((req, res) => {\\n  res.writeHead(200, {\"content-type\": \"application/json\"});\\n  res.end(JSON.stringify({ app: \"my-first-container\", host: require(\"os\").hostname() }));\\n}).listen(PORT, \"0.0.0.0\", () => console.log(\"listening on \" + PORT));\\n' > server.js && printf 'FROM node:24-alpine\\nWORKDIR /app\\nCOPY server.js .\\nEXPOSE 4000\\nCMD [\"node\", \"server.js\"]\\n' > Dockerfile && ls -la",
        saw: "Two files. server.js is a web server in about eight lines — note the \"0.0.0.0\" in there. The Dockerfile is five lines: pick a base, set a working folder, copy the code in, note the port, say how to start it. That's a complete, valid image definition.",
        check: { kind: "manual", label: "I created both files" },
      },
      {
        instruction: "Build it into an image. The dot at the end means 'build from this folder'.",
        command: "cd ~/quest-myapp && docker build -t myapp:1.0.0 .",
        saw: "It fetched the Node base image if it didn't have it, copied your file in, and produced an image. You now have a portable, self-contained package of your program — the exact same kind of artifact as every image in this project.",
        check: { kind: "manual", label: "The build succeeded" },
      },
      {
        instruction: "Run it, publishing port 4000 so you can reach it.",
        command: "docker run -d --name myapp -p 4000:4000 myapp:1.0.0 && sleep 2 && curl -s localhost:4000",
        saw: "Your app answered, and told you the container's hostname. You wrote a program, packaged it, and ran it in a container — and this image would behave identically on any machine with Docker, with no setup instructions attached.",
        check: { kind: "manual", label: "My app responded" },
      },
      {
        instruction: "Clean up the running container. The image stays for the next lesson.",
        command: "docker rm -f myapp",
        saw: "Stopped and removed. The image is still there — you'll deploy it to Kubernetes next.",
        check: { kind: "manual", label: "Cleaned up" },
      },
    ],
    takeaway:
      "A Dockerfile answers four questions: what it runs on, what files it needs, how to install dependencies, how to start. That's it.",
    source: {
      path: "~/quest-myapp/Dockerfile",
      note: "To use a real project instead: change the base image to match your language, copy your dependency file and install it before copying source, and set the start command.",
    },
  },

  {
    id: "own-deploy",
    chapter: 6,
    chapterTitle: "Ship your own app",
    title: "Put your app on the cluster",
    minutes: 12,
    concept: [
      "Now the same app goes onto Kubernetes. Two things need to happen: the cluster needs the image, and you need to declare what should run.",
      "GETTING THE IMAGE THERE. Normally you'd push it to a registry and the cluster would pull it. Your local cluster has a shortcut — you can hand images to it directly, which is what this project has been doing all along and why you've never needed a registry account.",
      "DECLARING WHAT SHOULD RUN. You need a Deployment (what image, how many copies) and usually a Service (a stable name in front of them). You can write these as a YAML file, and for real work you should — it lives in version control alongside your code.",
      "But Kubernetes can also generate them for you, which is much friendlier for a first time. You'll create a deployment with one command, then look at the YAML it produced. Reading generated configuration is a genuinely good way to learn the shape of it.",
      "One thing to watch: your image only exists locally, so you must tell Kubernetes not to try downloading it. Otherwise it'll reach for Docker Hub, fail to find `myapp`, and sit in ImagePullBackOff — which is far and away the most common first-deployment failure.",
    ],
    steps: [
      {
        instruction: "Hand your image to the cluster.",
        command: "kind load docker-image myapp:1.0.0 --name container-quest",
        saw: "The image was copied onto each node. In production this step is `docker push` to a registry instead, and the cluster pulls it — but the effect is the same: the machines that will run your app now have the image.",
        check: { kind: "manual", label: "The image loaded" },
      },
      {
        instruction: "Create a deployment with two copies of your app.",
        command:
          "kubectl create deployment myapp --image=myapp:1.0.0 --replicas=2 -n container-quest && kubectl patch deployment myapp -n container-quest -p '{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"myapp\",\"imagePullPolicy\":\"IfNotPresent\"}]}}}}'",
        saw: "Created, then patched so it uses the local image instead of trying to download one. Your declaration now exists: two copies of myapp should always be running.",
        check: { kind: "manual", label: "Deployment created" },
      },
      {
        instruction: "Watch your pods start.",
        command: "sleep 10; kubectl get pods -n container-quest -l app=myapp -o wide",
        saw: "Two pods of YOUR application, scheduled onto the cluster's worker machines. Everything you learned in Chapter 5 now applies to them — delete one and it comes back, scale them with one number, roll out a new version without downtime.",
        check: { kind: "manual", label: "My pods are running" },
      },
      {
        instruction: "Give them a stable name and reach your app through it.",
        command:
          "kubectl expose deployment myapp -n container-quest --port=4000 --target-port=4000 >/dev/null; kubectl port-forward -n container-quest svc/myapp 4400:4000 >/dev/null 2>&1 & sleep 4; curl -s localhost:4400; echo; curl -s localhost:4400; echo; kill %1 2>/dev/null",
        saw: "Two responses — and look at the hostnames. They're different, because the service load-balanced your two requests across your two pods. Your application is now running redundantly across multiple machines, behind a load balancer, with automatic restart if anything dies. That's a real deployment.",
        check: { kind: "manual", label: "I saw two different hostnames" },
      },
    ],
    takeaway:
      "Get the image to the cluster, declare a Deployment and a Service, and everything Kubernetes does for the built-in services now works for yours too.",
  },

  {
    id: "where-next",
    chapter: 6,
    chapterTitle: "Ship your own app",
    title: "What you know, and what's next",
    minutes: 6,
    concept: [
      "Worth stopping to name what you can now actually do, because it's more than it feels like from the inside.",
      "You can explain what a container is and why it isn't a virtual machine. You can read a Dockerfile, build an image, and know why one image is 200 MB and another 200 kB. You can debug a container that won't start. You know why a health check that tests your database can take down your entire fleet. You can deploy to Kubernetes, scale it, roll out a new version without downtime, and roll it back.",
      "That's genuinely the working knowledge of someone who's been doing this professionally for a while. The remaining gap is mostly practice and specifics, not concepts.",
      "The honest advice on what to learn next, in order of how likely you are to need it:",
      "• CONFIGMAPS AND SECRETS — the proper Kubernetes way to supply configuration and credentials, rather than environment variables written into a deployment file.\n• INGRESS — how real traffic from the internet reaches your services, with hostnames and TLS certificates. Everything you've done used port-forward, which is a debugging tool, not a way to serve users.\n• RESOURCE REQUESTS AND LIMITS — telling the scheduler how much CPU and memory your pods need. Getting these wrong is the most common cause of mysterious production problems.\n• HELM — templating for Kubernetes YAML, because you'll get tired of copying nearly-identical files.\n• CI/CD — building and deploying images automatically when you push code.",
      "And one strategic thought worth carrying: most systems do not need Kubernetes. A single server running Compose is a completely legitimate production setup and is dramatically simpler to operate. Kubernetes earns its complexity when you genuinely need multiple machines, zero-downtime deploys, or automatic recovery from hardware failure. Knowing when NOT to reach for it is as valuable as knowing how to use it.",
    ],
    steps: [
      {
        instruction:
          "Clean up the app you deployed, so your cluster is tidy. Your image stays if you want to keep experimenting.",
        command:
          "kubectl delete deployment,service myapp -n container-quest 2>/dev/null; echo 'cleaned up'",
        saw: "Removed. Note that deleting the deployment removed its pods too — they were owned by it. That ownership is how Kubernetes tracks what belongs to what, and why deleting a namespace cleans up everything inside it.",
        check: { kind: "manual", label: "Cleaned up" },
      },
      {
        instruction:
          "One last look at the cluster you've been working on, still running everything else quite happily.",
        command: "kubectl get all -n container-quest",
        saw: "Deployments, pods, services, and replicasets — the objects you now understand. When you started this course, none of these words meant anything.",
        check: { kind: "manual", label: "I looked at the cluster" },
      },
    ],
    takeaway:
      "You can containerise an app, deploy it redundantly, scale it, and update it without downtime. Next: ConfigMaps, Ingress, resource limits — and knowing when a single server is the better answer.",
  },
];
