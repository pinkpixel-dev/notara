import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Notara Docs',
  tagline: 'Notes, task management, and visual organization in your local workspace.',
  favicon: 'img/favicon.png',

  url: 'https://notara-docs.pages.dev',
  baseUrl: '/',

  organizationName: 'pinkpixel-dev',
  projectName: 'notara',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/pinkpixel-dev/notara/edit/main/website/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },

    image: 'img/screenshot.png',

    navbar: {
      title: 'Notara',
      logo: {
        alt: 'Notara logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/pinkpixel-dev/notara',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Installation', to: '/getting-started/installation' },
            { label: 'Product Overview', to: '/getting-started/overview' },
            { label: 'Workspace & Content Model', to: '/guides/workspace' },
            { label: 'Release Notes', to: '/reference/releases' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/pinkpixel-dev/notara' },
            { label: 'Pink Pixel', href: 'https://pinkpixel.dev' },
          ],
        },
      ],
      copyright: `Made with 💖 by <a href="https://pinkpixel.dev">Pink Pixel</a>`,
    },

    prism: {
      theme: prismThemes.oneDark,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'diff', 'json', 'typescript'],
    },

    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 3,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
