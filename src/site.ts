export type SitePage = {
  path: string;
  title: string;
  description?: string;
  body: string;
  nav?: boolean;
  tokenSummary?: string;
};

export type SiteDefinition = {
  title: string;
  description: string;
  pages: SitePage[];
};

export function defineSite(site: SiteDefinition): SiteDefinition {
  return site;
}

export const site = defineSite({
  title: "Lautaro Gärtner",
  description: "Building Paideia Framework in public.",
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
