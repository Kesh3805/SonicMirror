import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  applyReducedMotion,
  applyTheme,
  readReducedMotion,
  readThemePreference,
  type ThemePreference,
} from "../../app/theme";
import { ipc, isNativeRuntime } from "../../ipc/client";
import "./settings.css";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function About() {
  const info = useQuery({ queryKey: ["app-info"], queryFn: ipc.appInfo, enabled: isNativeRuntime() });
  return (
    <dl className="sm-about sm-data">
      {info.data ? (
        <>
          <dt>App</dt>
          <dd>{info.data.app}</dd>
          <dt>Engine</dt>
          <dd>{info.data.engine}</dd>
          <dt>Features</dt>
          <dd>{info.data.featureSchema}</dd>
        </>
      ) : (
        <>
          <dt>Versions</dt>
          <dd>Shown in the desktop app</dd>
        </>
      )}
      <dt>Analysis</dt>
      <dd>Runs on this computer. Nothing is uploaded.</dd>
    </dl>
  );
}

/** Settings (Redesign brief §4.6, A19): a definition grid of preferences. */
export function SettingsPage() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const [reduced, setReduced] = useState(readReducedMotion);

  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <p className="sm-kicker">Preferences</p>
        <h1 className="sm-page-title">Settings</h1>
      </header>

      <div className="sm-settings">
        <div className="sm-setting">
          <div className="sm-setting-text">
            <p className="sm-setting-name" id="appearance-label">
              Appearance
            </p>
            <p className="sm-setting-help">System follows your operating system.</p>
          </div>
          <div className="sm-segmented" role="radiogroup" aria-labelledby="appearance-label">
            {THEMES.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => {
                    setTheme(option.value);
                    applyTheme(option.value);
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="sm-setting">
          <div className="sm-setting-text">
            <label className="sm-setting-name" htmlFor="reduce-motion">
              Reduce motion
            </label>
            <p className="sm-setting-help">
              Turns off transitions and animated loading. Your system setting is always respected.
            </p>
          </div>
          <input
            id="reduce-motion"
            className="sm-switch"
            type="checkbox"
            role="switch"
            checked={reduced}
            onChange={(e) => {
              setReduced(e.target.checked);
              applyReducedMotion(e.target.checked);
            }}
          />
        </div>

        <div className="sm-setting">
          <div className="sm-setting-text">
            <p className="sm-setting-name">About</p>
            <p className="sm-setting-help">SonicMirror is local-first and works offline.</p>
          </div>
          <About />
        </div>
      </div>
    </div>
  );
}
