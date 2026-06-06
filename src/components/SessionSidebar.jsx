import ModelSelect from './ModelSelect.jsx'

export default function SessionSidebar({
  sessions,
  activeSessionId,
  models,
  model,
  modelsLoading,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onModelChange,
  onRefreshModels
}) {
  return (
    <aside className="session-sidebar">
      <div className="app-title">
        <div>
          <p className="eyebrow">Ollama</p>
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
        <button type="button" onClick={onNewSession}>
          New
        </button>
      </div>

      <nav className="session-list" aria-label="Saved discussions">
        {sessions.map(session => (
          <div className="session-row" key={session.id}>
            <button
              type="button"
              className={session.id === activeSessionId ? 'session-button active' : 'session-button'}
              onClick={() => onSelectSession(session.id)}
            >
              {session.title}
            </button>

            <button
              type="button"
              className="delete-session-button"
              onClick={() => onDeleteSession(session.id)}
              aria-label={`Delete ${session.title}`}
            >
              Delete
            </button>
          </div>
        ))}
      </nav>
    </aside>
  )
}
