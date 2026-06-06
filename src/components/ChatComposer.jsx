import { useEffect, useRef, useState } from 'react'
import AttachmentList from './AttachmentList.jsx'
import PromptTemplates from './PromptTemplates.jsx'
import { extractPdfText } from '../lib/pdfText.js'
import { isImageFile, readFileAsDataUrl } from '../lib/files.js'
import { canUseSpeechRecognition, getSpeechRecognition } from '../lib/speech.js'

const maxFileBytes = 30 * 1024 * 1024
const bigAttachmentChars = 120000

async function readFileAttachment(file, fileMode) {
  if (isImageFile(file)) {
    const dataUrl = await readFileAsDataUrl(file)

    return {
      content: '',
      image: dataUrl.split(',')[1] ?? '',
      previewUrl: dataUrl
    }
  }

  const content = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    ? await extractPdfText(file)
    : await file.text()

  if (file.name.toLowerCase().endsWith('.pdf') && !content.trim()) {
    throw new Error('empty-pdf')
  }

  if (fileMode === 'first-part' && content.length > bigAttachmentChars) {
    return {
      content: `${content.slice(0, bigAttachmentChars)}\n\n[Only first part attached.]`
    }
  }

  return { content }
}

export default function ChatComposer({
  value,
  attachments,
  loading,
  disabled,
  onChange,
  onAttachmentsChange,
  onSubmit,
  onCancel,
  warning,
  voiceSettings = {}
}) {
  const fileInputRef = useRef(null)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileMode, setFileMode] = useState('full')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const dictationBaseRef = useRef('')

  const hasBigAttachment = attachments.some(attachment => (attachment.content?.length ?? 0) > bigAttachmentChars)

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
        const attachment = await readFileAttachment(file, fileMode)

        nextAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          ...attachment
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
    event.stopPropagation()
    setDragging(false)

    if (!loading) {
      addFiles(event.dataTransfer.files)
    }
  }

  function handlePaste(event) {
    const files = Array.from(event.clipboardData.files).filter(isImageFile)

    if (files.length > 0 && !loading) {
      addFiles(files)
    }
  }

  function handleBrowse() {
    fileInputRef.current?.click()
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const Recognition = getSpeechRecognition()

    if (!Recognition) {
      setFileError('Speech input not supported here.')
      return
    }

    const recognition = new Recognition()

    dictationBaseRef.current = value
    recognition.continuous = Boolean(voiceSettings.keepListening)
    recognition.interimResults = true
    recognition.lang = voiceSettings.micLanguage || navigator.language || 'en-US'
    recognitionRef.current = recognition
    setListening(true)

    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript ?? '')
        .join('')
        .trim()

      if (transcript) {
        const base = dictationBaseRef.current.trim()

        onChange(base ? `${base} ${transcript}` : transcript)
      }
    }

    recognition.onerror = () => {
      setFileError('Speech input failed.')
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognition.start()
  }

  useEffect(() => {
    function handleWindowDragOver(event) {
      event.preventDefault()
      setDragging(true)
    }

    function handleWindowDrop(event) {
      event.preventDefault()
      setDragging(false)

      if (!loading) {
        addFiles(event.dataTransfer.files)
      }
    }

    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('drop', handleWindowDrop)

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('drop', handleWindowDrop)
    }
  }, [loading, attachments])

  return (
    <form
      className={dragging ? 'chat-composer dragging' : 'chat-composer'}
      onSubmit={onSubmit}
      onDragOver={event => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="composer-main">
        <AttachmentList attachments={attachments} onRemove={removeAttachment} />

        {fileError && <p className="file-error">{fileError}</p>}
        {warning && <p className="file-warning">{warning}</p>}
        {hasBigAttachment && <p className="file-warning">Big file. Model may forget far text.</p>}

        <textarea
          aria-label="Message"
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
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

      <PromptTemplates onApply={template => onChange(value ? `${value}\n\n${template}` : template)} />

      <select
        aria-label="File mode"
        value={fileMode}
        onChange={event => setFileMode(event.target.value)}
      >
        <option value="full">Full file</option>
        <option value="first-part">First part</option>
      </select>

      <button
        className="attach-button"
        type="button"
        disabled={loading}
        onClick={handleBrowse}
        title="Attach file"
        aria-label="Attach file"
      >
        ⎘
      </button>

      <button
        className={listening ? 'mic-button listening' : 'mic-button'}
        type="button"
        disabled={loading || !canUseSpeechRecognition()}
        onClick={toggleMic}
        title={listening ? 'Stop dictation' : 'Start dictation'}
        aria-label={listening ? 'Stop dictation' : 'Start dictation'}
      >
        {listening ? '■' : '◉'}
      </button>

      {loading && (
        <button
          className="cancel-button"
          type="button"
          onClick={onCancel}
          title="Cancel request"
          aria-label="Cancel request"
        >
          ■
        </button>
      )}

      <button
        type="submit"
        disabled={disabled || loading || (!value.trim() && attachments.length === 0)}
        title={loading ? 'Waiting' : 'Send message'}
        aria-label={loading ? 'Waiting' : 'Send message'}
      >
        {loading ? '…' : '↑'}
      </button>
    </form>
  )
}
