import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { fileTests as runTestFile } from "@lezer/generator/dist/test";
import { n8nLanguage } from "../dist/index.js";

const CASES_DIR = path.dirname(fileURLToPath(import.meta.url));

for (const testFile of fs.readdirSync(CASES_DIR)) {
  if (!/\.txt$/.test(testFile)) continue;

  const name = /^[^\.]*/.exec(testFile)[0];

  describe(name, () => {
    for (const { name, run } of runTestFile(
      fs.readFileSync(path.join(CASES_DIR, testFile), "utf8"),
      testFile
    )) {
      it(name, () => run(n8nLanguage.parser));
    }
  });
}
