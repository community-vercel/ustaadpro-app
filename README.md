# Ustaad Pro

Premium React Native CLI TypeScript clone for an on-demand home services marketplace.

## Stack

- React Native CLI 0.79
- TypeScript with strict mode
- React Navigation root stack plus bottom tabs
- Zustand global state for mocked auth, cart, and orders
- `react-native-linear-gradient`, `@react-native-community/blur`, `lucide-react-native`
- Outfit font family via `react-native.config.js`

## Project Structure

```text
src/
  App.tsx
  assets/fonts/
  components/
  data/
  navigation/
  screens/auth/
  screens/main/
  store/
  theme/
  types/
  utils/
android/
```

## Local Setup

Install dependencies:

```bash
npm install
```

Add these font files to `src/assets/fonts/`:

```text
Outfit-Regular.ttf
Outfit-Medium.ttf
Outfit-SemiBold.ttf
Outfit-Bold.ttf
Outfit-ExtraBold.ttf
```

Link font assets:

```bash
npx react-native-asset
```

Run Metro:

```bash
npm run start
```

Run Android in a second terminal:

```bash
npm run android
```

## Notes

This repository includes the Android native project in `android/`. iOS is not generated in this workspace.
