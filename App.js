import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
import LegacyStudentScreen from './screens/LegacyStudent';
import LegacySingleStudentProfile from './screens/LegacySingleStudentDetail';
import LegacyEditStudentProfile from './screens/LegacyEditStudentProfile';
import SeatAllotment from './screens/SeatAllotment';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Status bar: light icons on purple background */}
      <StatusBar style="light" backgroundColor="#8B5CF6" translucent={false} />

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
          <Stack.Screen
            name="Main"
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
            name="LegacySingleStudentProfile"
            component={LegacySingleStudentProfile}
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
            name="TrashStudentScreen"
            component={TrashStudentScreen}
            options={{ title: 'Menu', headerShown: false }}
          />
          <Stack.Screen
            name="LegacyStudent"
            component={LegacyStudentScreen}
            options={{ title: 'Legacy Student', headerShown: false }}
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
          <Stack.Screen
            name="LegacyEditStudentProfile"
            component={LegacyEditStudentProfile}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SeatAllotment"
            component={SeatAllotment}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}