// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Upstream Analysis System',
  tagline: 'Comprehensive documentation and training for upstream analysis workflow',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://mementorc.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/code-graph-rag/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'MementoRC', // Usually your GitHub org/user name.
  projectName: 'code-graph-rag', // Usually your repo name.
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/MementoRC/code-graph-rag/tree/feat-upstream-analysis-strategy/docs/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          remarkPlugins: [],
          rehypePlugins: [],
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/MementoRC/code-graph-rag/tree/feat-upstream-analysis-strategy/docs/',
          blogTitle: 'Upstream Analysis Updates',
          blogDescription: 'Latest updates, tutorials, and insights from the upstream analysis team',
          postsPerPage: 'ALL',
          blogSidebarTitle: 'Recent posts',
          blogSidebarCount: 5,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        gtag: {
          trackingID: 'G-XXXXXXXXXX', // Replace with actual tracking ID if needed
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/social-card.jpg',
      navbar: {
        title: 'Upstream Analysis',
        logo: {
          alt: 'Upstream Analysis Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'docSidebar',
            sidebarId: 'traingSidebar',
            position: 'left',
            label: 'Training',
          },
          {
            type: 'docSidebar',
            sidebarId: 'referenceSidebar',
            position: 'left',
            label: 'Reference',
          },
          {to: '/blog', label: 'Updates', position: 'left'},
          {
            href: '/dashboard',
            label: 'Dashboard',
            position: 'right',
          },
          {
            href: 'https://github.com/MementoRC/code-graph-rag',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/intro',
              },
              {
                label: 'User Guide',
                to: '/docs/user-guide/overview',
              },
              {
                label: 'System Architecture',
                to: '/docs/architecture/overview',
              },
            ],
          },
          {
            title: 'Training',
            items: [
              {
                label: 'Quick Start Tutorial',
                to: '/docs/training/quick-start',
              },
              {
                label: 'Analysis Sessions',
                to: '/docs/training/analysis-sessions',
              },
              {
                label: 'Feature Extraction',
                to: '/docs/training/feature-extraction',
              },
            ],
          },
          {
            title: 'Tools',
            items: [
              {
                label: 'Dashboard',
                href: '/dashboard',
              },
              {
                label: 'GitHub Repository',
                href: 'https://github.com/MementoRC/code-graph-rag',
              },
              {
                label: 'Upstream Repository',
                href: 'https://github.com/vitali87/code-graph-rag',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Updates Blog',
                to: '/blog',
              },
              {
                label: 'GitHub Issues',
                href: 'https://github.com/MementoRC/code-graph-rag/issues',
              },
              {
                label: 'Discussions',
                href: 'https://github.com/MementoRC/code-graph-rag/discussions',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Upstream Analysis Team. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'json', 'yaml', 'javascript', 'typescript'],
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 5,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      algolia: {
        // The application ID provided by Algolia
        appId: 'YOUR_APP_ID',
        // Public API key: it is safe to commit it
        apiKey: 'YOUR_SEARCH_API_KEY',
        indexName: 'upstream-analysis',
        // Optional: see doc section below
        contextualSearch: true,
        // Optional: Specify domains where the navigation should occur through window.location instead on history.push
        externalUrlRegex: 'external\\.com|domain\\.com',
        // Optional: Replace parts of the item URLs from Algolia
        replaceSearchResultPathname: {
          from: '/docs/', // or as RegExp: /\\/docs\\//
          to: '/',
        },
        // Optional: Algolia search parameters
        searchParameters: {},
        // Optional: path for search page that enabled by default (`false` to disable it)
        searchPagePath: 'search',
        //... other Algolia params
      },
      mermaid: {
        theme: {light: 'neutral', dark: 'dark'},
      },
    }),

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'training',
        path: 'training',
        routeBasePath: 'training',
        sidebarPath: require.resolve('./sidebars.js'),
        editUrl: 'https://github.com/MementoRC/code-graph-rag/tree/feat-upstream-analysis-strategy/docs/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'reference',
        path: 'reference',
        routeBasePath: 'reference',
        sidebarPath: require.resolve('./sidebars.js'),
        editUrl: 'https://github.com/MementoRC/code-graph-rag/tree/feat-upstream-analysis-strategy/docs/',
      },
    ],
  ],
};

module.exports = config;