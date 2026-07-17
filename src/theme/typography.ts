import {TextStyle} from 'react-native';

export const fontFamily = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
};

export const type = {
  // New Design System Typographies
  headlineXl: {
    fontFamily: fontFamily.bold, // Plus Jakarta Sans 700
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8, // -0.02em of 40px
  } satisfies TextStyle,

  headlineLg: {
    fontFamily: fontFamily.bold, // Plus Jakarta Sans 700
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64, // -0.02em of 32px
  } satisfies TextStyle,

  headlineLgMobile: {
    fontFamily: fontFamily.bold, // Plus Jakarta Sans 700
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.56,
  } satisfies TextStyle,

  headlineMd: {
    fontFamily: fontFamily.semiBold, // Plus Jakarta Sans 600
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  } satisfies TextStyle,

  headlineSm: {
    fontFamily: fontFamily.semiBold, // Plus Jakarta Sans 600
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0,
  } satisfies TextStyle,

  bodyLg: {
    fontFamily: fontFamily.regular, // Plus Jakarta Sans 400
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0,
  } satisfies TextStyle,

  bodyMd: {
    fontFamily: fontFamily.regular, // Plus Jakarta Sans 400
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  } satisfies TextStyle,

  bodySm: {
    fontFamily: fontFamily.regular, // Plus Jakarta Sans 400
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  } satisfies TextStyle,

  labelMd: {
    fontFamily: fontFamily.semiBold, // Plus Jakarta Sans 600
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.7, // 0.05em of 14px
  } satisfies TextStyle,

  labelSm: {
    fontFamily: fontFamily.medium, // Plus Jakarta Sans 500
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0,
  } satisfies TextStyle,

  // Backward-compatibility mappings
  hero: {
    fontFamily: fontFamily.extraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0,
  } satisfies TextStyle,
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  } satisfies TextStyle,
  h2: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  } satisfies TextStyle,
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } satisfies TextStyle,
};
