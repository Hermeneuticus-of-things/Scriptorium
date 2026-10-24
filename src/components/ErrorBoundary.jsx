import React from 'react';
import { recordError } from '../lib/reportProblem.js';
import { t } from '../lib/i18n.js';

// Last line of defence for errors thrown while rendering: instead of a white window, a short
// message with Reload; the error goes to the error log (Ajutor → Raportează o problemă).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const entry = recordError({ kind: 'render', message: error?.message || String(error), stack: `${error?.stack || ''}\n${info?.componentStack || ''}`.trim() });
    try {
      this.props.api?.logError?.({ kind: entry.kind, message: entry.message, stack: entry.stack })?.catch?.(() => {});
    } catch {
      /* the log must never throw */
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash-screen" role="alert">
        <h1>{t('ui.crash.titlu')}</h1>
        <p>{t('ui.crash.text')}</p>
        <p className="muted small"><code>{String(this.state.error?.message || this.state.error).slice(0, 300)}</code></p>
        <div className="actions">
          <button className="primary" onClick={() => window.location.reload()}>{t('ui.crash.reincarca')}</button>
        </div>
      </div>
    );
  }
}
