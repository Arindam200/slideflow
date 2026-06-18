/**
 * List (or create) Corsair instances and print their IDs.
 *
 * Usage (Node 22+, loads .env.local for CORSAIR_DEV_KEY):
 *   node --env-file=.env.local scripts/corsair-instances.mjs
 *   node --env-file=.env.local scripts/corsair-instances.mjs --create corsair-deck
 *
 * Copy the printed id into .env.local as CORSAIR_INSTANCE_ID=...
 */
import { createClient } from "@corsair-dev/app";

const key = process.env.CORSAIR_DEV_KEY;
if (!key) {
  console.error("✗ CORSAIR_DEV_KEY is not set. Add it to .env.local (starts with ch_).");
  process.exit(1);
}

const corsair = createClient({ apiKey: key });

const createFlag = process.argv.indexOf("--create");
const createName = createFlag !== -1 ? process.argv[createFlag + 1] : null;

try {
  if (createName) {
    const inst = await corsair.instances.create({ name: createName });
    console.log(`\n✓ Created instance "${createName}"\n`);
    console.log(`CORSAIR_INSTANCE_ID=${inst.id}\n`);
    process.exit(0);
  }

  const { instances } = await corsair.instances.list();
  if (instances.length === 0) {
    console.log("\nNo instances yet. Create one with:");
    console.log("  node --env-file=.env.local scripts/corsair-instances.mjs --create corsair-deck\n");
    process.exit(0);
  }

  console.log("\nYour Corsair instances:\n");
  for (const i of instances) {
    console.log(`  ${i.name.padEnd(20)} ${i.status?.padEnd(10) ?? ""} id: ${i.id}`);
  }
  console.log("\nPut the id you want into .env.local:");
  console.log(`  CORSAIR_INSTANCE_ID=${instances[0].id}\n`);
} catch (e) {
  console.error("\n✗ Request failed:", e?.message || e);
  console.error("  Check that CORSAIR_DEV_KEY is valid (https://app.corsair.dev/dashboard).\n");
  process.exit(1);
}
