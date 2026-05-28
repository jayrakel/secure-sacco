import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Ensure this path is correct
import './index.css'

// Verify Trusted Types policy is available (fallback in case HTML inline script didn't work)
interface TrustedTypesWindow extends Window {
  trustedTypes?: {
    defaultPolicy: unknown;
    createPolicy(name: string, rules: {
      createScript?: (str: string) => string;
      createScriptURL?: (str: string) => string;
      createHTML?: (str: string) => string;
    }): unknown;
  };
}

const win = window as TrustedTypesWindow;
if (typeof win.trustedTypes !== 'undefined' && !win.trustedTypes.defaultPolicy) {
  try {
    win.trustedTypes.createPolicy('default', {
      createScript: (str: string) => str,
      createScriptURL: (str: string) => str,
      createHTML: (str: string) => str,
    })
    console.log('✓ Trusted Types fallback policy created in main.tsx')
  } catch (e) {
    console.error('⚠ Failed to create Trusted Types fallback policy:', e)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)