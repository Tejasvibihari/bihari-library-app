import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import client from '../service/axiosClient';
import TopHeader from '../components/TopBar';
import Loading from '../components/Loading';

const Seat = () => {
    const [selectedShift, setSelectedShift] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [seatShift, setSeatShift] = useState('morning');
    const [filterStatus, setFilterStatus] = useState('all'); // all, available, unavailable
    const [loading, setLoading] = useState(true);
    const [allSeat, setAllSeat] = useState([]);

    useEffect(() => {
        const fetchAllSeat = async () => {
            try {
                setLoading(true);
                const res = await client.get('api/seat/getAllSeat');
                setAllSeat(res.data.allSeats);
                setLoading(false);
            } catch (error) {
                setLoading(false);
            }
        };
        fetchAllSeat();
    }, []);

    const shifts = [
        { label: 'Morning', value: 'Morning' },
        { label: 'Afternoon', value: 'Afternoon' },
        { label: 'Evening', value: 'Evening' },
        { label: 'Night', value: 'Night' },
        { label: 'Double', value: 'Double' },
        { label: '24 Hours', value: '24 Hours' }
    ];

    const getTimeOptions = () => {
        switch (selectedShift) {
            case 'Morning':
                return [
                    { label: '07:00AM - 11:00AM', value: '07:00AM - 11:00AM' },
                    { label: '07:00AM - 07:00AM', value: '07:00AM - 07:00AM' }
                ];
            case 'Afternoon':
                return [{ label: '11:00AM - 03:00PM', value: '11:00AM - 03:00PM' }];
            case 'Evening':
                return [{ label: '03:00PM - 07:00PM', value: '03:00PM - 07:00PM' }];
            case 'Night':
                return [
                    { label: '07:00PM - 11:00PM', value: '07:00PM - 11:00PM' },
                    { label: '07:00PM - 07:00AM', value: '07:00PM - 07:00AM' }
                ];
            case 'Double':
                return [
                    { label: '07:00AM - 03:00PM', value: '07:00AM - 03:00PM' },
                    { label: '11:00AM - 07:00PM', value: '11:00AM - 07:00PM' }
                ];
            case '24 Hours':
                return [{ label: '24 Hours', value: '24 Hours' }];
            default:
                return [];
        }
    };

    useEffect(() => {
        const handleShiftChange = () => {
            if (selectedTime === "07:00AM - 11:00AM") {
                setSeatShift("morning");
            } else if (selectedTime === "11:00AM - 03:00PM") {
                setSeatShift("afternoon");
            } else if (selectedTime === "03:00PM - 07:00PM") {
                setSeatShift("evening");
            } else if (selectedTime === "07:00PM - 11:00PM") {
                setSeatShift("night");
            } else if (selectedTime === "07:00PM - 07:00AM") {
                setSeatShift("nightLong");
            } else if (selectedTime === "07:00AM - 03:00PM") {
                setSeatShift("doubleMorning");
            } else if (selectedTime === "11:00AM - 07:00PM") {
                setSeatShift("doubleEvening");
            } else if (selectedTime === "07:00AM - 07:00AM") {
                setSeatShift("morningLong");
            } else {
                setSeatShift("fullDay");
            }
        };
        handleShiftChange();
    }, [selectedTime]);

    const getFilteredSeats = () => {
        if (filterStatus === 'all') return allSeat;

        return allSeat.filter(seat => {
            const isAvailable = seat.availability[seatShift];
            return filterStatus === 'available' ? isAvailable : !isAvailable;
        });
    };

    const getSeatStatus = (seat) => {
        return seat.availability[seatShift];
    };

    const handleSeatPress = (seat) => {
        const status = getSeatStatus(seat) ? 'Available' : 'Occupied';
        Alert.alert(
            `Seat ${seat.seatNumber}`,
            `Status: ${status}\nShift: ${seatShift}`,
            [{ text: 'OK', style: 'default' }]
        );
    };

    const getAvailableCount = () => {
        return allSeat.filter(seat => seat.availability[seatShift]).length;
    };

    const getOccupiedCount = () => {
        return allSeat.filter(seat => !seat.availability[seatShift]).length;
    };

    const timeOptions = getTimeOptions();

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    {/* <Loading
                        visible={loading}
                        logoSource={require('../assets/bihari.png')}
                        loadingText="Please wait..."
                        logoSize={100}
                        textColor="#333"
                        overlayColor="rgba(0, 0, 0, 0.6)"
                    /> */}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
            <ScrollView style={styles.scrollView}>
                <TopHeader heading="Seat Management" />

                {/* Shift Selection */}
                <View style={styles.filterSection}>
                    <Text style={styles.label}>Select Shift</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shiftList}>
                        {shifts.map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={[
                                    styles.shiftButton,
                                    selectedShift === item.value && styles.selectedShiftButton
                                ]}
                                onPress={() => {
                                    setSelectedShift(item.value);
                                    setSelectedTime('');
                                }}
                            >
                                <Text style={[
                                    styles.shiftButtonText,
                                    selectedShift === item.value && styles.selectedShiftButtonText
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Time Selection */}
                {selectedShift && (
                    <View style={styles.filterSection}>
                        <Text style={styles.label}>Select Time</Text>
                        <View style={styles.timeList}>
                            {timeOptions.map((item) => (
                                <TouchableOpacity
                                    key={item.value}
                                    style={[
                                        styles.timeButton,
                                        selectedTime === item.value && styles.selectedTimeButton
                                    ]}
                                    onPress={() => setSelectedTime(item.value)}
                                >
                                    <Text style={[
                                        styles.timeButtonText,
                                        selectedTime === item.value && styles.selectedTimeButtonText
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Status Summary */}
                {selectedTime && (
                    <View style={styles.statusSection}>
                        <View style={styles.statusCard}>
                            <Text style={styles.statusTitle}>Seat Status</Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusItem, { backgroundColor: '#d1fae5' }]}>
                                    <Text style={styles.statusNumber}>{getAvailableCount()}</Text>
                                    <Text style={styles.statusLabel}>Available</Text>
                                </View>
                                <View style={[styles.statusItem, { backgroundColor: '#fee2e2' }]}>
                                    <Text style={styles.statusNumber}>{getOccupiedCount()}</Text>
                                    <Text style={styles.statusLabel}>Occupied</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Filter Buttons */}
                {selectedTime && (
                    <View style={styles.filterButtons}>
                        <TouchableOpacity
                            style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
                            onPress={() => setFilterStatus('all')}
                        >
                            <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.activeFilterText]}>
                                All Seats
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, filterStatus === 'available' && styles.activeFilter]}
                            onPress={() => setFilterStatus('available')}
                        >
                            <Text style={[styles.filterButtonText, filterStatus === 'available' && styles.activeFilterText]}>
                                Available
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, filterStatus === 'unavailable' && styles.activeFilter]}
                            onPress={() => setFilterStatus('unavailable')}
                        >
                            <Text style={[styles.filterButtonText, filterStatus === 'unavailable' && styles.activeFilterText]}>
                                Occupied
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Seat Grid */}
                {selectedTime && (
                    <View style={styles.seatGrid}>
                        <Text style={styles.sectionTitle}>Seat Layout</Text>
                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: '#22c55e' }]} />
                                <Text style={styles.legendText}>Available</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: '#ef4444' }]} />
                                <Text style={styles.legendText}>Occupied</Text>
                            </View>
                        </View>
                        <View style={styles.seatsContainer}>
                            {getFilteredSeats().map((seat) => {
                                const isAvailable = getSeatStatus(seat);
                                return (
                                    <TouchableOpacity
                                        key={seat._id}
                                        style={[
                                            styles.seatButton,
                                            {
                                                backgroundColor: isAvailable ? '#22c55e' : '#ef4444',
                                            },
                                        ]}
                                        onPress={() => handleSeatPress(seat)}
                                    >
                                        <Icon name="event-seat" size={24} color="white" />
                                        <Text style={styles.seatNumber}>{seat.seatNumber}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {!selectedTime && (
                    <View style={styles.placeholderContainer}>
                        <Text style={styles.placeholderText}>
                            Please select a shift and time to view seat availability
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#8B5CF6',
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: 'white',
        opacity: 0.9,
    },
    filterSection: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        marginTop: 15,
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8B5CF6',
        marginBottom: 10,
    },
    shiftList: {
        paddingRight: 10,
    },
    shiftButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#8B5CF6',
        marginRight: 10,
    },
    selectedShiftButton: {
        backgroundColor: '#8B5CF6',
    },
    shiftButtonText: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
    selectedShiftButtonText: {
        color: 'white',
    },
    timeList: {
        flexDirection: 'row',
        // flexWrap: 'wrap',
    },
    timeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#8B5CF6',
        marginRight: 10,
        marginBottom: 10,
    },
    selectedTimeButton: {
        backgroundColor: '#8B5CF6',
    },
    timeButtonText: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
    selectedTimeButtonText: {
        color: 'white',
    },
    statusSection: {
        marginHorizontal: 15,
        marginTop: 15,
    },
    statusCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statusItem: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        minWidth: 100,
    },
    statusNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    filterButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginHorizontal: 15,
        marginTop: 15,
    },
    filterButton: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#8B5CF6',
        alignItems: 'center',
    },
    activeFilter: {
        backgroundColor: '#8B5CF6',
    },
    filterButtonText: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
    activeFilterText: {
        color: 'white',
    },
    seatGrid: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        marginTop: 15,
        marginBottom: 20,
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    legendBox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#666',
    },
    seatsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    seatButton: {
        width: '18%',
        aspectRatio: 1,
        marginBottom: 10,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
        flexDirection: 'column',
    },
    seatNumber: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10,
        marginTop: 4,
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    placeholderText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
});

export default Seat;