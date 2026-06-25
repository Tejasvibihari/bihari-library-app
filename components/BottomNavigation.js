import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BottomNavigation = ({ activeTab = 'home', onTabChange, style }) => {
  const [animatedValue] = useState(new Animated.Value(0));

  const tabs = [
    { id: 'seat',    iconName: 'event-seat', label: 'Seat'    },
    { id: 'student', iconName: 'person',     label: 'Student' },
    { id: 'home',    iconName: 'home',       label: 'Home'    },
    { id: 'search',  iconName: 'search',     label: 'Search'  },
    { id: 'menu',    iconName: 'menu',       label: 'Menu'    },
  ];

  const handleTabPress = (tabId) => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start(() => animatedValue.setValue(0));

    if (onTabChange) onTabChange(tabId);
  };

  const renderTab = (tab) => {
    const isActive = activeTab === tab.id;
    return (
      <TouchableOpacity
        key={tab.id}
        style={styles.tab}
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
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
  },
  iconContainer: {
    padding: 4,
    borderRadius: 12,
    marginBottom: 2,
  },
  activeIconContainer: {},
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