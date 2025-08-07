/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Main documentation sidebar
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/overview',
      ],
    },
  ],

  // Training sidebar
  trainingSidebar: [
    {
      type: 'category',
      label: 'Quick Start',
      items: [
        'quick-start/overview',
      ],
    },
    {
      type: 'category',
      label: 'Role-Based Training',
      items: [
        'roles/analyst',
        'roles/developer',
        'roles/team-lead',
      ],
    },
    {
      type: 'category',
      label: 'Hands-On Exercises',
      items: [
        'exercises/analysis-practice',
      ],
    },
    {
      type: 'category',
      label: 'Assessment & Certification',
      items: [
        'assessment/knowledge-checks',
      ],
    },
  ],

  // Reference sidebar
  referenceSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'config/overview',
      ],
    },
    {
      type: 'category',
      label: 'Templates',
      items: [
        'templates/overview',
      ],
    },
    {
      type: 'category',
      label: 'CLI Tools',
      items: [
        'cli/overview',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: [
        'troubleshooting/overview',
      ],
    },
    {
      type: 'category',
      label: 'FAQ',
      items: [
        'faq/overview',
      ],
    },
  ],
};

module.exports = sidebars;