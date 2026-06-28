import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyRemoteConfigOverride } from './leaderboard-config.js'
import { fetchAppConfig } from './services/supabase/data.js'

const bootstrap = async () => {
  try {
    const remoteConfig = await fetchAppConfig("leaderboard");
    if (remoteConfig && typeof remoteConfig === "object") {
      applyRemoteConfigOverride(remoteConfig);
    }
  } catch {
    // Keep local config fallback on any read error.
  }

  const { default: App } = await import('./App.jsx');
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

bootstrap();
