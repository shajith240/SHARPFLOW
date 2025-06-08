# SharpFlow Notification Sounds

This directory contains audio files for notification sounds in the SharpFlow application.

## Audio Implementation

The notification system uses the Web Audio API to generate professional notification sounds programmatically. This approach provides:

- **Consistent Experience**: No dependency on external audio files
- **Customizable**: Different sound patterns for different notification types
- **Lightweight**: No additional file downloads required
- **Cross-platform**: Works across all modern browsers

## Sound Types

### Job Completed (Success)
- **Pattern**: Ascending notes (C5 → E5 → G5)
- **Frequency**: 523Hz → 659Hz → 784Hz
- **Duration**: 300ms
- **Character**: Uplifting, positive completion sound

### Job Failed (Error)
- **Pattern**: Descending notes (A4 → F4)
- **Frequency**: 440Hz → 349Hz
- **Duration**: 300ms
- **Character**: Gentle alert without being jarring

### Job Started (Info)
- **Pattern**: Single gentle tone (D5)
- **Frequency**: 587Hz
- **Duration**: 300ms
- **Character**: Subtle notification sound

### Default Notification
- **Pattern**: Two-tone sequence
- **Frequency**: 800Hz → 600Hz
- **Duration**: 200ms
- **Character**: Standard notification chime

## Audio Controls

Users can:
- **Toggle**: Enable/disable notification sounds via the audio button in the notification center
- **Persistent**: Audio preferences are saved to localStorage
- **Test**: Enabling audio plays a test sound for immediate feedback

## Technical Details

- **Audio Context**: Uses Web Audio API with fallback handling
- **Volume**: Default volume set to 0.1 (10%) for non-intrusive experience
- **Filter**: Low-pass filter at 2000Hz for warmer, more pleasant sound
- **Envelope**: Smooth gain envelope to prevent audio clicks/pops
- **Oscillator**: Sine wave for clean, professional sound

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Requires user interaction before audio can play

## Future Enhancements

Potential future additions could include:
- Custom sound file uploads
- Volume control slider
- Different sound themes
- Agent-specific sound customization
