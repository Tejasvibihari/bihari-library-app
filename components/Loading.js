import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    Dimensions,
    Image,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const Loading = ({
    visible = false,
    logoSource = null, // Pass your company logo here
    loadingText = 'Loading...',
    logoSize = 80,
    textColor = '#ffffff',
    overlayColor = 'rgba(0, 0, 0, 0.5)',
    animationDuration = 1500,
    textStyle = {},
    logoStyle = {},
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Start animations when component becomes visible
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();

            // Animate loading text
            const animateText = () => {
                Animated.sequence([
                    Animated.timing(textOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(textOpacity, {
                        toValue: 0.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    if (visible) {
                        animateText(); // Loop the animation
                    }
                });
            };

            animateText();
        } else {
            // Reset animations when component becomes invisible
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
            textOpacity.setValue(0);
        }
    }, [visible, fadeAnim, scaleAnim, textOpacity]);

    // Logo pulse animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            const pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: animationDuration / 2,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: animationDuration / 2,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnimation.start();

            return () => {
                pulseAnimation.stop();
            };
        }
    }, [visible, pulseAnim, animationDuration]);

    if (!visible) {
        return null;
    }

    return (
        <Modal
            transparent={true}
            animationType="none"
            visible={visible}
            onRequestClose={() => { }} // Prevent closing on back button
        >
            <Animated.View
                style={[
                    styles.overlay,
                    {
                        backgroundColor: overlayColor,
                        opacity: fadeAnim,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.container,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Company Logo */}
                    {logoSource ? (
                        <Animated.View
                            style={[
                                styles.logoContainer,
                                {
                                    transform: [{ scale: pulseAnim }],
                                },
                            ]}
                        >
                            <Image
                                source={logoSource}
                                style={[
                                    styles.logo,
                                    {
                                        width: logoSize,
                                        height: logoSize,
                                    },
                                    logoStyle,
                                ]}
                                resizeMode="contain"
                            />
                        </Animated.View>
                    ) : (
                        // Default animated placeholder if no logo provided
                        <Animated.View
                            style={[
                                styles.defaultLogo,
                                {
                                    width: logoSize,
                                    height: logoSize,
                                    transform: [{ scale: pulseAnim }],
                                },
                            ]}
                        >
                            <View style={styles.defaultLogoInner} />
                        </Animated.View>
                    )}

                    {/* Loading Text */}
                    <Animated.Text
                        style={[
                            styles.loadingText,
                            {
                                color: "#ffffff",
                                // color: textColor,
                                opacity: textOpacity,
                            },
                            textStyle,
                        ]}
                    >
                        {loadingText}
                    </Animated.Text>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: width,
        height: height,
    },
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        marginBottom: 20,
    },
    logo: {
        borderRadius: 10,
    },
    defaultLogo: {
        borderRadius: 40,
        backgroundColor: '#007AFF',
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultLogoInner: {
        width: '60%',
        height: '60%',
        borderRadius: 20,
        backgroundColor: 'white',
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 10,
        textColor: '#ffffff',
    },
});

export default Loading;