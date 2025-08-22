import React, { useEffect, useState } from 'react'
import { View, Text, StatusBar, TextInput, SafeAreaView, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import TopBar from '../components/TopBar'
import { StudentCard } from '../components/StudentCard'
import client from '../service/axiosClient'
import Loading from '../components/Loading'
import Ionicons from 'react-native-vector-icons/Ionicons'

export default function TrashStudentScreen() {
    const [activeTab, setActiveTab] = useState('Active')
    const [allStudent, setAllStudent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('')

    const [filteredStudents, setFilteredStudents] = useState([]);

    useEffect(() => {
        // If search text is empty, show all students
        if (searchText.trim() === '') {
            setFilteredStudents(allStudent);
            return;
        }

        const lowerSearch = searchText.toLowerCase();

        const filtered = allStudent.filter(student => {
            // Match by SID (converted to string for comparison)
            const matchBySid = student.sid?.toString().includes(lowerSearch);

            // Match by name (case-insensitive)
            const matchByName = student.name?.toLowerCase().includes(lowerSearch);

            return matchBySid || matchByName;
        });

        setFilteredStudents(filtered);
    }, [searchText, allStudent]);

    useEffect(() => {
        const fetchAllStudent = async () => {
            try {
                setLoading(true)
                const response = await client.get('/api/student/trash-Student');
                setAllStudent(response.data);
                // Initialize filteredStudents with all students when data is first loaded
                setFilteredStudents(response.data);
                setLoading(false);
            } catch (error) {
                setLoading(false);
            }
        }
        fetchAllStudent();
    }, [])

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            {/* Top Bar */}
            <TopBar heading="Trash Students" />

            <View style={styles.searchContainer}>
                {/* Search Icon */}
                <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />

                <TextInput
                    style={styles.searchInput}
                    placeholder="Search By Sid or Name..."
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                    placeholderTextColor="#999"
                />
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
                        data={filteredStudents}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        renderItem={({ item }) => (
                            <StudentCard student={item} />
                        )}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                    />
                )}

                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryText}>
                        {filteredStudents.length} Trash Student{filteredStudents.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 16,
        marginTop: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingLeft: 8,
        height: 40,
        fontSize: 16,
        paddingHorizontal: 0,
        backgroundColor: '#f8f8f8',
        borderRadius: 1,
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