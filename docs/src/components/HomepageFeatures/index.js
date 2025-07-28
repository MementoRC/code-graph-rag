import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '📊 Automated Monitoring',
    Svg: require('@site/static/img/monitoring.svg').default,
    description: (
      <>
        Continuous tracking of upstream repositories with intelligent change detection.
        Never miss important updates with our 24/7 monitoring system that categorizes
        and prioritizes changes automatically.
      </>
    ),
  },
  {
    title: '🤝 Team Collaboration',
    Svg: require('@site/static/img/collaboration.svg').default,
    description: (
      <>
        Structured analysis sessions with built-in templates and decision frameworks.
        Collaborate effectively with your team using our guided workflows and
        comprehensive documentation tools.
      </>
    ),
  },
  {
    title: '🚀 Smart Extraction',
    Svg: require('@site/static/img/extraction.svg').default,
    description: (
      <>
        Streamlined feature extraction workflow with automated branch creation,
        testing scaffolding, and complete traceability from upstream source to
        local implementation.
      </>
    ),
  },
  {
    title: '📈 Interactive Dashboard',
    Svg: require('@site/static/img/dashboard.svg').default,
    description: (
      <>
        Real-time visualization of upstream activity, analysis progress, and team
        metrics. Make data-driven decisions with comprehensive charts and reports.
      </>
    ),
  },
  {
    title: '🔔 Smart Notifications',
    Svg: require('@site/static/img/notifications.svg').default,
    description: (
      <>
        Multi-channel notification system with configurable thresholds. Get alerted
        about significant changes via GitHub issues, Slack, or email based on your
        team's preferences.
      </>
    ),
  },
  {
    title: '🛡️ Quality Assurance',
    Svg: require('@site/static/img/quality.svg').default,
    description: (
      <>
        Built-in quality gates and testing requirements ensure extracted features
        meet your standards. Automated validation and comprehensive audit trails
        maintain code quality.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <Heading as="h2" className="text--center margin-bottom--lg">
              Why Choose Upstream Analysis System?
            </Heading>
          </div>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}