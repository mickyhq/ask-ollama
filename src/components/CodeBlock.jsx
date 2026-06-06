import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DoneIcon from '@mui/icons-material/Done'
import { IconButton, Tooltip } from '@mui/material'
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
      <Tooltip title={copied ? 'Copied' : 'Copy code'}>
        <IconButton color="primary" onClick={copyCode} aria-label={copied ? 'Copied' : 'Copy code'}>
          {copied ? <DoneIcon /> : <ContentCopyIcon />}
        </IconButton>
      </Tooltip>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}
