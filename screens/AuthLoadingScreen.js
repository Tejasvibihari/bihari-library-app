// screens/AuthLoadingScreen.js
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthLoadingScreen = ({ navigation }) => {
    useEffect(() => {
        const checkLoginStatus = async () => {
            const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
            if (isLoggedIn === 'true') {
                navigation.replace('Main');
            } else {
                navigation.replace('Login');
            }
        };

        checkLoginStatus();
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
    );
};

export default AuthLoadingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
