import AddIcon from '@mui/icons-material/Add'
import { IconButton, Tooltip } from '@mui/material'
import ModelSelect from './ModelSelect.jsx'
import SessionRow from './SessionRow.jsx'
import logoUrl from '../images/ollama.png'

export default function SessionSidebar({
  sessions,
  activeSessionId,
  models,
  model,
  modelsLoading,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  onModelChange,
  onRefreshModels
}) {
  return (
    <aside className="session-sidebar">
      <div className="app-title">
        <img className="app-logo" src={logoUrl} alt="" />
        <div>
          <h1>Ask Ollama</h1>
        </div>
      </div>

      <ModelSelect
        models={models}
        value={model}
        loading={modelsLoading}
        onChange={onModelChange}
        onRefresh={onRefreshModels}
      />

      <div className="sidebar-top">
        <div>
          <p className="eyebrow">Discussions</p>
          <h2>Chats</h2>
        </div>
        <Tooltip title="New chat">
          <IconButton color="primary" onClick={onNewSession} aria-label="New chat">
            <AddIcon />
          </IconButton>
        </Tooltip>
      </div>

      <nav className="session-list" aria-label="Saved discussions">
        {sessions.map(session => (
          <SessionRow
            key={session.id}
            session={session}
            active={session.id === activeSessionId}
            onSelect={onSelectSession}
            onRename={onRenameSession}
            onPin={onPinSession}
            onDelete={onDeleteSession}
          />
        ))}
      </nav>
    </aside>
  )
}
