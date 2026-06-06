import AttachFileIcon from '@mui/icons-material/AttachFile'
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice'
import SendIcon from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import { FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Tooltip } from '@mui/material'
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

        <TextField
          aria-label="Message"
          multiline
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          minRows={2}
          maxRows={5}
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

      <FormControl size="small">
        <InputLabel id="file-mode-label">File mode</InputLabel>
        <Select
          labelId="file-mode-label"
          label="File mode"
          aria-label="File mode"
          value={fileMode}
          onChange={event => setFileMode(event.target.value)}
        >
          <MenuItem value="full">Full file</MenuItem>
          <MenuItem value="first-part">First part</MenuItem>
        </Select>
      </FormControl>

      <Tooltip title="Attach file">
        <span>
          <IconButton color="primary" disabled={loading} onClick={handleBrowse} aria-label="Attach file">
            <AttachFileIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={listening ? 'Stop dictation' : 'Start dictation'}>
        <span>
          <IconButton
            color={listening ? 'warning' : 'primary'}
            disabled={loading || !canUseSpeechRecognition()}
            onClick={toggleMic}
            aria-label={listening ? 'Stop dictation' : 'Start dictation'}
          >
            {listening ? <StopIcon /> : <KeyboardVoiceIcon />}
          </IconButton>
        </span>
      </Tooltip>

      {loading && (
        <Tooltip title="Cancel request">
          <IconButton color="error" onClick={onCancel} aria-label="Cancel request">
            <StopIcon />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title={loading ? 'Waiting' : 'Send message'}>
        <span>
          <IconButton
            color="primary"
            type="submit"
            disabled={disabled || loading || (!value.trim() && attachments.length === 0)}
            aria-label={loading ? 'Waiting' : 'Send message'}
          >
            {loading ? <StopIcon /> : <SendIcon />}
          </IconButton>
        </span>
      </Tooltip>
    </form>
  )
}
