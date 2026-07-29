import type { NextConfig } from "next";

const config: NextConfig = {
  // teach: `standalone` makes Next emit a self-contained server bundle with only
  // teach: the node_modules it actually imports. It is the difference between a
  // teach: ~1 GB image (copying the whole workspace) and a ~200 MB one.
  //
  // Skipped on Vercel, which builds and runs Next its own way — asking for a
  // standalone server there is at best redundant and at worst confusing.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),

  // The contracts package ships raw TypeScript with no build step, so Next
  // has to compile it rather than treat it as a prebuilt dependency.
  transpilePackages: ["@quest/contracts"],

  // teach: dockerode reaches docker-modem → ssh2, which ships a native .node
  // binary. A bundler cannot inline machine code into a JavaScript chunk, so
  // the build fails. Marking these external leaves them as plain runtime
  // require()s. Any package with a native binding needs this treatment.
  serverExternalPackages: ["dockerode", "docker-modem", "ssh2"],

  // The monorepo root, not apps/dashboard — otherwise the standalone trace
  // misses hoisted node_modules and the image starts and immediately crashes.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default config;
