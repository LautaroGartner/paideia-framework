import { posts } from "./writing/index.js";

export type SitePage = {
  path: string;
  title: string;
  description?: string;
  body: string;
  nav?: boolean;
  tokenSummary?: string;
};

export type WritingPost = {
  slug: string;
  title: string;
  label?: string;
  topics?: string[];
  description: string;
  publishedAt: string;
  body: string;
  tokenSummary: string;
};

export type SiteDefinition = {
  title: string;
  description: string;
  url?: string;
  author?: string;
  language?: string;
  pages: SitePage[];
  posts: WritingPost[];
};

export function defineSite(site: SiteDefinition): SiteDefinition {
  return site;
}

export const site = defineSite({
  title: "Lautaro Gärtner's blog",
  description: "Building Paideia Framework: self-describing software systems.",
  url: "https://lautarogartner.com",
  author: "Lautaro Gärtner",
  language: "en",
  posts,
  pages: [
    {
      path: "/",
      title: "Lautaro Gärtner's blog",
      description:
        "Personal site for Lautaro Gärtner and Paideia Framework.",
      body: "",
      nav: false,
      tokenSummary:
        "Minimal article index for Lautaro Gärtner's blog about Paideia Framework and self-describing systems.",
    },
    {
      path: "/about",
      title: "About",
      description: "About Lautaro Gärtner, Paideia, and this site.",
      body: `
This site is the public notebook for Paideia Framework.

Paideia is an experiment in small generated software systems that can explain themselves. That phrase can sound larger than the code, so it is worth saying plainly what it means. When a system is generated, it should not leave behind a pile of files and ask the next person to guess what happened. It should describe what it made, why those artifacts exist, what capabilities the runtime claims, and how a human or agent can inspect the result before trusting it.

Most software starts from a strange place. You open a repository and immediately begin archaeology. You inspect folders, read package scripts, infer conventions, search for routes, and try to understand which files are source, which are generated, which are runtime surfaces, and which are just leftovers from an earlier decision. That work is normal, but it is not especially humane. It asks the developer to reconstruct the system from clues.

Paideia is interested in a different default.

The default should be legibility. A build should be able to say: here is what I produced, here is the site map, here is the runtime identity, here are the declared capabilities, here is the compact context an agent can read, and here is how to verify that the contract still holds. None of that needs to be magical. In fact, it is better when it is boring. Plain files are easier to inspect than dashboards. Small contracts are easier to trust than hidden conventions. A runtime that can name its own artifacts is easier to review than one that asks you to believe the framework.

That is the practical center of the project. Paideia emits files like system.json, runtime.json, context.json, and llms.txt because those files make the generated system easier to understand. system.json is the contract. runtime.json is the identity and artifact inventory. context.json is a compact map for agents and tired humans. llms.txt is a simple guide that says where to begin. These files do not replace reading the code. They make reading the code less blind.

The writing here is part of the same idea.

I do not want the site to feel like a product page for a framework. I want it to feel like a working notebook with a public surface: essays, release notes, design decisions, doubts, and explanations about why the framework is shaped the way it is. Paideia is small enough that every feature should have a reason. If a new artifact appears, it should earn its place. If a capability is declared, it should be understandable. If a command exists, it should answer a real question.

The project also has an agent angle, but not in the breathless way software sometimes talks about AI. Agents are more useful when the systems around them are explicit. They need stable maps, readable summaries, deterministic identifiers, and contracts that say what is valid. Humans need the same things. The overlap is the interesting part. Work that helps an agent understand a system often helps a person return to that system after a week away and ask: what is this, what changed, and where should I start?

That is why Paideia treats generated output as something with identity rather than residue from a build. A generated site can have a shape. A runtime can have a declared set of capabilities. A contract can be validated. An artifact inventory can be checked against the files on disk. A build ID can make change visible. These are small moves, but they change the posture of the system. They make understanding a built-in surface instead of an afterthought.

This blog is where I will keep working through those choices.

Some posts will be conceptual: why generated systems should explain themselves, why inspectability matters, how agent context should be designed, what good runtime identity looks like. Some posts will be closer to field notes: what changed in a release, what felt wrong, what got simplified, what needs to be removed before the project becomes too clever. The goal is not to make Paideia look more finished than it is. The goal is to make the thinking inspectable too.

There is a discipline I want the project to keep.

Paideia should stay small. It should prefer readable files over invisible machinery. It should avoid metadata theater. It should not describe everything just because it can. The test is practical: does this help someone inspect, verify, debug, operate, or hand the system to an agent with less guessing? If the answer is no, the feature probably does not belong yet.

That constraint is also why the public surface is minimal. The site should not shout. It should not pretend to be a mature platform with a marketing department. It should put the writing first, keep the system files available, and let the project explain itself through its own artifacts.

I am also using this site as a pressure test for the framework. If Paideia says generated systems should be inspectable, then the site generated by Paideia should be inspectable. If the framework claims that context files help agents navigate a project, then this site should publish those context files. If the runtime identity is supposed to be useful, it should be present here in the same way it would be present for another project. The blog is not separate from the framework. It is one of the first objects the framework has to explain.

That makes the design work matter too. A self-describing system should not feel clinical by default. It can be quiet, warm, and readable. It can have enough identity to feel made by a person without turning into decoration. The visual direction here is intentionally restrained: a writing index, calm colors, small metadata, and a few Paideia-specific signals. The point is to make the surface feel thoughtful without distracting from the essays.

The longer arc is to make Paideia useful for small systems that need to be understood by more than one kind of reader. A developer should be able to inspect it. An agent should be able to orient itself. A reviewer should be able to verify that the runtime matches its contract. A future version of me should be able to return to the project and understand why a decision was made. That is the kind of software I want more of: not bigger software, not louder software, but software with enough self-knowledge to be safely handled.

The machine-readable files below are part of that promise. They are not decorative. They are the same public contract Paideia asks generated systems to carry: a map, an identity, a context file, and a guide.
`,
      nav: true,
      tokenSummary:
        "About page explaining Paideia Framework as an experiment in self-describing generated software and linking the generated context files.",
    },
  ],
});
