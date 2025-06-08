import React, { createContext, useContext, useState } from "react";

// Processing state interface for AI agents
export interface ProcessingState {
  isProcessing: boolean;
  currentRequest: string;
  assignedAgent: "falcon" | "sage" | "sentinel" | null;
  stage: string;
  progress: number;
  status: "idle" | "processing" | "complete" | "error";
}

// Processing context interface
interface ProcessingContextType {
  processingState: ProcessingState;
  updateProcessingState: (state: Partial<ProcessingState>) => void;
}

// Create the context
const ProcessingContext = createContext<ProcessingContextType>({
  processingState: {
    isProcessing: false,
    currentRequest: "",
    assignedAgent: null,
    stage: "Idle",
    progress: 0,
    status: "idle",
  },
  updateProcessingState: () => {},
});

// Hook to use processing context
export const useProcessing = () => {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error("useProcessing must be used within a ProcessingProvider");
  }
  return context;
};

// Processing provider component
export const ProcessingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentRequest: "",
    assignedAgent: null,
    stage: "Idle",
    progress: 0,
    status: "idle",
  });

  const updateProcessingState = (newState: Partial<ProcessingState>) => {
    setProcessingState((prev) => ({ ...prev, ...newState }));
  };

  return (
    <ProcessingContext.Provider
      value={{ processingState, updateProcessingState }}
    >
      {children}
    </ProcessingContext.Provider>
  );
};
