import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Home from './screens/Home';
import LoginScreen from './screens/LoginScreen';
import MainLayout from './layout/MainLayout';
import SingleStudentProfile from './screens/SingleStudentDetail';
import AdmissionFormScreen from './screens/AdmissionFormScreen';
import Menu from './screens/Menu';
import TrashStudentScreen from './screens/TrashStudentScreen';
import AllInvoiceScreen from './screens/AllInvoiceScreen';
import AuthLoadingScreen from './screens/AuthLoadingScreen';
import EditStudentProfile from './screens/EditStudentProfile';
// import AutoUpdateService from './service/AutoUpdateService';
// import DeviceInfo from 'react-native-device-info';

// import { AppState } from 'react-native';


const Stack = createNativeStackNavigator();
export default function App() {
  // const updateServiceRef = useRef(null);


  // useEffect(() => {
  //   // Initialize the auto-update service
  //   updateServiceRef.current = new AutoUpdateService({
  //     serverUrl: 'https://your-server.com', // Replace with your actual server URL
  //     currentVersion: DeviceInfo.getVersion(),
  //     checkInterval: 0, // Check only on app open
  //     forceUpdate: false, // Set to true if you want mandatory updates
  //   });

  //   // Start checking for updates
  //   updateServiceRef.current.startPeriodicChecks();

  //   // Handle app state changes
  //   const handleAppStateChange = (nextAppState) => {
  //     if (nextAppState === 'active' && updateServiceRef.current) {
  //       // Check for updates when app becomes active
  //       updateServiceRef.current.checkForUpdates();
  //     }
  //   };

  //   const subscription = AppState.addEventListener('change', handleAppStateChange);

  //   // Cleanup
  //   return () => {
  //     if (updateServiceRef.current) {
  //       updateServiceRef.current.stopPeriodicChecks();
  //     }
  //     subscription?.remove();
  //   };
  // }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AuthLoading">
        <Stack.Screen
          name="AuthLoading"
          component={AuthLoadingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ title: 'Home Page' }}
        />
        <Stack.Screen name="Main"
          component={MainLayout}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Login Page', headerShown: false }}

        />
        <Stack.Screen
          name="SingleStudentProfile"
          component={SingleStudentProfile}
          options={{ title: 'Student Profile', headerShown: false }}
        />
        <Stack.Screen
          name="AdmissionFormScreen"
          component={AdmissionFormScreen}
          options={{ title: 'Admission Form', headerShown: false }}
        />
        <Stack.Screen
          name="Menu"
          component={Menu}
          options={{ title: 'Menu', headerShown: false }}
        />
        <Stack.Screen
          name="TrashStudent"
          component={TrashStudentScreen}
          options={{ title: 'Menu', headerShown: false }}
        />
        <Stack.Screen
          name="AllInvoice"
          component={AllInvoiceScreen}
          options={{ title: 'All Invoice', headerShown: false }}
        />
        <Stack.Screen
          name="EditStudentProfile"
          component={EditStudentProfile}
          options={{ headerShown: false }}
        />
        {/* Add more screens as needed */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

