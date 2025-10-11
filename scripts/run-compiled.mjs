import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.resolve(__dirname, "../.tmp-compile/dateFormatter.js");

console.log("🔹 Importing from:", file);

const mod = await import(file);

const samples = [
  "2025-10-02T14:00:00Z",
  "2025-12-25T00:00:00Z",
  new Date().toISOString(),
];

for (const s of samples) {
  const formatted = mod.formatDateForUI(s, "Asia/Beirut");
  console.log(`INPUT: ${s}`);
  console.log("OUTPUT:", formatted);
  console.log("----------------------------");
}
