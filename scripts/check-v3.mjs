import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const problems = [];

function must(ok, message) {
  if (!ok) problems.push(message);
}

// --- V3 rules: default deny on the 13 canonical collections ---
const rulesPath = resolve(root, "firestore.rules.v3");
must(existsSync(rulesPath), "firestore.rules.v3 missing");
const rules = existsSync(rulesPath) ? readFileSync(rulesPath, "utf8") : "";
must(rules.startsWith("rules_version = '2'"), "firestore.rules.v3 must declare rules_version 2");
const canonical = [
  "users",
  "handles",
  "profiles",
  "places",
  "events",
  "tickets",
  "orders",
  "deals",
  "dealClaims",
  "cohorts",
  "conversations",
  "audits",
  "rateLimits",
];
for (const name of canonical) {
  must(rules.includes(`match /${name}/`), `firestore.rules.v3 must declare /${name}/`);
}
must(rules.includes("match /claims/{claimId}"), "firestore.rules.v3 must lock place claims to functions");
must(rules.includes("match /{document=**}"), "firestore.rules.v3 must end with a default-deny catch-all");
// Every write grant must be `if false`: all V3 writes go through Functions.
for (const line of rules.split("\n")) {
  const trimmed = line.trim();
  if (/allow\b.*\bwrite\b/.test(trimmed) && !trimmed.endsWith("if false;")) {
    problems.push(`firestore.rules.v3 grants a client write: ${trimmed}`);
  }
}
// Every list is denied: clients read referenced docs by id with `get` only.
for (const line of rules.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("allow list") && !trimmed.endsWith("if false;") && !trimmed.includes("v3ParentOwner")) {
    problems.push(`firestore.rules.v3 grants an unexpected list: ${trimmed}`);
  }
}

// --- V3 indexes: canonical collections only ---
const indexesPath = resolve(root, "firestore.indexes.v3.json");
must(existsSync(indexesPath), "firestore.indexes.v3.json missing");
try {
  const defined = JSON.parse(readFileSync(indexesPath, "utf8")).indexes || [];
  must(defined.length > 0, "firestore.indexes.v3.json must define indexes");
  const serverSubcollections = ["claims"];
  for (const entry of defined) {
    must(
      canonical.includes(entry.collectionGroup) || serverSubcollections.includes(entry.collectionGroup),
      `firestore.indexes.v3.json must stay canonical (found ${entry.collectionGroup})`,
    );
  }
  must(
    defined.some((entry) => entry.collectionGroup === "claims"),
    "firestore.indexes.v3.json must index the claims review queue",
  );
} catch {
  problems.push("firestore.indexes.v3.json is not valid JSON");
}

// --- V3 emulator config points at the V3 files ---
const v3configPath = resolve(root, "firebase.v3.json");
must(existsSync(v3configPath), "firebase.v3.json missing");
if (existsSync(v3configPath)) {
  const config = JSON.parse(readFileSync(v3configPath, "utf8"));
  must(config.firestore?.rules === "firestore.rules.v3", "firebase.v3.json must use firestore.rules.v3");
  must(
    config.firestore?.indexes === "firestore.indexes.v3.json",
    "firebase.v3.json must use firestore.indexes.v3.json",
  );
}

// --- Shared contract pins the canonical set ---
const contract = readFileSync(resolve(root, "shared", "v3-contract.ts"), "utf8");
must(contract.includes("V3_CANONICAL_COLLECTIONS"), "shared/v3-contract must export V3_CANONICAL_COLLECTIONS");
for (const name of canonical) {
  must(contract.includes(`"${name}"`), `shared/v3-contract must list ${name}`);
}

// --- Callable domains: 7 modules behind the v3 barrel ---
const domains = ["common", "identity", "discovery", "events", "business", "commerce", "trust", "messaging", "index"];
for (const name of domains) {
  must(existsSync(resolve(root, "functions", "src", "v3", `${name}.ts`)), `functions/src/v3/${name}.ts missing`);
}
const barrel = readFileSync(resolve(root, "functions", "src", "v3", "index.ts"), "utf8");
const exported = [...barrel.matchAll(/\bv3[A-Z][A-Za-z]+\b/g)].map((m) => m[0]);
must(exported.length >= 32, `functions/src/v3/index.ts must export 32+ v3 callables (found ${exported.length})`);
// Money paths stay in commerce.ts.
for (const name of ["identity", "discovery", "events", "business", "trust", "messaging"]) {
  const body = readFileSync(resolve(root, "functions", "src", "v3", `${name}.ts`), "utf8");
  must(!body.includes("stripe."), `functions/src/v3/${name}.ts must not call Stripe directly`);
}

// --- Frontend boundary: read-only adapters behind the local gate ---
for (const name of ["gate", "client", "reads"]) {
  must(existsSync(resolve(root, "src", "lib", "v3", `${name}.ts`)), `src/lib/v3/${name}.ts missing`);
}
const gate = readFileSync(resolve(root, "src", "lib", "v3", "gate.ts"), "utf8");
must(gate.includes("VITE_V3_ADAPTERS"), "src/lib/v3/gate.ts must check VITE_V3_ADAPTERS");
must(gate.includes("VITE_USE_FIREBASE_EMULATOR"), "src/lib/v3/gate.ts must require the emulator");
for (const name of ["gate", "client", "reads"]) {
  const body = readFileSync(resolve(root, "src", "lib", "v3", `${name}.ts`), "utf8");
  for (const banned of ["setDoc", "updateDoc", "deleteDoc", "addDoc"]) {
    must(!body.includes(banned), `src/lib/v3/${name}.ts must not use ${banned}`);
  }
}

// Claim UI: page, shell, form, review queue behind the gate; no direct writes.
must(existsSync(resolve(root, "src", "pages", "ClaimVenuePage.tsx")), "src/pages/ClaimVenuePage.tsx missing");
for (const name of ["ClaimShell.tsx", "ClaimVenueForm.tsx", "ClaimReviewQueue.tsx"]) {
  must(existsSync(resolve(root, "src", "components", "claim", name)), `src/components/claim/${name} missing`);
}
for (const entry of readdirSync(resolve(root, "src", "components", "claim"))) {
  if (!entry.endsWith(".tsx")) continue;
  const body = readFileSync(resolve(root, "src", "components", "claim", entry), "utf8");
  for (const banned of ["setDoc", "updateDoc", "deleteDoc", "addDoc", "httpsCallable"]) {
    must(!body.includes(banned), `src/components/claim/${entry} must not use ${banned} (use src/lib/v3/client)`);
  }
  must(
    body.includes("isV3AdaptersEnabled") || entry === "ClaimShell.tsx",
    `src/components/claim/${entry} must check the V3 gate`,
  );
}
const routes = readFileSync(resolve(root, "src", "app", "routes.tsx"), "utf8");
must(routes.includes('path="/claim"'), "src/app/routes.tsx must register /claim");
const adminTabs = readFileSync(resolve(root, "src", "components", "admin", "AdminOverview.tsx"), "utf8");
must(adminTabs.includes('"claims"'), "AdminOverview must list the claims review tab");

// --- Wiring: scripts, env example ---
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
for (const script of ["emu:v3", "v3:check"]) {
  must(pkg.scripts?.[script], `package.json must define npm run ${script}`);
}
must(String(pkg.scripts?.verify || "").includes("v3:check"), "npm run verify must include v3:check");
must(
  readFileSync(resolve(root, ".env.example"), "utf8").includes("VITE_V3_ADAPTERS"),
  ".env.example must document VITE_V3_ADAPTERS",
);

if (problems.length) {
  console.error("V3 contract check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("V3 contract check passed.");
