// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  adapter: node({ mode: "standalone" }),
  srcDir: ".",
  site: "https://adventure-x.org",

  prefetch: {
    defaultStrategy: "viewport",
  },
  server: {
    allowedHosts: [".adventure-x.org"],
  },

  integrations: [
    react(),
    sitemap(),
    partytown({
      config: {
        forward: [["dataLayer.push"]],
        resolveUrl: (url) => {
          const siteUrl = "https://playbook.adventure-x.org/";
          const proxyUrl = new URL(siteUrl);
          if (
            url.hostname === "googleads.g.doubleclick.net" ||
            url.hostname === "www.googleadservices.com" ||
            url.hostname === "googletagmanager.com" ||
            url.hostname === "www.googletagmanager.com" ||
            url.hostname === "region1.google-analytics.com" ||
            url.hostname === "google.com"
          ) {
            proxyUrl.searchParams.append("apiurl", url.href);
            return proxyUrl;
          }
          return url;
        },
      },
    }),

    starlight({
      title: "PLAYBOOK",
      favicon: "/favicon.svg",
      // social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/AdventureX-RGE' }],
      sidebar: [
        {
          label: "Start",
          autogenerate: { directory: "start" },
        },
        {
          label: "Mid",
          autogenerate: { directory: "mid" },
        },
        {
          label: "Later",
          autogenerate: { directory: "later" },
        },
        {
          label: "On-Site",
          autogenerate: { directory: "onsite" },
        },
        // {
        // 	label: "Examples",
        // 	autogenerate: { directory: "examples" },
        // }
      ],
      customCss: ["./styles/global.css"],
      components: {
        Sidebar: "./components/starlight/Sidebar.astro",
        Header: "./components/starlight/Header.astro",
        ThemeProvider: "./components/starlight/ThemeProvider.astro",
        ThemeSelect: "./components/starlight/ThemeSelect.astro",
        Pagination: "./components/starlight/Pagination.astro",
        Head: "./components/starlight/Head.astro",
        MobileMenuToggle: "./components/starlight/MobileMenuToggle.astro",
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.local(),
        name: "Patika",
        cssVariable: "--font-patika",
        fallbacks: [],
        options: {
          variants: [
            {
              weight: 300,
              style: "normal",
              src: ["./assets/fonts/patika-300.woff2"],
            },
            {
              weight: 400,
              style: "normal",
              src: ["./assets/fonts/patika-400.woff2"],
            },
            {
              weight: 500,
              style: "normal",
              src: ["./assets/fonts/patika-500.woff2"],
            },
            {
              weight: 600,
              style: "normal",
              src: ["./assets/fonts/patika-600.woff2"],
            },
            {
              weight: 700,
              style: "normal",
              src: ["./assets/fonts/patika-700.woff2"],
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
              src: ["./assets/fonts/orbix-regular.woff2"],
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
              src: ["./assets/fonts/ibm-plex-300.woff2"],
            },
            {
              weight: 400,
              style: "normal",
              src: ["./assets/fonts/ibm-plex-400.woff2"],
            },
            {
              weight: 500,
              style: "normal",
              src: ["./assets/fonts/ibm-plex-500.woff2"],
            },
            {
              weight: 600,
              style: "normal",
              src: ["./assets/fonts/ibm-plex-600.woff2"],
            },
            {
              weight: 700,
              style: "normal",
              src: ["./assets/fonts/ibm-plex-700.woff2"],
            },
          ],
        },
      },
    ],
  },
});
