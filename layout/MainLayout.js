// components/MainLayout.js
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomNavigation from '../components/BottomNavigation'; // your component
import HomeScreen from '../screens/Home';
import Seat from '../screens/Seat'
import Student from '../screens/Student'
import Search from '../screens/Search'
import Menu from '../screens/Menu'

const MainLayout = () => {
    const [activeTab, setActiveTab] = useState('home');

    const renderScreen = () => {
        switch (activeTab) {
            case 'seat':
                return <Seat />;
            case 'student':
                return <Student />;
            case 'home':
                return <HomeScreen />;
            case 'search':
                return <Search />;
            default:
                return <Menu />;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.screenContainer}>{renderScreen()}</View>
            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </View>
    );
};

export default MainLayout;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screenContainer: {
        flex: 1,
    },
});
