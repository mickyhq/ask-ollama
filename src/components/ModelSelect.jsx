import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Tooltip } from '@mui/material'
import { getModelCapabilities } from '../lib/modelCapabilities.js'

export default function ModelSelect({ models, value, loading, onChange, onRefresh }) {
  const capabilities = value ? getModelCapabilities(value) : []

  return (
    <Box>
      <div className="model-row">
        <FormControl fullWidth size="small">
          <InputLabel id="model-select-label">Model</InputLabel>
          <Select
            labelId="model-select-label"
            label="Model"
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={loading || models.length === 0}
        >
          {models.length === 0 && <MenuItem value="">No models found</MenuItem>}
          {models.map(model => (
            <MenuItem key={model.name} value={model.name}>
              {model.name}
            </MenuItem>
          ))}
          </Select>
        </FormControl>

        <Tooltip title="Refresh models">
          <span>
            <IconButton color="primary" onClick={onRefresh} disabled={loading} aria-label="Refresh models">
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {capabilities.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.75} mt={1}>
          {capabilities.map(capability => (
            <Chip key={capability} label={capability} color="primary" size="small" variant="outlined" />
          ))}
        </Stack>
      )}
    </Box>
  )
}
