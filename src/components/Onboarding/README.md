# Onboarding Components

This folder contains the React components for managing sender onboarding in the IZ Gateway Configuration Console.

## 📁 Component Structure

```
Onboarding/
├── index.tsx              # Main onboarding component with DataGrid and mobile views
├── AddSender.tsx          # Component for adding new senders
├── EditSender.tsx         # Component for editing existing senders
├── StatusPromoteDemote.tsx # Component for managing sender status changes
├── mockData.ts            # Mock data and type definitions
└── README.md              # This documentation
```

## 🧩 Components Overview

### 1. **index.tsx** - Main Onboarding Component

- **Purpose**: Main container with sender list, search, and actions
- **Features**:
  - Responsive DataGrid (desktop) and card view (mobile)
  - Search and filter functionality
  - CRUD operations (Create, Read, Update, Delete)
  - Status management and connection toggle
  - Snackbar notifications for all actions

### 2. **AddSender.tsx** - Add New Sender

- **Purpose**: Wrapper component for adding new senders
- **Features**:
  - Reuses EditSender component with `isAddMode={true}`
  - Pre-fills default values for new senders
  - Restricts connection type to "onboarding" only

### 3. **EditSender.tsx** - Edit Existing Sender

- **Purpose**: Form component for creating/editing sender details
- **Features**:
  - Comprehensive form with validation
  - Dynamic status options based on connection type
  - MSH and facility information fields
  - Connection toggle functionality
  - Back button navigation

### 4. **StatusPromoteDemote.tsx** - Status Management

- **Purpose**: Manages sender status transitions with confirmation dialogs
- **Features**:
  - Toggle between promote/demote based on current status
  - Confirmation dialogs for status changes
  - Different status hierarchies for onboarding vs production

## 📊 Data Types

### SenderData Interface

```typescript
interface SenderData {
  id: string // Unique sender identifier
  sender: string // Sender name
  senderDetails: string // Certificate name (monospace display)
  destination: string // Destination name
  destinationCode: string // Destination code
  accessLevel: string // Access level (e.g., "Full Access")
  status: string // Current status (see status hierarchy)
  lastUpdated: string // Last update date (MM/DD/YYYY)
  connectionType: 'onboarding' | 'production'
  isConnected: boolean // Connection status
  msh3: string // MSH-3 field
  msh4: string // MSH-4 field
  facilityId: string // Facility ID
}
```

### Status Hierarchy

#### Onboarding Connection Type:

1. **Testing Ready** → 2. **Test Validate**

#### Production Connection Type:

1. **Production Ready** → 2. **Production Live**

## 🔌 API Integration Points

### Replace Mock Data with Real APIs

#### 1. **Fetch Senders** (index.tsx)

```typescript
// Replace mockSenderData with API call
const fetchSenders = async () => {
  try {
    const response = await fetch('/api/senders')
    const senders = await response.json()
    setSenderData(senders)
  } catch (error) {
    console.error('Failed to fetch senders:', error)
  }
}
```

#### 2. **Create Sender** (handleSaveAdd)

```typescript
const handleSaveAdd = async (newSender: SenderData) => {
  try {
    const response = await fetch('/api/senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSender),
    })
    const createdSender = await response.json()

    setSenderData((prev) => [...prev, createdSender])
    setSnackbarMessage(
      `Sender "${newSender.sender}" has been successfully added.`
    )
    setSnackbarSeverity('success')
    setSnackbarOpen(true)
  } catch (error) {
    setSnackbarMessage('Failed to add sender. Please try again.')
    setSnackbarSeverity('error')
    setSnackbarOpen(true)
  }
}
```

#### 3. **Update Sender** (handleSaveEdit)

```typescript
const handleSaveEdit = async (updatedSender: SenderData) => {
  try {
    const response = await fetch(`/api/senders/${updatedSender.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSender),
    })

    setSenderData((prev) =>
      prev.map((sender) =>
        sender.id === updatedSender.id ? updatedSender : sender
      )
    )
    setSnackbarMessage(`Sender "${updatedSender.sender}" has been updated.`)
  } catch (error) {
    setSnackbarMessage('Failed to update sender.')
    setSnackbarSeverity('error')
    setSnackbarOpen(true)
  }
}
```

#### 4. **Delete Sender** (handleConfirmDelete)

```typescript
const handleConfirmDelete = async () => {
  if (!senderToDelete) return

  try {
    await fetch(`/api/senders/${senderToDelete.id}`, {
      method: 'DELETE',
    })

    setSenderData((prev) =>
      prev.filter((sender) => sender.id !== senderToDelete.id)
    )
    setSnackbarMessage(`Sender "${senderToDelete.sender}" has been deleted.`)
  } catch (error) {
    setSnackbarMessage('Failed to delete sender.')
    setSnackbarSeverity('error')
    setSnackbarOpen(true)
  }
}
```

#### 5. **Update Status** (handleStatusUpdate)

```typescript
const handleStatusUpdate = async (senderId: string, newStatus: string) => {
  try {
    await fetch(`/api/senders/${senderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    // Update local state and show success message
  } catch (error) {
    setSnackbarMessage('Failed to update sender status.')
    setSnackbarSeverity('error')
    setSnackbarOpen(true)
  }
}
```

#### 6. **Toggle Connection** (handleWifiToggle)

```typescript
const handleWifiToggle = async (senderId: string) => {
  const sender = senderData.find((s) => s.id === senderId)
  const newConnectionState = !sender?.isConnected

  try {
    await fetch(`/api/senders/${senderId}/connection`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isConnected: newConnectionState }),
    })

    // Update local state and show success message
  } catch (error) {
    setSnackbarMessage('Failed to update connection status.')
    setSnackbarSeverity('error')
    setSnackbarOpen(true)
  }
}
```

## 🎨 UI Features

### Responsive Design

- **Desktop**: DataGrid with toolbar, filters, and pagination
- **Mobile**: Card-based layout with search and actions
- **Breakpoint**: 992px width

### User Feedback

- **Snackbar notifications** for all CRUD operations
- **Confirmation dialogs** for destructive actions (delete, status changes)
- **Loading states** during transitions
- **Form validation** with disabled save buttons

### Navigation

- **Back buttons** in Add/Edit modes with arrow icons
- **Cancel functionality** to return to main list
- **Breadcrumb-style** headers with context

## 🔧 Customization

### Adding New Fields

1. Update `SenderData` interface in `mockData.ts`
2. Add form fields in `EditSender.tsx`
3. Update DataGrid columns in `index.tsx`
4. Update mobile card display

### Modifying Status Hierarchy

Update `getStatusHierarchy()` in `StatusPromoteDemote.tsx`:

```typescript
const getStatusHierarchy = (connectionType: 'production' | 'onboarding') => {
  if (connectionType === 'production') {
    return ['Production Ready', 'Production Live', 'Production Complete'] // Add new status
  } else {
    return ['Testing Ready', 'Test Validate', 'Test Complete'] // Add new status
  }
}
```

## 🚀 Getting Started

1. **Install Dependencies**: Ensure MUI components are installed
2. **Replace Mock Data**: Update API endpoints as shown above
3. **Configure Context**: Ensure `SessionContext` is properly set up
4. **Test Components**: Use the mock data to verify functionality
5. **Integrate APIs**: Replace mock functions with real API calls
6. **Error Handling**: Add proper error boundaries and retry logic

## 📝 Notes

- All components use MUI (Material-UI) for consistent styling
- Snackbar notifications are handled through the parent component
- The components follow the same modular pattern as AccessControl components
- Form validation prevents saving incomplete data
- Connection type restrictions ensure proper workflow (onboarding → production)

## 🧪 Testing

Components can be tested with:

- Mock data from `mockData.ts`
- Jest unit tests for individual functions
- E2E tests for complete workflows
- API integration tests with mock endpoints

For any questions or issues, please refer to the main project documentation or contact the development team.
