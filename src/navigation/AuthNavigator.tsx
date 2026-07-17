import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthStackParamList} from '@/navigation/types';
import {OnboardingScreen} from '@/screens/auth/OnboardingScreen';
import {LoginScreen} from '@/screens/auth/LoginScreen';
import {SignupScreen} from '@/screens/auth/SignupScreen';
import {useAppStore} from '@/store/useAppStore';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator(): React.JSX.Element {
  const isOnboarded = useAppStore(state => state.isOnboarded);

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!isOnboarded && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}
