import { createContext, type ReactNode } from 'react';
import { rootStore, type RootStore } from '@app/stores';

// eslint-disable-next-line react-refresh/only-export-components
export const StoreContext = createContext<RootStore>(rootStore);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
    return <StoreContext.Provider value={rootStore}>{children}</StoreContext.Provider>;
};
