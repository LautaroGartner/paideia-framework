export function composeLayout(sections: string[]): string {
  return `
    <main class="layout">
      ${sections.join("\n")}
    </main>
  `;
}
