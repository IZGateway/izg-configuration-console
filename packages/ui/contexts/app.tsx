import { createContext, useState } from 'react'

export type AppContextType = {
  pageSize: number
  setPageSize: (newSession: number) => void
}

export type EditConnectionContextType = {
  isChangePasswordClicked: boolean
  setIsChangePasswordClicked: (isChangePasswordClicked: boolean) => void
  clearValue: () => void
}

type CombinedContextType = AppContextType & EditConnectionContextType;

const CombinedContext = createContext<CombinedContextType | undefined>(undefined);

export const AppProvider = ({ children }) => {
  const [pageSize, setPageSize] = useState<number>(5)
  const [isChangePasswordClicked, setIsChangePasswordClicked] = useState(false)
  const clearValue = () => {
    setIsChangePasswordClicked(false);
  };

  const combinedContextValue: CombinedContextType = {
    pageSize,
    setPageSize,
    isChangePasswordClicked,
    setIsChangePasswordClicked,
    clearValue,
  };
  return (
    <CombinedContext.Provider value={combinedContextValue}>
      {children}
    </CombinedContext.Provider>
  )
}

export default CombinedContext
