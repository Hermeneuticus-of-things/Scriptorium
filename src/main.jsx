import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { createMockApi } from './lib/mockApi.js';
import './styles.css';
import './script.css';
import './behaviour.css';

const api = window.api || createMockApi();
createRoot(document.getElementById('root')).render(<App api={api} />);
