import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Start Here',
      collapsed: false,
      items: [
        { type: 'doc', id: 'index', label: 'Welcome' },
        { type: 'doc', id: 'getting-started/overview', label: 'Product Overview' },
        { type: 'doc', id: 'getting-started/installation', label: 'Installation & Downloads' },
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        { type: 'doc', id: 'guides/workspace', label: 'Workspace & Content Model' },
        { type: 'doc', id: 'guides/ai-assistant', label: 'AI Assistant & Images' },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: [
        { type: 'doc', id: 'reference/storage-and-runtimes', label: 'Storage & Runtime Targets' },
        { type: 'doc', id: 'reference/releases', label: 'Release Notes' },
      ],
    },
  ],
};

export default sidebars;
