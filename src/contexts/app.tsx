import { createContext, useState } from 'react'

interface Alert {
  level: string
  jurisdiction?: string
  dest_type?: string
  message: string
}

export type AppContextType = {
  pageSize: number
  setPageSize: (newSession: number) => void
}

export type EditConnectionContextType = {
  isChangePasswordClicked: boolean
  setIsChangePasswordClicked: (isChangePasswordClicked: boolean) => void
  clearValue: () => void
  alert: Alert
  setAlert: (alert: Alert) => void
}

export type CombinedContextType = AppContextType & EditConnectionContextType

const CombinedContext = createContext<CombinedContextType | undefined>(
  undefined
)

export const AppProvider = ({ children }) => {
  const [pageSize, setPageSize] = useState<number>(5)
  const [isChangePasswordClicked, setIsChangePasswordClicked] = useState(false)
  const clearValue = () => {
    setIsChangePasswordClicked(false)
  }
  const [alert, setAlert] = useState<Alert>({
    level: '',
    jurisdiction: '',
    dest_type: '',
    message: '',
  })
  const combinedContextValue: CombinedContextType = {
    pageSize,
    setPageSize,
    isChangePasswordClicked,
    setIsChangePasswordClicked,
    clearValue,
    alert,
    setAlert: (newAlert: Alert) => setAlert(newAlert),
  }
  return (
    <CombinedContext.Provider value={combinedContextValue}>
      {children}
    </CombinedContext.Provider>
  )
}

export default CombinedContext
