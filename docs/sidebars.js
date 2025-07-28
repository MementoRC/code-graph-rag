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
        'getting-started/prerequisites',
        'getting-started/installation',
        'getting-started/first-steps',
      ],
    },
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/overview',
        'user-guide/dashboard',
        'user-guide/analysis-sessions',
        'user-guide/feature-extraction',
        'user-guide/notifications',
        'user-guide/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'System Architecture',
      items: [
        'architecture/overview',
        'architecture/components',
        'architecture/data-flow',
        'architecture/integrations',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Workflows',
      items: [
        'workflows/sync-process',
        'workflows/change-detection',
        'workflows/analysis-workflow',
        'workflows/extraction-workflow',
        'workflows/automation',
      ],
    },
    {
      type: 'category',
      label: 'Administration',
      items: [
        'admin/configuration',
        'admin/monitoring',
        'admin/maintenance',
        'admin/backup-recovery',
      ],
    },
  ],

  // Training sidebar
  trainingSidebar: [
    {
      type: 'category',
      label: 'Quick Start',
      items: [
        'training/quick-start/overview',
        'training/quick-start/your-first-session',
        'training/quick-start/using-dashboard',
        'training/quick-start/basic-extraction',
      ],
    },
    {
      type: 'category',
      label: 'Role-Based Training',
      items: [
        'training/roles/analyst',
        'training/roles/developer',
        'training/roles/team-lead',
        'training/roles/administrator',
      ],
    },
    {
      type: 'category',
      label: 'Hands-On Exercises',
      items: [
        'training/exercises/setup-exercise',
        'training/exercises/analysis-exercise',
        'training/exercises/extraction-exercise',
        'training/exercises/advanced-scenarios',
      ],
    },
    {
      type: 'category',
      label: 'Best Practices',
      items: [
        'training/best-practices/session-planning',
        'training/best-practices/decision-making',
        'training/best-practices/documentation',
        'training/best-practices/team-collaboration',
      ],
    },
    {
      type: 'category',
      label: 'Assessment',
      items: [
        'training/assessment/knowledge-check',
        'training/assessment/practical-test',
        'training/assessment/certification',
      ],
    },
  ],

  // Reference sidebar
  referenceSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'reference/api/overview',
        'reference/api/github-actions',
        'reference/api/scripts',
        'reference/api/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'reference/config/github-actions',
        'reference/config/analysis-config',
        'reference/config/notification-config',
        'reference/config/dashboard-config',
      ],
    },
    {
      type: 'category',
      label: 'Templates',
      items: [
        'reference/templates/analysis-session',
        'reference/templates/extraction-plan',
        'reference/templates/decision-framework',
        'reference/templates/pr-template',
      ],
    },
    {
      type: 'category',
      label: 'CLI Tools',
      items: [
        'reference/cli/analysis-tools',
        'reference/cli/extraction-tools',
        'reference/cli/dashboard-tools',
        'reference/cli/maintenance-tools',
      ],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: [
        'reference/troubleshooting/common-issues',
        'reference/troubleshooting/error-codes',
        'reference/troubleshooting/performance',
        'reference/troubleshooting/debugging',
      ],
    },
    {
      type: 'category',
      label: 'FAQ',
      items: [
        'reference/faq/general',
        'reference/faq/technical',
        'reference/faq/workflow',
        'reference/faq/integration',
      ],
    },
  ],
};

module.exports = sidebars;