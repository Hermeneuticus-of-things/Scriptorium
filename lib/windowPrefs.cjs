// Options › General: window size at start, "start maximized" and the projects reopened at start.
const clamp = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.max(lo, Math.min(hi, Math.round(n))) : d;
};

function windowSize(settings = {}) {
  return {
    width: clamp(settings.windowWidth, 900, 8000, 1400),
    height: clamp(settings.windowHeight, 600, 8000, 900),
    maximized: Boolean(settings.startMaximized),
  };
}

// Folders to reopen, one window each: only with "reopen all", without duplicates, at most 12.
function startupDirs(settings = {}) {
  if (settings.startupAction !== 'reopenAll') return [];
  const list = Array.isArray(settings.openAtClose) ? settings.openAtClose : [];
  return [...new Set(list.filter((d) => typeof d === 'string' && d))].slice(0, 12);
}

module.exports = { windowSize, startupDirs };
