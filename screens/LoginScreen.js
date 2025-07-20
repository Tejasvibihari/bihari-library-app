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
    Alert

} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../service/axiosClient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigation = useNavigation();


    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Validation Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await client.post('api/admin/auth/signin', { email, password });

            await AsyncStorage.setItem('isLoggedIn', 'true');
            setLoading(false);
            setError(null);

            Alert.alert('Success', 'Login successful!', [
                {
                    text: 'OK',
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

            setError(message);
            Alert.alert('Login Failed', message);
        }
    };




    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            {/* Purple gradient background */}
            <LinearGradient
                colors={['#E9D5FF', '#C4B5FD', '#A78BFA']}
                style={styles.gradientBackground}
            />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Login</Text>
                    {/* <TouchableOpacity>
                        <Text style={styles.signUpText}>
                            Student Login? <Text style={styles.signUpLink}>Login</Text>
                        </Text>
                    </TouchableOpacity> */}
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {/* Phone Number Input */}
                    <View style={styles.inputContainer}>
                        <Icon name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Icon name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.textInput, styles.passwordInput]}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Feather
                                name={showPassword ? 'eye' : 'eye-off'}
                                size={20}
                                color="#9CA3AF"
                                style={styles.inputIcon}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#8B5CF6', '#7C3AED']}
                            style={styles.loginButtonGradient}
                        >
                            {loading ? (
                                <Text style={styles.loginButtonText}>Logging in...</Text>
                            ) : (
                                <>
                                    <Text style={styles.loginButtonText}>Login</Text>
                                    <Icon name="arrow-forward" size={20} color="white" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                </View>


            </View>
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
        bottom: 0,
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.4,

        borderBottomRightRadius: 100,

    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    signUpText: {
        fontSize: 14,
        color: '#6B7280',
    },
    signUpLink: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
    form: {
        marginBottom: 40,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    countryCode: {
        fontSize: 16,
        color: '#1F2937',
        marginRight: 8,
        fontWeight: '500',
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 16,
    },
    passwordInput: {
        paddingRight: 80,
    },
    forgotPassword: {
        position: 'absolute',
        right: 16,
    },
    forgotPasswordText: {
        color: '#8B5CF6',
        fontSize: 12,
        fontWeight: '600',
    },
    loginButton: {
        borderRadius: 12,
        marginTop: 8,
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    loginButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    socialLogin: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    socialButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
});

export default LoginScreen;