export const post = {
  slug: "agent-readable-web",
  title: "The Agent-Readable Web",
  topics: [
    "agent-readable web",
    "runtime receipts",
    "inspectable software",
  ],
  description:
    "Why websites may need small, honest runtime receipts for routes, crawl status, artifacts, and limits.",
  publishedAt: "2026-05-22",
  body: `
The web was built for browsers. That sounds obvious, but it explains a lot. A website is usually judged by what happens after a browser loads it: does it look good, is it fast enough, can a person find what they came for, does the writing make sense, does the interface feel trustworthy?

Over time, the web also became readable by other systems. Search engines learned to index it. Social platforms learned to preview it. Analytics tools learned to observe it. APIs exposed parts of it. Feeds, sitemaps, metadata, and structured data all became ways for a site to say a little more about itself than the visible page alone could say.

Now another kind of reader is becoming normal: agents. I do not mean that in a grand science fiction sense. I mean ordinary software that can fetch a page, summarize it, compare it with another page, monitor it, answer questions about it, or decide what to do next. Some of these systems are simple. Some are more capable. The important part is that they are not just looking at a page once. They are trying to build a working understanding of a site.

Most websites are not very good at helping with that, and not because they lack content. The web has more content than anyone can read. The problem is that many sites do not explain themselves clearly. They show pages, but they rarely say what those pages mean in the structure of the site. They expose links, but not always which links matter. They return HTML, but not always enough HTML to understand the page without running a large client application. They may have metadata, but often it is missing, duplicated, stale, or written only for previews.

A person can tolerate a surprising amount of ambiguity. We can skim. We can infer. We can click around. We can notice that a page is important because it is in the navigation, or that a missing description is not fatal, or that an error probably means a site is rate limiting us.

Software is less graceful about that. It can guess, and modern systems can guess impressively well, but guessing is not the same as understanding. That is the gap I keep noticing: a site can be beautifully designed and still reveal almost nothing about what routes exist, what artifacts are authoritative, what was generated, what failed during a crawl, whether metadata is missing, whether JavaScript was required, or what limits shaped the observed result. The page is visible. The system is not. I think that distinction is going to matter more.

## A Receipt Layer

The phrase "agent-readable web" can sound more futuristic than it needs to. I do not think the web needs a giant new layer of magic. I do not think every site should become an API. I do not think every page needs to be optimized for automated systems at the expense of people. What I think is simpler: websites should become better at publishing receipts.

A receipt is not a pitch, a brand statement, or a confident summary written to sound impressive. It is a record of what happened.

For a website, that might mean:

* these routes were discovered
* these pages were fetched
* these files were generated
* these capabilities are declared
* these failures occurred
* these warnings apply
* these limits shaped the output

That kind of information is boring in the best way. It is close to logs, manifests, health checks, build output, and diagnostics. It does not ask for belief. It gives you something to inspect.

This is why I find the current conversation around \`llms.txt\` useful but incomplete. \`llms.txt\` is a good idea. A plain text entry point for tools that want to understand a site is much better than asking every system to scrape from scratch. It gives the site a front door, but a front door is not a map.

A single text file can introduce a site, but it cannot carry everything an agent or a careful human might need to know. It cannot fully explain crawl coverage, missing metadata, partial failures, route inventory, runtime capabilities, generated artifacts, or the difference between what was observed and what was inferred. That does not make \`llms.txt\` wrong. It makes it the beginning of a larger shape.

The next step is not necessarily a standard. It may be too early for that. The next step is a habit: when software observes or generates a site, it should leave behind small artifacts that explain what it knows.

## The Problem With Successful Crawls

One of the odd problems with crawlers is that many of them are too eager to look successful. If a page fails, the error often disappears into logs. If metadata is missing, the crawler continues silently. If a site is mostly a client side application and the static HTML contains almost no meaningful content, the crawler may still return an output that looks finished.

That is dangerous because it creates confidence without observability. A thin result is not the problem. Thin results happen. Some pages are protected. Some sites rate limit. Some sites require JavaScript. Some metadata is missing. Some links break. The web is messy. The problem is pretending the result is thicker than it is.

If a crawl only saw three pages, say that. If one route failed with a 429, record it. If descriptions were missing, warn about them. If JavaScript was not executed, make that explicit. If robots.txt was fetched only for awareness and not enforced, say so plainly.

There is a calmness in that kind of artifact. It does not overclaim. It does not collapse because the world was imperfect. It says: here is what I observed, here is what I could not observe, and here are the limits of this result.

That is much more useful than a polished lie.

## A Small Prototype

I built a small prototype called \`agentify\` to explore this idea. The tool is intentionally modest. It fetches a website, follows same origin links from the homepage up to a small page limit, extracts basic route metadata, and writes an explanation bundle:

\`\`\`txt
agent/
  system.json
  runtime.json
  context.json
  llms.txt
\`\`\`

It does not run JavaScript. It does not crawl deeply. It does not log in. It does not infer private backend behavior. It does not claim the site is secure, complete, or well documented. That restraint is part of the point.

The current version identifies itself as a static HTML renderer. It records that JavaScript was not executed. It records that recursive crawling was not performed. It records whether the crawl was complete or partial. It emits warning codes for missing titles, missing descriptions, JavaScript heavy pages, and partial crawls.

In other words, it does not only produce a summary. It produces a receipt. The bundle is small enough to read by hand. A person can open \`llms.txt\` first for the plain language version. A script can read \`runtime.json\` to see what happened during generation. Another tool can read \`context.json\` for routes and headings. \`system.json\` can describe the discovered shape of the site.

None of this is glamorous infrastructure. That is why I like it. It is just enough structure to reduce guessing.

## The Demo That Looked Like Failure

The most clarifying test was not a clean static site. It was a JavaScript heavy app shell. The output was thin. There was little useful title metadata. There was little useful description metadata. The static HTML did not reveal much route structure. The artifact warned that JavaScript appeared to be required for meaningful content.

At first glance, that looks like the crawler failed, but I think it is the opposite. The tool did exactly what I wanted it to do. It refused to pretend that a mostly opaque page had become understandable. That distinction matters.

If a crawler says "complete" but the actual understanding is mostly fictional, the receiving system is now standing on bad ground. It may summarize confidently. It may recommend badly. It may compare two sites as if both were equally visible. It may act as if missing evidence is evidence.

An honest crawl gives the next system a better contract. It can say: this result is complete for the limits that were declared, but the static page was sparse. Or: this crawl is partial because one route failed. Or: this bundle was produced without executing JavaScript, so do not treat it as a full rendering of the application. That is not a weakness. That is the beginning of trust.

## Why This Also Matters For People

It would be easy to frame all of this as something machines need. I think that misses the better point: people need it too. Anyone who has inherited a codebase knows the feeling of trying to understand a system from the outside. Where are the important routes? What does the build emit? Which files are source and which are generated? What changed? What failed? What does this project think it is?

Good documentation helps. Good code helps. Good naming helps. But systems also need live, boring, generated facts about themselves.

This is why I have been exploring similar ideas in Paideia, the small framework this blog is built with. Paideia generates a site, but it also emits runtime artifacts: a system description, a runtime identity file, a compact context file, and an \`llms.txt\` entry point.

The philosophy is the same as \`agentify\`, but from the other direction. \`agentify\` is retrofit: it takes an existing site and tries to describe what can be observed. Paideia is native generation: the framework already knows what it created, so it can describe the system directly. Both paths matter.

Retrofit matters because most of the web already exists. You cannot ask every site to rebuild itself before it becomes more inspectable. A small tool that can produce a useful receipt from the outside is practical.

Native generation matters because it is cleaner. A framework does not need to guess its own routes, artifacts, capabilities, or diagnostics. It can publish them as part of the build. Manual retrofit is useful. Native explanation is stronger. The interesting thing is that both point toward the same idea: software should make its shape easier to inspect.

## Caveats

There are plenty of caveats. Some sites cannot expose too much structure without creating security or abuse problems. Some crawls should respect robots.txt more deeply than a prototype does. Some pages need authenticated context. Some sites are intentionally dynamic. Some metadata is hard to summarize. Some agents will misuse good artifacts anyway.

There is also a risk of inventing too many files too quickly. The web does not need another pile of ceremonial formats that nobody maintains. If runtime receipts become useful, they will need to stay small, boring, and close to facts that software already knows.

That is why I am more interested in working examples than declarations. A route list is useful. A crawl status is useful. A warning code is useful. A generated artifact inventory is useful. A vague claim that a site is "AI ready" is not useful.

The standard should come after the habit, if it comes at all.

## What I Mean By Agent Readable

An agent-readable site is not a site that flatters agents. It is not a site stuffed with keywords for language models. It is not a site that replaces human writing with machine instructions. It is not a site that assumes automation is the primary audience. An agent-readable site is a site that publishes enough context for another system to behave more carefully around it.

That can be modest.

It can mean a plain text guide. It can mean a route inventory. It can mean metadata that is accurate. It can mean a runtime receipt. It can mean warnings when a crawl is incomplete. It can mean saying "this page requires JavaScript" instead of pretending the static result was meaningful.

The web spent decades optimizing presentation. That work still matters. People should remain the first audience for most sites. But presentation is not the same as inspectability.

As more software reads, compares, and acts on the web, inspectability becomes part of the public surface of a site. Not every site needs the same depth. A personal blog, a government service, a documentation site, an online store, and a private dashboard have different risks and responsibilities.

The shared principle is smaller: do not make other systems guess more than they have to. Publish what exists. Say what failed. Mark the limits. Keep the artifacts readable. Let humans and tools inspect the same facts.

That is the agent-readable web I want: not a web that becomes less human, but a web where software is more honest about what it knows.
`,
  tokenSummary:
    "Essay arguing that websites need small, honest runtime receipts for routes, crawl status, warnings, artifacts, and limits so humans and agents can inspect systems without guessing.",
};
