// Prunes non-runtime files that Next standalone tracing sweeps into
// .next/standalone (whole src/, electron/, docs, configs...).
// Keeps exactly what the prod server needs:
//   server.js, package.json, .next/, node_modules/ (traced), public/
// Run automatically as part of `npm run build:exe`.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", ".next", "standalone");
const dirs = ["src", "electron", "dist"];
const fileRes = [
  /\.md$/i,
  /\.vbs$/i,
  /\.bat$/i,
  /\.log$/i,
  /^LICENSE$/i,
  /^next\.config\./,
  /^next-env\.d\.ts$/i,
  /^postcss\.config/,
  /^tsconfig/,
  /^package-lock\.json$/,
];

let removed = 0;
for (const d of dirs) {
  try {
    fs.rmSync(path.join(root, d), { recursive: true, force: true });
    removed++;
    console.log("pruned dir", d);
  } catch (e) {
    console.log("skip", d, e.message);
  }
}
for (const f of fs.readdirSync(root)) {
  if (fileRes.some((re) => re.test(f))) {
    try {
      fs.rmSync(path.join(root, f), { force: true });
      removed++;
      console.log("pruned file", f);
    } catch (e) {
      console.log("skip", f, e.message);
    }
  }
}
console.log(`prune-standalone: removed ${removed} entries`);
