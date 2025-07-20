import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, StatusBar, SafeAreaView, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import TopBar from '../components/TopBar'
import { StudentCard } from '../components/StudentCard'
import client from '../service/axiosClient'
import Loading from '../components/Loading'
import InvoiceCard from '../components/InvoiceCard'
import Ionicons from 'react-native-vector-icons/Ionicons'

export default function AllInvoiceScreen() {
    const [activeTab, setActiveTab] = useState('Active')
    const [allInvoices, setAllInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('')
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    useEffect(() => {
        if (searchText.trim() === '') {
            setFilteredInvoices([]); // Or set to allStudent if you want to show all by default
            return;
        }

        const lowerSearch = searchText.toLowerCase();

        const filtered = allInvoices.filter(invoice => {
            // Match by SID (converted to string for comparison)
            const matchBySid = invoice.sid?.toString().includes(lowerSearch);

            return matchBySid;
        });

        setFilteredInvoices(filtered);
    }, [searchText, allInvoices]);

    useEffect(() => {
        const fetchAllInvoice = async () => {
            try {
                setLoading(true)
                const response = await client.get('/api/invoice/getAllInvoice');
                // console.log(response.data)
                setAllInvoices(response.data);
                setLoading(false);
            } catch (error) {
                setLoading(false);
            }
        }
        fetchAllInvoice();
    }, [])


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            {/* Top Bar */}
            <TopBar heading="All Invoice" />

            <View style={styles.tabContainer}>

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
                        data={filteredInvoices && filteredInvoices.length > 0 ? filteredInvoices : allInvoices}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        renderItem={({ item }) => (
                            <InvoiceCard invoice={item} />
                        )}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                    />
                )}

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
    contentContainer: {
        flex: 1,
        marginTop: 16,
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
    searchIcon: {
        marginRight: 8,
        marginTop: 10,
    },
})