import React, { useEffect, useState } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
} from '@mui/material'
import palette from '../../styles/theme/palette'
import {
  ENVIRONMENT_IDS,
  ENVIRONMENT_NAMES,
} from '../../lib/constants/environments'
import SearchableSingleSelect from '../Dropdown/SearchableSingleSelect'

export interface DestinationType {
  typeId: number
  type: string
}

export interface DestinationItem {
  destId: string
  destTypeId: number
  destUri: string
  jurisdictionId: string
  facilityId: string
  username: string
}

interface DestinationSelectorProps {
  destinationTypeValue: number | string
  destinationValue: string
  onDestinationTypeChange: (destTypeId: number) => void
  onDestinationChange: (destId: string) => void
  destinationTypeLabel?: string
  destinationLabel?: string
  required?: boolean
  disabled?: boolean
  size?: 'small' | 'medium'
  fullWidth?: boolean
  hideDestinationType?: boolean
  searchable?: boolean
}

const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  destinationTypeValue,
  destinationValue,
  onDestinationTypeChange,
  onDestinationChange,
  destinationTypeLabel = 'Destination Type',
  destinationLabel = 'Destination',
  required = false,
  disabled = false,
  size = 'medium',
  fullWidth = true,
  hideDestinationType = false,
  searchable = false,
}) => {
  const [destinationTypes, setDestinationTypes] = useState<DestinationType[]>(
    []
  )
  const [destinations, setDestinations] = useState<DestinationItem[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false)
  const [availableDestinations, setAvailableDestinations] = useState<
    DestinationItem[]
  >([])

  // Predefined destination types - using centralized constants
  const DESTINATION_TYPES: DestinationType[] = Object.entries(
    ENVIRONMENT_IDS
  ).map(([type, typeId]) => ({ typeId: typeId as number, type }))

  // Fetch all destinations on component mount
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setIsLoadingTypes(true)
        setIsLoadingDestinations(true)

        const response = await fetch('/api/destinations')

        if (!response.ok) {
          throw new Error('Failed to fetch destinations')
        }

        const destData = await response.json()
        const processedDests: DestinationItem[] = destData.map((dest: any) => ({
          destId: dest.destId,
          destTypeId: dest.destTypeId || dest.destinationType?.typeId,
          destUri: dest.destUri,
          jurisdictionId:
            dest.jurisdictionId || dest.jurisdiction?.jurisdictionId,
          facilityId: dest.facilityId,
          username: dest.username,
        }))

        setDestinations(processedDests)
        setDestinationTypes(DESTINATION_TYPES)
      } catch (error) {
        console.error('Error fetching destinations:', error)
        setDestinations([])
        setDestinationTypes(DESTINATION_TYPES)
      } finally {
        setIsLoadingTypes(false)
        setIsLoadingDestinations(false)
      }
    }

    fetchDestinations()
  }, [])

  // Filter destinations when destination type changes
  useEffect(() => {
    if (destinationTypeValue) {
      const typeId =
        typeof destinationTypeValue === 'string'
          ? parseInt(destinationTypeValue, 10)
          : destinationTypeValue

      const filtered = destinations.filter((dest) => dest.destTypeId === typeId)
      console.log('[DestinationSelector] Filtering destinations:', {
        destinationTypeValue,
        typeId,
        totalDestinations: destinations.length,
        filteredCount: filtered.length,
        currentDestinationValue: destinationValue,
      })
      setAvailableDestinations(filtered)
    } else {
      setAvailableDestinations([])
    }
  }, [destinationTypeValue, destinations, destinationValue])

  const handleDestinationTypeChange = (value: string) => {
    const typeId = parseInt(value, 10)
    onDestinationTypeChange(typeId)
    // Clear destination when type changes
    onDestinationChange('')
  }

  const handleDestinationChange = (destId: string) => {
    onDestinationChange(destId)
  }

  const getDestinationLabel = (dest: DestinationItem): string => {
    // Just show the destId for now
    return dest.destId
  }

  return (
    <>
      {/* Destination Type Dropdown */}
      {!hideDestinationType && (
        <FormControl
          fullWidth={fullWidth}
          size={size}
          required={required}
          disabled={disabled}
          sx={{ '& .MuiFormLabel-asterisk': { color: palette.error } }}
        >
          <InputLabel>{destinationTypeLabel}</InputLabel>
          <Select
            value={destinationTypeValue.toString()}
            label={destinationTypeLabel}
            onChange={(e) => handleDestinationTypeChange(e.target.value)}
            sx={{ borderRadius: '8px' }}
          >
            {isLoadingTypes ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Loading destination types...
                </Typography>
              </MenuItem>
            ) : destinationTypes.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  No destination types available
                </Typography>
              </MenuItem>
            ) : (
              destinationTypes.map((type) => (
                <MenuItem key={type.typeId} value={type.typeId.toString()}>
                  {type.type}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}

      {/* Destination Dropdown (standard or searchable) */}
      {searchable ? (
        <SearchableSingleSelect
          label={destinationLabel}
          value={destinationValue}
          options={availableDestinations.map((d) => getDestinationLabel(d))}
          onChange={(val) => handleDestinationChange(val)}
          disabled={disabled || !destinationTypeValue}
          required={required}
          helperText={
            !destinationTypeValue
              ? 'Select an environment first'
              : availableDestinations.length === 0
              ? 'No destinations available for this environment'
              : undefined
          }
          error={required && !destinationValue}
        />
      ) : (
        <FormControl
          fullWidth={fullWidth}
          size={size}
          required={required}
          disabled={disabled || !destinationTypeValue}
          sx={{ '& .MuiFormLabel-asterisk': { color: palette.error } }}
        >
          <InputLabel>{destinationLabel}</InputLabel>
          <Select
            value={destinationValue}
            label={destinationLabel}
            onChange={(e) => handleDestinationChange(e.target.value)}
            sx={{ borderRadius: '8px' }}
          >
            {!destinationTypeValue ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Select an environment first
                </Typography>
              </MenuItem>
            ) : isLoadingDestinations ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Loading destinations...
                </Typography>
              </MenuItem>
            ) : availableDestinations.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  No destinations available for this environment
                </Typography>
              </MenuItem>
            ) : (
              availableDestinations.map((dest) => (
                <MenuItem key={dest.destId} value={dest.destId}>
                  {getDestinationLabel(dest)}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}
    </>
  )
}

export default DestinationSelector
