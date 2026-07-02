import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

const LibraryLogo = require('../assets/bihari.png');
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../service/axiosClient';
import { useNavigation } from '@react-navigation/native';

const { height } = Dimensions.get('window');

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const navigation = useNavigation();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Validation Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);

        try {
            await client.post('api/admin/auth/signin', { email, password });
            await AsyncStorage.setItem('isLoggedIn', 'true');
            setLoading(false);

            Alert.alert('Welcome', 'Login successful!', [
                {
                    text: 'Continue',
                    onPress: () => navigation.replace('Main'),
                },
            ]);
        } catch (error) {
            setLoading(false);
            let message = 'Something went wrong. Please try again.';

            if (error.response?.data?.message) {
                message = error.response.data.message;
            } else if (error.message) {
                message = error.message;
            }

            Alert.alert('Login Failed', message);
        }
    };

    const Wrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
    const wrapperProps =
        Platform.OS === 'ios'
            ? { behavior: 'padding', keyboardVerticalOffset: 0, style: { flex: 1 } }
            : { style: { flex: 1 } };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

            <LinearGradient
                colors={['#8B5CF6', '#A78BFA', '#C4B5FD']}
                style={styles.gradientBackground}
            />

            <View style={styles.decorCircleLarge} pointerEvents="none" />
            <View style={styles.decorCircleSmall} pointerEvents="none" />

            <Wrapper {...wrapperProps}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="none"
                >
                    {/* Brand header */}
                    <View style={styles.brandHeader}>
                        <View style={styles.logoCircle}>
                            <Image
                                source={LibraryLogo}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.brandTitle}>Bihari Library</Text>
                        <Text style={styles.brandSubtitle}>Specialized Library Management System</Text>
                    </View>

                    {/* Form card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Sign In</Text>
                        <Text style={styles.cardHint}>Access the librarian &amp; admin portal</Text>

                        {/* Email Input */}
                        <Text style={styles.label}>Email Address</Text>
                        <View
                            style={[
                                styles.inputContainer,
                                emailFocused && styles.inputContainerFocused,
                            ]}
                        >
                            <Icon
                                name="mail-outline"
                                size={20}
                                color={emailFocused ? '#7C3AED' : '#9CA3AF'}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.textInput}
                                placeholder="you@biharilibrary.org"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                spellCheck={false}
                                placeholderTextColor="#9CA3AF"
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                            />
                        </View>

                        {/* Password Input */}
                        <Text style={styles.label}>Password</Text>
                        <View
                            style={[
                                styles.inputContainer,
                                passwordFocused && styles.inputContainerFocused,
                            ]}
                        >
                            <Icon
                                name="lock-outline"
                                size={20}
                                color={passwordFocused ? '#7C3AED' : '#9CA3AF'}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={[styles.textInput, styles.passwordInput]}
                                placeholder="Enter your password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCorrect={false}
                                spellCheck={false}
                                placeholderTextColor="#9CA3AF"
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                            />
                            <TouchableOpacity
                                style={styles.eyeToggle}
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather
                                    name={showPassword ? 'eye' : 'eye-off'}
                                    size={20}
                                    color="#9CA3AF"
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.forgotPasswordLink}>
                            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#8B5CF6', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.loginButtonGradient}
                            >
                                {loading ? (
                                    <Text style={styles.loginButtonText}>Signing in...</Text>
                                ) : (
                                    <>
                                        <Text style={styles.loginButtonText}>Login</Text>
                                        <Icon name="arrow-forward" size={20} color="white" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Icon name="menu-book" size={16} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.footerText}>
                            Bihari Library &middot; Authorized personnel only
                        </Text>
                    </View>
                </ScrollView>
            </Wrapper>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#8B5CF6',
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.42,
        borderBottomRightRadius: 100,
    },
    decorCircleLarge: {
        position: 'absolute',
        top: -60,
        right: -50,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    decorCircleSmall: {
        position: 'absolute',
        top: 90,
        left: -40,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.10)',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: height * 0.08,
        paddingBottom: 32,
    },
    brandHeader: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#4C1D95',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
        overflow: 'hidden',
    },
    logoImage: {
        width: 78,
        height: 78,
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    brandSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
        fontWeight: '500',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingVertical: 26,
        shadowColor: '#4C1D95',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    cardHint: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 22,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 6,
        marginLeft: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
    },
    inputContainerFocused: {
        borderColor: '#8B5CF6',
        backgroundColor: '#FFFFFF',
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        paddingVertical: 14,
    },
    passwordInput: {
        paddingRight: 34,
    },
    eyeToggle: {
        position: 'absolute',
        right: 14,
    },
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        marginBottom: 20,
        marginTop: -6,
    },
    forgotPasswordText: {
        color: '#7C3AED',
        fontSize: 13,
        fontWeight: '600',
    },
    loginButton: {
        borderRadius: 14,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    loginButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 26,
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    },
});

export default LoginScreen;