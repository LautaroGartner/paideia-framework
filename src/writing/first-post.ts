export const post = {
  slug: "building-paideia",
  title: "Building Paideia: Software That Explains Itself",
  label: "Paideia note",
  topics: [
    "inspectability",
    "system contracts",
    "framework notes",
  ],
  description:
    "Why I am building Paideia as a small framework for readable, inspectable, self-describing software systems.",
  publishedAt: "2026-05-20",
  body: `
Most software does not introduce itself.

It starts with a repository, a package file, a maze of conventions, and a long list of things you are supposed to already know. The first experience is not understanding. It is excavation. You open folders. You infer intent from filenames. You search for routes, build scripts, generated files, schemas, environment variables, and deployment assumptions. If the project is old enough, you also inherit a layer of folklore: why this file exists, why that output is checked in, why the build behaves differently on Tuesdays.

That is normal now. But it is strange.

A software system should be able to answer basic questions about itself. What was generated? What exists? What kind of artifact is this? Which build produced it? What capabilities does the runtime claim? Are the contracts valid? Is this output meant for humans, agents, or both?

Paideia is my attempt to build a small framework around that idea.

The premise is simple: generated systems should explain themselves.

Not through a huge dashboard. Not through a cloud control plane. Not by requiring a developer to memorize a framework's internal mythology. A generated system should carry a small set of readable files that describe its shape. Those files should live beside the output. They should be boring enough to inspect with a text editor. They should help humans and agents understand the system without guessing.

That is why Paideia emits system.json, context.json, llms.txt, and runtime.json. Each one has a job.

system.json is the system contract. It describes the generated site and its runtime structure. context.json is the compressed map for agents. It gives language models a concise summary of pages, posts, and important runtime facts. llms.txt is the plain-language guide. It tells agents where to start and what files matter. runtime.json is the runtime identity. It says what build produced the output, which artifacts exist, what kinds they are, how large they are, what capabilities the runtime declares, and whether the manifest is normalized.

This is not metadata for the sake of metadata.

The point is to reduce archaeology.

When a build finishes, the output should not feel like a pile of files. It should feel like a structured system. A person should be able to run paideia inspect and get a compact answer: framework version, build ID, page count, post count, artifact count, artifact kinds, capabilities, manifest state, diagnostic state. A machine should be able to read the same truth from runtime.json. A doctor command should be able to verify that the identity files are valid, that the artifact inventory points to real files, that the manifest is normalized, and that required capabilities are declared once.

This is the part that interests me most: inspectability is not decoration. It changes the relationship between the developer and the system.

Most frameworks optimize for power by hiding complexity behind conventions. That can be useful. It can also produce a kind of learned helplessness. You know how to run the framework, but you do not really know what it made. You know the magic words, but not the shape of the spell. You become fast at using the tool and slow at understanding the output.

Paideia is trying a different tradeoff.

It is not trying to be the biggest framework. It is not trying to compete with mature frontend ecosystems on breadth. It is not trying to own every layer of application development. It is trying to make small generated software more legible.

That constraint matters. The framework should remain tiny, readable, and finite. Every new surface has to earn its place by making the system more understandable or more verifiable. Artifact inventory earns its place because it answers what exists. A deterministic build ID earns its place because it answers whether the output changed. Capabilities earn their place because they answer what the runtime claims it can do. Doctor earns its place because it turns contracts into checks. Inspect earns its place because humans need a quick way to see the shape of the system.

But there is a danger here too.

It is very easy for a project like this to turn into metadata theater. Once you start describing a system, there is always one more thing to describe. One more field. One more contract. One more schema. One more layer that explains the layer that explains the layer. That way lies a very polished swamp.

So Paideia has to stay disciplined.

The goal is not infinite self-description. The goal is enough self-description to make the generated system understandable. The test is practical: does this help someone inspect, verify, debug, operate, or hand the system to an agent? If the answer is no, it probably does not belong.

This is also why Paideia is intentionally low dependency. A framework about readability should not require a cathedral of hidden machinery to explain a small website. It should be possible to read the generator, inspect the output, understand the runtime, and run the diagnostics without needing to trust a large stack of invisible behavior.

The agent angle is important, but not in the breathless way software often talks about AI.

Agents do not need mysticism. They need stable surfaces. They need files that say what exists. They need contracts that say what is valid. They need summaries that fit in context. They need deterministic identifiers so they can tell when something changed. They need runtime capabilities so they can reason about what tools are available without making things up.

Humans need the same things.

That is the quiet point under the whole project. The features that make software easier for agents often make it easier for humans too, as long as they stay explicit and boring. A good context file is useful for a model, but it is also useful for a tired developer. A good runtime identity is useful for automation, but it is also useful when you return to a project after three weeks and ask: what did this build produce?

Paideia began as a small experiment around inspectable runtimes and explicit contracts. It is now becoming a framework for self-describing generated systems. That sounds grand, but the implementation is deliberately modest. Generate the site. Emit the contracts. Validate the contracts. Describe the artifacts. Declare the capabilities. Provide a human inspect command. Keep the runtime small.

That is enough to create a different feeling.

The generated output no longer feels like residue from a build process. It feels like an object with identity. It has a contract. It has a map. It has a guide. It has a fingerprint. It has an inventory. It can be inspected. It can be checked.

That is the version of software I want more of.

Software that does not make understanding a scavenger hunt.

Software that can be handed to a human or an agent and say: here is what I am, here is what I made, here is what I can do, here is how to verify me.

That is what I am building with Paideia.
`,
  tokenSummary:
    "Long-form positioning essay about building Paideia as a small framework for self-describing generated systems with runtime identity, artifact inventory, deterministic build IDs, capabilities, diagnostics, and inspectability.",
};
