import React from 'react'
import { Autocomplete, TextField, Chip, Box } from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import palette from '../../styles/theme/palette'

interface SearchableMultiSelectProps {
  label: string
  value: string[]
  options: string[]
  onChange: (newValue: string[]) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  chipColor?: 'primary' | 'default'
  helperText?: string
  error?: boolean
}

/**
 * Reusable multi-select dropdown with search capability
 */
const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  chipColor = 'default',
  helperText,
  error = false,
}) => {
  // Chip styling based on color variant
  const getChipStyles = () => {
    if (chipColor === 'primary') {
      return {
        backgroundColor: '#e3f2fd',
        color: palette.primary,
        border: `1px solid ${palette.primary}`,
      }
    }
    return {
      backgroundColor: '#f5f5f5',
      color: 'text.primary',
      border: '1px solid #d0d0d0',
    }
  }

  return (
    <Box>
      <Autocomplete
        multiple
        options={options}
        value={value}
        onChange={(event, newValue) => onChange(newValue)}
        disabled={disabled}
        disableListWrap
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={value.length === 0 ? placeholder : ''}
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
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option}
              label={option}
              deleteIcon={<CloseIcon />}
              sx={{
                ...getChipStyles(),
                fontSize: '0.875rem',
                height: '32px',
              }}
            />
          ))
        }
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
    </Box>
  )
}

export default SearchableMultiSelect
