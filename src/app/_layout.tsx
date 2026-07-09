import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, ActivityIndicator, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '../context/auth-context';
import { LoginScreen } from '../screens/login-screen';
import { CompleteProfileScreen } from '../screens/complete-profile-screen';

SplashScreen.preventAutoHideAsync();

function MainAppContent() {
  const { userToken, userInfo, isLoading } = useAuth();

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

  // Eğer giriş yapan kullanıcı danışan ise ve henüz profilini kurmadıysa
  if (userInfo?.role === 'ROLE_USER' && (userInfo?.height === null || userInfo?.category === null)) {
    return <CompleteProfileScreen />;
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
