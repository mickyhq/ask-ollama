import UploadFileIcon from '@mui/icons-material/UploadFile'
import { IconButton, Tooltip } from '@mui/material'
import { useRef } from 'react'

export default function ImportMarkdownChatButton({ onImport }) {
  const inputRef = useRef(null)

  return (
    <>
      <Tooltip title="Import chat">
        <IconButton color="primary" onClick={() => inputRef.current?.click()} aria-label="Import chat">
          <UploadFileIcon />
        </IconButton>
      </Tooltip>

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept=".md,text/markdown,text/plain"
        onChange={event => {
          const file = event.target.files?.[0]

          if (file) {
            onImport(file)
          }

          event.target.value = ''
        }}
      />
    </>
  )
}
