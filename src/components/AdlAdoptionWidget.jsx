import React, { useState, useEffect } from 'react';
import './AdlAdoptionWidget.css';

export default function AdlAdoptionWidget() {
  const [adopted, setAdopted] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ionut_adl_adopted');
      if (stored !== null) {
        setAdopted(stored === 'true');
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleChoice = (val) => {
    setAdopted(val);
    try {
      localStorage.setItem('ionut_adl_adopted', String(val));
    } catch {
      // ignore
    }
  };

  if (adopted !== null) {
    return null; // Adopția a fost făcută, widgetul dispare discret
  }

  return (
    <div className="adl-adoption-overlay">
      <div className="adl-adoption-card">
        <h2>Adoptă Ionuț Application Design Language (ADL)</h2>
        <p>
          Această aplicație folosește standardul Ionuț ADL pentru fundamente calde,
          opace, niveluri de focalizare clare și ergonomie de nivel superior.
          Doriți să activați Ionuț ADL pentru această sesiune și proiect?
        </p>
        <div className="adl-buttons">
          <button className="adl-btn-yes" onClick={() => handleChoice(true)}>
            Da, Activează ADL (Recomandat)
          </button>
          <button className="adl-btn-no" onClick={() => handleChoice(false)}>
            Nu mulțumesc
          </button>
        </div>
      </div>
    </div>
  );
}
