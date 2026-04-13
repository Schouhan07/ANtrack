import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

/**
 * Stitch-inspired auth layout: editorial hero + form panel (project color tokens).
 */
export default function AuthPageShell({
  backTo,
  backLabel = 'Back',
  heroTitle,
  heroHighlight,
  heroSubtitle,
  pillars = [],
  children,
  wideCard = false,
}) {
  return (
    <div className="auth-page">
      <header className="auth-page-header">
        <Link to={backTo} className="auth-page-back" aria-label={backLabel}>
          <FiArrowLeft size={20} aria-hidden />
        </Link>
        <div className="auth-page-brand">
          AN<span className="auth-page-brand-accent">Track</span>
        </div>
      </header>

      <main className="auth-page-main">
        <section className="auth-page-hero">
          <div className="auth-page-hero-inner">
            <p className="auth-page-hero-eyebrow">Influencer intelligence</p>
            <h1 className="auth-page-hero-title">
              {heroTitle}{' '}
              {heroHighlight ? (
                <span className="auth-page-hero-highlight">{heroHighlight}</span>
              ) : null}
            </h1>
            <p className="auth-page-hero-lead">{heroSubtitle}</p>
          </div>
          {pillars.length > 0 && (
            <div className="auth-page-pillars">
              {pillars.map((p) => (
                <div key={p.title} className="auth-page-pillar">
                  <div className="auth-page-pillar-kicker">{p.title}</div>
                  <div className="auth-page-pillar-text">{p.text}</div>
                </div>
              ))}
            </div>
          )}
          <div className="auth-page-hero-glow auth-page-hero-glow--1" aria-hidden />
          <div className="auth-page-hero-glow auth-page-hero-glow--2" aria-hidden />
        </section>

        <section className="auth-page-form-section">
          <div className={wideCard ? 'auth-page-form-card auth-page-form-card--wide' : 'auth-page-form-card'}>
            {children}
          </div>
        </section>
      </main>

      <div className="auth-page-ambient" aria-hidden>
        <div className="auth-page-ambient-blob auth-page-ambient-blob--1" />
        <div className="auth-page-ambient-blob auth-page-ambient-blob--2" />
      </div>
    </div>
  );
}
