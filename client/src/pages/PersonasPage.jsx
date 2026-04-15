import React, { useEffect, useMemo, useState } from 'react';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?')
    .slice(0, 2)
    .toUpperCase();
}

function PersonaAvatar({ photo, name, theme }) {
  const [showImg, setShowImg] = useState(Boolean(photo));
  const initials = useMemo(() => initialsFromName(name), [name]);

  useEffect(() => {
    setShowImg(Boolean(photo));
  }, [photo]);

  return (
    <div className="persona-avatar-wrap">
      {showImg && photo ? (
        <img
          src={photo}
          alt=""
          className={`persona-avatar-img persona-avatar-img--${theme}`}
          onError={() => setShowImg(false)}
        />
      ) : (
        <span
          className={`persona-avatar-fallback persona-avatar-fallback--${theme}`}
          aria-hidden
        >
          {initials}
        </span>
      )}
    </div>
  );
}

const PERSONAS = [
  {
    theme: 'revenue',
    segment: 'Revenue',
    name: 'Sanjeeb',
    role: 'Revenue Owner',
    photo: `${process.env.PUBLIC_URL || ''}`,
    defaultView: 'Performance Mode',
    goal: 'Maximize revenue and ROI from influencer spends.',
    questions: [
      'Which creators are driving highest revenue per view?',
      'Where should I increase or decrease budget?',
      'Which campaigns are profitable?',
    ],
    decisions:
      'Shift spend toward creators and campaigns with the strongest RPV and ROAS; trim or retest laggards.',
    dashboardLabel: 'Dashboard view',
    dashboardHint: 'Performance Mode — revenue efficiency first.',
    metrics: ['Revenue per View (RPV)', 'Cost per Sale (CPS)', 'ROAS', 'Conversion rate'],
    sections: [],
  },
  {
    theme: 'leadership',
    segment: 'Leadership',
    name: 'Pallavi',
    role: 'CMO / Leadership',
    photo: null,
    defaultView: 'Executive Overview',
    goal: 'Understand big-picture impact of influencer marketing on the business.',
    questions: [
      'Are influencers driving meaningful business impact?',
      'Which markets and categories are growing?',
      'What is the overall ROI trend?',
    ],
    decisions:
      'Align portfolio narrative to revenue, reach, and efficiency; flag markets that need investment or discipline.',
    dashboardLabel: 'Dashboard view',
    dashboardHint: 'Executive Overview — portfolio story in one glance.',
    metrics: [
      'Total revenue from influencers',
      '% contribution to overall business',
      'Overall ROI / ROAS',
      'Total reach and engagement',
    ],
    sections: ['Market-wise performance', 'Category and portfolio trends'],
  },
  {
    theme: 'execution',
    segment: 'Execution',
    name: 'Sokun',
    role: 'Execution / Brand team',
    photo: null,
    defaultView: 'Execution Mode',
    goal: 'Execute campaigns better and improve content performance.',
    questions: [
      'What kind of content works?',
      'Which creators should I test next?',
      'Why did a campaign succeed or fail?',
    ],
    decisions:
      'Double down on winning formats and hooks; queue structured tests for new creators and briefs.',
    dashboardLabel: 'Dashboard view',
    dashboardHint: 'Execution Mode — creative and post-level diagnostics.',
    metrics: ['Engagement rate', 'Video-level performance', 'Hook retention', 'Content themes'],
    sections: [],
  },
];

function PersonaCard({ persona }) {
  const {
    theme,
    segment,
    name,
    role,
    photo,
    defaultView,
    goal,
    questions,
    decisions,
    dashboardLabel,
    dashboardHint,
    metrics,
    sections,
  } = persona;

  return (
    <article className={`persona-card persona-card--${theme}`}>
      <header className="persona-card-head persona-card-head--hero">
        <PersonaAvatar photo={photo} name={name} theme={theme} />
        <div className="persona-badges persona-badges--center">
          <span className="persona-badge persona-badge--segment">{segment}</span>
          <span className="persona-badge persona-badge--mode">{defaultView}</span>
        </div>
        <h2 className="persona-name">{name}</h2>
        <p className="persona-role">{role}</p>
      </header>

      <div className="persona-card-body">
        <section className="persona-block">
          <h3 className="persona-block-title">Primary goal</h3>
          <p className="persona-goal">{goal}</p>
        </section>

        <section className="persona-block">
          <h3 className="persona-block-title">Key questions</h3>
          <ul className="persona-list">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>

        <section className="persona-block">
          <h3 className="persona-block-title">Decisions</h3>
          <p className="persona-decisions">{decisions}</p>
        </section>

        <section className="persona-block persona-block--dashboard">
          <h3 className="persona-block-title">{dashboardLabel}</h3>
          <p className="persona-dashboard-hint">{dashboardHint}</p>
          <h3 className="persona-block-title persona-block-title--tight">Top metrics</h3>
          <div className="persona-metrics">
            {metrics.map((m) => (
              <span key={m} className="persona-chip">
                {m}
              </span>
            ))}
          </div>
          {sections.length > 0 && (
            <>
              <h3 className="persona-block-title persona-block-title--tight">Key sections</h3>
              <ul className="persona-list persona-list--inline">
                {sections.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </article>
  );
}

export default function PersonasPage() {
  return (
    <div className="page-personas">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Personas</h1>
        </div>
      </div>

      <div className="personas-grid">
        {PERSONAS.map((p) => (
          <PersonaCard key={p.name} persona={p} />
        ))}
      </div>
    </div>
  );
}
