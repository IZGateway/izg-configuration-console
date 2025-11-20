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

  // Predefined destination types
  const DESTINATION_TYPES: DestinationType[] = [
    { typeId: 1, type: 'PRODUCTION' },
    { typeId: 2, type: 'TEST' },
    { typeId: 3, type: 'ONBOARD' },
    { typeId: 4, type: 'STAGE' },
    { typeId: 5, type: 'DEV' },
    { typeId: 6, type: 'UNKNOWN' },
  ]

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
          label={`${destinationTypeLabel}${required ? ' *' : ''}`}
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

      {/* Destination Dropdown */}
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
          label={`${destinationLabel}${required ? ' *' : ''}`}
          onChange={(e) => handleDestinationChange(e.target.value)}
          sx={{ borderRadius: '8px' }}
        >
          {!destinationTypeValue ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                Select a destination type first
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
                No destinations available for this type
              </Typography>
            </MenuItem>
          ) : (
            availableDestinations.map((dest) => {
              console.log('[DestinationSelector] Rendering MenuItem:', {
                destId: dest.destId,
                currentValue: destinationValue,
                matches: dest.destId === destinationValue,
              })
              return (
                <MenuItem key={dest.destId} value={dest.destId}>
                  {getDestinationLabel(dest)}
                </MenuItem>
              )
            })
          )}
        </Select>
      </FormControl>
    </>
  )
}

export default DestinationSelector
