import { CssBaseline, ThemeProvider } from '@mui/material'
import { useMemo } from 'react'
import OllamaChat from './components/OllamaChat.jsx'
import { createAppTheme } from './theme.js'

export default function App() {
  const theme = useMemo(() => createAppTheme(), [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OllamaChat />
    </ThemeProvider>
  )
}
