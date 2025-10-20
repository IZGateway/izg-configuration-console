# AccessControl Components - Developer Integration Guide

This directory contains the AccessControl components with centralized mock data. Follow this guide to integrate real API data.

## 📁 File Structure

```
AccessControl/
├── index.tsx              # Main AccessControl container component
├── OnboardSender.tsx      # Onboard sender management table with edit mode
├── EditSender.tsx         # Edit sender form component (matches mockup design)
├── AccessGroups.tsx       # Access groups card layout
├── DenyList.tsx          # Deny list management table
├── mockData.ts           # 🎯 CENTRALIZED MOCK DATA (Replace this!)
└── README.md             # This file
```

## ✨ New Features

### Edit Functionality

- **OnboardSender** component now includes edit mode functionality
- **EditSender** component provides a form interface matching the provided mockup design
- Click the edit icon in any row to open the edit form
- Edit form includes all sender fields: ID, name, certificate name, access level, and status
- Responsive design works on both desktop and mobile

### Edit Mode Integration

```typescript
// The OnboardSender component handles edit mode internally
// EditSender component receives:
interface EditSenderProps {
  senderData: SenderData // Current sender data to edit
  onBack: () => void // Return to sender list
  onSave: (data: SenderData) => void // Save changes
  onCancel: () => void // Cancel editing
}
```

## 🚀 Quick Start - Replace Mock Data

### Step 1: Create API Services

Create a new file `services/accessControlApi.ts`:

```typescript
import {
  SenderData,
  AccessGroup,
  DenyListItem,
} from '../components/AccessControl/mockData'

// TODO: Replace these URLs with your actual API endpoints
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const fetchSenderData = async (): Promise<SenderData[]> => {
  const response = await fetch(`${API_BASE_URL}/senders`)
  if (!response.ok) throw new Error('Failed to fetch sender data')
  return response.json()
}

export const fetchAccessGroups = async (): Promise<AccessGroup[]> => {
  const response = await fetch(`${API_BASE_URL}/access-groups`)
  if (!response.ok) throw new Error('Failed to fetch access groups')
  return response.json()
}

export const fetchDenyListData = async (): Promise<DenyListItem[]> => {
  const response = await fetch(`${API_BASE_URL}/deny-list`)
  if (!response.ok) throw new Error('Failed to fetch deny list data')
  return response.json()
}
```

### Step 2: Update Main AccessControl Component

Modify `AccessControl/index.tsx` to fetch and pass real data:

```typescript
import React, { useState, useEffect } from 'react'
import { fetchSenderData, fetchAccessGroups, fetchDenyListData } from '../../services/accessControlApi'
import { SenderData, AccessGroup, DenyListItem } from './mockData'

const AccessControlComponent = () => {
  const [senderData, setSenderData] = useState<SenderData[]>([])
  const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([])
  const [denyListData, setDenyListData] = useState<DenyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [senders, groups, denyList] = await Promise.all([
          fetchSenderData(),
          fetchAccessGroups(),
          fetchDenyListData()
        ])

        setSenderData(senders)
        setAccessGroups(groups)
        setDenyListData(denyList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
        console.error('Error loading AccessControl data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    // ... existing JSX but pass data as props:
    <TabPanel value={tabValue} index={0}>
      <OnboardSender data={senderData} />
    </TabPanel>
    <TabPanel value={tabValue} index={1}>
      <AccessGroups data={accessGroups} />
    </TabPanel>
    <TabPanel value={tabValue} index={2}>
      <DenyList data={denyListData} />
    </TabPanel>
  )
}
```

### Step 3: Remove Mock Data (Optional)

Once real data is working, you can:

1. Delete `mockData.ts` file
2. Remove mock data imports from components
3. Update TypeScript interfaces in a separate `types.ts` file

## 📊 Data Interfaces

### OnboardSender Data Format

```typescript
interface SenderData {
  id: string
  sender: string // Display name
  senderDetails: string // URL or technical details
  destination: string // Destination display name
  destinationCode: string // Short code for destination
  accessLevel: string // "Full Access", "No Access", "Testing Only"
  status: string // "Approved", "Draft", "Disconnect"
  lastActive: string // Date string (MM/DD/YYYY)
}
```

### AccessGroups Data Format

```typescript
interface AccessGroup {
  id: string
  groupName: string // "Administrators", "Operating Staff", etc.
  description: string // Group description
  userCount: number // Total users in group
  roles: string[] // ["Admin (5)", "Super User (18)"]
}
```

### DenyList Data Format

```typescript
interface DenyListItem {
  id: string
  name: string // Name of blocked entity
  reason: string // Why it was denied
  dateDenied: string // Date string (YYYY-MM-DD)
  deniedBy: string // Email/username who denied it
}
```

## 🔄 Error Handling & Loading States

Each component accepts a `data` prop. When no data is provided, components fall back to mock data. Consider adding:

1. **Loading States**: Show spinners while data loads
2. **Error Boundaries**: Handle API failures gracefully
3. **Empty States**: Show appropriate messages when no data exists
4. **Retry Logic**: Allow users to retry failed requests

## 🎨 Component Features

### OnboardSender

- ✅ Responsive DataGrid/Mobile cards
- ✅ Search and filtering
- ✅ Status badges with icons
- ✅ Edit/Delete/More actions
- ✅ Pagination

### AccessGroups

- ✅ Card-based layout
- ✅ Responsive grid
- ✅ Role chips
- ✅ Edit/Delete actions
- ✅ Add new group button

### DenyList

- ✅ Responsive DataGrid/Mobile cards
- ✅ Search functionality
- ✅ Delete action only
- ✅ Block icons for security theme

## 🚨 Important Notes

1. **TypeScript**: All interfaces are strongly typed - ensure your API returns matching data structures
2. **Error Handling**: Components will crash if data format doesn't match interfaces
3. **Performance**: Consider implementing pagination for large datasets
4. **Security**: Validate data on both client and server sides
5. **Caching**: Consider implementing data caching for better performance

## 📝 Testing

Test with various data scenarios:

- Empty arrays (no data)
- Single items
- Large datasets (100+ items)
- Invalid/malformed data
- API failures

---

**Next Steps**: Replace mock data imports in components with real API calls following the patterns above.
