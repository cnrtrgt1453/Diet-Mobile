import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, ActivityIndicator, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '../context/auth-context';
import { LoginScreen } from '../screens/login-screen';

SplashScreen.preventAutoHideAsync();

function MainAppContent() {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F6' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!userToken) {
    return <LoginScreen />;
  }

  return <AppTabs />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <MainAppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
