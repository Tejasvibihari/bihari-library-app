import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Platform,
    SafeAreaView,
    RefreshControl,
    ActivityIndicator,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopHeader from '../components/TopBar';
import client from '../service/axiosClient';
import InvoiceCard from '../components/InvoiceCard';

const { width, height } = Dimensions.get('window');

const Home = ({ navigation }) => {
    const [allStudent, setAllStudent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Fetch all students
    const fetchAllStudents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await client.get('/api/student/getallstudent');
            setAllStudent(response.data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
            setError('Failed to fetch student data');
            Alert.alert('Error', 'Failed to fetch student data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchAllStudents();
    }, [fetchAllStudents]);

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAllStudents();
        setRefreshing(false);
    }, [fetchAllStudents]);

    // Calculate student counts
    const studentCounts = useMemo(() => {
        const total = allStudent.length;
        const active = allStudent.filter(student => student.status === "Active").length;
        const pending = allStudent.filter(student => student.status === "Pending").length;
        const inactive = allStudent.filter(student => student.status === "Inactive").length;

        return { total, active, pending, inactive };
    }, [allStudent]);

    // Handle navigation to filtered students
    const navigateToStudents = useCallback((status) => {
        const filteredStudents = status === 'all'
            ? allStudent
            : allStudent.filter(student => student.status === status);

        // Navigate to students list with filtered data
        if (navigation) {
            navigation.navigate('StudentsList', {
                students: filteredStudents,
                title: `${status === 'all' ? 'All' : status} Students`
            });
        }
    }, [allStudent, navigation]);

    // Render pending student item (if needed)
    const renderPendingItem = useCallback(({ item }) => (
        <TouchableOpacity
            onPress={() => {
                if (navigation) {
                    navigation.navigate('SingleStudentProfile', { student: item });
                }
            }}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#DDD6FE', '#EDE9FE', '#F3E8FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pendingItem}
            >
                <Image
                    source={{
                        uri: item.image
                            ? `https://api.biharilibrary.in/uploads/${item.image}`
                            : 'https://via.placeholder.com/100?text=Student'
                    }}
                    style={styles.avatar}
                    defaultSource={require('../assets/bihari.png')}
                />
                <Text style={styles.sidText} numberOfLines={1}>{item.sid}</Text>
            </LinearGradient>
        </TouchableOpacity>
    ), [navigation]);

    // Status Card Component
    const StatusCard = useCallback(({ title, count, colors, textColor, onPress }) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={styles.statusCardContainer}
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusCard}
            >
                <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
                <Text style={[styles.cardCount, { color: textColor }]}>{count}</Text>
            </LinearGradient>
        </TouchableOpacity>
    ), []);

    // Get pending students for horizontal list
    const pendingStudents = useMemo(() =>
        allStudent.filter(student => student.status === "Pending").slice(0, 10),
        [allStudent]
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'}
                backgroundColor="#8B5CF6"
                translucent={false}
            />

            <TopHeader heading='Bihari Library' />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#8B5CF6']}
                        tintColor="#8B5CF6"
                    />
                }
            >
                {/* Loading Indicator */}
                {loading && !refreshing && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={styles.loadingText}>Loading students...</Text>
                    </View>
                )}

                {/* Error State */}
                {error && !loading && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={fetchAllStudents} style={styles.retryButton}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Total Students Card */}
                <TouchableOpacity
                    onPress={() => navigateToStudents('all')}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#5B21B6', '#7C3AED', '#A78BFA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.totalCard}
                    >
                        <Text style={styles.totalText}>Total Students</Text>
                        <Text style={styles.countText}>{studentCounts.total}</Text>
                        {loading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.cardLoader} />}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Status Cards Row */}
                <View style={styles.statusRow}>
                    <StatusCard
                        title="Active"
                        count={studentCounts.active}
                        colors={['#A7F3D0', '#34D399', '#10B981']}
                        textColor="#065F46"
                        onPress={() => navigateToStudents('Active')}
                    />

                    <StatusCard
                        title="Pending"
                        count={studentCounts.pending}
                        colors={['#FDE047', '#EAB308', '#CA8A04']}
                        textColor="#713F12"
                        onPress={() => navigateToStudents('Pending')}
                    />

                    <StatusCard
                        title="Inactive"
                        count={studentCounts.inactive}
                        colors={['#FDA4AF', '#F43F5E', '#E11D48']}
                        textColor="#9F1239"
                        onPress={() => navigateToStudents('Inactive')}
                    />
                </View>

                {/* Pending Students Section */}
                {pendingStudents.length > 0 && (
                    <>
                        <Text style={styles.sectionHeader}>
                            Recent Pending Students ({pendingStudents.length})
                        </Text>

                        <FlatList
                            data={pendingStudents}
                            keyExtractor={(item) => item._id || item.sid}
                            renderItem={renderPendingItem}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.pendingList}
                            contentContainerStyle={styles.pendingListContent}
                            getItemLayout={(data, index) => ({
                                length: width * 0.2 + 12,
                                offset: (width * 0.2 + 12) * index,
                                index,
                            })}
                        />
                    </>
                )}

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                    <Text style={styles.sectionHeader}>Quick Overview</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{((studentCounts.active / studentCounts.total) * 100 || 0).toFixed(1)}%</Text>
                            <Text style={styles.statLabel}>Active Rate</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{studentCounts.pending}</Text>
                            <Text style={styles.statLabel}>Need Attention</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </Text>
                            <Text style={styles.statLabel}>Today</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#8B5CF6', // Match StatusBar color
    },
    container: {
        flex: 1,
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 16,
    },
    contentContainer: {
        paddingBottom: 24,
        paddingTop: 8,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 8,
        color: '#6B7280',
        fontSize: 14,
    },
    errorContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        marginVertical: 8,
        paddingHorizontal: 16,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    totalCard: {
        padding: 20,
        borderRadius: 20,
        marginVertical: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 7,
        borderWidth: 1,
        borderColor: '#7C3AED',
        position: 'relative',
    },
    totalText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    countText: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: 'bold',
    },
    cardLoader: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 8,
    },
    statusCardContainer: {
        flex: 1,
    },
    statusCard: {
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
        minHeight: 80,
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardCount: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#5B21B6',
        marginBottom: 12,
        marginTop: 8,
    },
    pendingList: {
        marginBottom: 16,
    },
    pendingListContent: {
        paddingHorizontal: 4,
    },
    pendingItem: {
        alignItems: 'center',
        marginRight: 12,
        padding: 12,
        borderRadius: 12,
        width: width * 0.2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    avatar: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: '#5B21B6',
    },
    sidText: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
    },
    quickStats: {
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5B21B6',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
});

export default Home;
