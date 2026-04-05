import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Ensure this path is correct
import './index.css'

// Verify Trusted Types policy is available (fallback in case HTML inline script didn't work)
if (typeof window.trustedTypes !== 'undefined' && !window.trustedTypes.defaultPolicy) {
  try {
    window.trustedTypes.createPolicy('default', {
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