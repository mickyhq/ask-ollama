import { ThemeProvider } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import ChatComposer from './ChatComposer.jsx'
import ChatMessages from './ChatMessages.jsx'
import ChatTools from './ChatTools.jsx'
import SettingsPanel from './SettingsPanel.jsx'
import SessionSidebar from './SessionSidebar.jsx'
import { generateOllamaAnswer, getOllamaModelInfo, getOllamaModels } from '../lib/ollamaApi.js'
import { createAppTheme } from '../theme.js'

const sessionsStorageKey = 'ask-ollama-sessions'
const settingsStorageKey = 'ask-ollama-settings'
const largeContextChars = 120000

const defaultSettings = {
  theme: 'dark',
  fontSize: 'normal',
  defaultModel: '',
  voiceName: '',
  voiceRate: 1,
  voicePitch: 1,
  autoReadAnswers: false,
  micLanguage: 'en-US',
  keepListening: false
}

function createSession() {
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function loadSavedSettings() {
  try {
    return {
      ...defaultSettings,
      ...JSON.parse(localStorage.getItem(settingsStorageKey) || '{}')
    }
  } catch {
    return defaultSettings
  }
}

function sortSessions(sessions) {
  return [...sessions].sort((first, second) => {
    if (Boolean(first.pinned) !== Boolean(second.pinned)) {
      return first.pinned ? -1 : 1
    }

    return (second.updatedAt ?? 0) - (first.updatedAt ?? 0)
  })
}

function createSessionTitle(text) {
  const cleanText = text.trim().replace(/\s+/g, ' ')
  const words = cleanText.split(' ').slice(0, 7).join(' ')

  return words || 'New chat'
}

function buildPrompt(messages) {
  return messages
    .map(message => `${message.role === 'user' ? 'User' : 'Ollama'}: ${message.content}`)
    .join('\n\n')
}

function buildFullPrompt(systemPrompt, messages) {
  const chatPrompt = buildPrompt(messages)

  if (!systemPrompt.trim()) {
    return chatPrompt
  }

  return `System: ${systemPrompt.trim()}\n\n${chatPrompt}`
}

function isVisionModel(modelName) {
  const name = modelName.toLowerCase()

  return ['vision', 'llava', 'bakllava', 'moondream', 'minicpm-v', 'gemma3'].some(part => name.includes(part))
}

function modelInfoHasVision(modelInfo) {
  const capabilityText = [
    ...(modelInfo?.capabilities ?? []),
    modelInfo?.details?.family,
    modelInfo?.model_info?.['general.architecture']
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return ['vision', 'clip', 'multimodal', 'llava'].some(part => capabilityText.includes(part))
}

function loadSavedSessions() {
  try {
    const savedSessions = JSON.parse(localStorage.getItem(sessionsStorageKey) || '[]')

    if (Array.isArray(savedSessions) && savedSessions.length > 0) {
      return savedSessions
    }
  } catch {
    return [createSession()]
  }

  return [createSession()]
}

function formatAttachmentContents(attachments) {
  if (attachments.length === 0) {
    return ''
  }

  return attachments
    .map(attachment => {
      const content = attachment.image
        ? '[image attached]'
        : attachment.content

      return `File: ${attachment.name}\nType: ${attachment.type || 'unknown'}\nContent:\n${content}`
    })
    .join('\n\n---\n\n')
}

function getAttachmentImages(attachments) {
  return attachments
    .map(attachment => attachment.image)
    .filter(Boolean)
}

function countSearchMatches(text, search) {
  const query = search.trim().toLowerCase()

  if (!query) {
    return 0
  }

  let count = 0
  let index = 0
  const lowerText = text.toLowerCase()

  while (index < lowerText.length) {
    const matchIndex = lowerText.indexOf(query, index)

    if (matchIndex === -1) {
      break
    }

    count += 1
    index = matchIndex + query.length
  }

  return count
}

export default function OllamaChat() {
  const [models, setModels] = useState([])
  const [model, setModel] = useState('')
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [sessions, setSessions] = useState(loadSavedSessions)
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0].id)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [settings, setSettings] = useState(loadSavedSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelInfo, setModelInfo] = useState(null)
  const [status, setStatus] = useState('')
  const [searchJump, setSearchJump] = useState(0)
  const activeRequestRef = useRef(null)

  const activeSession = useMemo(
    () => sessions.find(session => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions]
  )
  const muiTheme = useMemo(
    () => createAppTheme(settings.theme, settings.fontSize),
    [settings.theme, settings.fontSize]
  )
  const sortedSessions = useMemo(() => sortSessions(sessions), [sessions])

  useEffect(() => {
    localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.dataset.fontSize = settings.fontSize
  }, [settings])

  useEffect(() => {
    if (activeSession?.model && activeSession.model !== model) {
      setModel(activeSession.model)
    }
  }, [activeSession?.id])

  useEffect(() => {
    let alive = true

    getOllamaModelInfo(model).then(info => {
      if (alive) {
        setModelInfo(info)
      }
    })

    return () => {
      alive = false
    }
  }, [model])

  const searchCount = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return 0
    }

    return (activeSession?.messages ?? []).reduce((count, message) => {
      const attachmentText = (message.attachments ?? [])
        .map(attachment => attachment.name)
        .join(' ')

      return count + countSearchMatches(`${message.content} ${attachmentText}`, query)
    }, 0)
  }, [activeSession?.messages, search])

  const composerWarning = useMemo(() => {
    const modelCanSee = modelInfoHasVision(modelInfo) || isVisionModel(model)

    if (attachments.some(attachment => attachment.image) && model && !modelCanSee) {
      return 'Pick vision model for image.'
    }

    if (attachments.some(attachment => (attachment.content?.length ?? 0) > largeContextChars)) {
      return 'Large file. Use smaller chapter if model forgets.'
    }

    return ''
  }, [attachments, model, modelInfo])

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector('[aria-label="Search chat"]')?.focus()
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        startSession()
      }

      if (event.key === 'Escape' && loading) {
        cancelRequest()
      }
    }

    window.addEventListener('keydown', handleShortcut)

    return () => window.removeEventListener('keydown', handleShortcut)
  }, [loading, sessions, activeSessionId])

  async function loadModels() {
    setModelsLoading(true)
    setError('')

    try {
      const data = await getOllamaModels()
      const installedModels = data.models ?? []

      setModels(installedModels)
      setModel(current => {
        if (installedModels.some(installedModel => installedModel.name === current)) {
          return current
        }

        if (installedModels.some(installedModel => installedModel.name === activeSession?.model)) {
          return activeSession.model
        }

        if (installedModels.some(installedModel => installedModel.name === settings.defaultModel)) {
          return settings.defaultModel
        }

        return installedModels[0]?.name ?? ''
      })
    } catch (err) {
      setModels([])
      setModel('')
      setError(err.message || 'Could not load Ollama models')
    } finally {
      setModelsLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
  }, [])

  function updateActiveSession(updater) {
    setSessions(currentSessions => currentSessions.map(session => {
      if (session.id !== activeSession.id) {
        return session
      }

      return updater(session)
    }))
  }

  function changeModel(nextModel) {
    setModel(nextModel)

    if (!activeSession) {
      return
    }

    updateActiveSession(session => ({
      ...session,
      model: nextModel,
      updatedAt: Date.now()
    }))
  }

  function startSession() {
    const nextSession = createSession()

    setSessions(currentSessions => [{
      ...nextSession,
      model: settings.defaultModel || model
    }, ...currentSessions])
    setActiveSessionId(nextSession.id)
    setDraft('')
    setAttachments([])
    setError('')
  }

  function deleteSession(sessionId) {
    const session = sessions.find(currentSession => currentSession.id === sessionId)

    if (session && !window.confirm(`Delete "${session.title}"?`)) {
      return
    }

    setSessions(currentSessions => {
      const nextSessions = currentSessions.filter(session => session.id !== sessionId)
      const fallbackSession = nextSessions[0] ?? createSession()

      if (sessionId === activeSessionId) {
        setActiveSessionId(fallbackSession.id)
      }

      return nextSessions.length > 0 ? nextSessions : [fallbackSession]
    })
    setError('')
  }

  function renameSession(sessionId) {
    const session = sessions.find(currentSession => currentSession.id === sessionId)
    const title = window.prompt('Rename chat', session?.title ?? '')

    if (!title?.trim()) {
      return
    }

    setSessions(currentSessions => currentSessions.map(currentSession => {
      if (currentSession.id !== sessionId) {
        return currentSession
      }

      return {
        ...currentSession,
        title: title.trim(),
        updatedAt: Date.now()
      }
    }))
  }

  function pinSession(sessionId) {
    setSessions(currentSessions => currentSessions.map(session => {
      if (session.id !== sessionId) {
        return session
      }

      return {
        ...session,
        pinned: !session.pinned,
        updatedAt: Date.now()
      }
    }))
  }

  function cancelRequest() {
    activeRequestRef.current?.abort()
  }

  function clearChat() {
    updateActiveSession(session => ({
      ...session,
      messages: [],
      title: 'New chat',
      updatedAt: Date.now()
    }))
    setDraft('')
    setAttachments([])
    setError('')
  }

  function exportChat() {
    if (!activeSession) {
      return
    }

    const markdown = activeSession.messages
      .map(message => {
        const attachmentsText = (message.attachments ?? [])
          .map(attachment => attachment.previewUrl
            ? `\n- ${attachment.name}\n\n![${attachment.name}](${attachment.previewUrl})`
            : `\n- ${attachment.name}`)
          .join('')
        const title = message.role === 'user' ? 'You' : 'Ollama'

        return `## ${title}\n\n${message.content}${attachmentsText ? `\n\nAttachments:${attachmentsText}` : ''}`
      })
      .join('\n\n')
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${activeSession.title || 'chat'}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportAllChats() {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      sessions
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'ask-ollama-backup.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importAllChats(file) {
    try {
      const backup = JSON.parse(await file.text())

      if (!Array.isArray(backup.sessions)) {
        throw new Error('Bad backup')
      }

      const importedSessions = backup.sessions.length > 0 ? backup.sessions : [createSession()]

      setSessions(importedSessions)
      setSettings({
        ...defaultSettings,
        ...(backup.settings ?? {})
      })
      setActiveSessionId(importedSessions[0].id)
      setError('')
    } catch {
      setError('Backup file not good.')
    }
  }

  function editMessage(message) {
    const messageIndex = activeSession.messages.findIndex(sessionMessage => sessionMessage.id === message.id)
    const branchSession = {
      ...createSession(),
      title: `${activeSession.title} branch`,
      model: activeSession.model,
      messages: messageIndex >= 0 ? activeSession.messages.slice(0, messageIndex) : activeSession.messages
    }

    setDraft(message.content)
    setAttachments([])
    setSessions(currentSessions => [branchSession, ...currentSessions])
    setActiveSessionId(branchSession.id)
  }

  function setAssistantContent(sessionId, assistantMessageId, content) {
    setSessions(currentSessions => currentSessions.map(session => {
      if (session.id !== sessionId) {
        return session
      }

      return {
        ...session,
        messages: session.messages.map(message => {
          if (message.id !== assistantMessageId) {
            return message
          }

          return {
            ...message,
            content
          }
        }),
        updatedAt: Date.now()
      }
    }))
  }

  function appendAssistantContent(sessionId, assistantMessageId, chunk) {
    setSessions(currentSessions => currentSessions.map(session => {
      if (session.id !== sessionId) {
        return session
      }

      return {
        ...session,
        messages: session.messages.map(message => {
          if (message.id !== assistantMessageId) {
            return message
          }

          return {
            ...message,
            content: message.content + chunk
          }
        }),
        updatedAt: Date.now()
      }
    }))
  }

  async function runAnswer({ sessionId, assistantMessageId, messagesForOllama, images, signal }) {
    const startedAt = Date.now()

    await generateOllamaAnswer({
      model,
      prompt: buildFullPrompt(systemPrompt, messagesForOllama.map(message => ({
        ...message,
        content: message.promptContent ?? message.content
      }))),
      images,
      onChunk: chunk => appendAssistantContent(sessionId, assistantMessageId, chunk),
      signal
    })

    setSessions(currentSessions => currentSessions.map(session => {
      if (session.id !== sessionId) {
        return session
      }

      return {
        ...session,
        messages: session.messages.map(message => {
          if (message.id !== assistantMessageId) {
            return message
          }

          return {
            ...message,
            stats: {
              seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
              words: message.content.trim().split(/\s+/).filter(Boolean).length
            }
          }
        })
      }
    }))
  }

  async function regenerateLastAnswer() {
    if (!activeSession || loading) {
      return
    }

    const assistantIndex = activeSession.messages.findLastIndex(message => message.role === 'assistant')

    if (assistantIndex < 0) {
      return
    }

    const userIndex = activeSession.messages
      .slice(0, assistantIndex)
      .findLastIndex(message => message.role === 'user')

    if (userIndex < 0) {
      return
    }

    const controller = new AbortController()
    const assistantMessage = activeSession.messages[assistantIndex]
    const userMessage = activeSession.messages[userIndex]

    setError('')
    setStatus('Regenerating')
    setLoading(true)
    activeRequestRef.current = controller
    setAssistantContent(activeSession.id, assistantMessage.id, '')

    try {
      await runAnswer({
        sessionId: activeSession.id,
        assistantMessageId: assistantMessage.id,
        messagesForOllama: activeSession.messages.slice(0, userIndex + 1),
        images: userMessage.promptImages ?? [],
        signal: controller.signal
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        setAssistantContent(activeSession.id, assistantMessage.id, 'Canceled.')
      } else {
        setError(err.message || 'Ollama request failed')
      }
    } finally {
      activeRequestRef.current = null
      setLoading(false)
      setStatus('')
    }
  }

  async function askOllama(event) {
    event.preventDefault()

    const trimmedDraft = draft.trim()

    if ((!trimmedDraft && attachments.length === 0) || !model || loading || !activeSession) {
      return
    }

    const currentAttachments = attachments
    const sessionId = activeSession.id
    const controller = new AbortController()
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedDraft || 'Process attached files.',
      attachments: currentAttachments.map(attachment => ({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size
      }))
    }
    const assistantMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: currentAttachments.length > 0 ? 'Reading file...' : ''
    }

    setDraft('')
    setAttachments([])
    setError('')
    setStatus(currentAttachments.length > 0 ? 'Reading files' : 'Generating')
    setLoading(true)
    activeRequestRef.current = controller
    updateActiveSession(session => ({
      ...session,
      title: session.messages.length === 0 ? createSessionTitle(trimmedDraft || currentAttachments[0]?.name || '') : session.title,
      messages: [...session.messages, userMessage, assistantMessage],
      updatedAt: Date.now()
    }))

    try {
      const attachmentText = formatAttachmentContents(currentAttachments)
      const promptImages = getAttachmentImages(currentAttachments)
      const visibleAttachments = currentAttachments.map(attachment => ({
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        previewUrl: attachment.previewUrl
      }))
      const promptContent = attachmentText
        ? `${trimmedDraft || 'Process attached files.'}\n\nAttached files:\n\n${attachmentText}`
        : trimmedDraft
      const promptUserMessage = {
        ...userMessage,
        promptContent,
        attachments: visibleAttachments,
        promptImages
      }
      const messagesForOllama = [...activeSession.messages, promptUserMessage]

      setSessions(currentSessions => currentSessions.map(session => {
        if (session.id !== activeSession.id) {
          return session
        }

        return {
          ...session,
          messages: session.messages.map(message => {
            if (message.id !== userMessage.id) {
              return message
            }

            return promptUserMessage
          }),
          updatedAt: Date.now()
        }
      }))
      setAssistantContent(sessionId, assistantMessage.id, '')
      setStatus(promptImages.length > 0 ? 'Sending image' : 'Generating')

      await runAnswer({
        sessionId,
        assistantMessageId: assistantMessage.id,
        messagesForOllama,
        images: promptImages,
        signal: controller.signal
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        setAssistantContent(sessionId, assistantMessage.id, 'Canceled.')
      } else {
        setError(err.message || 'Ollama request failed')
      }
    } finally {
      activeRequestRef.current = null
      setLoading(false)
      setStatus('')
    }
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <main className="app-shell">
      <SessionSidebar
        sessions={sortedSessions}
        activeSessionId={activeSession?.id}
        models={models}
        model={model}
        modelsLoading={modelsLoading}
        onSelectSession={setActiveSessionId}
        onNewSession={startSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onPinSession={pinSession}
        onModelChange={changeModel}
        onRefreshModels={loadModels}
      />

      <section className="chat-panel">
        {error && <p className="error-text">{error}</p>}

        <ChatTools
          search={search}
          systemPrompt={systemPrompt}
          searchCount={searchCount}
          searchIndex={searchCount === 0 ? 0 : Math.abs(searchJump) % searchCount}
          settingsOpen={settingsOpen}
          status={status}
          hasMessages={(activeSession?.messages ?? []).length > 0}
          onSearchChange={setSearch}
          onSystemPromptChange={setSystemPrompt}
          onSearchNext={() => setSearchJump(current => current + 1)}
          onSearchPrevious={() => setSearchJump(current => current - 1)}
          onExport={exportChat}
          onClear={clearChat}
          onToggleSettings={() => setSettingsOpen(current => !current)}
        />

        <SettingsPanel
          open={settingsOpen}
          models={models}
          settings={settings}
          onSettingsChange={setSettings}
          onExportAll={exportAllChats}
          onImportAll={importAllChats}
        />

        <ChatMessages
          messages={activeSession?.messages ?? []}
          loading={loading}
          search={search}
          searchJump={searchJump}
          voiceSettings={settings}
          onEditMessage={editMessage}
          onRegenerate={regenerateLastAnswer}
          onCancel={cancelRequest}
        />

        <ChatComposer
          value={draft}
          attachments={attachments}
          loading={loading}
          disabled={modelsLoading || !model}
          warning={composerWarning}
          voiceSettings={settings}
          onChange={setDraft}
          onAttachmentsChange={setAttachments}
          onSubmit={askOllama}
          onCancel={cancelRequest}
        />
      </section>
      </main>
    </ThemeProvider>
  )
}
