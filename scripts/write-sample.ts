import { mkdirSync, writeFileSync } from "node:fs";
import { createSampleProject } from "../src/domain/sample";
import { serializeProjectFile, wrapProject } from "../src/persistence/file";

mkdirSync("samples", { recursive: true });
writeFileSync("samples/courtyard-studio.lintel", serializeProjectFile(wrapProject(createSampleProject())));
console.log("Wrote samples/courtyard-studio.lintel");
