export default function SessionRow({
  session,
  active,
  onSelect,
  onRename,
  onPin,
  onDelete
}) {
  return (
    <div className="session-row">
      <button
        type="button"
        className={active ? 'session-button active' : 'session-button'}
        onClick={() => onSelect(session.id)}
      >
        {session.pinned ? 'Pinned ' : ''}{session.title}
      </button>

      <button
        type="button"
        className="delete-session-button"
        onClick={() => onPin(session.id)}
        title={session.pinned ? 'Unpin chat' : 'Pin chat'}
        aria-label={`${session.pinned ? 'Unpin' : 'Pin'} ${session.title}`}
      >
        {session.pinned ? '★' : '☆'}
      </button>

      <button
        type="button"
        className="delete-session-button"
        onClick={() => onRename(session.id)}
        title="Rename chat"
        aria-label={`Rename ${session.title}`}
      >
        ✎
      </button>

      <button
        type="button"
        className="delete-session-button"
        onClick={() => onDelete(session.id)}
        title="Delete chat"
        aria-label={`Delete ${session.title}`}
      >
        ×
      </button>
    </div>
  )
}
