import React from 'react'
import { Autocomplete, TextField, FormHelperText, Box } from '@mui/material'
import palette from '../../styles/theme/palette'

interface StandardSelectProps {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  helperText?: string
  error?: boolean
  placeholder?: string
  fullWidth?: boolean
}

/**
 * Reusable standard dropdown select component with search capability
 */
const StandardSelect: React.FC<StandardSelectProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  helperText,
  error = false,
  placeholder,
  fullWidth = true,
}) => {
  // Ensure value is converted to string for proper comparison
  const stringValue = String(value || '')
  // Find the selected option object
  const selectedOption =
    options.find((opt) => opt.value === stringValue) || null

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <Autocomplete
        value={selectedOption}
        onChange={(event, newValue) => {
          onChange(newValue?.value || '')
        }}
        options={options}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        disabled={disabled}
        disableListWrap
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            error={error}
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
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        }}
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
              listbox.scrollTop = 0
            }
          }, 0)
        }}
      />
      {helperText && (
        <FormHelperText error={error} sx={{ mx: 1.75 }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  )
}

export default StandardSelect
