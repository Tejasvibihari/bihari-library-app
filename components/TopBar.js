import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const TopHeader = ({ heading = 'Dashboard', onNotificationPress, onPlusPress }) => {
    const navigation = useNavigation();

    const handlePlusPress = onPlusPress || (() => navigation.navigate('AdmissionFormScreen'));
    const handleNotificationPress = onNotificationPress || (() => console.log('Notification pressed'));

    return (
        <LinearGradient
            colors={['#8B5CF6', '#A78BFA']}
            style={styles.headerContainer}
        >
            <View style={styles.innerHeader}>
                <Text style={styles.title}>{heading}</Text>
                <View style={styles.iconsContainer}>
                    <TouchableOpacity onPress={handlePlusPress}>
                        <Icon name="add" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.bellButton} onPress={handleNotificationPress}>
                        <Icon name="notifications" size={26} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

export default TopHeader;

const styles = StyleSheet.create({
    headerContainer: {
        // No paddingTop needed — StatusBar is non-translucent so it doesn't overlap
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    innerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        color: '#fff',
        fontWeight: '700',
    },
    iconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bellButton: {
        marginLeft: 20,
    },
});