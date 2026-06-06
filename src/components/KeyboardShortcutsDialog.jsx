import { Dialog, DialogContent, DialogTitle, List, ListItem, ListItemText } from '@mui/material'

const shortcuts = [
  ['Cmd/Ctrl K', 'Open command palette'],
  ['Cmd/Ctrl N', 'New chat'],
  ['Cmd/Ctrl /', 'Show shortcuts'],
  ['Enter', 'Send message'],
  ['Shift Enter', 'New line'],
  ['Escape', 'Stop answer']
]

export default function KeyboardShortcutsDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Shortcuts</DialogTitle>
      <DialogContent>
        <List dense>
          {shortcuts.map(([keys, action]) => (
            <ListItem key={keys} disableGutters>
              <ListItemText primary={keys} secondary={action} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  )
}
