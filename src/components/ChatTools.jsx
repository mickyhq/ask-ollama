import ClearAllIcon from '@mui/icons-material/ClearAll'
import DownloadIcon from '@mui/icons-material/Download'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import SettingsIcon from '@mui/icons-material/Settings'
import { Box, IconButton, TextField, Tooltip, Typography } from '@mui/material'

export default function ChatTools({
  search,
  systemPrompt,
  searchCount,
  searchIndex,
  settingsOpen,
  status,
  onSearchChange,
  onSystemPromptChange,
  onSearchNext,
  onSearchPrevious,
  onExport,
  onClear,
  onToggleSettings,
  hasMessages
}) {
  return (
    <Box className="chat-tools">
      <TextField
        aria-label="Search chat"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
        placeholder="Search chat"
      />

      {search.trim() && <Typography className="search-count">{searchCount} found</Typography>}

      {search.trim() && (
        <div className="search-buttons">
          <Tooltip title="Previous match">
            <span>
              <IconButton color="primary" disabled={searchCount === 0} onClick={onSearchPrevious} aria-label="Previous match">
                <NavigateBeforeIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Next match">
            <span>
              <IconButton color="primary" disabled={searchCount === 0} onClick={onSearchNext} aria-label="Next match">
                <NavigateNextIcon />
              </IconButton>
            </span>
          </Tooltip>
          {searchCount > 0 && <Typography variant="body2">{searchIndex + 1}/{searchCount}</Typography>}
        </div>
      )}

      <TextField
        aria-label="System prompt"
        value={systemPrompt}
        onChange={event => onSystemPromptChange(event.target.value)}
        placeholder="System prompt"
      />

      <Tooltip title="Export chat">
        <span>
          <IconButton color="primary" disabled={!hasMessages} onClick={onExport} aria-label="Export chat">
            <DownloadIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Clear chat">
        <span>
          <IconButton color="primary" disabled={!hasMessages} onClick={onClear} aria-label="Clear chat">
            <ClearAllIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={settingsOpen ? 'Hide settings' : 'Show settings'}>
        <IconButton color="primary" onClick={onToggleSettings} aria-label={settingsOpen ? 'Hide settings' : 'Show settings'}>
          <SettingsIcon />
          {settingsOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      {status && <Typography className="status-text">{status}</Typography>}
    </Box>
  )
}
