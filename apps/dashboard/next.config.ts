import type { NextConfig } from "next";

const config: NextConfig = {
  // teach: `standalone` makes Next emit a self-contained server bundle with only
  // teach: the node_modules it actually imports. It is the difference between a
  // teach: ~1 GB image (copying the whole workspace) and a ~200 MB one.
  output: "standalone",

  // The contracts package ships raw TypeScript with no build step, so Next
  // has to compile it rather than treat it as a prebuilt dependency.
  transpilePackages: ["@quest/contracts"],

  // The monorepo root, not apps/dashboard — otherwise the standalone trace
  // misses hoisted node_modules and the image starts and immediately crashes.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default config;
