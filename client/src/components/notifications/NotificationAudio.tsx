import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/stores/notificationStore";

interface NotificationAudioProps {
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

interface AudioSettings {
  enabled: boolean;
  volume: number;
}

// Audio context for Web Audio API
let audioContext: AudioContext | null = null;

// Initialize audio context
const getAudioContext = (): AudioContext | null => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn("Web Audio API not supported:", error);
      return null;
    }
  }
  return audioContext;
};

// Sound generation functions
const createNotificationSound = (type: Notification["type"], volume: number = 0.1) => {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filterNode = context.createBiquadFilter();

  // Connect nodes
  oscillator.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(context.destination);

  // Configure filter for warmer sound
  filterNode.type = "lowpass";
  filterNode.frequency.setValueAtTime(2000, context.currentTime);

  // Sound patterns based on notification type
  switch (type) {
    case "job_completed":
      // Success sound: ascending notes
      oscillator.frequency.setValueAtTime(523, context.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, context.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, context.currentTime + 0.2); // G5
      break;

    case "job_failed":
      // Error sound: descending notes
      oscillator.frequency.setValueAtTime(440, context.currentTime); // A4
      oscillator.frequency.setValueAtTime(349, context.currentTime + 0.15); // F4
      break;

    case "job_started":
      // Info sound: single gentle tone
      oscillator.frequency.setValueAtTime(587, context.currentTime); // D5
      break;

    default:
      // Default notification sound
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1);
      break;
  }

  // Configure gain envelope
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

  // Set oscillator type for warmer sound
  oscillator.type = "sine";

  // Play sound
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.3);
};

// Load audio settings from localStorage
const loadAudioSettings = (): AudioSettings => {
  try {
    const saved = localStorage.getItem("sharpflow-audio-settings");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn("Failed to load audio settings:", error);
  }
  return { enabled: true, volume: 0.1 };
};

// Save audio settings to localStorage
const saveAudioSettings = (settings: AudioSettings) => {
  try {
    localStorage.setItem("sharpflow-audio-settings", JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to save audio settings:", error);
  }
};

export function NotificationAudio({ enabled, onToggle, className }: NotificationAudioProps) {
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);
  const isControlled = enabled !== undefined;
  const isEnabled = isControlled ? enabled : audioSettings.enabled;

  const handleToggle = () => {
    const newEnabled = !isEnabled;
    
    if (isControlled && onToggle) {
      onToggle(newEnabled);
    } else {
      const newSettings = { ...audioSettings, enabled: newEnabled };
      setAudioSettings(newSettings);
      saveAudioSettings(newSettings);
    }

    // Play a test sound when enabling
    if (newEnabled) {
      createNotificationSound("job_completed", audioSettings.volume);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={cn(
        "h-8 w-8 p-0 rounded-full hover:bg-white/10 apple-transition-fast",
        className
      )}
      title={isEnabled ? "Disable notification sounds" : "Enable notification sounds"}
    >
      {isEnabled ? (
        <Volume2 className="h-4 w-4 text-[#C1FF72]" />
      ) : (
        <VolumeX className="h-4 w-4 text-gray-400" />
      )}
    </Button>
  );
}

// Hook for playing notification sounds
export function useNotificationAudio() {
  const [audioSettings] = useState<AudioSettings>(loadAudioSettings);

  const playNotificationSound = (notification: Notification) => {
    if (!audioSettings.enabled) return;

    try {
      createNotificationSound(notification.type, audioSettings.volume);
    } catch (error) {
      console.warn("Failed to play notification sound:", error);
    }
  };

  return { playNotificationSound, isEnabled: audioSettings.enabled };
}

export default NotificationAudio;
