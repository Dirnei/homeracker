import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import { rehypeRepoLinks, rehypeSections } from "./src/lib/rehype.ts";

export default defineConfig({
  site: "https://homeracker.org",
  outDir: "dist",
  trailingSlash: "always",
  markdown: {
    processor: unified({ rehypePlugins: [rehypeRepoLinks, rehypeSections] }),
  },
  vite: {
    server: { fs: { allow: [".."] } },
  },
});
