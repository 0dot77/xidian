import { useState, useEffect } from 'react';
import { type ExtensionSettings, DEFAULT_SETTINGS } from '@/types';
import { getSettings, saveSettings } from '@/utils/storage';
import './style.css';

export default function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const update = (partial: Partial<ExtensionSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto p-6 font-sans text-sm text-gray-900 bg-white min-h-screen">
      <h1 className="text-base font-bold mb-4 flex items-center gap-2">
        <span className="text-lg">📎</span> X to Obsidian
      </h1>

      {/* Export Method */}
      <section className="mb-4">
        <label className="block font-semibold mb-1.5 text-gray-700">
          Export Method
        </label>
        <div className="space-y-1">
          {(
            [
              ['uri', 'Obsidian URI'],
              ['clipboard', 'Clipboard'],
              ['rest-api', 'Local REST API'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="exportMethod"
                value={value}
                checked={settings.exportMethod === value}
                onChange={() => update({ exportMethod: value })}
                className="accent-violet-600"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Vault Settings */}
      <section className="mb-4">
        <label className="block font-semibold mb-1 text-gray-700">
          Vault Name
        </label>
        <input
          type="text"
          value={settings.vaultName}
          onChange={(e) => update({ vaultName: e.target.value })}
          placeholder="My Vault"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </section>

      <section className="mb-4">
        <label className="block font-semibold mb-1 text-gray-700">
          Save Path
        </label>
        <input
          type="text"
          value={settings.savePath}
          onChange={(e) => update({ savePath: e.target.value })}
          placeholder="Clippings/Twitter"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </section>

      {/* REST API Settings */}
      {settings.exportMethod === 'rest-api' && (
        <section className="mb-4 p-2.5 bg-gray-50 rounded-lg">
          <label className="block font-semibold mb-1 text-gray-700">
            API Port
          </label>
          <input
            type="number"
            value={settings.restApiPort}
            onChange={(e) =>
              update({ restApiPort: parseInt(e.target.value) || 27123 })
            }
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <label className="block font-semibold mb-1 text-gray-700">
            API Key
          </label>
          <input
            type="password"
            value={settings.restApiKey}
            onChange={(e) => update({ restApiKey: e.target.value })}
            placeholder="Enter API key"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </section>
      )}

      {/* Format Options */}
      <section className="mb-4 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.includeMetrics}
            onChange={(e) => update({ includeMetrics: e.target.checked })}
            className="accent-violet-600"
          />
          <span>Include metrics (likes, reposts)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.includeImages}
            onChange={(e) => update({ includeImages: e.target.checked })}
            className="accent-violet-600"
          />
          <span>Include images</span>
        </label>
      </section>

      <section className="mb-4">
        <label className="block font-semibold mb-1 text-gray-700">
          File Name Template
        </label>
        <input
          type="text"
          value={settings.fileNameTemplate}
          onChange={(e) => update({ fileNameTemplate: e.target.value })}
          placeholder="{{handle}}-{{id}}"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {'{{handle}}, {{id}}, {{date}}, {{name}}'}
        </p>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors"
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Cmd+Shift+X to toggle selection mode on X
      </p>
    </div>
  );
}
