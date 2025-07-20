import React, { useEffect, useState } from 'react'
import { Text, View, TextInput, TouchableOpacity, StyleSheet, StatusBar, FlatList } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons' // Import icon
import client from '../service/axiosClient';
import { StudentCard } from '../components/StudentCard';


export default function Search() {
    const [searchText, setSearchText] = useState('')
    const [loading, setLoading] = useState(false);
    const [allStudent, setAllStudent] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    // console.log((allStudent, filteredStudents))
    useEffect(() => {
        if (searchText.trim() === '') {
            setFilteredStudents([]); // Or set to allStudent if you want to show all by default
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



    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            <View style={styles.searchContainer}>
                {/* Search Icon */}
                <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />

                <TextInput
                    style={styles.searchInput}
                    placeholder="Search By Sid or Name..."
                    value={searchText}
                    onChangeText={setSearchText}
                    // onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    placeholderTextColor="#999"
                />

                {/* {searchText.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearSearch}
                    >
                        <Text style={styles.clearButtonText}>×</Text>
                    </TouchableOpacity>
                )} */}
            </View>
            {/* <View>
                <Text>
                    ksdfjhgkjdfbg
                </Text>
            </View>
            <View>
                {searchText && filteredStudents.length === [] ? <Text style={styles.contentText}>No results found</Text> : null}
            </View> */}
            <View style={styles.contentContainer}>
                {searchText ? (
                    <FlatList
                        data={filteredStudents}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        renderItem={({ item }) => (
                            <StudentCard student={item} />
                        )}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                    />
                ) : (
                    <Text style={styles.contentText}>Enter a search term above</Text>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 16,
        marginTop: 50,
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
    clearButton: {
        padding: 8,
    },
    clearButtonText: {
        fontSize: 20,
        color: '#666',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    contentText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
    },
    contentContainer: {
        flex: 1,
        marginTop: 16,
    },
})