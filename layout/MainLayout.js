import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomNavigation from '../components/BottomNavigation';
import HomeScreen from '../screens/Home';
import Seat from '../screens/Seat';
import Student from '../screens/Student';
import Search from '../screens/Search';
import Menu from '../screens/Menu';

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'seat':    return <Seat />;
      case 'student': return <Student />;
      case 'home':    return <HomeScreen />;
      case 'search':  return <Search />;
      default:        return <Menu />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* flex: 1 makes the screen fill all remaining space above the nav bar */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Nav bar sits here in normal flow — no absolute, no gap */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
};

export default MainLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  screenContainer: {
    flex: 1,         // Takes all space except the nav bar's 60px
    overflow: 'hidden', // Clips content so it never bleeds behind the nav
  },
});