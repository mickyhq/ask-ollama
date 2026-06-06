import { useRef, useState } from 'react'
import AttachmentList from './AttachmentList.jsx'
import { extractPdfText } from '../lib/pdfText.js'

const maxFileBytes = 30 * 1024 * 1024

export default function ChatComposer({
  value,
  attachments,
  loading,
  disabled,
  onChange,
  onAttachmentsChange,
  onSubmit,
  onCancel
}) {
  const fileInputRef = useRef(null)
  const [fileError, setFileError] = useState('')

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit(event)
    }
  }

  async function addFiles(fileList) {
    setFileError('')

    const files = Array.from(fileList)
    const nextAttachments = []

    for (const file of files) {
      if (file.size > maxFileBytes) {
        setFileError(`${file.name} too big. Max 30 MB.`)
        continue
      }

      try {
        const content = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
          ? await extractPdfText(file)
          : await file.text()

        nextAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          content
        })
      } catch {
        setFileError(`${file.name} could not be read.`)
      }
    }

    if (nextAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...nextAttachments])
    }
  }

  function removeAttachment(attachmentId) {
    onAttachmentsChange(attachments.filter(attachment => attachment.id !== attachmentId))
  }

  function handleDrop(event) {
    event.preventDefault()

    if (!loading) {
      addFiles(event.dataTransfer.files)
    }
  }

  function handleBrowse() {
    fileInputRef.current?.click()
  }

  return (
    <form
      className="chat-composer"
      onSubmit={onSubmit}
      onDragOver={event => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="composer-main">
        <AttachmentList attachments={attachments} onRemove={removeAttachment} />

        {fileError && <p className="file-error">{fileError}</p>}

        <textarea
          aria-label="Message"
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows="2"
          placeholder="Ask Ollama..."
        />
      </div>

      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        multiple
        onChange={event => {
          addFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <button className="attach-button" type="button" disabled={loading} onClick={handleBrowse}>
        File
      </button>

      {loading && (
        <button className="cancel-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      )}

      <button type="submit" disabled={disabled || loading || (!value.trim() && attachments.length === 0)}>
        {loading ? 'Wait' : 'Send'}
      </button>
    </form>
  )
}
