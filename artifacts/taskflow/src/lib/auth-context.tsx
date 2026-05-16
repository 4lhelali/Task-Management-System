import { createContext, useContext, ReactNode } from "react";
import { useGetMe, UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  user: UserProfile | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
    } as any
  });
  
  const [location, setLocation] = useLocation();

  if (isError && location !== "/login" && location !== "/signup") {
    setLocation("/login");
  }

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
