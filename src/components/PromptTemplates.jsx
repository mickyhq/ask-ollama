const templates = [
  {
    name: 'Explain image',
    prompt: 'Explain this image. Mention important objects, text, layout, and likely meaning.'
  },
  {
    name: 'Summarize PDF',
    prompt: 'Summarize this document. Include key points, decisions, dates, names, and numbers.'
  },
  {
    name: 'Code review',
    prompt: 'Review this code. Lead with bugs and risks, then suggest small fixes.'
  },
  {
    name: 'Extract tasks',
    prompt: 'Extract action items, owners, deadlines, and open questions.'
  }
]

export default function PromptTemplates({ onApply }) {
  return (
    <FormControl size="small">
      <InputLabel id="prompt-template-label">Template</InputLabel>
      <Select
        labelId="prompt-template-label"
        label="Template"
        aria-label="Prompt templates"
        value=""
        onChange={event => {
          if (event.target.value) {
            onApply(event.target.value)
          }
        }}
      >
        <MenuItem value="">Template</MenuItem>
      {templates.map(template => (
        <MenuItem key={template.name} value={template.prompt}>
          {template.name}
        </MenuItem>
      ))}
      </Select>
    </FormControl>
  )
}
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
