import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Alert,
    FlatList,
    TextInput,
    Modal,
    RefreshControl,   
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import client from '../service/axiosClient';
import TopHeader from '../components/TopBar';

const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';
const PURPLE_LIGHT = '#EDE9FE';
const GREEN = '#10B981';
const GREEN_LIGHT = '#D1FAE5';
const RED = '#EF4444';
const RED_LIGHT = '#FEE2E2';
const PINK_LIGHT = '#FCE7F3';
const PINK = '#EC4899';
const BLUE_LIGHT = '#DBEAFE';
const BLUE = '#3B82F6';

// ─── Shift icon mapping ────────────────────────────────────────────────────
const SHIFT_ICONS = {
    morning: 'weather-sunny',
    afternoon: 'white-balance-sunny',
    evening: 'weather-sunset',
    night: 'moon-waning-crescent',
    fullday: 'hours-24',
};
function getShiftIcon(code) {
    return SHIFT_ICONS[String(code || '').toLowerCase()] || 'clock-outline';
}

// ─── Seat icon by status & reservedFor ────────────────────────────────────
function getSeatIcon(available, reservedFor) {
    if (!available) return 'seat-passenger';   // occupied
    if (reservedFor === 'girl') return 'seat-legroom-extra';
    if (reservedFor === 'boy') return 'seat-legroom-normal';
    return 'seat';
}

// ─── Main Component ────────────────────────────────────────────────────────
const SeatAllotment = ({ navigation }) => {
    // ─── State ─────────────────────────────────────────────────────────────
    const [seats, setSeats] = useState([]);
    const [filteredSeats, setFilteredSeats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // For allotment modal
    const [allotModalVisible, setAllotModalVisible] = useState(false);
    const [selectedSeatForAllot, setSelectedSeatForAllot] = useState(null);
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [allotting, setAllotting] = useState(false);

    // For vacate modal
    const [vacateModalVisible, setVacateModalVisible] = useState(false);
    const [selectedSeatForVacate, setSelectedSeatForVacate] = useState(null);
    const [vacating, setVacating] = useState(false);

    // ─── Fetch Data ────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch all seats
            const seatsRes = await client.get('/api/v2/seat/seats');
            const allSeats = seatsRes.data?.allSeats || [];

            // 2. Fetch all active seat bookings (status = 'allotted')
            //    We'll assume this endpoint exists: /api/v2/seat/bookings?status=allotted&populate=student
            //    If not, you can fetch all students with seat.activeAllotment instead.
            const bookingsRes = await client.get('/api/v2/seat/bookings?status=allotted&populate=student');
            const bookings = bookingsRes.data || [];

            // 3. Build a map: seatId -> booking (with student info)
            const bookingMap = {};
            bookings.forEach((booking) => {
                if (booking.seat && booking.student) {
                    bookingMap[booking.seat._id || booking.seat] = booking;
                }
            });

            // 4. Merge seats with bookings
            const merged = allSeats.map((seat) => {
                const booking = bookingMap[seat._id];
                return {
                    ...seat,
                    currentBooking: booking
                        ? {
                            studentName: booking.student.name,
                            sid: booking.student.sid,
                            shift: booking.shift,
                            bookingId: booking._id,
                        }
                        : null,
                };
            });

            setSeats(merged);
            setFilteredSeats(merged);
        } catch (error) {
            console.error('Fetch data error:', error);
            Alert.alert('Error', 'Failed to load seat data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // ─── Fetch students for allotment ─────────────────────────────────────
    const fetchStudents = useCallback(async (query = '') => {
        try {
            const res = await client.get('/api/v2/student/getallstudent', {
                params: { name: query, status: 'active' }, // optional filters
            });
            const list = res.data || [];
            setStudents(list);
            setFilteredStudents(list);
        } catch (error) {
            Alert.alert('Error', 'Failed to load students.');
        }
    }, []);

    // ─── Effects ───────────────────────────────────────────────────────────
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Search filter
    useEffect(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) {
            setFilteredSeats(seats);
            return;
        }
        const filtered = seats.filter((seat) => {
            const number = seat.seatNumber?.toLowerCase() || '';
            const studentName = seat.currentBooking?.studentName?.toLowerCase() || '';
            const sid = seat.currentBooking?.sid?.toString() || '';
            return number.includes(q) || studentName.includes(q) || sid.includes(q);
        });
        setFilteredSeats(filtered);
    }, [searchQuery, seats]);

    // Student search in modal
    useEffect(() => {
        const q = studentSearch.toLowerCase().trim();
        if (!q) {
            setFilteredStudents(students);
            return;
        }
        const filtered = students.filter((s) =>
            (s.name?.toLowerCase() || '').includes(q) ||
            (s.sid?.toString() || '').includes(q)
        );
        setFilteredStudents(filtered);
    }, [studentSearch, students]);

    // ─── Allotment Logic ──────────────────────────────────────────────────
    const openAllotModal = (seat) => {
        setSelectedSeatForAllot(seat);
        setSelectedStudent(null);
        setStudentSearch('');
        fetchStudents();
        setAllotModalVisible(true);
    };

    const handleAllot = async () => {
        if (!selectedSeatForAllot || !selectedStudent) {
            Alert.alert('Error', 'Please select a student.');
            return;
        }
        setAllotting(true);
        try {
            // Call the endpoint to assign the student to this seat
            // This will automatically vacate any previous seat for the student
            await client.put(`/api/v2/student/seat/${selectedStudent.sid}`, {
                seatNumber: selectedSeatForAllot.seatNumber,
            });
            Alert.alert('Success', 'Seat allotted successfully.');
            setAllotModalVisible(false);
            fetchData(); // refresh
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Allotment failed.');
        } finally {
            setAllotting(false);
        }
    };

    // ─── Vacate Logic ─────────────────────────────────────────────────────
    const openVacateModal = (seat) => {
        setSelectedSeatForVacate(seat);
        setVacateModalVisible(true);
    };

    const handleVacate = async () => {
        if (!selectedSeatForVacate) return;
        setVacating(true);
        try {
            // Option 1: Vacate by bookingId (if we have it)
            // const bookingId = selectedSeatForVacate.currentBooking?.bookingId;
            // await client.patch(`/api/v2/seat/booking/${bookingId}/vacate`, { reason: 'Admin action' });

            // Option 2: Set student's seat to 'Other' (this also vacates)
            const sid = selectedSeatForVacate.currentBooking?.sid;
            if (!sid) {
                Alert.alert('Error', 'No student assigned to this seat.');
                setVacating(false);
                return;
            }
            await client.put(`/api/v2/student/seat/${sid}`, {
                seatNumber: 'Other',
            });
            Alert.alert('Success', 'Seat vacated successfully.');
            setVacateModalVisible(false);
            fetchData(); // refresh
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Vacation failed.');
        } finally {
            setVacating(false);
        }
    };

    // ─── Render Helpers ──────────────────────────────────────────────────
    const renderSeatItem = ({ item: seat }) => {
        const isAllotted = !!seat.currentBooking;
        const reservedFor = seat.reservedFor || 'any';
        const iconName = getSeatIcon(!isAllotted, reservedFor);
        const iconColor = isAllotted ? RED : (reservedFor === 'girl' ? PINK : (reservedFor === 'boy' ? BLUE : PURPLE));

        return (
            <View style={styles.seatCard}>
                <View style={styles.seatHeader}>
                    <View style={styles.seatNumberContainer}>
                        <Icon name={iconName} size={24} color={iconColor} />
                        <Text style={styles.seatNumber}>Seat {seat.seatNumber}</Text>
                    </View>
                    <View style={styles.reservedBadge}>
                        <Text style={styles.reservedText}>
                            {reservedFor === 'any' ? 'Unreserved' : reservedFor.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {isAllotted ? (
                    <View style={styles.allotmentInfo}>
                        <Text style={styles.studentName}>
                            {seat.currentBooking.studentName}
                        </Text>
                        <Text style={styles.studentSid}>SID: {seat.currentBooking.sid}</Text>
                        <Text style={styles.shiftInfo}>
                            <Icon name={getShiftIcon(seat.currentBooking.shift?.code)} size={14} />
                            {' '}{seat.currentBooking.shift?.displayTime || ''}
                        </Text>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.vacateBtn]}
                                onPress={() => openVacateModal(seat)}
                            >
                                <Text style={styles.vacateBtnText}>Vacate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.allotBtn]}
                                onPress={() => openAllotModal(seat)}
                            >
                                <Text style={styles.allotBtnText}>Re‑allot</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.allotButton}
                        onPress={() => openAllotModal(seat)}
                    >
                        <Icon name="plus-circle" size={22} color={PURPLE} />
                        <Text style={styles.allotButtonText}>Allot Student</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // ─── Main Render ──────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
            <TopHeader heading="Seat Management" />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Icon name="magnify" size={22} color="#9CA3AF" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by seat, student name or SID..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={PURPLE} />
                </View>
            ) : (
                <FlatList
                    data={filteredSeats}
                    keyExtractor={(item) => item._id}
                    renderItem={renderSeatItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchData();
                            }}
                            colors={[PURPLE]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No seats found</Text>
                        </View>
                    }
                />
            )}

            {/* ─── Allotment Modal ─── */}
            <Modal
                visible={allotModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAllotModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Allot Student</Text>
                            <TouchableOpacity onPress={() => setAllotModalVisible(false)}>
                                <Icon name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Search Student</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Name or SID..."
                            value={studentSearch}
                            onChangeText={setStudentSearch}
                        />

                        <FlatList
                            data={filteredStudents}
                            keyExtractor={(item) => item._id}
                            style={styles.studentList}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.studentItem,
                                        selectedStudent?._id === item._id && styles.studentItemSelected,
                                    ]}
                                    onPress={() => setSelectedStudent(item)}
                                >
                                    <Text style={styles.studentItemName}>{item.name}</Text>
                                    <Text style={styles.studentItemSid}>SID: {item.sid}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No students found</Text>
                            }
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalCancelBtn]}
                                onPress={() => setAllotModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalConfirmBtn, (!selectedStudent || allotting) && styles.modalBtnDisabled]}
                                onPress={handleAllot}
                                disabled={!selectedStudent || allotting}
                            >
                                {allotting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Allot</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── Vacate Modal ─── */}
            <Modal
                visible={vacateModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setVacateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Vacate Seat</Text>
                            <TouchableOpacity onPress={() => setVacateModalVisible(false)}>
                                <Icon name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.vacateInfo}>
                            <Text style={styles.vacateText}>
                                Are you sure you want to vacate seat{' '}
                                <Text style={{ fontWeight: '700' }}>
                                    {selectedSeatForVacate?.seatNumber}
                                </Text>
                                ?
                            </Text>
                            {selectedSeatForVacate?.currentBooking && (
                                <Text style={styles.vacateStudent}>
                                    Student: {selectedSeatForVacate.currentBooking.studentName}
                                    {' (SID: '}{selectedSeatForVacate.currentBooking.sid}{')'}
                                </Text>
                            )}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalCancelBtn]}
                                onPress={() => setVacateModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalDangerBtn, vacating && styles.modalBtnDisabled]}
                                onPress={handleVacate}
                                disabled={vacating}
                            >
                                {vacating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Vacate</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 15,
        color: '#111827',
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingTop: 8 },

    // Seat Card
    seatCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: PURPLE,
    },
    seatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    seatNumberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    seatNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    reservedBadge: {
        backgroundColor: PURPLE_LIGHT,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    reservedText: {
        fontSize: 11,
        fontWeight: '600',
        color: PURPLE,
        letterSpacing: 0.5,
    },
    allotmentInfo: {
        marginTop: 4,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    studentSid: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    shiftInfo: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    actionBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
    },
    vacateBtn: {
        borderColor: RED_LIGHT,
        backgroundColor: RED_LIGHT,
    },
    vacateBtnText: {
        color: RED,
        fontWeight: '600',
        fontSize: 13,
    },
    allotBtn: {
        borderColor: PURPLE_LIGHT,
        backgroundColor: PURPLE_LIGHT,
    },
    allotBtnText: {
        color: PURPLE,
        fontWeight: '600',
        fontSize: 13,
    },

    // Allot button (empty seat)
    allotButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderWidth: 1.5,
        borderColor: PURPLE_LIGHT,
        borderRadius: 10,
        borderStyle: 'dashed',
        marginTop: 6,
        gap: 6,
        backgroundColor: '#F9FAFB',
    },
    allotButtonText: {
        color: PURPLE,
        fontWeight: '600',
        fontSize: 14,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 22,
        width: '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111827',
        marginBottom: 12,
    },
    studentList: {
        maxHeight: 200,
        marginBottom: 16,
    },
    studentItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    studentItemSelected: {
        backgroundColor: PURPLE_LIGHT,
        borderRadius: 6,
        borderBottomColor: 'transparent',
    },
    studentItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    studentItemSid: {
        fontSize: 12,
        color: '#6B7280',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCancelBtn: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalCancelText: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 15,
    },
    modalConfirmBtn: {
        backgroundColor: PURPLE,
    },
    modalDangerBtn: {
        backgroundColor: RED,
    },
    modalConfirmText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    modalBtnDisabled: {
        opacity: 0.5,
    },
    vacateInfo: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: RED_LIGHT,
        borderRadius: 10,
    },
    vacateText: {
        fontSize: 15,
        color: '#7F1D1D',
        lineHeight: 22,
    },
    vacateStudent: {
        marginTop: 6,
        fontSize: 14,
        fontWeight: '600',
        color: '#991B1B',
    },
    empty: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 16,
    },
});

export default SeatAllotment;