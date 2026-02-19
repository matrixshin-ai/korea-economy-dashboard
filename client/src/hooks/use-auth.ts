import { useState, useCallback, useEffect } from "react";

const TOKEN_KEY = "admin_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const verify = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const login = async (password: string): Promise<boolean> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const { token } = await res.json();
    localStorage.setItem(TOKEN_KEY, token);
    setIsAdmin(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAdmin(false);
  };

  const authHeader = (): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return { isAdmin, isLoading, login, logout, authHeader };
}
