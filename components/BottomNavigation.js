import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const BottomNavigation = ({ activeTab = 'home', onTabChange, style }) => {
  const [animatedValue] = useState(new Animated.Value(0));

  const tabs = [
    {
      id: 'seat',
      name: 'Seat',
      iconName: 'event-seat',
      label: 'Seat'
    },
    {
      id: 'student',
      name: 'Student',
      iconName: 'person',
      label: 'Student'
    },
    {
      id: 'home',
      name: 'Home',
      iconName: 'home',
      label: 'Home'
    },
    {
      id: 'search',
      name: 'Search',
      iconName: 'search',
      label: 'Search'
    },
    {
      id: 'menu',
      name: 'Menu',
      iconName: 'menu',
      label: 'Menu'
    }
  ];

  const handleTabPress = (tabId) => {
    // Animate on tab press
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      animatedValue.setValue(0);
    });

    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const renderTab = (tab) => {
    const isActive = activeTab === tab.id;

    return (
      <TouchableOpacity
        key={tab.id}
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => handleTabPress(tab.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
          <Icon
            name={tab.iconName}
            size={24}
            color={isActive ? '#8E54E9' : '#6B7280'}
          />
        </View>
        <Text style={[styles.label, isActive && styles.activeLabel]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tabContainer}>
        {tabs.map(renderTab)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 20 : 20, // Safe area for iOS
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // Additional styles for active tab if needed

  },
  iconContainer: {
    padding: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeIconContainer: {
    // backgroundColor: '#EBF4FF',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeLabel: {
    color: '#8E54E9',
    fontWeight: '600',
  },
});

export default BottomNavigation;

// Example usage in your main component
/*
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import BottomNavigation from './components/BottomNavigation';

const App = () => {
  const [currentTab, setCurrentTab] = useState('home');

  const renderScreen = () => {
    switch (currentTab) {
      case 'seat':
        return (
          <View style={[styles.screen, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.screenTitle}>Seat Screen</Text>
            <Text style={styles.screenSubtitle}>Manage your seat reservations</Text>
          </View>
        );
      case 'student':
        return (
          <View style={[styles.screen, { backgroundColor: '#FDF2F8' }]}>
            <Text style={styles.screenTitle}>Student Screen</Text>
            <Text style={styles.screenSubtitle}>Student profile and information</Text>
          </View>
        );
      case 'home':
        return (
          <View style={[styles.screen, { backgroundColor: '#EBF4FF' }]}>
            <Text style={styles.screenTitle}>Home Screen</Text>
            <Text style={styles.screenSubtitle}>Welcome to your dashboard</Text>
          </View>
        );
      case 'search':
        return (
          <View style={[styles.screen, { backgroundColor: '#FFFBEB' }]}>
            <Text style={styles.screenTitle}>Search Screen</Text>
            <Text style={styles.screenSubtitle}>Find what you're looking for</Text>
          </View>
        );
      case 'menu':
        return (
          <View style={[styles.screen, { backgroundColor: '#FEF2F2' }]}>
            <Text style={styles.screenTitle}>Menu Screen</Text>
            <Text style={styles.screenSubtitle}>Access more options and settings</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <BottomNavigation
        activeTab={currentTab}
        onTabChange={setCurrentTab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    marginBottom: 60, // Height of bottom navigation
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default App;
*/