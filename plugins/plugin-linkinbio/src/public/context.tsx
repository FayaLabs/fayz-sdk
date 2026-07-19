import { createContext, useContext, type ReactNode } from 'react';
import type { BioPageDataProvider } from './data';

export interface LinkInBioContextValue {
  provider: BioPageDataProvider;
  /** Optional "made with" footer link rendered by BioPageRenderer. */
  poweredBy?: { label: string; url: string };
  /** Fallback document.title suffix when a page omits seo.title. Default 'Bio'. */
  titleSuffix: string;
}

const LinkInBioContext = createContext<LinkInBioContextValue | null>(null);

export function LinkInBioProvider({
  value,
  children,
}: {
  value: LinkInBioContextValue;
  children: ReactNode;
}) {
  return <LinkInBioContext.Provider value={value}>{children}</LinkInBioContext.Provider>;
}

export function useLinkInBio(): LinkInBioContextValue {
  const ctx = useContext(LinkInBioContext);
  if (!ctx) {
    throw new Error('useLinkInBio must be used within a LinkInBioProvider (mount the plugin Provider).');
  }
  return ctx;
}
