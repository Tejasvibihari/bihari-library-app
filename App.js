import React from 'react';
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

const Stack = createNativeStackNavigator();
export default function App() {
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

