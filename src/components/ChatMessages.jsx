import { useEffect, useMemo, useRef, useState } from 'react'
import MarkdownResult from './MarkdownResult.jsx'
import { speakText, stopSpeaking } from '../lib/speech.js'

function formatSize(size) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${Math.round(size / 1024 / 1024)} MB`
}

function messageMatchesSearch(message, search) {
  const query = search.trim().toLowerCase()

  if (!query) {
    return false
  }

  const attachmentText = (message.attachments ?? [])
    .map(attachment => attachment.name)
    .join(' ')

  return `${message.content} ${attachmentText}`.toLowerCase().includes(query)
}

function clearSearchHighlights(container) {
  container.querySelectorAll('mark.search-highlight').forEach(mark => {
    mark.replaceWith(document.createTextNode(mark.textContent))
  })
  container.normalize()
}

function highlightSearchText(container, search) {
  const query = search.trim()

  clearSearchHighlights(container)

  if (!query) {
    return
  }

  const nodes = []

  container.querySelectorAll('.message-searchable').forEach(searchable => {
    const walker = document.createTreeWalker(searchable, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) {
          return NodeFilter.FILTER_REJECT
        }

        return node.nodeValue.toLowerCase().includes(query.toLowerCase())
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
      }
    })

    while (walker.nextNode()) {
      nodes.push(walker.currentNode)
    }
  })

  nodes.forEach(node => {
    const text = node.nodeValue
    const fragment = document.createDocumentFragment()
    let index = 0

    while (index < text.length) {
      const matchIndex = text.toLowerCase().indexOf(query.toLowerCase(), index)

      if (matchIndex === -1) {
        fragment.append(document.createTextNode(text.slice(index)))
        break
      }

      fragment.append(document.createTextNode(text.slice(index, matchIndex)))

      const mark = document.createElement('mark')

      mark.className = 'search-highlight'
      mark.textContent = text.slice(matchIndex, matchIndex + query.length)
      fragment.append(mark)
      index = matchIndex + query.length
    }

    node.replaceWith(fragment)
  })
}

export default function ChatMessages({
  messages,
  loading,
  search,
  searchJump,
  voiceSettings = {},
  onEditMessage,
  onRegenerate,
  onCancel
}) {
  const messagesRef = useRef(null)
  const autoScrollRef = useRef(true)
  const autoReadRef = useRef('')
  const previousLoadingRef = useRef(loading)
  const [copiedId, setCopiedId] = useState('')
  const [speakingId, setSpeakingId] = useState('')
  const scrollKey = useMemo(
    () => messages.map(message => `${message.id}:${message.content.length}`).join('|'),
    [messages]
  )
  const lastAssistantId = [...messages].reverse().find(message => message.role === 'assistant')?.id

  useEffect(() => {
    if (!autoScrollRef.current) {
      return
    }

    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [scrollKey])

  useEffect(() => {
    if (!messagesRef.current) {
      return
    }

    highlightSearchText(messagesRef.current, search)
  }, [search, scrollKey])

  useEffect(() => {
    const highlights = messagesRef.current?.querySelectorAll('mark.search-highlight') ?? []

    highlights.forEach(highlight => highlight.classList.remove('active'))

    if (highlights.length === 0) {
      return
    }

    const index = ((searchJump % highlights.length) + highlights.length) % highlights.length
    const activeHighlight = highlights[index]

    activeHighlight.classList.add('active')
    activeHighlight.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    })
  }, [searchJump, search, scrollKey])

  function handleScroll() {
    const element = messagesRef.current

    if (!element) {
      return
    }

    autoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64
  }

  async function copyMessage(message) {
    await navigator.clipboard.writeText(message.content)
    setCopiedId(message.id)
    window.setTimeout(() => setCopiedId(''), 1200)
  }

  function toggleSpeech(message) {
    if (speakingId === message.id) {
      stopSpeaking()
      setSpeakingId('')
      return
    }

    if (speakText(message.content, voiceSettings, () => setSpeakingId(''))) {
      setSpeakingId(message.id)
    }
  }

  useEffect(() => {
    const finishedAnswer = previousLoadingRef.current && !loading

    previousLoadingRef.current = loading

    if (!voiceSettings.autoReadAnswers || !finishedAnswer) {
      return
    }

    const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant')

    if (!lastAssistant?.content || autoReadRef.current === lastAssistant.id) {
      return
    }

    autoReadRef.current = lastAssistant.id

    if (speakText(lastAssistant.content, voiceSettings, () => setSpeakingId(''))) {
      setSpeakingId(lastAssistant.id)
    }
  }, [messages, loading, voiceSettings])

  useEffect(() => {
    return () => {
      stopSpeaking()
    }
  }, [])

  if (messages.length === 0) {
    return (
      <section className="messages empty-chat" ref={messagesRef}>
        
      </section>
    )
  }

  return (
    <section className="messages" aria-live="polite" ref={messagesRef} onScroll={handleScroll}>
      {messages.map(message => (
        <article
          className={`message ${message.role}${messageMatchesSearch(message, search) ? ' search-match' : ''}`}
          key={message.id}
        >
          <div className="message-top">
            <div className="message-label">
              {message.role === 'user' ? 'You' : 'Ollama'}
            </div>

            <div className="message-actions">
              {message.role === 'user' && (
                <button
                  type="button"
                  onClick={() => onEditMessage(message)}
                  title="Edit message"
                  aria-label="Edit message"
                >
                  ✎
                </button>
              )}

              {message.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => copyMessage(message)}
                  title={copiedId === message.id ? 'Copied' : 'Copy answer'}
                  aria-label={copiedId === message.id ? 'Copied' : 'Copy answer'}
                >
                  {copiedId === message.id ? '✓' : '⧉'}
                </button>
              )}

              {message.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => toggleSpeech(message)}
                  title={speakingId === message.id ? 'Stop speaking' : 'Speak answer'}
                  aria-label={speakingId === message.id ? 'Stop speaking' : 'Speak answer'}
                >
                  {speakingId === message.id ? '■' : '▶'}
                </button>
              )}

              {message.id === lastAssistantId && !loading && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  title="Regenerate answer"
                  aria-label="Regenerate answer"
                >
                  ↻
                </button>
              )}

              {message.id === lastAssistantId && loading && (
                <button
                  type="button"
                  onClick={onCancel}
                  title="Stop answer"
                  aria-label="Stop answer"
                >
                  ■
                </button>
              )}
            </div>
          </div>

          {message.role === 'assistant' ? (
            <div className="message-searchable">
              <MarkdownResult content={message.content || (loading ? 'Thinking...' : '')} />
            </div>
          ) : (
            <div className="message-searchable">
              <p>{message.content}</p>
              {message.attachments?.length > 0 && (
                <div className="message-attachments">
                  {message.attachments.map(attachment => (
                    <div className="message-attachment" key={attachment.id}>
                      {attachment.previewUrl && <img src={attachment.previewUrl} alt={attachment.name} />}
                      <span>{attachment.name} ({formatSize(attachment.size)})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {message.stats && (
            <div className="message-stats">
              {message.stats.words} words - {message.stats.seconds}s
            </div>
          )}
        </article>
      ))}
    </section>
  )
}
