// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://adventure-x.org',
  integrations: [starlight({
      title: 'Open Hackathon Playbook',
    // social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/AdventureX-RGE' }],
      sidebar: [
          // {
          //     label: 'Start Here',
          //     items: [
          //         // Each item here is one entry in the navigation menu.
          //         { label: 'Example Guide',
          //           slug: 'guides/example',
          //         },
          //     ],
          // },
          {
            label: 'Start Here',
            autogenerate: { directory: 'start_here' },
          },
          {
              label: 'Examples',
              autogenerate: { directory: 'examples' },
          },
      ],
      customCss: [
        './src/styles/global.css',
        './src/fonts/font-face.css',
      ],
      components: {
        Sidebar: './src/components/starlight/Sidebar.astro',
        Header: './src/components/starlight/Header.astro',
        Search: './src/components/starlight/Search.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
      },
  }), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});