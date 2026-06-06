import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm
}) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2">
          {body}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
