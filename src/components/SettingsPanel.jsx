import { useEffect, useRef, useState } from 'react'

export default function SettingsPanel({
  open,
  models,
  settings,
  onSettingsChange,
  onExportAll,
  onImportAll
}) {
  const inputRef = useRef(null)
  const [voices, setVoices] = useState([])

  useEffect(() => {
    function loadVoices() {
      setVoices(window.speechSynthesis?.getVoices() ?? [])
    }

    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)

    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
  }, [])

  if (!open) {
    return null
  }

  return (
    <div className="settings-panel">
      <label>
        Theme
        <select
          value={settings.theme}
          onChange={event => onSettingsChange({ ...settings, theme: event.target.value })}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>

      <label>
        Font size
        <select
          value={settings.fontSize}
          onChange={event => onSettingsChange({ ...settings, fontSize: event.target.value })}
        >
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
        </select>
      </label>

      <label>
        Default model
        <select
          value={settings.defaultModel}
          onChange={event => onSettingsChange({ ...settings, defaultModel: event.target.value })}
        >
          <option value="">First installed</option>
          {models.map(model => (
            <option key={model.name} value={model.name}>
              {model.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Voice
        <select
          value={settings.voiceName}
          onChange={event => onSettingsChange({ ...settings, voiceName: event.target.value })}
        >
          <option value="">System voice</option>
          {voices.map(voice => (
            <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </label>

      <label>
        Speed
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={settings.voiceRate}
          onChange={event => onSettingsChange({ ...settings, voiceRate: event.target.value })}
        />
      </label>

      <label>
        Pitch
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={settings.voicePitch}
          onChange={event => onSettingsChange({ ...settings, voicePitch: event.target.value })}
        />
      </label>

      <label>
        Mic language
        <select
          value={settings.micLanguage}
          onChange={event => onSettingsChange({ ...settings, micLanguage: event.target.value })}
        >
          <option value="en-US">English US</option>
          <option value="en-GB">English UK</option>
          <option value="fr-FR">French</option>
          <option value="es-ES">Spanish</option>
          <option value="de-DE">German</option>
          <option value="it-IT">Italian</option>
        </select>
      </label>

      <label className="toggle-label">
        <input
          type="checkbox"
          checked={settings.autoReadAnswers}
          onChange={event => onSettingsChange({ ...settings, autoReadAnswers: event.target.checked })}
        />
        Auto-read answers
      </label>

      <label className="toggle-label">
        <input
          type="checkbox"
          checked={settings.keepListening}
          onChange={event => onSettingsChange({ ...settings, keepListening: event.target.checked })}
        />
        Keep mic listening
      </label>

      <div className="settings-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onExportAll}
          title="Backup chats"
          aria-label="Backup chats"
        >
          ⇩
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => inputRef.current?.click()}
          title="Import chats"
          aria-label="Import chats"
        >
          ⇧
        </button>
      </div>

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="application/json"
        onChange={event => {
          const file = event.target.files?.[0]

          if (file) {
            onImportAll(file)
          }

          event.target.value = ''
        }}
      />
    </div>
  )
}
