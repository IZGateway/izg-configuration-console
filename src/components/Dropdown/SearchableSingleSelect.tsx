import React from 'react'
import { Autocomplete, TextField, Box } from '@mui/material'
import palette from '../../styles/theme/palette'

interface SearchableSingleSelectProps {
  label: string
  value: string
  options: string[]
  onChange: (newValue: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  helperText?: string
  error?: boolean
}

/**
 * Single-select autocomplete with search capability
 */
const SearchableSingleSelect: React.FC<SearchableSingleSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  helperText,
  error = false,
}) => {
  return (
    <Box>
      <Autocomplete
        options={options}
        value={value || null}
        onChange={(event, newValue) => onChange(newValue || '')}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={(!value && placeholder) || ''}
            required={required}
            error={error}
            helperText={helperText}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
              '& .MuiInputLabel-asterisk': {
                color: palette.error,
              },
            }}
          />
        )}
        ListboxProps={{
          style: { maxHeight: 200 },
        }}
        componentsProps={{
          popper: {
            modifiers: [
              {
                name: 'flip',
                enabled: false,
              },
            ],
          },
        }}
        onOpen={() => {
          // Reset scroll to top when dropdown opens
          setTimeout(() => {
            const listbox = document.querySelector('[role="listbox"]')
            if (listbox) {
              ;(listbox as HTMLElement).scrollTop = 0
            }
          }, 0)
        }}
      />
    </Box>
  )
}

export default SearchableSingleSelect
