import React from 'react';

/**
 * Placeholder tab — no matches UI yet.
 */
export default function LookalikeCreatorsTab() {
  return (
    <div className="lookalike-page lookalike-page--empty">
      <div className="card lookalike-empty-card">
        <span className="lookalike-empty-icon" aria-hidden>
          🔮
        </span>
        <h2 className="lookalike-empty-title">Lookalike creators</h2>
        <p className="lookalike-empty-text">
          This space is reserved for finding creators with a similar profile to your standouts.
          Nothing to show yet.
        </p>
      </div>
    </div>
  );
}
