import React, { useEffect, useState } from 'react'
import { View, Text, StatusBar, SafeAreaView, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import TopBar from '../components/TopBar'
import { StudentCard } from '../components/StudentCard'
import client from '../service/axiosClient'
import Loading from '../components/Loading'


export default function Student() {
    const [activeTab, setActiveTab] = useState('Active')
    const [allStudent, setAllStudent] = useState([]);
    const [loading, setLoading] = useState(true);


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

    const getTabStyle = (tab) => {
        return activeTab === tab ? styles.activeTab : styles.inactiveTab
    }

    const getTabTextStyle = (tab) => {
        return activeTab === tab ? styles.activeTabText : styles.inactiveTabText
    }
    // if (loading) {
    //     return (

    //     )
    // }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            {/* Top Bar */}
            <TopBar heading="All Students" />

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, getTabStyle('Active')]}
                    onPress={() => setActiveTab('Active')}
                >
                    <Text style={getTabTextStyle('Active')}>Active</Text>
                    <View style={[styles.indicator, activeTab === 'Active' && styles.activeIndicator]} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, getTabStyle('Pending')]}
                    onPress={() => setActiveTab('Pending')}
                >
                    <Text style={getTabTextStyle('Pending')}>Pending</Text>
                    <View style={[styles.indicator, activeTab === 'Pending' && styles.activeIndicator]} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, getTabStyle('Deactive')]}
                    onPress={() => setActiveTab('Deactive')}
                >
                    <Text style={getTabTextStyle('Deactive')}>Deactive</Text>
                    <View style={[styles.indicator, activeTab === 'Deactive' && styles.activeIndicator]} />
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={styles.contentContainer}>
                {loading ? (
                    <Loading
                        visible={loading}
                        logoSource={require('../assets/bihari.png')}
                        loadingText="Please wait..."
                        logoSize={100}
                        textColor="#333"
                        overlayColor="rgba(0, 0, 0, 0.6)"
                    />
                ) : (
                    <FlatList
                        data={allStudent.filter(student => student.status === activeTab)}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        renderItem={({ item }) => (
                            <StudentCard student={item} />
                        )}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                    />
                )}



                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryText}>
                        {allStudent.filter(student => student.status === activeTab).length} {activeTab} student{allStudent.filter(student => student.status === activeTab).length !== 1 ? 's' : ''}

                        {/* {studentData[activeTab].length} {activeTab} student{studentData[activeTab].length !== 1 ? 's' : ''} */}
                    </Text>
                </View>

                {/*  */}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderRadius: 8,
        position: 'relative',
    },
    activeTab: {
        backgroundColor: '#8B5CF6',
    },
    inactiveTab: {
        backgroundColor: 'transparent',
    },
    activeTabText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    inactiveTabText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
    },
    indicator: {
        position: 'absolute',
        bottom: 4,
        height: 3,
        width: 30,
        borderRadius: 2,
        backgroundColor: 'transparent',
    },
    activeIndicator: {
        backgroundColor: '#ffffff',
    },
    contentContainer: {
        flex: 1,
        marginTop: 16,
    },
    summaryHeader: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    summaryText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    studentCard: {
        backgroundColor: '#ffffff',
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#8B5CF6',
    },
    studentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    studentName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    courseText: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 4,
    },
    gradeText: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '600',
    },
    statusDetailText: {
        fontSize: 14,
        color: '#D97706',
        fontWeight: '500',
    },
    reasonText: {
        fontSize: 14,
        color: '#DC2626',
        fontWeight: '500',
    },
})