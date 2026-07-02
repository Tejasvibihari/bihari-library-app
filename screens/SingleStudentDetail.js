import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    Animated, Dimensions, StatusBar, SafeAreaView, Share, Alert,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback,
    Linking, Platform, FlatList, RefreshControl, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Loading from '../components/Loading';
import client from '../service/axiosClient';
import convertTo12Hour from '../helpers/timeFormat';

const { width, height } = Dimensions.get('window');

/* ────────────────────────────────────────────────────────────────
   Client‑side Billing Helpers (mirroring billingServiceV2.js)
   ──────────────────────────────────────────────────────────────── */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function diffDays(from, to) {
    return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

function addDays(dateInput, days) {
    const d = startOfDay(dateInput);
    d.setDate(d.getDate() + Number(days || 0));
    return d;
}

function deriveAccountFromDays({ remainingDays, dailyRate, asOfDate, dueFromDate = null }) {
    const today = startOfDay(asOfDate || new Date());
    const days = Math.round(Number(remainingDays || 0));
    const rate = Number(dailyRate || 0);

    const isPaid = days > 0;
    const validTill = isPaid
        ? addDays(today, days)
        : (dueFromDate ? startOfDay(dueFromDate) : today);

    const dueDays = !isPaid ? Math.abs(days) : 0;
    const dueAmount = rate > 0 ? parseFloat((dueDays * rate).toFixed(2)) : 0;
    const dueFrom = !isPaid ? (dueFromDate ? startOfDay(dueFromDate) : today) : null;

    const paymentStatus = isPaid ? 'paid' : 'due';
    const studentStatus = isPaid ? 'active' : 'pending';

    return {
        remainingDays: days,
        dueDays,
        dueAmount,
        validTill,
        dueFrom,
        paymentStatus,
        studentStatus
    };
}

function applyPayment({ currentRemainingDays, currentValidTill, amountPaid, dailyRate, asOfDate, dueFromDate = null }) {
    const today = startOfDay(asOfDate || new Date());
    const rate = Number(dailyRate || 0);
    const paid = Number(amountPaid || 0);

    const purchasedDays = rate > 0 ? Math.floor(paid / rate) : 0;
    const currentDays = Math.round(Number(currentRemainingDays || 0));

    let effectiveCurrentDays = currentDays;
    if (currentDays > 0 && currentValidTill) {
        const daysLeftByValidTill = diffDays(today, startOfDay(currentValidTill));
        effectiveCurrentDays = Math.min(currentDays, daysLeftByValidTill);
    }

    const newRemainingDays = effectiveCurrentDays + purchasedDays;
    const newDueFrom = newRemainingDays <= 0
        ? (dueFromDate || (currentValidTill ? startOfDay(currentValidTill) : today))
        : null;

    return {
        purchasedDays,
        effectiveCurrentDays,
        newRemainingDays,
        ...deriveAccountFromDays({
            remainingDays: newRemainingDays,
            dailyRate: rate,
            asOfDate: today,
            dueFromDate: newDueFrom
        })
    };
}

/* ─── colour helpers ─────────────────────────────────────────────── */

function studentStatusColor(s) {
    switch (s) {
        case 'active': return '#10B981';
        case 'pending': return '#F59E0B';
        case 'inactive': return '#EF4444';
        case 'left': return '#94A3B8';
        default: return '#8B5CF6';
    }
}

function paymentStatusColor(s) {
    switch (s) {
        case 'paid': return '#10B981';
        case 'due': return '#EF4444';
        default: return '#94A3B8';
    }
}

function invoiceStatusColor(s) {
    switch (s) {
        case 'paid': return '#10B981';
        case 'partial': return '#F59E0B';
        case 'due': return '#EF4444';
        case 'advance': return '#3B82F6';
        case 'cancelled': return '#9CA3AF';
        default: return '#6B7280';
    }
}

function fmt(n) {
    if (n === undefined || n === null) return '—';
    return `₹${Number(n).toLocaleString('en-IN')}`;
}

function fmtDate(d) {
    if (!d) return 'N/A';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return 'N/A'; }
}

function capitalize(s) {
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ─── main component ─────────────────────────────────────────────── */

const SingleStudentProfile = ({ route, navigation }) => {
    const passedStudent = route.params?.student;

    const [student, setStudent] = useState(passedStudent || null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    /* lightbox */
    const [lightboxVisible, setLightboxVisible] = useState(false);

    /* payment modal */
    const [payModalVisible, setPayModalVisible] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');
    const [payMethod, setPayMethod] = useState('cash');
    const [isPaying, setIsPaying] = useState(false);

    /* delete invoice modal */
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    /* ─── Preview state ────────────────────────────────────────── */
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewTimeoutRef = useRef(null);

    /* animations */
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const scaleAnim = useRef(new Animated.Value(0.88)).current;

    const startAnimations = useCallback(() => {
        fadeAnim.setValue(0); slideAnim.setValue(40); scaleAnim.setValue(0.88);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]).start();
    }, []);

    /* ── fetch student ── */
    const fetchStudent = useCallback(async () => {
        if (!passedStudent?._id) return;
        try {
            const res = await client.get(`/api/v2/student/getstudent?_id=${passedStudent._id}`);
            if (res.data) setStudent(res.data);
        } catch (e) {
            console.error('fetch student error', e);
        }
    }, [passedStudent?._id]);

    /* ── fetch invoices ── */
    const fetchInvoices = useCallback(async () => {
        if (!passedStudent?.sid) return;
        setLoading(true);
        try {
            const res = await client.get(`/api/v2/invoice/getinvoicebysid/${passedStudent.sid}`);
            setInvoices(res.data || []);
        } catch (e) {
            console.error('fetch invoices error', e);
        } finally {
            setLoading(false);
        }
    }, [passedStudent?.sid]);

    useFocusEffect(useCallback(() => {
        fetchStudent();
        fetchInvoices();
        startAnimations();
    }, [fetchStudent, fetchInvoices, startAnimations]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchStudent(), fetchInvoices()]);
        setRefreshing(false);
    }, [fetchStudent, fetchInvoices]);

    /* ── communication ── */
    const handleCall = useCallback(() => {
        if (!student?.mobile) return;
        Linking.openURL(`tel:${student.mobile}`).catch(() => Alert.alert('Error', 'Could not open dialer'));
    }, [student?.mobile]);

    const handleSms = useCallback(() => {
        if (!student?.mobile) return;
        const body = `Dear ${student.name},\n\nYour library fee is due. Please pay at your earliest convenience.\n\n— Bihari Library\n📞 9608888400`;
        const sep = Platform.OS === 'ios' ? '&' : '?';
        Linking.openURL(`sms:${student.mobile}${sep}body=${encodeURIComponent(body)}`);
    }, [student]);

    const handleWhatsApp = useCallback(() => {
        if (!student?.mobile) return;
        const msg = `Hello ${student.name} 👋\n\nThis is a reminder from *Bihari Library* (SID: ${student.sid}).\n\n📢 *Your monthly fee is due.*\n🧾 Due: ${fmt(student.account?.dueAmount)}\n📅 Valid till: ${fmtDate(student.account?.validTill)}\n\n📞 9608888400\n🌐 https://biharilibrary.in/\n\n— *Bihari Library*`;
        const url = `whatsapp://send?phone=91${student.mobile}&text=${encodeURIComponent(msg)}`;
        Linking.openURL(url).catch(() => Linking.openURL(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(msg)}`));
    }, [student]);

    const handleShare = useCallback(async () => {
        if (!student) return;
        await Share.share({
            message: `Student: ${student.name}\nSID: ${student.sid}\nShift: ${student.shift?.label} (${student.shift?.displayTime})\nMobile: ${student.mobile}\nEmail: ${student.email}`
        });
    }, [student]);

    /* ─── Client‑side preview calculation ────────────────────── */
    const calculatePreview = useCallback((amount) => {
        const parsed = parseFloat(amount);
        if (!parsed || parsed <= 0) {
            setPreviewData(null);
            return;
        }

        setPreviewLoading(true);
        // Small delay to show spinner
        setTimeout(() => {
            const dailyRate = student?.billing?.dailyRate || 0;
            const currentRemainingDays = student?.account?.remainingDays || 0;
            const currentValidTill = student?.account?.validTill
                ? new Date(student.account.validTill)
                : new Date();

            const result = applyPayment({
                currentRemainingDays,
                currentValidTill,
                amountPaid: parsed,
                dailyRate,
                asOfDate: new Date(),
                dueFromDate: student?.account?.dueFrom
                    ? new Date(student.account.dueFrom)
                    : null
            });

            setPreviewData({
                currentRemainingDays,
                newRemainingDays: result.newRemainingDays,
                purchasedDays: result.purchasedDays,
                currentDueAmount: student?.account?.dueAmount || 0,
                newDueAmount: result.dueAmount,
                dueDaysBefore: student?.account?.dueDays || 0,
                dueDaysAfter: result.dueDays,
                newValidTill: result.validTill,
                newPaymentStatus: result.paymentStatus,
            });
            setPreviewLoading(false);
        }, 300);
    }, [student]);

    // Debounced preview on amount change (only when modal is open)
    useEffect(() => {
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
        if (!payModalVisible) {
            setPreviewData(null);
            return;
        }
        const val = amountPaid;
        if (!val || parseFloat(val) <= 0) {
            setPreviewData(null);
            return;
        }
        previewTimeoutRef.current = setTimeout(() => {
            calculatePreview(val);
        }, 500);
        return () => clearTimeout(previewTimeoutRef.current);
    }, [amountPaid, payModalVisible, calculatePreview]);

    /* ── payment submit ── */
    const handlePaymentSubmit = useCallback(async () => {
        if (!amountPaid || isNaN(Number(amountPaid))) {
            Alert.alert('त्रुटि', 'कृपया सही राशि दर्ज करें।');
            return;
        }
        setIsPaying(true);
        try {
            const res = await client.post('/api/v2/payment/makepayment', {
                sid: student.sid,
                amountPaid: Number(amountPaid),
                method: payMethod,
            });
            if (res.data?.message === 'Payment recorded' || res.status === 200) {
                Alert.alert('सफलता', 'भुगतान सफलतापूर्वक प्रोसेस हो गया!', [{ text: 'ठीक है' }]);
                setPayModalVisible(false);
                setAmountPaid('');
                setPreviewData(null);
                await Promise.all([fetchStudent(), fetchInvoices()]);
            } else {
                throw new Error(res.data?.message || 'Unknown error');
            }
        } catch (e) {
            Alert.alert('त्रुटि', e?.response?.data?.message || 'भुगतान में समस्या आई।');
        } finally {
            setIsPaying(false);
        }
    }, [student, amountPaid, payMethod, fetchStudent, fetchInvoices]);

    /* ── delete invoice / payment ── */
    const openDeleteModal = useCallback((invoice) => {
        setInvoiceToDelete(invoice);
        setDeleteReason('');
        setDeleteModalVisible(true);
    }, []);
    console.log(invoices[0], "from line no 350 SingleStudentdetails")
    const closeDeleteModal = useCallback(() => {
        if (isDeleting) return;
        setDeleteModalVisible(false);
        setInvoiceToDelete(null);
        setDeleteReason('');
    }, [isDeleting]);

    const handleConfirmDelete = useCallback(async () => {
        if (!invoiceToDelete) return;

        if (!deleteReason.trim()) {
            Alert.alert('त्रुटि', 'कृपया हटाने का कारण दर्ज करें।');
            return;
        }

        // Invoice references its payment via `payment` (id or populated object)
        const paymentId = invoiceToDelete.payment || invoiceToDelete.payment;

        if (!paymentId) {
            Alert.alert('त्रुटि', 'इस इनवॉइस से जुड़ा भुगतान नहीं मिला।');
            return;
        }

        setIsDeleting(true);
        try {
            const res = await client.post(`/api/v2/payment/delete/${paymentId}`, {
                reason: deleteReason.trim(),
                // deletedBy: currentUser?._id, // wire this up to your auth/user context if available
            });

            if (res.data?.success) {
                const reasonUsed = deleteReason.trim();

                // Reflect the deleted state immediately so the red warning shows right away
                setInvoices(prev => prev.map(inv =>
                    inv._id === invoiceToDelete._id
                        ? {
                            ...inv,
                            isDeleted: true,
                            deletedAt: new Date().toISOString(),
                            deleteReason: reasonUsed
                        }
                        : inv
                ));

                setDeleteModalVisible(false);
                setInvoiceToDelete(null);
                setDeleteReason('');

                // Sync with server truth (student account gets restored on the backend too)
                await Promise.all([fetchStudent(), fetchInvoices()]);
            } else {
                throw new Error(res.data?.message || 'हटाने में समस्या आई।');
            }
        } catch (e) {
            Alert.alert(
                'त्रुटि',
                e?.response?.data?.message || e.message || 'हटाने में समस्या आई।'
            );
        } finally {
            setIsDeleting(false);
        }
    }, [invoiceToDelete, deleteReason, fetchStudent, fetchInvoices]);

    if (!student) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Loading visible logoSource={require('../assets/bihari.png')} loadingText="Loading..." textColor="#333" overlayColor="rgba(0,0,0,0.5)" />
                </View>
            </SafeAreaView>
        );
    }

    const profileImageUri = student.image ? `https://api.biharilibrary.in/uploads/${student.image}` : null;
    const sColor = studentStatusColor(student.statuses?.student);
    const pColor = paymentStatusColor(student.statuses?.payment);
    const dueAmount = student.account?.dueAmount ?? 0;
    const formattedShiftTime = convertTo12Hour(student?.shift?.displayTime);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            {/* ── Header ── */}
            <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Student Profile</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('EditStudentProfile', { student })}>
                            <Ionicons name="create-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
                            <Ionicons name="share-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />}
            >
                {/* ── Profile hero ── */}
                <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <TouchableOpacity onPress={() => profileImageUri && setLightboxVisible(true)} activeOpacity={0.85}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={profileImageUri ? { uri: profileImageUri } : require('../assets/bihari.png')}
                                style={styles.avatar}
                                defaultSource={require('../assets/bihari.png')}
                                resizeMode="cover"
                            />
                            {profileImageUri && (
                                <View style={styles.avatarZoomHint}>
                                    <Ionicons name="expand-outline" size={14} color="#fff" />
                                </View>
                            )}
                            <View style={[styles.onlineDot, { backgroundColor: student.isOnline ? '#10B981' : '#9CA3AF' }]} />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.heroName}>{student.name || '—'}</Text>
                    <Text style={styles.heroSid}>SID: {student.sid}</Text>

                    <View style={styles.heroBadgeRow}>
                        <View style={[styles.heroBadge, { backgroundColor: `${sColor}18`, borderColor: `${sColor}50` }]}>
                            <View style={[styles.heroBadgeDot, { backgroundColor: sColor }]} />
                            <Text style={[styles.heroBadgeText, { color: sColor }]}>{capitalize(student.statuses?.student)}</Text>
                        </View>
                        <View style={[styles.heroBadge, { backgroundColor: `${pColor}18`, borderColor: `${pColor}50` }]}>
                            <Text style={[styles.heroBadgeText, { color: pColor }]}>{capitalize(student.statuses?.payment)}</Text>
                        </View>
                        {student.isOnline && (
                            <View style={[styles.heroBadge, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                                <Text style={[styles.heroBadgeText, { color: '#059669' }]}>● Online</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* ── Quick actions ── */}
                <Animated.View style={[styles.quickActions, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <QuickBtn icon="call" label="Call" color="#10B981" onPress={handleCall} disabled={!student.mobile} />
                    <QuickBtn icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={handleWhatsApp} disabled={!student.mobile} />
                    <QuickBtn icon="chatbubble" label="SMS" color="#3B82F6" onPress={handleSms} disabled={!student.mobile} />
                    <QuickBtn icon="card" label="Pay Now" color="#8B5CF6" onPress={() => setPayModalVisible(true)} />
                </Animated.View>

                {/* ── Account summary strip ── */}
                <Animated.View style={[styles.accountStrip, { opacity: fadeAnim }]}>
                    <AccountChip label="Monthly" value={fmt(student.billing?.netCycleAmount)} color="#8B5CF6" />
                    <AccountChip label="Due" value={fmt(dueAmount)} color={dueAmount > 0 ? '#EF4444' : '#10B981'} />
                    <AccountChip
                        label="Remaining Days"
                        value={student.account?.remainingDays ?? 0}
                        color={student.account?.remainingDays > 0 ? '#3B82F6' : '#EF4444'}
                    />
                    <AccountChip
                        label="Due Days"
                        value={student.account?.dueDays ?? 0}
                        color={student.account?.dueDays > 0 ? '#EF4444' : '#10B981'}
                    />
                </Animated.View>

                {/* ── Due / valid dates ── */}
                {(student.account?.validTill || student.account?.dueFrom) && (
                    <View style={styles.datesRow}>
                        {student.account?.validTill && (
                            <DateChip icon="checkmark-circle" label="Valid till" date={fmtDate(student.account.validTill)} color="#10B981" />
                        )}
                        {student.account?.dueFrom && (
                            <DateChip icon="warning" label="Due from" date={fmtDate(student.account.dueFrom)} color="#EF4444" />
                        )}
                    </View>
                )}

                {/* ── Personal info ── */}
                <SectionHeader title="Personal Info" />
                <View style={styles.cards}>
                    <InfoCard icon="person" label="Father" value={student.father} />
                    <InfoCard icon="male-female" label="Gender" value={capitalize(student.gender)} iconColor="#EC4899" />
                    <InfoCard icon="call" label="Mobile" value={student.mobile} iconColor="#3B82F6" />
                    <InfoCard icon="mail" label="Email" value={student.email} iconColor="#F59E0B" />
                    <InfoCard icon="location" label="Address" value={(student.address || '').replace(/\+/g, ' ')} iconColor="#10B981" />
                    {student.guardian && <InfoCard icon="shield" label="Guardian" value={student.guardian} iconColor="#EC4899" />}
                    <InfoCard icon="calendar" label="Admission" value={fmtDate(student.admissionDate)} iconColor="#EF4444" />
                </View>

                {/* ── Shift & seat ── */}
                <SectionHeader title="Shift & Seat" />
                <View style={styles.cards}>
                    <InfoCard icon="time" label="Shift" value={student.shift?.label} iconColor="#8B5CF6" />
                    <InfoCard icon="time" label="Time" value={formattedShiftTime} iconColor="#8B5CF6" />
                    <InfoCard icon="bookmark" label="Seat" value={student.seat?.seatNumber} iconColor="#F59E0B" />
                    <InfoCard icon="layers" label="Seat status" value={capitalize(student.seat?.status?.replace(/_/g, ' '))} iconColor="#6B7280" />
                </View>

                {/* ── Billing detail ── */}
                <SectionHeader title="Billing" />
                <View style={styles.cards}>
                    <InfoCard icon="card" label="Gross cycle" value={fmt(student.billing?.netCycleAmount + (student.billing?.fixedDiscountAmount || 0))} iconColor="#8B5CF6" />
                    <InfoCard icon="pricetag" label="Fixed discount" value={fmt(student.billing?.fixedDiscountAmount)} iconColor="#10B981" />
                    {student.billing?.fixedDiscountReason && (
                        <InfoCard icon="information-circle" label="Discount reason" value={student.billing.fixedDiscountReason} iconColor="#6B7280" />
                    )}
                    <InfoCard icon="card" label="Net cycle" value={fmt(student.billing?.netCycleAmount)} iconColor="#8B5CF6" />
                    <InfoCard icon="speedometer" label="Daily rate" value={fmt(student.billing?.dailyRate)} iconColor="#94A3B8" />
                    <InfoCard icon="calendar" label="Cycle anchor" value={fmtDate(student.billing?.cycleAnchorDate)} iconColor="#6B7280" />
                    <InfoCard icon="refresh" label="Cycle days" value={`${student.billing?.cycleDays ?? 30} days`} iconColor="#6B7280" />
                </View>

                {/* ── Account detail ── */}
                <SectionHeader title="Account" />
                <View style={styles.cards}>
                    <InfoCard icon="calendar" label="Remaining Days" value={`${student.account?.remainingDays ?? 0} days`} iconColor="#3B82F6" />
                    <InfoCard icon="trending-down" label="Due Days" value={`${student.account?.dueDays ?? 0} days`} iconColor={student.account?.dueDays > 0 ? '#EF4444' : '#10B981'} />
                    <InfoCard icon="trending-down" label="Due Amount" value={fmt(student.account?.dueAmount)} iconColor={student.account?.dueAmount > 0 ? '#EF4444' : '#10B981'} />
                    <InfoCard icon="checkmark-circle" label="Valid till" value={fmtDate(student.account?.validTill)} iconColor="#10B981" />
                    <InfoCard icon="warning" label="Due from" value={fmtDate(student.account?.dueFrom)} iconColor="#EF4444" />
                    <InfoCard icon="calendar" label="Cycle start" value={fmtDate(student.account?.currentCycleStart)} iconColor="#8B5CF6" />
                    <InfoCard icon="calendar" label="Cycle end" value={fmtDate(student.account?.currentCycleEnd)} iconColor="#8B5CF6" />
                    <InfoCard icon="time" label="Last payment" value={fmtDate(student.account?.lastPaymentAt)} iconColor="#6B7280" />
                    <InfoCard icon="document-text" label="Last invoice #" value={student.account?.lastInvoiceNumber ?? '—'} iconColor="#6B7280" />
                </View>

                {/* ── Social ── */}
                {(student.instagram || student.facebook || student.youtube) && (
                    <>
                        <SectionHeader title="Social" />
                        <View style={styles.cards}>
                            {student.instagram && <InfoCard icon="logo-instagram" label="Instagram" value={student.instagram} iconColor="#E1306C" />}
                            {student.facebook && <InfoCard icon="logo-facebook" label="Facebook" value={student.facebook} iconColor="#1877F2" />}
                            {student.youtube && <InfoCard icon="logo-youtube" label="YouTube" value={student.youtube} iconColor="#FF0000" />}
                        </View>
                    </>
                )}

                {/* ── Invoices ── */}
                {invoices.length > 0 && (
                    <>
                        <SectionHeader title={`Invoices (${invoices.length})`} />
                        <FlatList
                            data={invoices}
                            keyExtractor={item => item._id?.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.invoiceList}
                            renderItem={({ item }) => (
                                <InvoiceCard invoice={item} onDelete={() => openDeleteModal(item)} />
                            )}
                        />
                    </>
                )}

                {loading && (
                    <View style={styles.centered}>
                        <Text style={styles.loadingText}>Loading…</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Image lightbox ── */}
            <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
                <View style={styles.lightboxOverlay}>
                    <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxVisible(false)}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: profileImageUri }}
                        style={styles.lightboxImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.lightboxName}>{student.name}</Text>
                </View>
            </Modal>

            {/* ─── Payment Modal with Live Preview ─── */}
            {/* ─── Payment Modal with Live Preview & Keyboard Avoidance ─── */}
            <Modal
                visible={payModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setPayModalVisible(false);
                    setAmountPaid('');
                    setPreviewData(null);
                }}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.payOverlay}>
                            <View style={styles.paySheet}>
                                <ScrollView
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <View style={styles.payHandle} />

                                    <Text style={styles.payTitle}>भुगतान करें</Text>
                                    <Text style={styles.payStudentName}>{student.name}</Text>

                                    {/* Summary strip */}
                                    <View style={styles.paySummary}>
                                        <PaySummaryItem label="बकाया" value={fmt(dueAmount)} color={dueAmount > 0 ? '#EF4444' : '#10B981'} />
                                        <PaySummaryItem label="मासिक" value={fmt(student.billing?.netCycleAmount)} color="#8B5CF6" />
                                        <PaySummaryItem label="शेष दिन" value={student.account?.remainingDays ?? 0} color="#3B82F6" />
                                    </View>

                                    <PayInput
                                        label="भुगतान राशि *"
                                        placeholder="₹0"
                                        value={amountPaid}
                                        onChangeText={setAmountPaid}
                                        keyboardType="numeric"
                                    />

                                    {/* Preview Section */}
                                    {previewLoading && (
                                        <View style={styles.previewLoading}>
                                            <ActivityIndicator size="small" color="#8B5CF6" />
                                            <Text style={styles.previewLoadingText}>प्रभाव की गणना हो रही है…</Text>
                                        </View>
                                    )}

                                    {previewData && !previewLoading && (
                                        <View style={styles.previewCard}>
                                            <Text style={styles.previewTitle}>📊 भुगतान के बाद का प्रभाव</Text>
                                            <View style={styles.previewEquation}>
                                                <Text style={styles.previewEquationText}>
                                                    {previewData.currentRemainingDays} दिन + {previewData.purchasedDays} दिन = {previewData.newRemainingDays} दिन
                                                </Text>
                                            </View>
                                            <PreviewRow
                                                label="शेष दिन"
                                                before={previewData.currentRemainingDays}
                                                after={previewData.newRemainingDays}
                                                isPositive={previewData.newRemainingDays > previewData.currentRemainingDays}
                                            />
                                            <PreviewRow
                                                label="बकाया राशि"
                                                before={previewData.currentDueAmount}
                                                after={previewData.newDueAmount}
                                                isPositive={previewData.newDueAmount < previewData.currentDueAmount}
                                                isMoney
                                            />
                                            <PreviewRow
                                                label="बकाया दिन"
                                                before={previewData.dueDaysBefore}
                                                after={previewData.dueDaysAfter}
                                                isPositive={previewData.dueDaysAfter < previewData.dueDaysBefore}
                                            />
                                            {previewData.newValidTill && (
                                                <View style={styles.previewRow}>
                                                    <Text style={styles.previewLabel}>नई वैधता तिथि</Text>
                                                    <Text style={[styles.previewValue, { color: '#10B981', fontWeight: '700' }]}>
                                                        {fmtDate(previewData.newValidTill)}
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.previewDivider} />
                                            <View style={styles.previewRow}>
                                                <Text style={styles.previewLabel}>स्थिति (नई)</Text>
                                                <Text style={[styles.previewValue, { color: previewData.newPaymentStatus === 'paid' ? '#10B981' : '#EF4444', fontWeight: '700' }]}>
                                                    {previewData.newPaymentStatus === 'paid' ? '✅ Paid' : '⏳ Due'}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    <Text style={styles.payLabel}>भुगतान विधि</Text>
                                    <View style={styles.methodRow}>
                                        {['cash', 'upi', 'card', 'bank'].map(m => (
                                            <TouchableOpacity
                                                key={m}
                                                style={[styles.methodBtn, payMethod === m && styles.methodBtnActive]}
                                                onPress={() => setPayMethod(m)}
                                            >
                                                <Text style={[styles.methodBtnText, payMethod === m && styles.methodBtnTextActive]}>
                                                    {m.toUpperCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <View style={styles.payActions}>
                                        <TouchableOpacity
                                            style={styles.payCancelBtn}
                                            onPress={() => {
                                                setPayModalVisible(false);
                                                setAmountPaid('');
                                                setPreviewData(null);
                                            }}
                                        >
                                            <Text style={styles.payCancelText}>रद्द करें</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.payConfirmBtn, (isPaying || !amountPaid || parseFloat(amountPaid) <= 0) && styles.payBtnDisabled]}
                                            onPress={handlePaymentSubmit}
                                            disabled={isPaying || !amountPaid || parseFloat(amountPaid) <= 0}
                                        >
                                            <Text style={styles.payConfirmText}>
                                                {isPaying ? 'प्रोसेस हो रहा है…' : 'पुष्टि करें'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* ─── Delete Invoice Modal ─── */}
            {/* ─── Delete Invoice Modal with Keyboard Avoidance ─── */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="slide"
                onRequestClose={closeDeleteModal}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.payOverlay}>
                            <View style={styles.paySheet}>
                                <ScrollView
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <View style={styles.payHandle} />

                                    <View style={styles.deleteIconWrap}>
                                        <Ionicons name="warning" size={26} color="#EF4444" />
                                    </View>

                                    <Text style={styles.deleteTitle}>इनवॉइस हटाएं?</Text>
                                    <Text style={styles.deleteSubtitle}>
                                        #{invoiceToDelete?.invoiceNumber ?? ''} — यह क्रिया वापस नहीं हो सकती और इससे जुड़ा भुगतान भी हटा दिया जाएगा। छात्र का खाता स्वतः पुनर्स्थापित हो जाएगा।
                                    </Text>

                                    <View style={styles.payInputWrapper}>
                                        <Text style={styles.payLabel}>हटाने का कारण *</Text>
                                        <TextInput
                                            style={[styles.payInput, styles.deleteReasonInput]}
                                            placeholder="जैसे: गलती से बना इनवॉइस, डुप्लीकेट भुगतान..."
                                            placeholderTextColor="#9CA3AF"
                                            value={deleteReason}
                                            onChangeText={setDeleteReason}
                                            multiline
                                            editable={!isDeleting}
                                        />
                                    </View>

                                    <View style={styles.payActions}>
                                        <TouchableOpacity style={styles.payCancelBtn} onPress={closeDeleteModal} disabled={isDeleting}>
                                            <Text style={styles.payCancelText}>रद्द करें</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.deleteConfirmBtn, (isDeleting || !deleteReason.trim()) && styles.payBtnDisabled]}
                                            onPress={handleConfirmDelete}
                                            disabled={isDeleting || !deleteReason.trim()}
                                        >
                                            <Text style={styles.payConfirmText}>
                                                {isDeleting ? 'हटाया जा रहा है…' : 'हटाएं'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

/* ─── sub-components ─────────────────────────────────────────────── */

const QuickBtn = ({ icon, label, color, onPress, disabled }) => (
    <TouchableOpacity
        style={[styles.quickBtn, { backgroundColor: disabled ? '#D1D5DB' : color }]}
        onPress={disabled ? null : onPress}
        activeOpacity={disabled ? 1 : 0.8}
        disabled={disabled}
    >
        <Ionicons name={icon} size={18} color="#fff" />
        <Text style={styles.quickBtnText}>{label}</Text>
    </TouchableOpacity>
);

const AccountChip = ({ label, value, color }) => (
    <View style={[styles.accountChip, { borderColor: `${color}30` }]}>
        <Text style={[styles.accountChipValue, { color }]}>{value}</Text>
        <Text style={styles.accountChipLabel}>{label}</Text>
    </View>
);

const DateChip = ({ icon, label, date, color }) => (
    <View style={[styles.dateChip, { borderColor: `${color}30`, backgroundColor: `${color}08` }]}>
        <Ionicons name={icon} size={16} color={color} />
        <View>
            <Text style={styles.dateChipLabel}>{label}</Text>
            <Text style={[styles.dateChipValue, { color }]}>{date}</Text>
        </View>
    </View>
);

const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionLine} />
    </View>
);

const InfoCard = ({ icon, label, value, iconColor = '#8B5CF6' }) => (
    <View style={styles.infoCard}>
        <View style={[styles.infoIconBox, { backgroundColor: `${iconColor}18` }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.infoText}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{value || 'N/A'}</Text>
        </View>
    </View>
);

/**
 * InvoiceCard
 * - Shows a delete (trash) button on active invoices.
 * - Once `invoice.isDeleted` is true, the card switches to a red, muted
 *   state and shows a warning banner with the deletion reason/date.
 */
const InvoiceCard = ({ invoice, onDelete }) => {
    const isDeleted = !!invoice.isDeleted;
    const color = isDeleted ? '#EF4444' : invoiceStatusColor(invoice.status);

    return (
        <View style={[
            styles.invoiceCard,
            { borderTopColor: color },
            isDeleted && styles.invoiceCardDeleted
        ]}>
            <View style={styles.invoiceHeader}>
                <Text style={[styles.invoiceNumber, isDeleted && styles.invoiceNumberDeleted]}>
                    #{invoice.invoiceNumber}
                </Text>
                <View style={styles.invoiceHeaderRight}>
                    <View style={[styles.invoiceStatusPill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                        <Text style={[styles.invoiceStatusText, { color }]}>
                            {isDeleted ? 'Deleted' : capitalize(invoice.status)}
                        </Text>
                    </View>
                    {!isDeleted && !!onDelete && (
                        <TouchableOpacity
                            style={styles.invoiceDeleteBtn}
                            onPress={onDelete}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isDeleted && (
                <View style={styles.deletedWarningBox}>
                    <Ionicons name="warning" size={14} color="#EF4444" style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.deletedWarningTitle}>यह इनवॉइस हटा दिया गया है</Text>
                        {!!invoice.deleteReason && (
                            <Text style={styles.deletedWarningReason}>कारण: {invoice.deleteReason}</Text>
                        )}
                        {!!invoice.deletedAt && (
                            <Text style={styles.deletedWarningDate}>{fmtDate(invoice.deletedAt)}</Text>
                        )}
                    </View>
                </View>
            )}

            <View style={isDeleted ? styles.invoiceBodyDeleted : undefined}>
                <Text style={styles.invoiceDate}>{fmtDate(invoice.issuedAt)}</Text>

                <View style={styles.invoiceCycle}>
                    <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.invoiceCycleText}>
                        {fmtDate(invoice.cycleStart)} → {fmtDate(invoice.cycleEnd)}
                    </Text>
                </View>

                <View style={styles.invoiceAmounts}>
                    <InvoiceAmount label="Gross" value={fmt(invoice.grossCycleAmount)} />
                    {invoice.fixedDiscountAmount > 0 && (
                        <InvoiceAmount label="Fixed disc." value={`-${fmt(invoice.fixedDiscountAmount)}`} color="#10B981" />
                    )}
                    {invoice.oneTimeDiscountAmount > 0 && (
                        <InvoiceAmount label="One-time" value={`-${fmt(invoice.oneTimeDiscountAmount)}`} color="#10B981" />
                    )}
                    <InvoiceAmount label="Net" value={fmt(invoice.netCycleAmount)} color="#8B5CF6" bold />
                    <InvoiceAmount label="Paid" value={fmt(invoice.amountPaid)} color="#10B981" bold />
                </View>

                {(invoice.dueAmountAfter > 0 || invoice.advanceAmountAfter > 0) && (
                    <View style={styles.invoiceAfter}>
                        {invoice.dueAmountAfter > 0 && (
                            <Text style={styles.invoiceAfterDue}>Due after: {fmt(invoice.dueAmountAfter)}</Text>
                        )}
                        {invoice.advanceAmountAfter > 0 && (
                            <Text style={styles.invoiceAfterAdv}>Advance: {fmt(invoice.advanceAmountAfter)}</Text>
                        )}
                    </View>
                )}

                {invoice.items?.length > 0 && (
                    <View style={styles.invoiceItems}>
                        {invoice.items.map((it, i) => (
                            <View key={i} style={styles.invoiceItemRow}>
                                <Text style={styles.invoiceItemLabel}>{it.label}</Text>
                                <Text style={[
                                    styles.invoiceItemAmount,
                                    it.kind.includes('discount') && { color: '#10B981' }
                                ]}>
                                    {it.kind.includes('discount') ? '-' : ''}{fmt(it.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {invoice.validTillAfter && (
                    <View style={styles.invoiceFooter}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={styles.invoiceFooterText}>Valid till {fmtDate(invoice.validTillAfter)}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const InvoiceAmount = ({ label, value, color = '#1F2937', bold }) => (
    <View style={styles.invoiceAmountRow}>
        <Text style={styles.invoiceAmountLabel}>{label}</Text>
        <Text style={[styles.invoiceAmountValue, { color }, bold && { fontWeight: '800' }]}>{value}</Text>
    </View>
);

const PayInput = ({ label, placeholder, value, onChangeText, keyboardType = 'default' }) => (
    <View style={styles.payInputWrapper}>
        <Text style={styles.payLabel}>{label}</Text>
        <TextInput
            style={styles.payInput}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
        />
    </View>
);

const PaySummaryItem = ({ label, value, color }) => (
    <View style={styles.paySummaryItem}>
        <Text style={[styles.paySummaryValue, { color }]}>{value}</Text>
        <Text style={styles.paySummaryLabel}>{label}</Text>
    </View>
);

/* ─── Preview Row (sub‑component) ──────────────────────────────── */

const PreviewRow = ({ label, before, after, isPositive, isMoney = false }) => {
    const fmtVal = (v) => (isMoney ? fmt(v) : `${v} दिन`);
    let color = '#6B7280';
    if (isPositive === true) color = '#10B981';
    else if (isPositive === false) color = '#EF4444';

    return (
        <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{label}</Text>
            <View style={styles.previewValues}>
                <Text style={styles.previewValueBefore}>{fmtVal(before)}</Text>
                <Text style={styles.previewArrow}>→</Text>
                <Text style={[styles.previewValueAfter, { color, fontWeight: '700' }]}>
                    {fmtVal(after)}
                </Text>
            </View>
        </View>
    );
};

/* ─── styles ─────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    loadingText: { color: '#9CA3AF', fontSize: 14 },

    header: { paddingTop: 10, paddingBottom: 18, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, elevation: 8, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    headerRight: { flexDirection: 'row', gap: 8 },
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)' },

    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 20 },

    hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 18, paddingHorizontal: 20 },
    avatarWrapper: { position: 'relative', marginBottom: 14 },
    avatar: { width: 108, height: 108, borderRadius: 54, borderWidth: 3.5, borderColor: '#8B5CF6' },
    avatarZoomHint: { position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    onlineDot: { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    heroName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 3, textAlign: 'center' },
    heroSid: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
    heroBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    heroBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 5 },
    heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
    heroBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

    quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 18, marginVertical: 16, gap: 8 },
    quickBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, gap: 4, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    quickBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    accountStrip: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 12, gap: 8 },
    accountChip: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, borderWidth: 1, gap: 2, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
    accountChipValue: { fontSize: 13, fontWeight: '800' },
    accountChipLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },

    datesRow: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 14, gap: 8 },
    dateChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
    dateChipLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
    dateChipValue: { fontSize: 13, fontWeight: '700' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 20, marginBottom: 10, gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
    sectionLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },

    cards: { paddingHorizontal: 18, gap: 8 },
    infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
    infoIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    infoText: { flex: 1 },
    infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
    infoValue: { fontSize: 15, color: '#111827', fontWeight: '600', flexWrap: 'wrap' },

    invoiceList: { paddingHorizontal: 18, paddingBottom: 4, gap: 12 },
    invoiceCard: { width: width * 0.72, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderTopWidth: 3, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
    invoiceCardDeleted: { borderColor: '#FCA5A5', borderWidth: 1, backgroundColor: '#FEF2F2' },
    invoiceBodyDeleted: { opacity: 0.55 },
    invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    invoiceHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    invoiceNumber: { fontSize: 15, fontWeight: '800', color: '#111827' },
    invoiceNumberDeleted: { textDecorationLine: 'line-through', color: '#9CA3AF' },
    invoiceDeleteBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    invoiceStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    invoiceStatusText: { fontSize: 11, fontWeight: '700' },
    invoiceDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
    invoiceCycle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
    invoiceCycleText: { fontSize: 11, color: '#9CA3AF' },
    invoiceAmounts: { gap: 5, marginBottom: 8 },
    invoiceAmountRow: { flexDirection: 'row', justifyContent: 'space-between' },
    invoiceAmountLabel: { fontSize: 12, color: '#6B7280' },
    invoiceAmountValue: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
    invoiceAfter: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    invoiceAfterDue: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
    invoiceAfterAdv: { fontSize: 11, color: '#3B82F6', fontWeight: '600' },
    invoiceItems: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, gap: 4 },
    invoiceItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
    invoiceItemLabel: { fontSize: 11, color: '#6B7280' },
    invoiceItemAmount: { fontSize: 11, color: '#1F2937', fontWeight: '600' },
    invoiceFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    invoiceFooterText: { fontSize: 11, color: '#10B981', fontWeight: '500' },

    /* ── Deleted invoice warning banner ── */
    deletedWarningBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 8, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5' },
    deletedWarningTitle: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
    deletedWarningReason: { fontSize: 11, color: '#B91C1C', marginTop: 2 },
    deletedWarningDate: { fontSize: 10, color: '#B91C1C', marginTop: 2 },

    lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    lightboxClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    lightboxImage: { width: width - 40, height: width - 40, borderRadius: 16 },
    lightboxName: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600', marginTop: 16 },

    /* ── Payment modal ── */
    payOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    paySheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36 },
    payHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
    payTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 2 },
    payStudentName: { fontSize: 13, fontWeight: '600', color: '#8B5CF6', textAlign: 'center', marginBottom: 14 },
    paySummary: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 16, justifyContent: 'space-around' },
    paySummaryItem: { alignItems: 'center', gap: 2 },
    paySummaryValue: { fontSize: 15, fontWeight: '800' },
    paySummaryLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
    payInputWrapper: { marginBottom: 10 },
    payLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    payInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#111827' },
    methodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    methodBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    methodBtnActive: { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' },
    methodBtnText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
    methodBtnTextActive: { color: '#8B5CF6' },
    payActions: { flexDirection: 'row', gap: 10 },
    payCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    payCancelText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
    payConfirmBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#8B5CF6', alignItems: 'center' },
    payConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    payBtnDisabled: { opacity: 0.45 },

    /* ── Delete invoice modal ── */
    deleteIconWrap: { alignSelf: 'center', width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    deleteTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 },
    deleteSubtitle: { fontSize: 12.5, color: '#6B7280', textAlign: 'center', marginBottom: 16, lineHeight: 18, paddingHorizontal: 6 },
    deleteReasonInput: { minHeight: 70, textAlignVertical: 'top', paddingTop: 11 },
    deleteConfirmBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center' },

    /* ─── Preview styles ── */
    previewLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 10,
    },
    previewLoadingText: {
        fontSize: 14,
        color: '#6B7280',
    },
    previewCard: {
        backgroundColor: '#F5F3FF',
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#EDE9FE',
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#7C3AED',
        marginBottom: 10,
        textAlign: 'center',
    },
    previewEquation: {
        backgroundColor: '#EDE9FE',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    previewEquationText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#5B4FCF',
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    previewLabel: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
        flex: 1,
    },
    previewValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    previewValueBefore: {
        fontSize: 13,
        color: '#6B7280',
        textDecorationLine: 'line-through',
    },
    previewArrow: {
        fontSize: 13,
        color: '#9CA3AF',
        marginHorizontal: 4,
    },
    previewValueAfter: {
        fontSize: 13,
        fontWeight: '700',
    },
    previewDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 6,
    },
});

export default SingleStudentProfile;