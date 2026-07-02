// screens/AuthLoadingScreen.js
import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Image,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const MIN_SPLASH_TIME = 1800; // ms — keeps splash from flashing too fast

const AuthLoadingScreen = ({ navigation }) => {
    const logoScale = useRef(new Animated.Value(0.7)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(10)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]).start();

        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        try {
            const [isLoggedIn] = await Promise.all([
                AsyncStorage.getItem('isLoggedIn'),
                new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_TIME)),
            ]);

            if (isLoggedIn === 'true') {
                navigation.replace('Main');
            } else {
                navigation.replace('Login');
            }
        } catch (err) {
            console.log('Auth check failed:', err);
            navigation.replace('Login');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" backgroundColor="#8B5CF6" />
            <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <Animated.View
                        style={[
                            styles.logoWrapper,
                            {
                                opacity: logoOpacity,
                                transform: [{ scale: logoScale }],
                            },
                        ]}
                    >
                        <Image
                            source={require('../assets/bihari.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    <Animated.Text
                        style={[
                            styles.title,
                            {
                                opacity: textOpacity,
                                transform: [{ translateY: textTranslateY }],
                            },
                        ]}
                    >
                        Bihari Library
                    </Animated.Text>

                    <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                        Personalized Library Management
                    </Animated.Text>

                    <Animated.Text style={[styles.unit, { opacity: taglineOpacity }]}>
                        A Unit of Bihari Traders
                    </Animated.Text>
                </View>

                <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
                    <View style={styles.dotsRow}>
                        <PulsingDot delay={0} />
                        <PulsingDot delay={150} />
                        <PulsingDot delay={300} />
                    </View>
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

function PulsingDot({ delay }) {
    const scale = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        let mounted = true;
        const animate = () => {
            if (!mounted) return;
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1,
                    duration: 400,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 0.6,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start(() => animate());
        };
        animate();
        return () => {
            mounted = false;
        };
    }, []);

    return <Animated.View style={[styles.dot, { transform: [{ scale }] }]} />;
}

export default AuthLoadingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    logoWrapper: {
        width: width * 0.32,
        height: width * 0.32,
        borderRadius: (width * 0.32) / 2,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    logo: {
        width: '65%',
        height: '65%',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    tagline: {
        fontSize: 14,
        color: '#EDE9FE',
        fontWeight: '500',
        marginBottom: 2,
    },
    unit: {
        fontSize: 12,
        color: '#DDD6FE',
        fontWeight: '400',
        marginTop: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 60,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
});