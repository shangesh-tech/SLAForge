// Copies the SLAForge ABI from the Foundry build into src/abi.js.
// Run after changing the contract: (cd ../protocol && forge build) && npm run abi
import { readFileSync, writeFileSync } from "node:fs";

const source = new URL("../../protocol/out/SLAForge.sol/SLAForge.json", import.meta.url);
const { abi } = JSON.parse(readFileSync(source, "utf8"));
writeFileSync(
  new URL("../src/abi.js", import.meta.url),
  "// Generated from protocol/out/SLAForge.sol/SLAForge.json by `npm run abi`.\n" +
    `export const slaForgeAbi = ${JSON.stringify(abi, null, 2)};\n`,
);
console.log(`Wrote src/abi.js (${abi.length} entries)`);
