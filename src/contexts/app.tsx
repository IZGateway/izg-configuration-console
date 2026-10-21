import { createContext, useCallback, useMemo, useState } from 'react'

interface Alert {
  level: string
  jurisdiction?: string
  dest_type?: string
  message: string
  // IGDD-3566: set when the message must wait for a dismissal rather than fade.
  // The alert lives here, above the page, so it can surface on a screen the
  // raiser never rendered. Carrying the intent on the alert keeps the guarantee
  // true wherever it lands.
  persistent?: boolean
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
  const [alert, setAlert] = useState<Alert>({
    level: '',
    jurisdiction: '',
    dest_type: '',
    message: '',
  })

  const clearValue = useCallback(() => {
    setIsChangePasswordClicked(false)
  }, [])

  // IGDD-3566: setAlert is handed out as the useState setter, which React keeps
  // stable, and the value object is memoised. A wrapper rebuilt on every render
  // changed the context identity on every render, so a consumer effect that listed
  // setAlert as a dependency and called it looped without end.
  const combinedContextValue: CombinedContextType = useMemo(
    () => ({
      pageSize,
      setPageSize,
      isChangePasswordClicked,
      setIsChangePasswordClicked,
      clearValue,
      alert,
      setAlert,
    }),
    [pageSize, isChangePasswordClicked, clearValue, alert]
  )

  return (
    <CombinedContext.Provider value={combinedContextValue}>
      {children}
    </CombinedContext.Provider>
  )
}

export default CombinedContext
