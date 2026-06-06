function formatSize(size) {
  if (size < 1024) {
    return `${size} B`
  }

  return `${Math.round(size / 1024)} KB`
}

function getAttachmentKind(attachment) {
  if (attachment.image) {
    return 'Image'
  }

  if (attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf')) {
    return 'PDF'
  }

  return 'Text'
}

export default function AttachmentList({ attachments, onRemove }) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="attachment-list">
      {attachments.map(attachment => (
        <div className="attachment-pill" key={attachment.id}>
          {attachment.previewUrl && <img src={attachment.previewUrl} alt="" />}
          <span>{attachment.name}</span>
          <small>{getAttachmentKind(attachment)} - {formatSize(attachment.size)}</small>
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            title={`Remove ${attachment.name}`}
            aria-label={`Remove ${attachment.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
