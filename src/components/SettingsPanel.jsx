import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Tooltip,
  Typography
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import ModelDetails from './ModelDetails.jsx'

export default function SettingsPanel({
  open,
  models,
  model,
  modelInfo,
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
      <FormControl size="small">
        <InputLabel id="theme-label">Theme</InputLabel>
        <Select
          labelId="theme-label"
          label="Theme"
          value={settings.theme}
          onChange={event => onSettingsChange({ ...settings, theme: event.target.value })}
        >
          <MenuItem value="dark">Dark</MenuItem>
          <MenuItem value="light">Light</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel id="font-size-label">Font size</InputLabel>
        <Select
          labelId="font-size-label"
          label="Font size"
          value={settings.fontSize}
          onChange={event => onSettingsChange({ ...settings, fontSize: event.target.value })}
        >
          <MenuItem value="small">Small</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="large">Large</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel id="density-label">Density</InputLabel>
        <Select
          labelId="density-label"
          label="Density"
          value={settings.density}
          onChange={event => onSettingsChange({ ...settings, density: event.target.value })}
        >
          <MenuItem value="compact">Compact</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="cozy">Cozy</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel id="default-model-label">Default model</InputLabel>
        <Select
          labelId="default-model-label"
          label="Default model"
          value={settings.defaultModel}
          onChange={event => onSettingsChange({ ...settings, defaultModel: event.target.value })}
        >
          <MenuItem value="">First installed</MenuItem>
          {models.map(model => (
            <MenuItem key={model.name} value={model.name}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel id="voice-label">Voice</InputLabel>
        <Select
          labelId="voice-label"
          label="Voice"
          value={settings.voiceName}
          onChange={event => onSettingsChange({ ...settings, voiceName: event.target.value })}
        >
          <MenuItem value="">System voice</MenuItem>
          {voices.map(voice => (
            <MenuItem key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div>
        <Typography variant="caption">Speed</Typography>
        <Slider
          min="0.5"
          max="2"
          step="0.1"
          value={settings.voiceRate}
          onChange={(_event, value) => onSettingsChange({ ...settings, voiceRate: value })}
        />
      </div>

      <div>
        <Typography variant="caption">Pitch</Typography>
        <Slider
          min="0.5"
          max="2"
          step="0.1"
          value={settings.voicePitch}
          onChange={(_event, value) => onSettingsChange({ ...settings, voicePitch: value })}
        />
      </div>

      <FormControl size="small">
        <InputLabel id="mic-language-label">Mic language</InputLabel>
        <Select
          labelId="mic-language-label"
          label="Mic language"
          value={settings.micLanguage}
          onChange={event => onSettingsChange({ ...settings, micLanguage: event.target.value })}
        >
          <MenuItem value="en-US">English US</MenuItem>
          <MenuItem value="en-GB">English UK</MenuItem>
          <MenuItem value="fr-FR">French</MenuItem>
          <MenuItem value="es-ES">Spanish</MenuItem>
          <MenuItem value="de-DE">German</MenuItem>
          <MenuItem value="it-IT">Italian</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={(
          <Checkbox
            checked={settings.autoReadAnswers}
            onChange={event => onSettingsChange({ ...settings, autoReadAnswers: event.target.checked })}
          />
        )}
        label="Auto-read answers"
      />

      <FormControlLabel
        control={(
          <Checkbox
            checked={settings.keepListening}
            onChange={event => onSettingsChange({ ...settings, keepListening: event.target.checked })}
          />
        )}
        label="Keep mic listening"
      />

      <div className="settings-actions">
        <Tooltip title="Backup chats">
          <IconButton color="primary" onClick={onExportAll} aria-label="Backup chats">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Import chats">
          <IconButton color="primary" onClick={() => inputRef.current?.click()} aria-label="Import chats">
            <UploadFileIcon />
          </IconButton>
        </Tooltip>
      </div>

      <ModelDetails model={model} modelInfo={modelInfo} />

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
