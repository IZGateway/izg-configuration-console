import { createContext, useState } from "react";

export type AppContextType = {
  pageSize: number;
  setPageSize: (newSession: number) => void;
};

const AppContext = createContext<AppContextType | undefined>({
  pageSize: 5,
  setPageSize: undefined,
});

export const AppProvider = ({ children }) => {
  const [pageSize, setPageSize] = useState<number>(5);

  return (
    <AppContext.Provider value={{ pageSize, setPageSize }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
