import { useEffect, useMemo, useRef } from 'react'
import MarkdownResult from './MarkdownResult.jsx'

function formatSize(size) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${Math.round(size / 1024 / 1024)} MB`
}

export default function ChatMessages({ messages, loading }) {
  const messagesRef = useRef(null)
  const scrollKey = useMemo(
    () => messages.map(message => `${message.id}:${message.content.length}`).join('|'),
    [messages]
  )

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [scrollKey])

  if (messages.length === 0) {
    return (
      <section className="messages empty-chat" ref={messagesRef}>
        
      </section>
    )
  }

  return (
    <section className="messages" aria-live="polite" ref={messagesRef}>
      {messages.map(message => (
        <article className={`message ${message.role}`} key={message.id}>
          <div className="message-label">
            {message.role === 'user' ? 'You' : 'Ollama'}
          </div>
          {message.role === 'assistant' ? (
            <MarkdownResult content={message.content || (loading ? 'Thinking...' : '')} />
          ) : (
            <>
              <p>{message.content}</p>
              {message.attachments?.length > 0 && (
                <div className="message-attachments">
                  {message.attachments.map(attachment => (
                    <span key={attachment.id}>
                      {attachment.name} ({formatSize(attachment.size)})
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </article>
      ))}
    </section>
  )
}
