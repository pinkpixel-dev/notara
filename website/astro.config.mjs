import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Notara Docs',
      titleDelimiter: ' | ',
      description:
        'Guides, setup instructions, release downloads, and architecture notes.',
      tagline: 'Notetaking, task management, and visual organization for your local workspace.',
      logo: {
        src: './public/logo.png',
        alt: 'Notara logo',
        replacesTitle: false,
      },
      favicon: '/favicon.png',
      customCss: ['./src/styles/custom.css'],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/pinkpixel-dev/notara',
        },
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { slug: 'index', label: 'Welcome' },
            { slug: 'getting-started/overview', label: 'Product Overview' },
            { slug: 'getting-started/installation', label: 'Installation & Downloads' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { slug: 'guides/workspace', label: 'Workspace & Content Model' },
            { slug: 'guides/ai-assistant', label: 'AI Assistant & Images' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { slug: 'reference/storage-and-runtimes', label: 'Storage & Runtime Targets' },
            { slug: 'reference/releases', label: 'Release Notes' },
          ],
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/pinkpixel-dev/notara/edit/main/website/',
      },
      lastUpdated: true,
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
    }),
  ],
});
