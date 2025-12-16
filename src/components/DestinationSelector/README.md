# DestinationSelector Component

A reusable React component for selecting destinations with a two-level hierarchy: destination type first, then specific destinations.

## Overview

The `DestinationSelector` component provides a dropdown interface for selecting destinations from DynamoDB. It fetches all accessible destinations for the current user and allows selection by:

1. First selecting a destination type (PRODUCTION, TEST, ONBOARD, STAGE, DEV, UNKNOWN)
2. Then selecting a specific destination from the filtered list

## Usage

### Basic Example

```tsx
import DestinationSelector from '../DestinationSelector'

function MyComponent() {
  const [formData, setFormData] = useState({
    destinationType: '',
    destinationId: '',
  })

  const handleDestinationTypeChange = (destTypeId: number) => {
    setFormData((prev) => ({
      ...prev,
      destinationType: destTypeId,
      destinationId: '', // Clear destination when type changes
    }))
  }

  const handleDestinationChange = (destId: string) => {
    setFormData((prev) => ({
      ...prev,
      destinationId: destId,
    }))
  }

  return (
    <DestinationSelector
      destinationTypeValue={formData.destinationType}
      destinationValue={formData.destinationId}
      onDestinationTypeChange={handleDestinationTypeChange}
      onDestinationChange={handleDestinationChange}
      required={true}
    />
  )
}
```

### With Custom Labels

```tsx
<DestinationSelector
  destinationTypeValue={destType}
  destinationValue={destId}
  onDestinationTypeChange={handleTypeChange}
  onDestinationChange={handleDestChange}
  destinationTypeLabel="Environment"
  destinationLabel="Target Destination"
  required={true}
  size="small"
/>
```

## Props

| Prop                      | Type                           | Default              | Description                             |
| ------------------------- | ------------------------------ | -------------------- | --------------------------------------- |
| `destinationTypeValue`    | `number \| string`             | **Required**         | The selected destination type ID        |
| `destinationValue`        | `string`                       | **Required**         | The selected destination ID             |
| `onDestinationTypeChange` | `(destTypeId: number) => void` | **Required**         | Callback when destination type changes  |
| `onDestinationChange`     | `(destId: string) => void`     | **Required**         | Callback when destination changes       |
| `destinationTypeLabel`    | `string`                       | `'Destination Type'` | Label for the destination type dropdown |
| `destinationLabel`        | `string`                       | `'Destination'`      | Label for the destination dropdown      |
| `required`                | `boolean`                      | `false`              | Whether the fields are required         |
| `disabled`                | `boolean`                      | `false`              | Whether the dropdowns are disabled      |
| `size`                    | `'small' \| 'medium'`          | `'medium'`           | Size of the dropdowns                   |
| `fullWidth`               | `boolean`                      | `true`               | Whether dropdowns take full width       |

## Data Flow

### 1. Component Mount

- Fetches all destinations from `/api/destinations`
- Processes and stores destinations internally
- Displays predefined destination types

### 2. User Selects Destination Type

- User selects "PRODUCTION" (typeId: 1)
- Component filters destinations where `destTypeId === 1`
- Calls `onDestinationTypeChange(1)` → Parent state updates
- Calls `onDestinationChange('')` → Clears destination in parent
- Second dropdown populates with filtered destinations

### 3. User Selects Destination

- User selects "404"
- Calls `onDestinationChange("404")` → Parent state updates
- Parent now has both values:
  - `destinationType: 1`
  - `destinationId: "404"`

## Destination Type IDs

```typescript
const DESTINATION_TYPES = [
  { typeId: 1, type: 'PRODUCTION' },
  { typeId: 2, type: 'TEST' },
  { typeId: 3, type: 'ONBOARD' },
  { typeId: 4, type: 'STAGE' },
  { typeId: 5, type: 'DEV' },
  { typeId: 6, type: 'UNKNOWN' },
]
```

## API Endpoint

The component fetches data from:

```
GET /api/destinations
```

Returns array of destinations:

```typescript
interface DestinationItem {
  destId: string
  destTypeId: number
  destUri: string
  jurisdictionId: string
  facilityId: string
  username: string
}
```

## DynamoDB Structure

The component works with destinations stored in DynamoDB with the following structure:

- `entityType`: "Destination"
- `sortKey`: "{destTypeId}#{destId}" (e.g., "5#404")
- `destId`: Destination identifier
- `destTypeId`: Type identifier (1-6)
- `jurisdictionId`: Associated jurisdiction
- Other metadata fields (msh3, msh4, msh5, msh6, facilityId, etc.)

## Controlled Component Pattern

This component uses the **Controlled Component** pattern:

- Parent owns the state
- Component receives values via props
- Component notifies parent of changes via callbacks
- Parent updates its state, causing component to re-render with new values

## Integration with Forms

### Example: Onboarding Form

```tsx
const [formData, setFormData] = useState({
  senderName: '',
  certificateName: '',
  destinationType: '',
  destinationId: '',
  // ...other fields
})

const handleSubmit = async () => {
  const payload = {
    sender: formData.senderName,
    certificate: formData.certificateName,
    destinationType: formData.destinationType,
    destinationId: formData.destinationId,
  }

  await fetch('/api/senders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

return (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <OrganizationCertificateSelector
      organizationValue={formData.senderName}
      certificateValue={formData.certificateName}
      onOrganizationChange={(name) =>
        setFormData((prev) => ({
          ...prev,
          senderName: name,
          certificateName: '',
        }))
      }
      onCertificateChange={(cert) =>
        setFormData((prev) => ({ ...prev, certificateName: cert }))
      }
      required={true}
    />

    <DestinationSelector
      destinationTypeValue={formData.destinationType}
      destinationValue={formData.destinationId}
      onDestinationTypeChange={(typeId) =>
        setFormData((prev) => ({
          ...prev,
          destinationType: typeId,
          destinationId: '',
        }))
      }
      onDestinationChange={(destId) =>
        setFormData((prev) => ({ ...prev, destinationId: destId }))
      }
      required={true}
    />

    <Button onClick={handleSubmit}>Submit</Button>
  </Box>
)
```

## Notes

- The destination dropdown is automatically disabled until a destination type is selected
- Changing the destination type automatically clears the selected destination
- The component handles loading states and displays appropriate messages
- Destinations are filtered client-side for performance
- The component is fully typed with TypeScript for type safety
