import { useState, useCallback } from 'react';

export const useAuthForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setError('');
    setIsLoading(false);
  }, []);

  const setErrorMessage = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const toggleMode = useCallback(() => {
    setIsSignup((prev) => !prev);
    setError('');
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    isSignup,
    toggleMode,
    error,
    setErrorMessage,
    isLoading,
    setLoadingState,
    reset,
  };
};
