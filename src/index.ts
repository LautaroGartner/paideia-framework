import { mkdirSync, writeFileSync } from "fs";
import { ai } from "./ai.js";
import { generateDatabaseSchema } from "./database.js";
import { email, select, string } from "./fields.js";
import { generateSystemManifest } from "./manifest.js";
import { generatePage } from "./page.js";
import { resource } from "./resource.js";

const leadResource = resource(
  "Lead",
  {
    name: string("Name").required().min(2),

    email: email("Email").required(),

    status: select(
      ["new", "contacted", "closed"],
      "Status"
    ).required(),

    notes: string("Notes"),
  },

  {
    storage: "local",

    permissions: {
      create: "public",
      update: "public",
      delete: "admin",
      ai: "authenticated",
    },

    actions: [
      {
        name: "markContacted",
        label: "Mark contacted",
        type: "update",
        set: {
          status: "contacted",
        },
        log: "Lead was marked as contacted.",
      },

      ai.summarizeRecord({
        name: "summarize",
        label: "Summarize",
        log: "AI summary generated for one Lead record.",
      }),

      {
        name: "close",
        label: "Close",
        type: "update",
        set: {
          status: "closed",
        },
        log: "Lead was closed.",
      },
    ],
  }
);

mkdirSync("dist", { recursive: true });

writeFileSync("dist/index.html", generatePage(leadResource));
writeFileSync("dist/schema.sql", generateDatabaseSchema(leadResource));
writeFileSync("dist/system.json", generateSystemManifest(leadResource));

console.log("Generated dist/index.html");
console.log("Generated dist/schema.sql");
console.log("Generated dist/system.json");
