import { useState, useEffect, useCallback } from "react";

interface GlobalLoadingState {
  isInitialLoading: boolean;
  isAppReady: boolean;
  loadingMessage: string;
}

// Global loading state management for seamless transitions
let globalLoadingState: GlobalLoadingState = {
  isInitialLoading: true,
  isAppReady: false,
  loadingMessage: "Loading SharpFlow...",
};

const subscribers = new Set<(state: GlobalLoadingState) => void>();

// Global state management functions
const updateGlobalLoading = (updates: Partial<GlobalLoadingState>) => {
  globalLoadingState = { ...globalLoadingState, ...updates };
  subscribers.forEach((callback) => callback(globalLoadingState));
};

const subscribe = (callback: (state: GlobalLoadingState) => void) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

export function useGlobalLoading() {
  const [state, setState] = useState(globalLoadingState);

  useEffect(() => {
    const unsubscribe = subscribe(setState);
    return unsubscribe;
  }, []);

  const setAppReady = useCallback(() => {
    console.log(
      "🚀 [GLOBAL_LOADING] App is ready, transitioning from initial loading"
    );
    updateGlobalLoading({
      isInitialLoading: false,
      isAppReady: true,
      loadingMessage: "App ready",
    });

    // Remove initial loading screen with fade
    const initialLoading = document.getElementById("initial-loading");
    if (initialLoading) {
      initialLoading.classList.add("fade-out");
      document.body.classList.remove("loading");

      setTimeout(() => {
        if (initialLoading.parentNode) {
          initialLoading.parentNode.removeChild(initialLoading);
        }
      }, 300);
    }
  }, []);

  const setLoadingMessage = useCallback((message: string) => {
    updateGlobalLoading({ loadingMessage: message });
  }, []);

  const resetLoading = useCallback((message: string = "Loading...") => {
    console.log("🔄 [GLOBAL_LOADING] Resetting loading state:", message);
    updateGlobalLoading({
      isInitialLoading: true,
      isAppReady: false,
      loadingMessage: message,
    });
  }, []);

  return {
    ...state,
    setAppReady,
    setLoadingMessage,
    resetLoading,
  };
}

// Export global functions for use outside of React components
export const globalLoadingActions = {
  setAppReady: () =>
    updateGlobalLoading({ isInitialLoading: false, isAppReady: true }),
  setLoadingMessage: (message: string) =>
    updateGlobalLoading({ loadingMessage: message }),
  resetLoading: (message: string = "Loading...") =>
    updateGlobalLoading({
      isInitialLoading: true,
      isAppReady: false,
      loadingMessage: message,
    }),
};
