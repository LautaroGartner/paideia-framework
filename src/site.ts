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
  title: "Lautaro Gärtner",
  description: "Building Paideia Framework in public.",
  url: "https://lautarogartner.com",
  author: "Lautaro Gärtner",
  language: "en",
  posts,
  pages: [
    {
      path: "/",
      title: "Home",
      description: "Personal site for Lautaro Gärtner and Paideia Framework.",
      body: "Building Paideia Framework in public.",
      nav: true,
      tokenSummary: "Home page introducing Lautaro and the Paideia Framework build log.",
    },
    {
      path: "/writing",
      title: "Writing",
      description: "Notes on software, systems, agents, and Paideia.",
      body: "Notes on software, systems, and building Paideia.",
      nav: true,
      tokenSummary: "Writing index for essays and notes about software, agents, and Paideia.",
    },
  ],
});
