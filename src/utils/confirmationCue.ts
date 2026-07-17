import {NativeModules, Vibration} from 'react-native';

const {ConfirmationSound} = NativeModules;

export function playConfirmationCue() {
  if (ConfirmationSound?.play) {
    ConfirmationSound.play();
    return;
  }

  Vibration.vibrate([0, 45, 45, 70]);
}
