import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TopBar from '../components/TopBar';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');

const Menu = () => {
    const navigation = useNavigation();
    const menuOptions = [

        {
            id: 1,
            title: 'All Invoices',
            subtitle: 'All Invoice of Students',
            icon: 'receipt',
            screen: 'AllInvoice',
            color: '#7C3AED'
        },
        {
            id: 2,
            title: 'Trash',
            subtitle: 'View All Deleted Students',
            icon: 'person',
            screen: 'TrashStudent',
            color: '#8B5CF6'
        },
        // {
        //     id: 2,
        //     title: 'Camera',
        //     subtitle: 'Watch Live Video',
        //     icon: 'camera',
        //     screen: 'CameraScreen',
        //     color: '#8B5CF6'
        // },
        {
            id: 3,
            title: 'Log Out',
            subtitle: 'log out from the app',
            icon: 'logout',
            screen: 'Login',
            color: '#FF3F33'
        },
        // {
        //     id: 4,
        //     title: 'My Library',
        //     subtitle: 'Your saved books',
        //     icon: 'library-books',
        //     screen: 'MyLibraryScreen',
        //     color: '#5B21B6'
        // },
        // {
        //     id: 5,
        //     title: 'Reading List',
        //     subtitle: 'Books to read later',
        //     icon: 'bookmark',
        //     screen: 'ReadingListScreen',
        //     color: '#4C1D95'
        // },
        // {
        //     id: 6,
        //     title: 'History',
        //     subtitle: 'Recently viewed books',
        //     icon: 'history',
        //     screen: 'HistoryScreen',
        //     color: '#7C3AED'
        // },
        // {
        //     id: 7,
        //     title: 'Search',
        //     subtitle: 'Find books quickly',
        //     icon: 'search',
        //     screen: 'SearchScreen',
        //     color: '#8B5CF6'
        // },
        // {
        //     id: 8,
        //     title: 'Settings',
        //     subtitle: 'App preferences',
        //     icon: 'settings',
        //     screen: 'SettingsScreen',
        //     color: '#6D28D9'
        // },
        // {
        //     id: 9,
        //     title: 'About',
        //     subtitle: 'About Bihari Library',
        //     icon: 'info',
        //     screen: 'AboutScreen',
        //     color: '#5B21B6'
        // }
    ];

    const handleMenuPress = async (screen) => {

        if (screen === 'Login') {
            // Clear login status if logging out
            await AsyncStorage.removeItem('isLoggedIn');
            navigation.replace('Login');
        } else {

            navigation.navigate(screen);
        }
    };

    const renderMenuItem = (item) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { borderLeftColor: item.color }]}
            onPress={() => handleMenuPress(item.screen)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>
    );
    const handleLogout = async () => {
        await AsyncStorage.removeItem('isLoggedIn');
        navigation.replace('Login');
    };
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            {/* Top Bar */}
            <TopBar heading="Menu" />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Welcome Section */}


                {/* Menu Options */}
                <View style={styles.menuSection}>
                    {menuOptions.map(renderMenuItem)}
                </View>

                {/* Quick Actions */}
                {/* <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => handleMenuPress('SearchScreen')}
                        >
                            <Icon name="search" size={20} color="#8B5CF6" />
                            <Text style={styles.quickActionText}>Search</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => handleMenuPress('BooksScreen')}
                        >
                            <Icon name="book" size={20} color="#8B5CF6" />
                            <Text style={styles.quickActionText}>Browse</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => handleMenuPress('MyLibraryScreen')}
                        >
                            <Icon name="library-books" size={20} color="#8B5CF6" />
                            <Text style={styles.quickActionText}>My Library</Text>
                        </TouchableOpacity>
                    </View>
                </View> */}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100, // Added extra padding to prevent content from being hidden behind bottom navigation
    },
    welcomeSection: {
        backgroundColor: '#8B5CF6',
        padding: 20,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    welcomeSubtext: {
        fontSize: 16,
        color: '#E5E7EB',
        lineHeight: 22,
    },
    menuSection: {
        paddingHorizontal: 16,
        marginBottom: 24,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    menuSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    quickActionsSection: {
        paddingHorizontal: 16,
    },
    quickActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    quickAction: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        flex: 1,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    quickActionText: {
        fontSize: 12,
        color: '#374151',
        marginTop: 8,
        fontWeight: '500',
    },
});

export default Menu;