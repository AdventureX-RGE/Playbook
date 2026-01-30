// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import starlight from "@astrojs/starlight";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://adventure-x.org",
  integrations: [
    starlight({
      title: "PLAYBOOK",
      // social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/AdventureX-RGE' }],
      sidebar: [
        {
          label: "Start Here",
          autogenerate: { directory: "start_here" },
        },
        {
          label: "Examples",
          autogenerate: { directory: "examples" },
        },
      ],
      customCss: ["./src/styles/global.css"],
      components: {
        Sidebar: "./src/components/starlight/Sidebar.astro",
        Header: "./src/components/starlight/Header.astro",
        Search: "./src/components/starlight/Search.astro",
        ThemeSelect: "./src/components/starlight/ThemeSelect.astro",
        Pagination: "./src/components/starlight/Pagination.astro",
        Head: "./src/components/starlight/Head.astro",
      },
    }),
    react(),
  ],

  server: {
    allowedHosts: ["playbook.adventure-x.org"],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.local(),
        name: "Patika",
        cssVariable: "--font-patika",
        fallbacks: ["system-ui", "sans-serif"],
        options: {
          variants: [
            {
              weight: 300,
              style: "normal",
              src: ["./src/assets/fonts/patika-300.woff2"],
            },
            {
              weight: 400,
              style: "normal",
              src: ["./src/assets/fonts/patika-400.woff2"],
            },
            {
              weight: 500,
              style: "normal",
              src: ["./src/assets/fonts/patika-500.woff2"],
            },
            {
              weight: 600,
              style: "normal",
              src: ["./src/assets/fonts/patika-600.woff2"],
            },
            {
              weight: 700,
              style: "normal",
              src: ["./src/assets/fonts/patika-700.woff2"],
            },
          ],
        },
      },
      {
        provider: fontProviders.local(),
        name: "Orbix",
        cssVariable: "--font-orbix",
        fallbacks: ["system-ui", "sans-serif"],
        options: {
          variants: [
            {
              weight: 400,
              style: "normal",
              src: ["./src/assets/fonts/orbix-regular.woff2"],
            },
          ],
        },
      },
      {
        provider: fontProviders.local(),
        name: "IBM Plex Sans SC",
        cssVariable: "--font-ibm-plex-sc",
        fallbacks: ["system-ui", "sans-serif"],
        options: {
          variants: [
            {
              weight: 300,
              style: "normal",
              src: ["./src/assets/fonts/ibm-plex-300.woff2"],
            },
            {
              weight: 400,
              style: "normal",
              src: ["./src/assets/fonts/ibm-plex-400.woff2"],
            },
            {
              weight: 500,
              style: "normal",
              src: ["./src/assets/fonts/ibm-plex-500.woff2"],
            },
            {
              weight: 600,
              style: "normal",
              src: ["./src/assets/fonts/ibm-plex-600.woff2"],
            },
            {
              weight: 700,
              style: "normal",
              src: ["./src/assets/fonts/ibm-plex-700.woff2"],
            },
          ],
        },
      },
    ],
  },
});
