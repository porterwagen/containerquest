import test from "node:test";
import assert from "node:assert/strict";

import { ServiceMeta, ChaosRequest } from "./meta.ts";
import { QuestEvent, Replica } from "./events.ts";
import { SERVICES, INFRA, ALL_SERVICES, byId } from "./services.ts";
import { CAPABILITY_NOTES } from "./driver.ts";

const sampleMeta = {
  service: "compute",
  language: "c",
  version: "1.0.0",
  gitSha: "abc1234",
  buildTime: "2026-07-29T00:00:00.000Z",
  hostname: "b3f0a1c9",
  podName: null,
  nodeName: null,
  namespace: null,
  uptimeSec: 12,
  requests: 3,
  pid: 1,
};

test("ServiceMeta accepts a well-formed payload", () => {
  const m = ServiceMeta.parse(sampleMeta);
  assert.equal(m.language, "c");
  assert.equal(m.podName, null);
});

test("ServiceMeta rejects an unknown language", () => {
  assert.equal(ServiceMeta.safeParse({ ...sampleMeta, language: "rust" }).success, false);
});

test("podName is nullable but not optional — Docker must explicitly report null", () => {
  const { podName, ...withoutPodName } = sampleMeta;
  assert.equal(ServiceMeta.safeParse(withoutPodName).success, false);
});

test("ChaosRequest defaults the duration", () => {
  assert.equal(ChaosRequest.parse({ action: "unready" }).durationMs, 15_000);
});

test("QuestEvent discriminates on type", () => {
  const e = QuestEvent.parse({
    type: "replica.restarted",
    at: Date.now(),
    service: "util",
    id: "util-7f9",
    restarts: 2,
  });
  assert.equal(e.type, "replica.restarted");
});

test("QuestEvent rejects an unknown type", () => {
  assert.equal(QuestEvent.safeParse({ type: "nope", at: 1, service: "x" }).success, false);
});

test("Replica phases cover the full Kubernetes lifecycle", () => {
  for (const phase of ["Pending", "Starting", "Ready", "Unready", "Terminating", "Gone"]) {
    assert.equal(Replica.shape.phase.safeParse(phase).success, true, phase);
  }
});

test("every service is one of the five languages the project promises", () => {
  const langs = new Set(SERVICES.map((s) => s.language));
  assert.deepEqual([...langs].sort(), ["c", "go", "python", "typescript"]);
});

test("service ids are unique and every dependency resolves", () => {
  const ids = ALL_SERVICES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate service id");
  for (const s of ALL_SERVICES) {
    for (const dep of s.dependsOn) {
      assert.ok(byId(dep), `${s.id} depends on unknown service "${dep}"`);
    }
  }
});

test("host ports do not collide", () => {
  const ports = ALL_SERVICES.map((s) => s.hostPort);
  assert.equal(new Set(ports).size, ports.length, "two services claim the same host port");
});

test("infra services are marked as infra, not as a language", () => {
  assert.deepEqual(INFRA.map((s) => s.language), ["infra", "infra"]);
});

test("every capability has a note explaining the gap to the user", () => {
  for (const key of ["reschedules", "rollingUpdate", "separateProbes", "nodes"] as const) {
    assert.ok(CAPABILITY_NOTES[key].length > 20, `${key} needs a real explanation`);
  }
});
