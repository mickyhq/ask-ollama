import { getModelCapabilities } from '../lib/modelCapabilities.js'

export default function ModelSelect({ models, value, loading, onChange, onRefresh }) {
  const capabilities = value ? getModelCapabilities(value) : []

  return (
    <label>
      Model
      <div className="model-row">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={loading || models.length === 0}
        >
          {models.length === 0 && <option value="">No models found</option>}
          {models.map(model => (
            <option key={model.name} value={model.name}>
              {model.name}
            </option>
          ))}
        </select>

        <button
          className="secondary-button"
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh models"
          aria-label="Refresh models"
        >
          ↻
        </button>
      </div>

      {capabilities.length > 0 && (
        <div className="model-badges">
          {capabilities.map(capability => (
            <span key={capability}>{capability}</span>
          ))}
        </div>
      )}
    </label>
  )
}
