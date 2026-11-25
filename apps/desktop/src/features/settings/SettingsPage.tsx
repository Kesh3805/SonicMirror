import { useState } from "react";
import { applyTheme, readThemePreference, type ThemePreference } from "../../app/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function SettingsPage() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  return (
    <div className="sm-page">
      <header className="sm-page-header">
        <h1 className="sm-page-title">Settings</h1>
      </header>
      <fieldset className="sm-settings-row">
        <legend>Appearance</legend>
        {OPTIONS.map((option) => (
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
            />{" "}
            {option.label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
