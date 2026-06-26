import { createContext, useContext, useState, ReactNode } from "react";

type Session = {
  token: string | undefined;
  signIn: (token: string) => void;
  signOut: () => void;
};

const Ctx = createContext<Session>({
  token: undefined,
  signIn: () => {},
  signOut: () => {},
});

const KEY = "tl_token";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | undefined>(
    () => localStorage.getItem(KEY) ?? undefined,
  );
  const signIn = (t: string) => {
    localStorage.setItem(KEY, t);
    setToken(t);
  };
  const signOut = () => {
    localStorage.removeItem(KEY);
    setToken(undefined);
  };
  return (
    <Ctx.Provider value={{ token, signIn, signOut }}>{children}</Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
