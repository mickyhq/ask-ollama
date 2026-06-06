import { useEffect, useMemo, useRef, useState } from 'react'
import ChatComposer from './ChatComposer.jsx'
import ChatMessages from './ChatMessages.jsx'
import SessionSidebar from './SessionSidebar.jsx'
import { generateOllamaAnswer, getOllamaModels } from '../lib/ollamaApi.js'

const sessionsStorageKey = 'ask-ollama-sessions'
const attachmentChunkSize = 12000
const maxAttachmentChunks = 6

function createSession() {
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function summarizeDiscussion(text) {
  const cleanText = text.trim().replace(/\s+/g, ' ')
  const words = cleanText.split(' ').slice(0, 7).join(' ')

  return words || 'New chat'
}

function buildPrompt(messages) {
  return messages
    .map(message => `${message.role === 'user' ? 'User' : 'Ollama'}: ${message.content}`)
    .join('\n\n')
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

function getReferenceChunks(text) {
  const chunkCount = Math.ceil(text.length / attachmentChunkSize)
  const chunks = Array.from({ length: chunkCount }, (_value, index) => {
    const start = index * attachmentChunkSize

    return text.slice(start, start + attachmentChunkSize)
  })

  if (chunks.length <= maxAttachmentChunks) {
    return chunks
  }

  return Array.from({ length: maxAttachmentChunks }, (_value, index) => {
    const sourceIndex = Math.floor(index * (chunks.length - 1) / (maxAttachmentChunks - 1))

    return chunks[sourceIndex]
  })
}

async function askForText(model, prompt, signal) {
  let answer = ''

  await generateOllamaAnswer({
    model,
    prompt,
    onChunk: chunk => {
      answer += chunk
    },
    signal
  })

  return answer.trim()
}

async function summarizeAttachment(model, attachment, onProgress, signal) {
  const chunks = getReferenceChunks(attachment.content)
  const summaries = []

  for (const [index, chunk] of chunks.entries()) {
    onProgress(`Reading ${attachment.name}: part ${index + 1} of ${chunks.length}`)

    const summary = await askForText(
      model,
      `Summarize this reference chunk for later question answering. Keep names, dates, numbers, decisions, requirements, and important details. Be concise.\n\nFile: ${attachment.name}\nChunk: ${index + 1} of ${chunks.length}\n\n${chunk}`,
      signal
    )

    summaries.push(`Chunk ${index + 1}: ${summary}`)
  }

  if (summaries.length === 1) {
    return summaries[0]
  }

  onProgress(`Merging notes from ${attachment.name}`)

  return askForText(
    model,
    `Merge these chunk summaries into one useful reference summary. Preserve concrete facts, names, dates, numbers, requirements, and unresolved questions.\n\nFile: ${attachment.name}\n\n${summaries.join('\n\n')}`,
    signal
  )
}

async function summarizeAttachments(model, attachments, onProgress, signal) {
  const summaries = []

  for (const [index, attachment] of attachments.entries()) {
    onProgress(`Reading file ${index + 1} of ${attachments.length}`)

    const summary = await summarizeAttachment(model, attachment, onProgress, signal)

    summaries.push({
      id: attachment.id,
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      summary
    })
  }

  return summaries
}

function formatAttachmentSummaries(attachments) {
  if (attachments.length === 0) {
    return ''
  }

  return attachments
    .map(attachment => `File: ${attachment.name}\nType: ${attachment.type || 'unknown'}\nSummary:\n${attachment.summary}`)
    .join('\n\n---\n\n')
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
  const activeRequestRef = useRef(null)

  const activeSession = useMemo(
    () => sessions.find(session => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions]
  )

  useEffect(() => {
    localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions))
  }, [sessions])

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

  function startSession() {
    const nextSession = createSession()

    setSessions(currentSessions => [nextSession, ...currentSessions])
    setActiveSessionId(nextSession.id)
    setDraft('')
    setAttachments([])
    setError('')
  }

  function deleteSession(sessionId) {
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

  function cancelRequest() {
    activeRequestRef.current?.abort()
  }

  async function askOllama(event) {
    event.preventDefault()

    const trimmedDraft = draft.trim()

    if ((!trimmedDraft && attachments.length === 0) || !model || loading || !activeSession) {
      return
    }

    const currentAttachments = attachments
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
    setLoading(true)
    activeRequestRef.current = controller
    updateActiveSession(session => ({
      ...session,
      title: session.messages.length === 0 ? summarizeDiscussion(trimmedDraft || currentAttachments[0]?.name || '') : session.title,
      messages: [...session.messages, userMessage, assistantMessage],
      updatedAt: Date.now()
    }))

    function setAssistantContent(content) {
      setSessions(currentSessions => currentSessions.map(session => {
        if (session.id !== activeSession.id) {
          return session
        }

        return {
          ...session,
          messages: session.messages.map(message => {
            if (message.id !== assistantMessage.id) {
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

    try {
      const summarizedAttachments = await summarizeAttachments(model, currentAttachments, setAssistantContent, controller.signal)
      const attachmentText = formatAttachmentSummaries(summarizedAttachments)
      const promptContent = attachmentText
        ? `${trimmedDraft || 'Process attached files.'}\n\nReference summaries:\n\n${attachmentText}`
        : trimmedDraft
      const promptUserMessage = {
        ...userMessage,
        promptContent,
        attachments: summarizedAttachments.map(attachment => ({
          id: attachment.id,
          name: attachment.name,
          type: attachment.type,
          size: attachment.size
        }))
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
      setAssistantContent('')

      await generateOllamaAnswer({
        model,
        prompt: buildPrompt(messagesForOllama.map(message => ({
          ...message,
          content: message.promptContent ?? message.content
        }))),
        onChunk: chunk => {
          setSessions(currentSessions => currentSessions.map(session => {
            if (session.id !== activeSession.id) {
              return session
            }

            return {
              ...session,
              messages: session.messages.map(message => {
                if (message.id !== assistantMessage.id) {
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
        },
        signal: controller.signal
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        setAssistantContent('Canceled.')
      } else {
        setError(err.message || 'Ollama request failed')
      }
    } finally {
      activeRequestRef.current = null
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSession?.id}
        models={models}
        model={model}
        modelsLoading={modelsLoading}
        onSelectSession={setActiveSessionId}
        onNewSession={startSession}
        onDeleteSession={deleteSession}
        onModelChange={setModel}
        onRefreshModels={loadModels}
      />

      <section className="chat-panel">
        {error && <p className="error-text">{error}</p>}

        <ChatMessages messages={activeSession?.messages ?? []} loading={loading} />

        <ChatComposer
          value={draft}
          attachments={attachments}
          loading={loading}
          disabled={modelsLoading || !model}
          onChange={setDraft}
          onAttachmentsChange={setAttachments}
          onSubmit={askOllama}
          onCancel={cancelRequest}
        />
      </section>
    </main>
  )
}
