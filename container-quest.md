## Application concept

Build a polished interactive application called **Container Quest**.

Container Quest is not simply a Next.js application. It is a miniature production platform built from multiple independent services running in different languages.

The purpose is to teach Docker and Kubernetes through a realistic distributed system while making the infrastructure visible and interactive.

The dashboard should feel like a mission control center where I can observe services communicating, containers starting, workers processing jobs, deployments rolling out, failures occurring, and Kubernetes recovering automatically.

The UI should intentionally visualize concepts that are normally invisible.

Examples include:

- Live request flow
- Service-to-service communication
- Queue depth
- Active workers
- Container identity
- Pod identity
- Restart counts
- Health checks
- Rolling deployments
- Replica counts
- Network requests
- Logs
- Resource usage
- Service versions
- Deployment history

The dashboard itself becomes the primary learning tool.

---

## Architecture

The finished system should consist of several independently deployable services.

Each service should live in its own folder, own Docker image, and own Kubernetes Deployment.

Suggested architecture:

```text
Browser
      │
      ▼
Next.js Dashboard (TypeScript)
      │
      ├──────────────► PostgreSQL
      │
      ├──────────────► Redis
      │
      ├──────────────► Node Worker
      │
      ├──────────────► Python AI Service
      │
      ├──────────────► Go Utility Service
      │
      └──────────────► Optional Native C Service
```

Every service should expose:

- Health endpoint
- Version endpoint
- Service metadata
- Container hostname
- Pod hostname (later)
- Uptime
- Request counter
- Build version

The dashboard should identify exactly which service and container handled every request.

---

## Technology progression

The goal is to demonstrate that Docker and Kubernetes are infrastructure technologies—not JavaScript technologies.

We will progressively add services written in different languages.

### Phase 1

- Next.js (TypeScript)
- PostgreSQL
- Redis

### Phase 2

- Separate Node.js worker

### Phase 3

- Python FastAPI AI service

Use Python to simulate AI workloads, embeddings, image processing, OCR, or inference.

The implementation can initially be mocked.

### Phase 4

- Go microservice

Use Go for a lightweight high-performance API.

Examples:

- Metrics aggregation
- File hashing
- Compression
- Health aggregation
- Streaming responses

Explain why Go is popular for cloud infrastructure.

### Phase 5

- Optional native C application

Create a small compiled service that performs a computational task.

Examples:

- Mandelbrot generation
- Image filtering
- Prime calculation
- Matrix multiplication

The objective is to demonstrate that Docker packages compiled native applications exactly the same way it packages Node.js or Python applications.

---

## Teaching objective

Throughout the project, continually reinforce the following idea:

Docker and Kubernetes do **not** care whether an application is written in:

- TypeScript
- JavaScript
- Python
- Go
- Java
- Rust
- C
- C++
- .NET

They simply run Linux processes inside containers.

Every time a new service is introduced:

1. Explain why that language was chosen.
2. Explain how it is packaged into a Docker image.
3. Compare its Dockerfile to the previous services.
4. Show that Kubernetes deploys it exactly the same way.
5. Visualize the service running alongside the others in the dashboard.

By the end of the project I should naturally understand that Docker and Kubernetes operate above the application layer, making the concepts transferable to software systems in startups, SaaS platforms, enterprise environments, robotics, aerospace, defense, finance, AI infrastructure, and embedded Linux systems.

---

## Visual mission control

The application should be visually impressive.

Think:

- NASA mission control
- Kubernetes dashboard
- Grafana
- Linear
- Raycast
- Vercel dashboard

The dashboard should make invisible infrastructure concepts visible through animation and interaction.

I should be able to intentionally:

- Crash services
- Restart containers
- Scale replicas
- Simulate network failures
- Simulate database outages
- Trigger rolling deployments
- Watch Kubernetes recover automatically

The dashboard should become more sophisticated throughout the course until it resembles a real production operations center.
