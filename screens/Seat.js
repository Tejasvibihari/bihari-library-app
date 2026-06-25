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
    Image,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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

// ─── Seat icon by status & reservedFor (fallback if no image) ────────────
function getSeatIcon(available, reservedFor) {
    if (!available) return 'seat-passenger';
    if (reservedFor === 'girl') return 'seat-legroom-extra';
    if (reservedFor === 'boy') return 'seat-legroom-normal';
    return 'seat';
}

// ─── Main Component ────────────────────────────────────────────────────────
const Seat = () => {
    const [shifts, setShifts] = useState([]);
    const [activeShift, setActiveShift] = useState(null);
    const [allSeats, setAllSeats] = useState([]);
    const [filter, setFilter] = useState('all');
    const [shiftsLoading, setShiftsLoading] = useState(true);
    const [seatsLoading, setSeatsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // ── Student map (sid -> student data) ──────────────────────────────
    const [studentMap, setStudentMap] = useState({});

    // ── Modal states ─────────────────────────────────────────────────────
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedSeat, setSelectedSeat] = useState(null);

    const [allotModalVisible, setAllotModalVisible] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [allStudents, setAllStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedStudentForAllot, setSelectedStudentForAllot] = useState(null);
    const [allotting, setAllotting] = useState(false);
    const [vacating, setVacating] = useState(false);

    // ─── fetch shifts on mount ──────────────────────────────────────────
    useEffect(() => {
        const fetchShifts = async () => {
            try {
                setShiftsLoading(true);
                const res = await client.get('api/v2/seat/shifts');
                setShifts(res.data.shifts || []);
            } catch (err) {
                Alert.alert('Error', 'Could not load shifts.');
            } finally {
                setShiftsLoading(false);
            }
        };
        fetchShifts();
    }, []);

    // ─── fetch students (for allotment) ────────────────────────────────
    const fetchAllStudents = useCallback(async () => {
        try {
            const res = await client.get('api/v2/student/getallstudent');
            const students = res.data || [];
            const map = {};
            students.forEach(s => { map[s.sid] = s; });
            setAllStudents(students);
            setStudentMap(map);
            return students;
        } catch (error) {
            Alert.alert('Error', 'Failed to load students.');
            return [];
        }
    }, []);

    // ─── fetch seats when shift changes ────────────────────────────────
    const fetchSeats = useCallback(async (shift, studentMapData) => {
        if (!shift) return;
        try {
            setSeatsLoading(true);
            setAllSeats([]);
            const res = await client.get(`api/v2/seat/seats?shiftCode=${shift.code}`);
            const seats = res.data.allSeats || [];

            // Enrich occupied seats with student data
            const enriched = seats.map(seat => {
                if (!seat.available && seat.blockingBooking) {
                    const sid = seat.blockingBooking.sid;
                    const student = studentMapData ? studentMapData[sid] : studentMap[sid];
                    return {
                        ...seat,
                        student: student || null,
                    };
                }
                return seat;
            });
            setAllSeats(enriched);
        } catch (err) {
            Alert.alert('Error', 'Could not load seats.');
        } finally {
            setSeatsLoading(false);
            setRefreshing(false);
        }
    }, [studentMap]);

    // ─── handle shift selection ────────────────────────────────────────
    const handleSelectShift = useCallback(async (shift) => {
        setActiveShift(shift);
        setFilter('all');
        // Fetch students first, then seats
        const students = await fetchAllStudents();
        const studentMapData = {};
        students.forEach(s => { studentMapData[s.sid] = s; });
        setStudentMap(studentMapData);
        await fetchSeats(shift, studentMapData);
    }, [fetchAllStudents, fetchSeats]);

    // ─── refresh ────────────────────────────────────────────────────────
    const onRefresh = useCallback(() => {
        if (activeShift) {
            setRefreshing(true);
            handleSelectShift(activeShift);
        }
    }, [activeShift, handleSelectShift]);

    // ─── derived counts ────────────────────────────────────────────────
    const availableCount = allSeats.filter(s => s.available).length;
    const occupiedCount = allSeats.length - availableCount;

    const filteredSeats = allSeats.filter(s => {
        if (filter === 'available') return s.available;
        if (filter === 'occupied') return !s.available;
        return true;
    });

    // ─── Seat tile press ──────────────────────────────────────────────
    const handleSeatPress = (seat) => {
        setSelectedSeat(seat);
        setDetailModalVisible(true);
    };

    // ─── Vacate logic ──────────────────────────────────────────────────
    const handleVacate = async () => {
        if (!selectedSeat || !selectedSeat.blockingBooking) return;
        const bookingId = selectedSeat.blockingBooking._id;
        setVacating(true);
        try {
            await client.patch(`/api/v2/seat/booking/${bookingId}/vacate`, { reason: 'Admin action' });
            Alert.alert('Success', 'Seat vacated successfully.');
            setDetailModalVisible(false);
            handleSelectShift(activeShift); // refresh
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Vacation failed.');
        } finally {
            setVacating(false);
        }
    };

    // ─── Open allot modal ──────────────────────────────────────────────
    const openAllotModal = () => {
        setAllotModalVisible(true);
        setStudentSearch('');
        setSelectedStudentForAllot(null);
    };

    // ─── Student search filter ────────────────────────────────────────
    useEffect(() => {
        const q = studentSearch.toLowerCase().trim();
        if (!q) {
            setFilteredStudents(allStudents);
            return;
        }
        const filtered = allStudents.filter(s =>
            (s.name?.toLowerCase() || '').includes(q) ||
            (s.sid?.toString() || '').includes(q)
        );
        setFilteredStudents(filtered);
    }, [studentSearch, allStudents]);

    // ─── Allot logic ──────────────────────────────────────────────────
    const handleAllot = async () => {
        if (!selectedStudentForAllot || !selectedSeat) return;
        setAllotting(true);
        try {
            await client.put(`/api/v2/student/seat/${selectedStudentForAllot.sid}`, {
                seatNumber: selectedSeat.seatNumber,
            });
            Alert.alert('Success', 'Seat allotted successfully.');
            setAllotModalVisible(false);
            setDetailModalVisible(false);
            handleSelectShift(activeShift); // refresh
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Allotment failed.');
        } finally {
            setAllotting(false);
        }
    };

    // ─── Render seat tile ──────────────────────────────────────────────
    const renderSeat = ({ item: seat }) => {
        const isOccupied = !seat.available && seat.blockingBooking;
        const student = seat.student || null;
        const reservedFor = seat.reservedFor || 'any';
        const tileStyle = isOccupied ? styles.seatOcc : styles.seatAvail;
        const iconColor = isOccupied ? RED : GREEN;

        let reservedBadge = null;
        if (reservedFor === 'girl') {
            reservedBadge = (
                <View style={[styles.reservedBadge, { backgroundColor: PINK_LIGHT }]}>
                    <Text style={[styles.reservedBadgeText, { color: PINK }]}>♀</Text>
                </View>
            );
        } else if (reservedFor === 'boy') {
            reservedBadge = (
                <View style={[styles.reservedBadge, { backgroundColor: BLUE_LIGHT }]}>
                    <Text style={[styles.reservedBadgeText, { color: BLUE }]}>♂</Text>
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={[styles.seatTile, tileStyle]}
                onPress={() => handleSeatPress(seat)}
                activeOpacity={0.75}
            >
                {reservedBadge && <View style={styles.reservedBadgePos}>{reservedBadge}</View>}

                {isOccupied && student ? (
                    <Image
                        source={
                            student.image
                                ? { uri: `https://api.biharilibrary.in/uploads/${student.image}` }
                                : require('../assets/bihari.png')
                        }
                        style={styles.studentAvatar}
                        defaultSource={require('../assets/bihari.png')}
                        resizeMode="cover"
                    />
                ) : (
                    <Icon name={getSeatIcon(true, reservedFor)} size={26} color={iconColor} />
                )}

                <Text style={[styles.seatNumber, { color: isOccupied ? '#991B1B' : '#065F46' }]}>
                    {seat.seatNumber}
                </Text>

                {isOccupied && student && (
                    <Text style={styles.sidText}>SID: {student.sid}</Text>
                )}

                <View style={[
                    styles.statusPill,
                    { backgroundColor: isOccupied ? RED_LIGHT : GREEN_LIGHT }
                ]}>
                    <Text style={[
                        styles.statusPillText,
                        { color: isOccupied ? '#991B1B' : '#065F46' }
                    ]}>
                        {isOccupied ? 'Taken' : 'Free'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // ─── Loading screen ──────────────────────────────────────────────────
    if (shiftsLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={PURPLE} />
                <TopHeader heading="Seat Management" />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={PURPLE} />
                    <Text style={styles.loadingText}>Loading shifts…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={PURPLE} />
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} />
                }
            >
                <TopHeader heading="Seat Management" />

                {/* ── Shift selector ─────────────────────────────────── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Select shift</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.shiftRow}
                    >
                        {shifts.map((shift) => {
                            const isActive = activeShift?.code === shift.code;
                            return (
                                <TouchableOpacity
                                    key={shift._id || shift.code}
                                    style={[styles.shiftChip, isActive && styles.shiftChipActive]}
                                    onPress={() => handleSelectShift(shift)}
                                    activeOpacity={0.8}
                                >
                                    <Icon
                                        name={getShiftIcon(shift.code)}
                                        size={16}
                                        color={isActive ? '#fff' : PURPLE}
                                    />
                                    <Text style={[styles.shiftChipText, isActive && styles.shiftChipTextActive]}>
                                        {shift.label}
                                    </Text>
                                    <Text style={[styles.shiftChipTime, isActive && { color: '#DDD6FE' }]}>
                                        {shift.startTime}–{shift.endTime}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ── Active shift info bar ──────────────────────────── */}
                {activeShift && (
                    <View style={styles.shiftInfoBar}>
                        <Icon name="clock-outline" size={16} color={PURPLE_DARK} />
                        <Text style={styles.shiftInfoText}>
                            {activeShift.label}{'  '}·{'  '}
                            {activeShift.startTime} – {activeShift.endTime}
                            {activeShift.durationLabel ? `  ·  ${activeShift.durationLabel}` : ''}
                            {activeShift.price != null ? `  ·  ₹${activeShift.price}` : ''}
                        </Text>
                    </View>
                )}

                {/* ── Stats ─────────────────────────────────────────── */}
                {activeShift && (
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: '#F5F3FF' }]}>
                            <Text style={[styles.statNum, { color: PURPLE_DARK }]}>
                                {allSeats.length}
                            </Text>
                            <Text style={styles.statLbl}>Total</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: GREEN_LIGHT }]}>
                            <Text style={[styles.statNum, { color: '#065F46' }]}>
                                {availableCount}
                            </Text>
                            <Text style={styles.statLbl}>Available</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: RED_LIGHT }]}>
                            <Text style={[styles.statNum, { color: '#991B1B' }]}>
                                {occupiedCount}
                            </Text>
                            <Text style={styles.statLbl}>Occupied</Text>
                        </View>
                    </View>
                )}

                {/* ── Filter tabs ───────────────────────────────────── */}
                {activeShift && (
                    <View style={styles.filterRow}>
                        {[
                            { key: 'all', label: 'All seats', icon: 'grid' },
                            { key: 'available', label: 'Available', icon: 'check-circle-outline' },
                            { key: 'occupied', label: 'Occupied', icon: 'lock-outline' },
                        ].map(tab => (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
                                onPress={() => setFilter(tab.key)}
                                activeOpacity={0.8}
                            >
                                <Icon
                                    name={tab.icon}
                                    size={14}
                                    color={filter === tab.key ? '#fff' : PURPLE}
                                />
                                <Text style={[
                                    styles.filterTabText,
                                    filter === tab.key && styles.filterTabTextActive
                                ]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── Legend ───────────────────────────────────────── */}
                {activeShift && (
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
                            <Text style={styles.legendText}>Available</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: RED }]} />
                            <Text style={styles.legendText}>Occupied</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: PINK }]} />
                            <Text style={styles.legendText}>Ladies</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: BLUE }]} />
                            <Text style={styles.legendText}>Gents</Text>
                        </View>
                    </View>
                )}

                {/* ── Seat grid ─────────────────────────────────────── */}
                {activeShift && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>
                            Seat layout
                            {filteredSeats.length > 0
                                ? `  —  ${filteredSeats.length} seat${filteredSeats.length !== 1 ? 's' : ''}`
                                : ''}
                        </Text>

                        {seatsLoading ? (
                            <View style={styles.centered}>
                                <ActivityIndicator size="large" color={PURPLE} />
                                <Text style={styles.loadingText}>Loading seats…</Text>
                            </View>
                        ) : filteredSeats.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="seat-outline" size={40} color="#C4B5FD" />
                                <Text style={styles.emptyText}>No seats match this filter</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredSeats}
                                keyExtractor={(item) => String(item._id || item.seatNumber)}
                                renderItem={renderSeat}
                                numColumns={4}
                                scrollEnabled={false}
                                columnWrapperStyle={styles.gridRow}
                                contentContainerStyle={{ paddingBottom: 8 }}
                            />
                        )}
                    </View>
                )}

                {/* ── Placeholder when no shift selected ────────────── */}
                {!activeShift && (
                    <View style={styles.placeholder}>
                        <Icon name="seat-outline" size={48} color="#C4B5FD" />
                        <Text style={styles.placeholderTitle}>Pick a shift to begin</Text>
                        <Text style={styles.placeholderSub}>
                            Select a shift above to view seat availability in real time
                        </Text>
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ─── Seat Detail Modal ─── */}
            <Modal
                visible={detailModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Seat {selectedSeat?.seatNumber || ''}
                            </Text>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                <Icon name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {selectedSeat && (
                            <>
                                {!selectedSeat.available && selectedSeat.student ? (
                                    <View style={styles.studentDetail}>
                                        <Image
                                            source={
                                                selectedSeat.student.image
                                                    ? { uri: `https://api.biharilibrary.in/uploads/${selectedSeat.student.image}` }
                                                    : require('../assets/bihari.png')
                                            }
                                            style={styles.detailAvatar}
                                            defaultSource={require('../assets/bihari.png')}
                                            resizeMode="cover"
                                        />
                                        <Text style={styles.detailName}>{selectedSeat.student.name}</Text>
                                        <Text style={styles.detailSid}>SID: {selectedSeat.student.sid}</Text>
                                        <Text style={styles.detailShift}>
                                            Shift: {selectedSeat.blockingBooking?.shift?.label || '—'}
                                            {' ('}{selectedSeat.blockingBooking?.shift?.displayTime || '—'}{')'}
                                        </Text>
                                        {selectedSeat.blockingBooking?.validTo && (
                                            <Text style={styles.detailValidTill}>
                                                Valid till: {new Date(selectedSeat.blockingBooking.validTo).toLocaleDateString('en-IN')}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.emptyDetail}>
                                        <Icon name="seat-outline" size={48} color="#C4B5FD" />
                                        <Text style={styles.emptyDetailText}>This seat is available</Text>
                                    </View>
                                )}

                                <View style={styles.modalActions}>
                                    {!selectedSeat.available && selectedSeat.student && (
                                        <TouchableOpacity
                                            style={[styles.modalBtn, styles.modalDangerBtn, vacating && styles.modalBtnDisabled]}
                                            onPress={handleVacate}
                                            disabled={vacating}
                                        >
                                            {vacating ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.modalConfirmText}>Vacate Seat</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.modalBtn, styles.modalAllotBtn]}
                                        onPress={openAllotModal}
                                    >
                                        <Text style={styles.modalAllotText}>
                                            {!selectedSeat.available && selectedSeat.student ? 'Re‑allot' : 'Allot Student'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ─── Allot Student Modal ─── */}
            <Modal
                visible={allotModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAllotModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Student</Text>
                            <TouchableOpacity onPress={() => setAllotModalVisible(false)}>
                                <Icon name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Search by name or SID..."
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
                                        selectedStudentForAllot?._id === item._id && styles.studentItemSelected,
                                    ]}
                                    onPress={() => setSelectedStudentForAllot(item)}
                                >
                                    <View style={styles.studentItemRow}>
                                        <Image
                                            source={
                                                item.image
                                                    ? { uri: `https://api.biharilibrary.in/uploads/${item.image}` }
                                                    : require('../assets/bihari.png')
                                            }
                                            style={styles.studentItemAvatar}
                                            defaultSource={require('../assets/bihari.png')}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.studentItemInfo}>
                                            <Text style={styles.studentItemName}>{item.name}</Text>
                                            <Text style={styles.studentItemSid}>SID: {item.sid}</Text>
                                        </View>
                                        {selectedStudentForAllot?._id === item._id && (
                                            <Icon name="check-circle" size={20} color={PURPLE} />
                                        )}
                                    </View>
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
                                style={[
                                    styles.modalBtn,
                                    styles.modalConfirmBtn,
                                    (!selectedStudentForAllot || allotting) && styles.modalBtnDisabled
                                ]}
                                onPress={handleAllot}
                                disabled={!selectedStudentForAllot || allotting}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F3FF' },
    scroll: { flex: 1 },
    centered: { paddingVertical: 40, alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#7C3AED', marginTop: 8 },

    section: {
        backgroundColor: '#fff',
        marginHorizontal: 14,
        marginTop: 14,
        borderRadius: 14,
        padding: 14,
        shadowColor: '#6D28D9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 3,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: PURPLE,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },

    shiftRow: { paddingRight: 8, gap: 8, flexDirection: 'row' },
    shiftChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: PURPLE,
        backgroundColor: PURPLE_LIGHT,
    },
    shiftChipActive: { backgroundColor: PURPLE, borderColor: PURPLE_DARK },
    shiftChipText: { fontSize: 13, fontWeight: '600', color: PURPLE },
    shiftChipTextActive: { color: '#fff' },
    shiftChipTime: { fontSize: 11, color: '#7C3AED' },

    shiftInfoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 14,
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: PURPLE_LIGHT,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: '#C4B5FD',
    },
    shiftInfoText: {
        fontSize: 13,
        color: PURPLE_DARK,
        fontWeight: '500',
        flexShrink: 1,
    },

    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 14,
        marginTop: 12,
        gap: 10,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    statNum: { fontSize: 24, fontWeight: '700' },
    statLbl: { fontSize: 12, color: '#6B7280', marginTop: 3 },

    filterRow: {
        flexDirection: 'row',
        marginHorizontal: 14,
        marginTop: 12,
        gap: 8,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: PURPLE,
        backgroundColor: PURPLE_LIGHT,
    },
    filterTabActive: { backgroundColor: PURPLE_DARK, borderColor: PURPLE_DARK },
    filterTabText: { fontSize: 12, fontWeight: '600', color: PURPLE },
    filterTabTextActive: { color: '#fff' },

    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: 14,
        marginTop: 10,
        gap: 12,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 3 },
    legendText: { fontSize: 12, color: '#6B7280' },

    gridRow: { justifyContent: 'flex-start', gap: 8, marginBottom: 8 },
    seatTile: {
        width: '23%',
        aspectRatio: 0.85,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderWidth: 1,
        position: 'relative',
        paddingTop: 6,
    },
    seatAvail: { backgroundColor: GREEN_LIGHT, borderColor: '#6EE7B7' },
    seatOcc: { backgroundColor: RED_LIGHT, borderColor: '#FCA5A5' },
    seatNumber: { fontSize: 11, fontWeight: '700' },
    sidText: { fontSize: 8, color: '#6B7280', fontWeight: '500' },
    statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    statusPillText: { fontSize: 9, fontWeight: '600' },

    reservedBadgePos: { position: 'absolute', top: 4, right: 4 },
    reservedBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    reservedBadgeText: { fontSize: 10, fontWeight: '700' },

    studentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fff',
    },

    emptyState: { paddingVertical: 32, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 14, color: '#9CA3AF' },

    placeholder: {
        marginHorizontal: 14,
        marginTop: 30,
        paddingVertical: 40,
        paddingHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#C4B5FD',
    },
    placeholderTitle: { fontSize: 17, fontWeight: '600', color: PURPLE_DARK },
    placeholderSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

    // ── Modal styles ────────────────────────────────────────────────────
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
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

    studentDetail: { alignItems: 'center', paddingVertical: 12 },
    detailAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: PURPLE, marginBottom: 10 },
    detailName: { fontSize: 18, fontWeight: '700', color: '#111827' },
    detailSid: { fontSize: 14, color: '#6B7280', marginTop: 2 },
    detailShift: { fontSize: 14, color: '#374151', marginTop: 4 },
    detailValidTill: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

    emptyDetail: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyDetailText: { fontSize: 15, color: '#9CA3AF' },

    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCancelBtn: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
    modalConfirmBtn: { backgroundColor: PURPLE },
    modalDangerBtn: { backgroundColor: RED },
    modalAllotBtn: { backgroundColor: BLUE },
    modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modalAllotText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modalBtnDisabled: { opacity: 0.5 },

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
    studentList: { maxHeight: 200, marginBottom: 16 },
    studentItem: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    studentItemSelected: {
        backgroundColor: PURPLE_LIGHT,
        borderRadius: 6,
        borderBottomColor: 'transparent',
    },
    studentItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    studentItemAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    studentItemInfo: { flex: 1 },
    studentItemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    studentItemSid: { fontSize: 12, color: '#6B7280' },
});

export default Seat;