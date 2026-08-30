import React from 'react';
import Link from '@docusaurus/Link';

export default function WelcomeHero(): React.JSX.Element {
  return (
    <section className="notara-hero">
      <div className="notara-hero__top">
        <div className="notara-hero__headline">
          <span className="notara-hero__badge">Notara v2.5.0</span>
          <h1 className="notara-hero__title">Smart Notetaking.</h1>
          <p className="notara-hero__subtitle">Task Management &amp; Visual Planning.</p>
        </div>
        <img
          className="notara-hero__logo"
          src="/img/logo.png"
          alt="Notara logo"
          width={80}
          height={80}
          loading="eager"
        />
      </div>

      <p className="notara-hero__lede">
        Notara is a private, local-first personal workspace combining Markdown editing in real
        directory trees, due-linked task reminders with desktop system tray integration, vision
        boards, calendar planning, and an OpenAI assistant with interactive change reviews.
      </p>

      <img
        className="notara-hero__screenshot"
        src="/img/screenshot.png"
        alt="Notara application interface"
        loading="lazy"
      />

      <div className="notara-hero__actions">
        <Link className="notara-hero__button" to="/getting-started/installation">
          Install Notara
        </Link>
        <Link className="notara-hero__button-secondary" to="/getting-started/overview">
          Product Overview
        </Link>
        <Link className="notara-hero__button-secondary" to="/reference/storage-and-runtimes">
          Storage &amp; Runtimes
        </Link>
      </div>

      <div className="notara-hero__features">
        <article className="notara-hero__feature-card">
          <strong>Local-First Markdown</strong>
          <span>
            Your notes live as real Markdown files in normal folders, with atomic saves and
            preserved frontmatter.
          </span>
        </article>
        <article className="notara-hero__feature-card">
          <strong>Due-Linked Task Reminders</strong>
          <span>
            Tasks schedule native background desktop notifications via Rust, keeping timers active
            in the system tray.
          </span>
        </article>
        <article className="notara-hero__feature-card">
          <strong>Interactive AI Assistant</strong>
          <span>
            OpenAI text and image tools propose structured changes with visual diffs before
            touching your files.
          </span>
        </article>
      </div>
    </section>
  );
}
