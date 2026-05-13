import { ai } from "../../src/ai.js";
import { email, select, string } from "../../src/fields.js";
import { resource } from "../../src/resource.js";

export const leadResource = resource(
  "Lead",
  {
    name: string("Name").required().min(2),
    email: email("Email").required(),
    status: select(["new", "contacted", "closed"], "Status").required(),
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
