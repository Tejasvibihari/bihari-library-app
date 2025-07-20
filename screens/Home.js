import React, { useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Platform } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient'; 
import { LinearGradient } from 'expo-linear-gradient';
import TopHeader from '../components/TopBar';
import client from '../service/axiosClient';
import InvoiceCard from '../components/InvoiceCard';
import { SafeAreaView } from 'react-native';

const { width } = Dimensions.get('window');



const Home = () => {
    // Mock data for demonstration
    const [allStudent, setAllStudent] = React.useState([]);
    const [loading, setLoading] = React.useState(false);



    const totalStudents = 100;
    const activeStudents = 70;
    const deactivatedStudents = 20;
    const pendingStudents = [
        { id: '1', sid: 'SID001', imageUrl: 'https://via.placeholder.com/100?text=Student1' },
        { id: '2', sid: 'SID002', imageUrl: 'https://via.placeholder.com/100?text=Student2' },
        { id: '3', sid: 'SID003', imageUrl: 'https://via.placeholder.com/100?text=Student3' },
        { id: '4', sid: 'SID004', imageUrl: 'https://via.placeholder.com/100?text=Student4' },
        { id: '5', sid: 'SID005', imageUrl: 'https://via.placeholder.com/100?text=Student5' },
        { id: '6', sid: 'SID006', imageUrl: 'https://via.placeholder.com/100?text=Student6' },
        { id: '7', sid: 'SID007', imageUrl: 'https://via.placeholder.com/100?text=Student7' },
        // Add more as needed
    ];
    useEffect(() => {
        const fetchAllStudent = async () => {
            try {
                setLoading(true)
                const response = await client.get('/api/student/getallstudent');
                // console.log(response.data)
                setAllStudent(response.data);
                setLoading(false);
            } catch (error) {
                setLoading(false);
            }
        }
        fetchAllStudent();
    }, [])

    const renderPendingItem = ({ item }) => (
        <LinearGradient
            colors={['#DDD6FE', '#EDE9FE', '#F3E8FF']} // Abstract purple-ish gradient for pending items
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pendingItem}
        >
            <Image source={{ uri: item.imageUrl }} style={styles.avatar} />
            <Text style={styles.sidText}>{item.sid}</Text>
        </LinearGradient>
    );

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <TopHeader heading='Bihari Library' />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* Total Students Card */}

                <LinearGradient
                    colors={['#5B21B6', '#7C3AED', '#A78BFA']} // Abstract gradient based on primary purple
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.totalCard}
                >
                    <Text style={styles.totalText}>Total Students</Text>
                    <Text style={styles.countText}>{allStudent?.length}</Text>
                </LinearGradient>

                {/* Status Cards Row */}
                <View style={styles.statusRow}>
                    {/* Active Students Clickable Card */}
                    <TouchableOpacity
                        onPress={() => console.log('Active Students clicked - Navigate to details')}
                    >
                        <LinearGradient
                            colors={['#A7F3D0', '#34D399', '#10B981']} // Abstract green gradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statusCard}
                        >
                            <Text style={[styles.cardTitle, styles.activeText]}>Active</Text>
                            <Text style={[styles.cardCount, styles.activeText]}>{allStudent?.filter(student => student.status === "Active").length}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Pending Students Clickable Card */}
                    <TouchableOpacity
                        onPress={() => console.log('Pending Students clicked - Navigate to details')}
                    >
                        <LinearGradient
                            colors={['#FDE047', '#EAB308', '#CA8A04']} // Abstract yellow gradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statusCard}
                        >
                            <Text style={[styles.cardTitle, styles.pendingText]}>Pending</Text>
                            <Text style={[styles.cardCount, styles.pendingText]}>{allStudent?.filter(student => student.status === "Pending").length}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Deactivated Students Clickable Card */}
                    {/* <TouchableOpacity
                        onPress={() => console.log('Deactivated Students clicked - Navigate to details')}
                    >
                        <LinearGradient
                            colors={['#FDA4AF', '#F43F5E', '#E11D48']} // Abstract red gradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.statusCard}
                        >
                            <Text style={[styles.cardTitle, styles.deactiveText]}>Deactivated</Text>
                            <Text style={[styles.cardCount, styles.deactiveText]}>{deactivatedStudents}</Text>
                        </LinearGradient>
                    </TouchableOpacity> */}
                </View>

                {/* Pending Students Header */}
                {/* <Text style={styles.sectionHeader}>Pending Students List</Text> */}

                {/* Horizontally Scrollable List of Pending Students */}
                {/* <FlatList
                    data={pendingStudents}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPendingItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pendingList}
                    contentContainerStyle={styles.pendingListContent}
                /> */}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EDE9FE', // Lighter purple-tinted background for vibrancy
        paddingHorizontal: 16,
    },
    contentContainer: {
        paddingBottom: 24,
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
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    statusCard: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,

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
    activeText: {
        color: '#065F46',
    },
    pendingText: {
        color: '#713F12',
    },
    deactiveText: {
        color: '#9F1239',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#5B21B6',
        marginBottom: 8,
        marginTop: 4,
    },
    pendingList: {
        marginBottom: 12,
    },
    pendingListContent: {
        paddingHorizontal: 4,
    },
    pendingItem: {
        alignItems: 'center',
        marginRight: 12,
        padding: 8,
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
        marginTop: 4,
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
    },
});

export default Home;