import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started - 5min ⏱️
          </Link>
          <Link
            className="button button--primary button--lg margin-left--md"
            to="/training/quick-start/overview">
            Take the Tutorial 🎓
          </Link>
        </div>
        <div className={styles.dashboardLink}>
          <Link
            className="button button--outline button--primary"
            to="/dashboard">
            View Live Dashboard 📊
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Documentation`}
      description="Comprehensive documentation and training for upstream analysis workflow">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        
        {/* Quick Stats Section */}
        <section className={styles.quickStats}>
          <div className="container">
            <div className="row">
              <div className="col col--12">
                <h2 className="text--center margin-bottom--lg">System Impact</h2>
              </div>
            </div>
            <div className="row">
              <div className="col col--3">
                <div className="text--center">
                  <h3 className="margin-bottom--sm">75%</h3>
                  <p>Reduction in Analysis Time</p>
                </div>
              </div>
              <div className="col col--3">
                <div className="text--center">
                  <h3 className="margin-bottom--sm">300%</h3>
                  <p>Increase in Feature Adoption</p>
                </div>
              </div>
              <div className="col col--3">
                <div className="text--center">
                  <h3 className="margin-bottom--sm">50+</h3>
                  <p>Automated Workflows</p>
                </div>
              </div>
              <div className="col col--3">
                <div className="text--center">
                  <h3 className="margin-bottom--sm">24/7</h3>
                  <p>Continuous Monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started Paths */}
        <section className={styles.gettingStarted}>
          <div className="container">
            <div className="row">
              <div className="col col--12">
                <h2 className="text--center margin-bottom--lg">Choose Your Path</h2>
              </div>
            </div>
            <div className="row">
              <div className="col col--4">
                <div className="card margin-bottom--lg">
                  <div className="card__header">
                    <h3>📊 For Analysts</h3>
                  </div>
                  <div className="card__body">
                    <p>Learn to conduct effective analysis sessions and make data-driven extraction decisions.</p>
                    <ul>
                      <li>Session planning and execution</li>
                      <li>Decision framework usage</li>
                      <li>Team collaboration tools</li>
                    </ul>
                  </div>
                  <div className="card__footer">
                    <Link to="/training/roles/analyst" className="button button--primary button--block">
                      Start Analyst Training
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col col--4">
                <div className="card margin-bottom--lg">
                  <div className="card__header">
                    <h3>⚙️ For Developers</h3>
                  </div>
                  <div className="card__body">
                    <p>Understand the system architecture and learn to implement extracted features.</p>
                    <ul>
                      <li>System architecture overview</li>
                      <li>Feature extraction workflow</li>
                      <li>API integration patterns</li>
                    </ul>
                  </div>
                  <div className="card__footer">
                    <Link to="/training/roles/developer" className="button button--primary button--block">
                      Start Developer Training
                    </Link>
                  </div>
                </div>
              </div>
              <div className="col col--4">
                <div className="card margin-bottom--lg">
                  <div className="card__header">
                    <h3>👑 For Team Leads</h3>
                  </div>
                  <div className="card__body">
                    <p>Master team coordination, process optimization, and strategic decision-making.</p>
                    <ul>
                      <li>Team workflow management</li>
                      <li>Performance metrics</li>
                      <li>Strategic planning</li>
                    </ul>
                  </div>
                  <div className="card__footer">
                    <Link to="/training/roles/team-lead" className="button button--primary button--block">
                      Start Leadership Training
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Resources */}
        <section className={styles.popularResources}>
          <div className="container">
            <div className="row">
              <div className="col col--12">
                <h2 className="text--center margin-bottom--lg">Popular Resources</h2>
              </div>
            </div>
            <div className="row">
              <div className="col col--6">
                <div className="card">
                  <div className="card__header">
                    <h4>🚀 Quick Start Guide</h4>
                  </div>
                  <div className="card__body">
                    <p>Get up and running with the upstream analysis system in just 30 minutes.</p>
                    <Link to="/training/quick-start/overview">Start the tutorial →</Link>
                  </div>
                </div>
              </div>
              <div className="col col--6">
                <div className="card">
                  <div className="card__header">
                    <h4>📊 Dashboard Guide</h4>
                  </div>
                  <div className="card__body">
                    <p>Learn to navigate and interpret the upstream analysis dashboard.</p>
                    <Link to="/docs/user-guide/dashboard">Explore the dashboard →</Link>
                  </div>
                </div>
              </div>
              <div className="col col--6">
                <div className="card">
                  <div className="card__header">
                    <h4>🔄 Analysis Workflows</h4>
                  </div>
                  <div className="card__body">
                    <p>Master the complete workflow from change detection to feature implementation.</p>
                    <Link to="/docs/workflows/analysis-workflow">Learn the workflow →</Link>
                  </div>
                </div>
              </div>
              <div className="col col--6">
                <div className="card">
                  <div className="card__header">
                    <h4>🛠️ Troubleshooting</h4>
                  </div>
                  <div className="card__body">
                    <p>Solutions to common issues and debugging guides.</p>
                    <Link to="/docs/user-guide/troubleshooting">Get help →</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}