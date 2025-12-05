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
import SearchableSingleSelect from '../Dropdown/SearchableSingleSelect'

export interface Organization {
  organizationName: string
  principalNames: string[]
}

interface OrganizationCertificateSelectorProps {
  organizationValue: string
  certificateValue: string
  onOrganizationChange: (organizationName: string) => void
  onCertificateChange: (certificateName: string) => void
  organizationLabel?: string
  certificateLabel?: string
  required?: boolean
  disabled?: boolean
  size?: 'small' | 'medium'
  fullWidth?: boolean
  searchable?: boolean
}

const OrganizationCertificateSelector: React.FC<
  OrganizationCertificateSelectorProps
> = ({
  organizationValue,
  certificateValue,
  onOrganizationChange,
  onCertificateChange,
  organizationLabel = 'Organization Name',
  certificateLabel = 'Certificate Name',
  required = false,
  disabled = false,
  size = 'medium',
  fullWidth = true,
  searchable = false,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true)
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null)

  // Log incoming props
  console.log('[OrgCertSelector] Props:', {
    organizationValue,
    certificateValue,
    organizationsCount: organizations.length,
    isLoading: isLoadingOrganizations,
    selectedOrg: selectedOrganization?.organizationName,
  })

  // Fetch organizations on component mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoadingOrganizations(true)

        const response = await fetch('/api/organizations')

        if (!response.ok) {
          throw new Error('Failed to fetch organizations')
        }

        const orgData = await response.json()
        const processedOrgs: Organization[] = orgData.map((org: any) => {
          let principalNames: string[] = []

          principalNames = Array.from(org.principalNames)

          return {
            organizationName: org.organizationName || 'Unknown Organization',
            principalNames: principalNames,
          }
        })

        console.log(
          '[OrgCertSelector] Fetched organizations:',
          processedOrgs.map((o) => o.organizationName)
        )
        setOrganizations(processedOrgs)
      } catch (error) {
        console.error('Error fetching organizations:', error)
        setOrganizations([])
      } finally {
        setIsLoadingOrganizations(false)
      }
    }

    fetchOrganizations()
  }, [])

  // Update selected organization when organizationValue changes
  useEffect(() => {
    console.log('[OrgCertSelector] organizationValue changed:', {
      organizationValue,
      organizationsCount: organizations.length,
      organizationNames: organizations.map((o) => o.organizationName),
    })

    if (organizationValue) {
      const org = organizations.find(
        (o) => o.organizationName === organizationValue
      )
      console.log('[OrgCertSelector] Found organization:', {
        searched: organizationValue,
        found: org?.organizationName,
        principals: org?.principalNames,
      })
      setSelectedOrganization(org || null)
    } else {
      setSelectedOrganization(null)
    }
  }, [organizationValue, organizations])

  const handleOrganizationChange = (orgName: string) => {
    const org = organizations.find((o) => o.organizationName === orgName)
    setSelectedOrganization(org || null)
    onOrganizationChange(orgName)
    // Clear certificate when organization changes
    onCertificateChange('')
  }

  const handleCertificateChange = (certName: string) => {
    onCertificateChange(certName)
  }

  return (
    <>
      {/* Organization Dropdown */}
      {searchable ? (
        <SearchableSingleSelect
          label={`${organizationLabel}${required ? ' *' : ''}`}
          value={organizationValue}
          options={organizations.map((o) => o.organizationName)}
          onChange={(val) => handleOrganizationChange(val)}
          disabled={disabled}
          required={required}
          helperText={
            organizations.length === 0
              ? 'No organizations available'
              : undefined
          }
          error={required && !organizationValue}
        />
      ) : (
        <FormControl
          fullWidth={fullWidth}
          size={size}
          required={required}
          disabled={disabled}
          sx={{ '& .MuiFormLabel-asterisk': { color: palette.error } }}
        >
          <InputLabel>{organizationLabel}</InputLabel>
          <Select
            value={organizationValue}
            label={`${organizationLabel}${required ? ' *' : ''}`}
            onChange={(e) => handleOrganizationChange(e.target.value)}
            sx={{ borderRadius: '8px' }}
          >
            {isLoadingOrganizations ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Loading organizations...
                </Typography>
              </MenuItem>
            ) : organizations.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  No organizations available
                </Typography>
              </MenuItem>
            ) : (
              organizations.map((org) => (
                <MenuItem
                  key={org.organizationName}
                  value={org.organizationName}
                >
                  {org.organizationName}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}

      {/* Certificate Dropdown */}
      {searchable ? (
        <SearchableSingleSelect
          label={`${certificateLabel}${required ? ' *' : ''}`}
          value={certificateValue}
          options={
            selectedOrganization ? selectedOrganization.principalNames : []
          }
          onChange={(val) => handleCertificateChange(val)}
          disabled={disabled || !selectedOrganization}
          required={required}
          helperText={
            !selectedOrganization
              ? 'Select an organization first'
              : selectedOrganization.principalNames.length === 0
              ? 'No principals available for this organization'
              : undefined
          }
          error={required && !certificateValue}
        />
      ) : (
        <FormControl
          fullWidth={fullWidth}
          size={size}
          required={required}
          disabled={disabled || !selectedOrganization}
          sx={{ '& .MuiFormLabel-asterisk': { color: palette.error } }}
        >
          <InputLabel>{certificateLabel}</InputLabel>
          <Select
            value={certificateValue}
            label={`${certificateLabel}${required ? ' *' : ''}`}
            onChange={(e) => handleCertificateChange(e.target.value)}
            sx={{ borderRadius: '8px' }}
          >
            {!selectedOrganization ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Select an organization first
                </Typography>
              </MenuItem>
            ) : selectedOrganization.principalNames.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  No principals available for this organization
                </Typography>
              </MenuItem>
            ) : (
              selectedOrganization.principalNames.map((principal) => (
                <MenuItem key={principal} value={principal}>
                  {principal}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}
    </>
  )
}

export default OrganizationCertificateSelector
