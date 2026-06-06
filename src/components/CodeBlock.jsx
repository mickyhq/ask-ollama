import { useState } from 'react'

export default function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false)
  const text = String(children ?? '').replace(/\n$/, '')

  async function copyCode() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="code-block">
      <button
        type="button"
        onClick={copyCode}
        title={copied ? 'Copied' : 'Copy code'}
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? '✓' : '⧉'}
      </button>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}
