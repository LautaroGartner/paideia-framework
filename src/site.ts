export type SitePage = {
  path: string;
  title: string;
  body: string;
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
      body: "Building Paideia Framework in public.",
    },
    {
      path: "/writing",
      title: "Writing",
      body: "Notes on software, systems, and building Paideia.",
    },
  ],
});
