import React from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material'
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
 * Reusable standard dropdown select component
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
  const labelId = `${label.toLowerCase().replace(/\s+/g, '-')}-label`

  return (
    <FormControl
      fullWidth={fullWidth}
      required={required}
      disabled={disabled}
      error={error}
      sx={{
        '& .MuiFormLabel-asterisk': {
          color: palette.error,
        },
      }}
    >
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        value={value}
        label={label + (required ? ' *' : '')}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          borderRadius: '8px',
        }}
        MenuProps={{
          PaperProps: {
            style: { maxHeight: 200 },
          },
          autoFocus: false,
          disableAutoFocusItem: true,
        }}
      >
        {placeholder && value === '' && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  )
}

export default StandardSelect
