import AddIcon from '@mui/icons-material/Add'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import { IconButton, Tooltip } from '@mui/material'
import ModelSelect from './ModelSelect.jsx'
import SessionRow from './SessionRow.jsx'
import logoUrl from '../images/ollama.png'

function getGroupName(timestamp) {
  const date = new Date(timestamp ?? Date.now())
  const today = new Date()
  const yesterday = new Date()

  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return 'Older'
}

function groupSessions(sessions) {
  return sessions.reduce((groups, session) => {
    const groupName = session.pinned ? 'Pinned' : getGroupName(session.updatedAt)
    const group = groups.find(currentGroup => currentGroup.name === groupName)

    if (group) {
      group.sessions.push(session)
      return groups
    }

    return [...groups, { name: groupName, sessions: [session] }]
  }, [])
}

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
  onArchiveSession,
  onDuplicateSession,
  onToggleArchived,
  onModelChange,
  onRefreshModels,
  showArchived
}) {
  const visibleSessions = sessions.filter(session => showArchived ? session.archived : !session.archived)
  const groups = groupSessions(visibleSessions)

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
        <Tooltip title={showArchived ? 'Show active chats' : 'Show archived chats'}>
          <IconButton color={showArchived ? 'secondary' : 'primary'} onClick={onToggleArchived} aria-label={showArchived ? 'Show active chats' : 'Show archived chats'}>
            <Inventory2Icon />
          </IconButton>
        </Tooltip>
      </div>

      <nav className="session-list" aria-label="Saved discussions">
        {groups.length === 0 && (
          <p className="empty-state">{showArchived ? 'No archived chats.' : 'No chats.'}</p>
        )}
        {groups.map(group => (
          <div className="session-group" key={group.name}>
            <p>{group.name}</p>
            {group.sessions.map(session => (
              <SessionRow
                key={session.id}
                session={session}
                active={session.id === activeSessionId}
                onSelect={onSelectSession}
                onRename={onRenameSession}
                onPin={onPinSession}
                onArchive={onArchiveSession}
                onDuplicate={onDuplicateSession}
                onDelete={onDeleteSession}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
