import { createTheme } from '@mui/material/styles'

export function createAppTheme(mode = 'dark', fontSize = 'normal') {
  const baseSize = {
    small: 14,
    normal: 16,
    large: 18
  }[fontSize] ?? 16

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#5eead4'
      },
      secondary: {
        main: '#67e8f9'
      },
      background: {
        default: mode === 'light' ? '#f8fafc' : '#0f1218',
        paper: mode === 'light' ? '#ffffff' : '#121720'
      }
    },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: baseSize
    },
    shape: {
      borderRadius: 8
    },
    components: {
      MuiButton: {
        defaultProps: {
          variant: 'contained'
        }
      },
      MuiIconButton: {
        defaultProps: {
          size: 'small'
        }
      },
      MuiTextField: {
        defaultProps: {
          size: 'small'
        }
      },
      MuiSelect: {
        defaultProps: {
          size: 'small'
        }
      }
    }
  })
}
