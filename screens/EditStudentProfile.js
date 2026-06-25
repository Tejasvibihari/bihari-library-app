import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    TextInput, Dimensions, StatusBar, SafeAreaView, Alert,
    Platform, KeyboardAvoidingView, ActivityIndicator, Modal,
    FlatList, Animated, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import client from '../service/axiosClient';

const { width } = Dimensions.get('window');

/* ─── Design Tokens ─────────────────────────────────────────────────────── */
const C = {
    primary: '#5B4FCF',
    primaryDk: '#3D33A0',
    primaryLt: '#EDE9FF',
    primaryMid: '#7B71D8',
    accent: '#F59E0B',
    success: '#10B981',
    successLt: '#D1FAE5',
    danger: '#EF4444',
    dangerLt: '#FEE2E2',
    warn: '#F59E0B',
    warnLt: '#FEF3C7',
    ink: '#1A1033',
    sub: '#6B6B8A',
    line: '#E8E5F4',
    bg: '#F5F4FB',
    card: '#FFFFFF',
    inputBg: '#F9F8FF',
    previewBg: '#F0EDFF',
    previewBorder: '#C4BAF5',
};

/* ─── Status / Enum Maps (UPDATED: only paid/due) ───────────────────── */
const STUDENT_STATUSES = ['active', 'pending', 'inactive', 'left', 'trash'];
const PAYMENT_STATUSES = ['paid', 'due'];                   // only two
const SEAT_STATUSES = ['allotted', 'not_allotted', 'expired', 'vacated', 'cancelled'];

const STATUS_COLORS = {
    active: { bg: '#D1FAE5', fg: '#065F46' },
    pending: { bg: '#FEF3C7', fg: '#92400E' },
    inactive: { bg: '#FEE2E2', fg: '#991B1B' },
    left: { bg: '#E0E7FF', fg: '#3730A3' },
    trash: { bg: '#F3F4F6', fg: '#374151' },
    paid: { bg: '#D1FAE5', fg: '#065F46' },
    due: { bg: '#FEE2E2', fg: '#991B1B' },
    allotted: { bg: '#D1FAE5', fg: '#065F46' },
    not_allotted: { bg: '#F3F4F6', fg: '#374151' },
    expired: { bg: '#FEE2E2', fg: '#991B1B' },
    vacated: { bg: '#FEF3C7', fg: '#92400E' },
    cancelled: { bg: '#F3F4F6', fg: '#374151' },
    safe: { bg: '#D1FAE5', fg: '#065F46' },
    warning: { bg: '#FEF3C7', fg: '#92400E' },
    urgent: { bg: '#FEE2E2', fg: '#991B1B' },
    expired_renewal: { bg: '#F3F4F6', fg: '#374151' },
};

/* ─── Warnings (unchanged) ─────────────────────────────────────────────── */
const WARNINGS = {
    billing: '⚠️ Changing billing fields recalculates the student\'s daily rate and net cycle amount.',
    account: '⚠️ These are computed financial values. Changes will recalculate statuses live before saving.',
    password: '⚠️ This will immediately change the student\'s login password.',
    status_trash: '⚠️ Moving to Trash will cancel all active seat bookings for this student.',
    status_inactive: '⚠️ Setting status to Inactive will suspend the student\'s access.',
    seat_status: '⚠️ Changing seat status directly does not update SeatBooking records.',
    payment_status: '⚠️ Payment status is normally managed automatically by the billing system.',
    sid: '⚠️ Student ID is a unique identifier and cannot be changed.',
    cycle_anchor: '⚠️ Changing the billing cycle anchor date will shift all future payment due dates.',
    hard_edit: '⚠️ Hard Edit bypasses billing logic. You will see a diff of inconsistencies before saving.',
};

/* ─── Frontend Billing Engine (mirrors billingServiceV2.js) ──────────────── */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function diffDays(from, to) {
    return Math.floor((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

function addDays(dateInput, days) {
    const date = startOfDay(dateInput);
    date.setDate(date.getDate() + Number(days || 0));
    return date;
}

/**
 * Derive account snapshot from remainingDays – EXACT match with backend.
 * Payment statuses: 'paid' if remainingDays > 0 else 'due'.
 */
function deriveAccountFromDays({ remainingDays, dailyRate, asOfDate = new Date(), dueFromDate = null }) {
    const today = startOfDay(asOfDate);
    const days = Math.round(Number(remainingDays || 0));
    const rate = Number(dailyRate || 0);

    const isPaid = days > 0;
    const isDue = days <= 0;

    const validTill = isPaid
        ? addDays(today, days)
        : (dueFromDate ? startOfDay(dueFromDate) : today);

    const dueDays = isDue ? Math.abs(days) : 0;
    const dueAmount = rate > 0 ? parseFloat((dueDays * rate).toFixed(2)) : 0;

    const dueFrom = isDue
        ? (dueFromDate ? startOfDay(dueFromDate) : today)
        : null;

    let renewal = 'safe';
    if (isDue || days <= 0) renewal = 'expired';
    else if (days <= 3) renewal = 'urgent';
    else if (days <= 7) renewal = 'warning';

    const paymentStatus = isPaid ? 'paid' : 'due';
    const studentStatus = isPaid ? 'active' : 'pending';

    return {
        remainingDays: days,
        dueDays,
        dueAmount,
        validTill,
        dueFrom,
        paymentStatus,
        studentStatus,
        renewal
    };
}

function calculateBilling({ shiftAmount, fixedDiscountAmount = 0, cycleDays = 30 }) {
    const netCycleAmount = Math.max(Number(shiftAmount || 0) - Number(fixedDiscountAmount || 0), 0);
    const dailyRate = cycleDays > 0 ? parseFloat((netCycleAmount / cycleDays).toFixed(4)) : 0;
    return { netCycleAmount, dailyRate };
}

/* ─── Reusable Components (unchanged except for status chip updates) ── */
const Field = ({ label, required, children, hint, warning }) => (
    <View style={s.field}>
        <Text style={s.label}>
            {label}
            {required && <Text style={{ color: C.danger }}> *</Text>}
        </Text>
        {children}
        {warning ? (
            <View style={s.warningBox}>
                <Text style={s.warningTxt}>{warning}</Text>
            </View>
        ) : null}
        {hint && !warning ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
);

const Section = ({ icon, title, subtitle }) => (
    <View style={s.sectionRow}>
        <View style={s.sectionIcon}><Ionicons name={icon} size={16} color={C.primary} /></View>
        <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={s.sectionSub}>{subtitle}</Text> : null}
        </View>
        <View style={s.sectionLine} />
    </View>
);

const StatusChip = ({ value, options, onChange, colorMap, disabled }) => (
    <View style={s.chipWrap}>
        {options.map(opt => {
            const active = value === opt;
            const colors = colorMap[opt] || { bg: '#F3F4F6', fg: '#374151' };
            return (
                <TouchableOpacity
                    key={opt}
                    style={[s.chip, active && { backgroundColor: colors.bg, borderColor: colors.fg }, disabled && s.disabledChip]}
                    onPress={() => !disabled && onChange(opt)}
                    disabled={disabled}
                >
                    {active && <View style={[s.chipDot, { backgroundColor: colors.fg }]} />}
                    <Text style={[s.chipTxt, active && { color: colors.fg, fontWeight: '700' }]}>
                        {opt}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

const WarningBanner = ({ text, color = '#92400E', bgColor = C.warnLt }) => (
    <View style={[s.banner, { backgroundColor: bgColor }]}>
        <Ionicons name="warning-outline" size={16} color={color} style={{ marginRight: 8, marginTop: 1 }} />
        <Text style={[s.bannerTxt, { color }]}>{text}</Text>
    </View>
);

const ReadonlyRow = ({ label, value, highlight }) => (
    <View style={[s.readonlyRow, highlight && { backgroundColor: C.previewBg, borderRadius: 6, paddingHorizontal: 8 }]}>
        <Text style={s.readonlyLabel}>{label}</Text>
        <Text style={[s.readonlyVal, highlight && { color: C.primary }]}>{value ?? '—'}</Text>
    </View>
);

/* ─── Live Account Preview (UPDATED: uses deriveAccountFromDays) ────── */
const LiveAccountPreview = ({ preview, dailyRate }) => {
    if (!preview) return null;
    const rc = STATUS_COLORS[preview.renewal] || STATUS_COLORS.safe;
    const pc = STATUS_COLORS[preview.paymentStatus] || STATUS_COLORS.paid;
    const sc = STATUS_COLORS[preview.studentStatus] || STATUS_COLORS.active;

    return (
        <View style={s.livePreviewCard}>
            <View style={s.livePreviewHeader}>
                <Ionicons name="analytics-outline" size={14} color={C.primary} />
                <Text style={s.livePreviewTitle}>Live Calculation Preview</Text>
                <View style={[s.liveDot, { backgroundColor: C.success }]} />
            </View>
            <View style={s.livePreviewGrid}>
                <View style={s.livePreviewCell}>
                    <Text style={s.livePreviewCellLabel}>Daily Rate</Text>
                    <Text style={s.livePreviewCellValue}>₹{(dailyRate || 0).toFixed(2)}</Text>
                </View>
                <View style={s.livePreviewCell}>
                    <Text style={s.livePreviewCellLabel}>Remaining Days</Text>
                    <Text style={[s.livePreviewCellValue, { color: preview.remainingDays <= 3 ? C.danger : C.success }]}>
                        {preview.remainingDays}d
                    </Text>
                </View>
                <View style={s.livePreviewCell}>
                    <Text style={s.livePreviewCellLabel}>Due Days</Text>
                    <Text style={[s.livePreviewCellValue, { color: preview.dueDays > 0 ? C.danger : C.ink }]}>
                        {preview.dueDays}d
                    </Text>
                </View>
                <View style={s.livePreviewCell}>
                    <Text style={s.livePreviewCellLabel}>Due Amount</Text>
                    <Text style={[s.livePreviewCellValue, { color: preview.dueAmount > 0 ? C.danger : C.ink }]}>
                        ₹{preview.dueAmount.toFixed(0)}
                    </Text>
                </View>
            </View>
            <View style={s.liveStatusRow}>
                <View style={[s.liveStatusPill, { backgroundColor: pc.bg }]}>
                    <Text style={[s.liveStatusPillTxt, { color: pc.fg }]}>Payment: {preview.paymentStatus}</Text>
                </View>
                <View style={[s.liveStatusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[s.liveStatusPillTxt, { color: sc.fg }]}>Student: {preview.studentStatus}</Text>
                </View>
                <View style={[s.liveStatusPill, { backgroundColor: rc.bg }]}>
                    <Text style={[s.liveStatusPillTxt, { color: rc.fg }]}>Renewal: {preview.renewal}</Text>
                </View>
            </View>
            {preview.dueFrom && (
                <Text style={s.livePreviewDue}>
                    Due from: {new Date(preview.dueFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
            )}
        </View>
    );
};

/* ─── Diff Modal ─────────────────────────────────────────────────────────── */
const DiffModal = ({ visible, diffs, onConfirm, onCancel, saving }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={s.diffOverlay}>
            <View style={s.diffSheet}>
                <View style={s.diffHeader}>
                    <Ionicons name="warning" size={20} color={C.warn} />
                    <Text style={s.diffTitle}>Review Changes</Text>
                </View>
                <Text style={s.diffSubtitle}>
                    The following fields were manually edited. Inconsistencies are highlighted.
                </Text>
                <ScrollView style={s.diffScroll} showsVerticalScrollIndicator={false}>
                    {diffs.map((d, i) => (
                        <View key={i} style={[s.diffRow, d.inconsistent && s.diffRowWarn]}>
                            <Text style={s.diffField}>{d.field}</Text>
                            <View style={s.diffValues}>
                                <Text style={s.diffOld}>Was: {d.was}</Text>
                                <Text style={[s.diffNew, d.inconsistent && { color: C.danger }]}>
                                    Now: {d.now}
                                    {d.inconsistent ? ' ⚠️' : ''}
                                </Text>
                                {d.inconsistent && d.expected !== undefined && (
                                    <Text style={s.diffExpected}>System would compute: {d.expected}</Text>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
                <View style={s.diffActions}>
                    <TouchableOpacity style={s.diffCancel} onPress={onCancel} disabled={saving}>
                        <Text style={s.diffCancelTxt}>Go Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.diffConfirm} onPress={onConfirm} disabled={saving}>
                        {saving
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={s.diffConfirmTxt}>Save Anyway</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
const EditStudentProfile = ({ route, navigation }) => {
    const { student: initialStudent } = route.params;

    /* ── Profile State (unchanged) ────────────────────────────────────── */
    const [profile, setProfile] = useState({
        sid: '', name: '', email: '', mobile: '',
        father: '', guardian: '', gender: '', address: '',
        admissionDate: new Date(), image: '', isOnline: false,
        instagram: '', facebook: '', youtube: '',
    });

    /* ── Account/Billing State (UPDATED: removed balanceAmount) ──────── */
    const [account, setAccount] = useState({
        shiftCode: '', shiftId: '', shiftLabel: '', shiftTime: '', shiftAmount: '',
        cycleAnchorDate: new Date(), cycleDays: '30',
        fixedDiscountAmount: '0', fixedDiscountReason: '',
        seatNumber: '',
        validTill: new Date(),          // primary editable date – backend uses it to set remainingDays
    });

    /* ── Hard Edit State (UPDATED: new account fields) ───────────────── */
    const [hardEdit, setHardEdit] = useState({
        enabled: false,
        studentStatus: 'pending',
        paymentStatus: 'due',
        seatStatusStat: 'not_allotted',
        seatStatus: 'not_allotted',
        // New account overrides (all fields from StudentV2.account)
        remainingDays: '0',
        validTill: new Date(),
        dueFrom: null,
        dueDays: '0',
        dueAmount: '0',
        lastPaymentAt: null,
        lastInvoiceNumber: '',
        currentCycleStart: null,
        currentCycleEnd: null,
    });

    /* ── Live Preview ──────────────────────────────────────────────────── */
    const [livePreview, setLivePreview] = useState(null);
    const [liveDailyRate, setLiveDailyRate] = useState(0);

    /* ── Original snapshot (for diff) ─────────────────────────────────── */
    const originalRef = useRef(null);

    /* ── UI State (unchanged) ─────────────────────────────────────────── */
    const [imageUri, setImageUri] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingAccount, setSavingAccount] = useState(false);
    const [savingSeat, setSavingSeat] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingHardEdit, setSavingHardEdit] = useState(false);
    const [shifts, setShifts] = useState([]);
    const [vacantSeats, setVacantSeats] = useState([]);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [loadingSeats, setLoadingSeats] = useState(false);
    const [shiftModal, setShiftModal] = useState(false);
    const [seatModal, setSeatModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [activeDatePicker, setActiveDatePicker] = useState(null);
    const [activeDateTarget, setActiveDateTarget] = useState('profile'); // 'profile' | 'account' | 'hardEdit'
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [diffModal, setDiffModal] = useState(false);
    const [pendingDiffs, setPendingDiffs] = useState([]);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    /* ─── Live Preview recalculation (UPDATED) ────────────────────────── */
    useEffect(() => {
        const shiftAmount = parseFloat(account.shiftAmount) || 0;
        const fixedDiscount = parseFloat(account.fixedDiscountAmount) || 0;
        const cycleDays = parseInt(account.cycleDays) || 30;

        const { dailyRate } = calculateBilling({ shiftAmount, fixedDiscountAmount: fixedDiscount, cycleDays });
        setLiveDailyRate(dailyRate);

        // Compute remainingDays from validTill (as of today)
        const today = startOfDay(new Date());
        const validDate = account.validTill ? startOfDay(account.validTill) : today;
        const remainingDays = diffDays(today, validDate);

        const preview = deriveAccountFromDays({
            remainingDays,
            dailyRate,
            asOfDate: today,
            dueFromDate: remainingDays <= 0 ? validDate : null,
        });
        setLivePreview(preview);
    }, [account.shiftAmount, account.fixedDiscountAmount, account.cycleDays, account.validTill]);

    /* ── Init ──────────────────────────────────────────────────────────── */
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        if (initialStudent) populateForm(initialStudent);
        fetchShifts();
    }, []);

    const populateForm = (st) => {
        const data = st?.toObject ? st.toObject() : st;

        const profileData = {
            sid: data.sid?.toString() || '',
            name: data.name || '',
            email: data.email || '',
            mobile: data.mobile || '',
            father: data.father || '',
            guardian: data.guardian || '',
            gender: data.gender || '',
            address: data.address || '',
            admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
            image: '',
            isOnline: data.isOnline || false,
            instagram: data.instagram || '',
            facebook: data.facebook || '',
            youtube: data.youtube || '',
        };

        const accountData = {
            shiftCode: data.shift?.code || '',
            shiftId: data.shift?.shift || data.shift?._id || '',
            shiftLabel: data.shift?.label || '',
            shiftTime: data.shift?.displayTime || '',
            shiftAmount: (data.shift?.amount || 0).toString(),
            cycleAnchorDate: data.billing?.cycleAnchorDate ? new Date(data.billing.cycleAnchorDate) : new Date(),
            cycleDays: (data.billing?.cycleDays || 30).toString(),
            fixedDiscountAmount: (data.billing?.fixedDiscountAmount || 0).toString(),
            fixedDiscountReason: data.billing?.fixedDiscountReason || '',
            seatNumber: data.seat?.seatNumber || '',
            validTill: data.account?.validTill ? new Date(data.account.validTill) : new Date(),
        };

        const hardEditData = {
            enabled: false,
            studentStatus: data.statuses?.student || 'pending',
            paymentStatus: data.statuses?.payment || 'due',
            seatStatusStat: data.statuses?.seat || 'not_allotted',
            seatStatus: data.seat?.status || 'not_allotted',
            remainingDays: (data.account?.remainingDays || 0).toString(),
            validTill: data.account?.validTill ? new Date(data.account.validTill) : new Date(),
            dueFrom: data.account?.dueFrom ? new Date(data.account.dueFrom) : null,
            dueDays: (data.account?.dueDays || 0).toString(),
            dueAmount: (data.account?.dueAmount || 0).toString(),
            lastPaymentAt: data.account?.lastPaymentAt ? new Date(data.account.lastPaymentAt) : null,
            lastInvoiceNumber: data.account?.lastInvoiceNumber?.toString() || '',
            currentCycleStart: data.account?.currentCycleStart ? new Date(data.account.currentCycleStart) : null,
            currentCycleEnd: data.account?.currentCycleEnd ? new Date(data.account.currentCycleEnd) : null,
        };

        setProfile(profileData);
        setAccount(accountData);
        setHardEdit(hardEditData);

        originalRef.current = { profile: profileData, account: accountData, hardEdit: hardEditData };

        if (data.image) setImageUri(`https://api.biharilibrary.in/uploads/${data.image}`);
    };

    const setP = useCallback((key, val) => setProfile(p => ({ ...p, [key]: val })), []);
    const setA = useCallback((key, val) => setAccount(p => ({ ...p, [key]: val })), []);
    const setH = useCallback((key, val) => setHardEdit(p => ({ ...p, [key]: val })), []);

    /* ── Shifts / Seats (unchanged) ───────────────────────────────────── */
    const fetchShifts = async () => {
        try {
            setLoadingShifts(true);
            const res = await client.get('/api/v2/seat/shifts');
            setShifts(res.data?.shifts || []);
        } catch {
            Alert.alert('Error', 'Could not load shifts.');
        } finally {
            setLoadingShifts(false);
        }
    };

    const fetchVacantSeats = async (shiftCode) => {
        if (!shiftCode) return;
        try {
            setLoadingSeats(true);
            const res = await client.get(`/api/v2/seat/getVacantSeatsByShift?shiftCode=${shiftCode}&gender=${profile.gender}`);
            const seats = res.data || [];
            const cur = account.seatNumber;
            const hasCur = seats.find(s => s.seatNumber === cur);
            setVacantSeats(cur && !hasCur ? [{ seatNumber: cur, _current: true }, ...seats] : seats);
        } catch {
            setVacantSeats([]);
        } finally {
            setLoadingSeats(false);
        }
    };

    const handleShiftSelect = (shift) => {
        setAccount(p => ({
            ...p,
            shiftCode: shift.code,
            shiftId: shift._id,
            shiftLabel: shift.label,
            shiftTime: shift.displayTime,
            shiftAmount: shift.price?.toString() || '',
            seatNumber: '',
        }));
        setShiftModal(false);
        fetchVacantSeats(shift.code);
    };

    const handleSeatSelect = (seat) => {
        setA('seatNumber', seat.seatNumber);
        setSeatModal(false);
    };

    /* ── Image (unchanged) ────────────────────────────────────────────── */
    const handleImagePicker = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please allow photo library access.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
            });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setImageUri(asset.uri);
                setP('image', `data:image/jpeg;base64,${asset.base64}`);
            }
        } catch {
            Alert.alert('Error', 'Failed to pick image');
        }
    }, []);

    /* ── Date helpers (unchanged) ─────────────────────────────────────── */
    const formatDate = (d) => {
        if (!d) return 'Not set';
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const openDatePicker = (key, target) => {
        setActiveDatePicker(key);
        setActiveDateTarget(target);
    };

    const handleDateChange = (_, selected) => {
        const key = activeDatePicker;
        const target = activeDateTarget;
        setActiveDatePicker(null);
        if (!selected || !key) return;
        if (target === 'profile') setP(key, selected);
        else if (target === 'account') setA(key, selected);
        else if (target === 'hardEdit') setH(key, selected);
    };

    const getActiveDateValue = () => {
        if (!activeDatePicker) return new Date();
        let val;
        if (activeDateTarget === 'profile') val = profile[activeDatePicker];
        else if (activeDateTarget === 'account') val = account[activeDatePicker];
        else val = hardEdit[activeDatePicker];
        return val instanceof Date && !isNaN(val) ? val : new Date();
    };

    /* ── Validate Profile (unchanged) ─────────────────────────────────── */
    const validateProfile = () => {
        const required = [['name', 'Name'], ['email', 'Email'], ['mobile', 'Mobile'], ['father', 'Father\'s Name'], ['gender', 'Gender'], ['address', 'Address']];
        for (const [k, label] of required) {
            if (!profile[k]?.toString().trim()) {
                Alert.alert('Required Field', `${label} is required.`);
                return false;
            }
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
            Alert.alert('Invalid Email', 'Enter a valid email address.');
            return false;
        }
        if (!/^[0-9]{10}$/.test(profile.mobile)) {
            Alert.alert('Invalid Mobile', 'Enter a valid 10-digit mobile number.');
            return false;
        }
        return true;
    };

    /* ─── Build Hard Edit Diffs (UPDATED) ────────────────────────────── */
    const buildHardEditDiffs = () => {
        if (!livePreview) return [];
        const diffs = [];
        const orig = originalRef.current?.hardEdit;

        const check = (field, was, now, expected, inconsistent) => {
            if (String(was) !== String(now)) {
                diffs.push({ field, was: String(was), now: String(now), expected: String(expected), inconsistent });
            }
        };

        // Compare hardEdit values with livePreview (system-computed)
        check('Student Status', orig?.studentStatus, hardEdit.studentStatus, livePreview.studentStatus, hardEdit.studentStatus !== livePreview.studentStatus);
        check('Payment Status', orig?.paymentStatus, hardEdit.paymentStatus, livePreview.paymentStatus, hardEdit.paymentStatus !== livePreview.paymentStatus);
        check('Remaining Days', orig?.remainingDays, hardEdit.remainingDays, livePreview.remainingDays.toString(), parseInt(hardEdit.remainingDays) !== livePreview.remainingDays);
        check('Valid Till', orig?.validTill?.toISOString(), hardEdit.validTill.toISOString(), livePreview.validTill.toISOString(), hardEdit.validTill.toISOString() !== livePreview.validTill.toISOString());
        check('Due From', orig?.dueFrom?.toISOString(), hardEdit.dueFrom?.toISOString(), livePreview.dueFrom?.toISOString(), (hardEdit.dueFrom || null) !== (livePreview.dueFrom || null));
        check('Due Days', orig?.dueDays, hardEdit.dueDays, livePreview.dueDays.toString(), parseInt(hardEdit.dueDays) !== livePreview.dueDays);
        check('Due Amount', orig?.dueAmount, hardEdit.dueAmount, livePreview.dueAmount.toFixed(2), Math.abs(parseFloat(hardEdit.dueAmount) - livePreview.dueAmount) > 1);
        check('Last Payment At', orig?.lastPaymentAt?.toISOString(), hardEdit.lastPaymentAt?.toISOString(), null, false);
        check('Last Invoice Number', orig?.lastInvoiceNumber, hardEdit.lastInvoiceNumber, null, false);
        check('Current Cycle Start', orig?.currentCycleStart?.toISOString(), hardEdit.currentCycleStart?.toISOString(), null, false);
        check('Current Cycle End', orig?.currentCycleEnd?.toISOString(), hardEdit.currentCycleEnd?.toISOString(), null, false);

        return diffs;
    };

    /* ── Save Profile (unchanged) ────────────────────────────────────── */
    const saveProfile = async () => {
        if (!validateProfile()) return;
        try {
            setSavingProfile(true);
            const payload = {
                name: profile.name.trim(),
                email: profile.email.trim(),
                mobile: profile.mobile.trim(),
                father: profile.father.trim(),
                guardian: profile.guardian?.trim() || '',
                gender: profile.gender,
                address: profile.address.trim(),
                admissionDate: profile.admissionDate.toISOString(),
                isOnline: profile.isOnline,
                instagram: profile.instagram?.trim() || '',
                facebook: profile.facebook?.trim() || '',
                youtube: profile.youtube?.trim() || '',
            };
            if (profile.image) payload.image = profile.image;
            await client.put(`/api/v2/student/profile/${profile.sid}`, payload);
            Alert.alert('Saved', 'Personal details updated successfully.');
            originalRef.current = { ...originalRef.current, profile };
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update profile.';
            Alert.alert('Error', msg);
        } finally {
            setSavingProfile(false);
        }
    };

    /* ── Save Account/Billing (UPDATED: send validTill) ────────────── */
    const saveAccount = async () => {
        try {
            setSavingAccount(true);
            const payload = {
                shiftCode: account.shiftCode,
                fixedDiscountAmount: parseFloat(account.fixedDiscountAmount) || 0,
                fixedDiscountReason: account.fixedDiscountReason,
                cycleDays: parseInt(account.cycleDays) || 30,
                cycleAnchorDate: account.cycleAnchorDate.toISOString(),
                validTill: account.validTill.toISOString(),   // backend recalculates remainingDays from this
            };
            const res = await client.put(`/api/v2/student/account/${profile.sid}`, payload);
            Alert.alert('Saved', 'Billing & account updated successfully.');
            originalRef.current = { ...originalRef.current, account };
            // Update local state from response
            if (res.data?.student) {
                const st = res.data.student;
                setA('validTill', st.account?.validTill ? new Date(st.account.validTill) : new Date());
                // Also update hardEdit's validTill if enabled? Not needed.
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update account.';
            Alert.alert('Error', msg);
        } finally {
            setSavingAccount(false);
        }
    };

    /* ── Save Seat (unchanged) ────────────────────────────────────────── */
    const saveSeat = async () => {
        try {
            setSavingSeat(true);
            await client.put(`/api/v2/student/seat/${profile.sid}`, { seatNumber: account.seatNumber || 'Other' });
            Alert.alert('Saved', 'Seat assignment updated.');
            originalRef.current = { ...originalRef.current, account };
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update seat.';
            Alert.alert('Error', msg);
        } finally {
            setSavingSeat(false);
        }
    };

    /* ── Save Password (unchanged) ────────────────────────────────────── */
    const savePassword = async () => {
        if (!passwordForm.newPassword) {
            Alert.alert('Required', 'Enter a new password.');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }
        Alert.alert('Confirm', 'This will immediately change the student\'s login password. Proceed?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Change Password', onPress: async () => {
                    try {
                        setSavingPassword(true);
                        await client.put(`/api/v2/student/admin/${profile.sid}`, { password: passwordForm.newPassword });
                        setPasswordForm({ newPassword: '', confirmPassword: '' });
                        Alert.alert('Done', 'Password updated successfully.');
                    } catch (err) {
                        Alert.alert('Error', err.response?.data?.message || 'Failed to update password.');
                    } finally {
                        setSavingPassword(false);
                    }
                }
            }
        ]);
    };

    /* ─── Hard Edit Save (UPDATED: send all account fields) ──────────── */
    const initiateHardEditSave = () => {
        const diffs = buildHardEditDiffs();
        if (diffs.length === 0) {
            Alert.alert('No Changes', 'No hard edit fields have been changed.');
            return;
        }
        setPendingDiffs(diffs);
        setDiffModal(true);
    };

    const confirmHardEditSave = async () => {
        try {
            setSavingHardEdit(true);
            const payload = {
                'statuses.student': hardEdit.studentStatus,
                'statuses.payment': hardEdit.paymentStatus,
                'statuses.seat': hardEdit.seatStatusStat,
                'seat.status': hardEdit.seatStatus,
                'account.remainingDays': parseInt(hardEdit.remainingDays) || 0,
                'account.validTill': hardEdit.validTill.toISOString(),
                'account.dueFrom': hardEdit.dueFrom ? hardEdit.dueFrom.toISOString() : null,
                'account.dueDays': parseInt(hardEdit.dueDays) || 0,
                'account.dueAmount': parseFloat(hardEdit.dueAmount) || 0,
                'account.lastPaymentAt': hardEdit.lastPaymentAt ? hardEdit.lastPaymentAt.toISOString() : null,
                'account.lastInvoiceNumber': hardEdit.lastInvoiceNumber ? Number(hardEdit.lastInvoiceNumber) : null,
                'account.currentCycleStart': hardEdit.currentCycleStart ? hardEdit.currentCycleStart.toISOString() : null,
                'account.currentCycleEnd': hardEdit.currentCycleEnd ? hardEdit.currentCycleEnd.toISOString() : null,
            };
            await client.put(`/api/v2/student/admin/${profile.sid}`, payload);
            setDiffModal(false);
            Alert.alert('Saved', 'Admin override applied. Note: these values may be overwritten on the next billing cycle.');
            setH('enabled', false);
            originalRef.current = { ...originalRef.current, hardEdit };
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Hard edit failed.');
        } finally {
            setSavingHardEdit(false);
        }
    };

    const selectedShift = shifts.find(s => s.code === account.shiftCode);
    const netCycleAmount = calculateBilling({
        shiftAmount: parseFloat(account.shiftAmount) || 0,
        fixedDiscountAmount: parseFloat(account.fixedDiscountAmount) || 0,
        cycleDays: parseInt(account.cycleDays) || 30,
    }).netCycleAmount;

    /* ═══════════════════════════════════════════════════════════════════════ */
    return (
        <SafeAreaView style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primaryDk} />
            {/* Header (unchanged) */}
            <LinearGradient colors={[C.primaryDk, C.primary]} style={s.header}>
                <View style={s.headerRow}>
                    <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={s.headerCenter}>
                        <Text style={s.headerTitle}>Edit Student</Text>
                        <Text style={s.headerSub}>SID #{profile.sid}  ·  {profile.name || '...'}</Text>
                    </View>
                    <View style={s.headerBtn} />
                </View>
            </LinearGradient>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Avatar Section (unchanged) */}
                    <View style={s.avatarSection}>
                        <TouchableOpacity onPress={handleImagePicker} activeOpacity={0.85}>
                            <View style={s.avatarWrapper}>
                                <Image source={imageUri ? { uri: imageUri } : require('../assets/bihari.png')} style={s.avatar} />
                                <View style={s.avatarBadge}>
                                    <Ionicons name="camera" size={14} color="#fff" />
                                </View>
                            </View>
                        </TouchableOpacity>
                        <Text style={s.avatarName}>{profile.name || 'Student Name'}</Text>
                        <View style={[s.statusPill, { backgroundColor: STATUS_COLORS[livePreview?.studentStatus || 'pending']?.bg || '#FEF3C7' }]}>
                            <Text style={[s.statusPillTxt, { color: STATUS_COLORS[livePreview?.studentStatus || 'pending']?.fg || '#92400E' }]}>
                                {livePreview?.studentStatus || 'pending'}
                            </Text>
                        </View>
                    </View>

                    {/* SECTION 1: PERSONAL DETAILS (unchanged) */}
                    <View style={s.card}>
                        <Section icon="person-outline" title="Personal Details" />
                        <Field label="Student ID" warning={WARNINGS.sid}>
                            <TextInput style={[s.input, s.disabled]} value={profile.sid} editable={false} />
                        </Field>
                        <Field label="Full Name" required>
                            <TextInput style={s.input} value={profile.name} onChangeText={v => setP('name', v)} placeholder="Full name" />
                        </Field>
                        <Field label="Email" required hint="Used for student login">
                            <TextInput style={s.input} value={profile.email} onChangeText={v => setP('email', v)} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
                        </Field>
                        <Field label="Mobile" required>
                            <TextInput style={s.input} value={profile.mobile} onChangeText={v => setP('mobile', v)} placeholder="10-digit number" keyboardType="numeric" maxLength={10} />
                        </Field>
                        <Field label="Father's Name" required>
                            <TextInput style={s.input} value={profile.father} onChangeText={v => setP('father', v)} placeholder="Father's full name" />
                        </Field>
                        <Field label="Guardian Mobile" hint="Emergency contact">
                            <TextInput style={s.input} value={profile.guardian} onChangeText={v => setP('guardian', v)} placeholder="Guardian phone" keyboardType="numeric" />
                        </Field>
                        <Field label="Gender" required>
                            <View style={s.pickerWrap}>
                                <Picker selectedValue={profile.gender} style={s.picker} onValueChange={v => setP('gender', v)}>
                                    <Picker.Item label="Select gender" value="" />
                                    <Picker.Item label="Male" value="Male" />
                                    <Picker.Item label="Female" value="Female" />
                                    <Picker.Item label="Other" value="Other" />
                                </Picker>
                            </View>
                        </Field>
                        <Field label="Address" required>
                            <TextInput style={[s.input, s.textarea]} value={profile.address} onChangeText={v => setP('address', v)} placeholder="Full address" multiline numberOfLines={3} textAlignVertical="top" />
                        </Field>
                        <Field label="Admission Date">
                            <TouchableOpacity style={s.dateBtn} onPress={() => openDatePicker('admissionDate', 'profile')}>
                                <Ionicons name="calendar-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
                                <Text style={s.dateBtnTxt}>{formatDate(profile.admissionDate)}</Text>
                            </TouchableOpacity>
                        </Field>
                        <Field label="Online Access">
                            <View style={s.switchRow}>
                                <Text style={s.switchLabel}>{profile.isOnline ? 'Online access enabled' : 'Online access disabled'}</Text>
                                <Switch value={profile.isOnline} onValueChange={v => setP('isOnline', v)} trackColor={{ false: C.line, true: C.primaryLt }} thumbColor={profile.isOnline ? C.primary : '#ccc'} />
                            </View>
                        </Field>
                        <Section icon="share-social-outline" title="Social Media" />
                        {[
                            { key: 'instagram', icon: 'logo-instagram', placeholder: 'Instagram username' },
                            { key: 'facebook', icon: 'logo-facebook', placeholder: 'Facebook profile link' },
                            { key: 'youtube', icon: 'logo-youtube', placeholder: 'YouTube channel link' },
                        ].map(({ key, icon, placeholder }) => (
                            <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                                <View style={s.socialRow}>
                                    <View style={s.socialIcon}><Ionicons name={icon} size={18} color={C.primary} /></View>
                                    <TextInput style={[s.input, s.socialInput]} value={profile[key]} onChangeText={v => setP(key, v)} placeholder={placeholder} autoCapitalize="none" />
                                </View>
                            </Field>
                        ))}
                        <TouchableOpacity style={[s.sectionCta, savingProfile && s.ctaDisabled]} onPress={saveProfile} disabled={savingProfile}>
                            <LinearGradient colors={[C.primary, C.primaryDk]} style={s.sectionCtaGrad}>
                                {savingProfile ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={s.sectionCtaTxt}>Save Personal Details</Text></>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* SECTION 2: SHIFT, BILLING & ACCOUNT (UPDATED) */}
                    <View style={s.card}>
                        <Section icon="card-outline" title="Shift & Billing" subtitle="Changes recalculate live" />
                        <WarningBanner text={WARNINGS.billing} />
                        <Field label="Shift" hint={account.shiftTime ? `${account.shiftTime}  ·  ₹${account.shiftAmount}/mo` : undefined}>
                            <TouchableOpacity style={s.selectBtn} onPress={() => { fetchShifts(); setShiftModal(true); }} disabled={loadingShifts}>
                                <View style={{ flex: 1 }}>
                                    {account.shiftLabel ? (<><Text style={s.selectBtnLabel}>{account.shiftLabel}</Text><Text style={s.selectBtnSub}>{account.shiftTime}</Text></>) : <Text style={s.selectBtnPlaceholder}>Select a shift</Text>}
                                </View>
                                {loadingShifts ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="chevron-down" size={18} color={C.sub} />}
                            </TouchableOpacity>
                        </Field>
                        <Field label="Billing Cycle Anchor Date" warning={WARNINGS.cycle_anchor}>
                            <TouchableOpacity style={s.dateBtn} onPress={() => openDatePicker('cycleAnchorDate', 'account')}>
                                <Ionicons name="calendar-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
                                <Text style={s.dateBtnTxt}>{formatDate(account.cycleAnchorDate)}</Text>
                            </TouchableOpacity>
                        </Field>
                        <Field label="Cycle Duration (days)" hint="Default: 30 days">
                            <TextInput style={s.input} value={account.cycleDays} onChangeText={v => setA('cycleDays', v)} keyboardType="numeric" />
                        </Field>
                        <Field label="Fixed Discount (₹)" hint="Applied each billing cycle">
                            <TextInput style={s.input} value={account.fixedDiscountAmount} onChangeText={v => setA('fixedDiscountAmount', v)} keyboardType="numeric" />
                        </Field>
                        <Field label="Discount Reason">
                            <TextInput style={[s.input, s.textarea]} value={account.fixedDiscountReason} onChangeText={v => setA('fixedDiscountReason', v)} placeholder="Reason for discount (optional)" multiline numberOfLines={2} textAlignVertical="top" />
                        </Field>

                        {/* ── Valid Till (the only editable date in account) ── */}
                        <Field label="Valid Till" hint="Coverage end date – remaining days recalculated from today">
                            <TouchableOpacity style={s.dateBtn} onPress={() => openDatePicker('validTill', 'account')}>
                                <Ionicons name="calendar-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
                                <Text style={s.dateBtnTxt}>{formatDate(account.validTill)}</Text>
                            </TouchableOpacity>
                        </Field>

                        <View style={s.billingComputedRow}>
                            <View style={s.billingComputedCell}><Text style={s.billingComputedLabel}>Net Cycle</Text><Text style={s.billingComputedValue}>₹{netCycleAmount.toFixed(0)}</Text></View>
                            <View style={s.billingComputedCell}><Text style={s.billingComputedLabel}>Daily Rate</Text><Text style={s.billingComputedValue}>₹{liveDailyRate.toFixed(2)}</Text></View>
                            <View style={s.billingComputedCell}><Text style={s.billingComputedLabel}>Remaining Days</Text><Text style={[s.billingComputedValue, { color: (livePreview?.remainingDays || 0) <= 0 ? C.danger : C.success }]}>
                                {livePreview?.remainingDays ?? 0}d
                            </Text></View>
                            <View style={s.billingComputedCell}><Text style={s.billingComputedLabel}>Due Amount</Text><Text style={[s.billingComputedValue, { color: (livePreview?.dueAmount || 0) > 0 ? C.danger : C.sub }]}>
                                ₹{(livePreview?.dueAmount || 0).toFixed(0)}
                            </Text></View>
                        </View>
                        <LiveAccountPreview preview={livePreview} dailyRate={liveDailyRate} />
                        <TouchableOpacity style={[s.sectionCta, savingAccount && s.ctaDisabled]} onPress={saveAccount} disabled={savingAccount}>
                            <LinearGradient colors={[C.success, '#059669']} style={s.sectionCtaGrad}>
                                {savingAccount ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={s.sectionCtaTxt}>Save Billing & Account</Text></>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* SECTION 3: SEAT (unchanged) */}
                    <View style={s.card}>
                        <Section icon="time-outline" title="Seat Assignment" />
                        <Field label="Seat Number" hint={account.shiftCode ? undefined : 'Select a shift first (in Billing section)'}>
                            <TouchableOpacity style={[s.selectBtn, !account.shiftCode && s.disabledBtn]} onPress={() => { if (!account.shiftCode) return; fetchVacantSeats(account.shiftCode); setSeatModal(true); }} disabled={!account.shiftCode}>
                                <View style={{ flex: 1 }}>{account.seatNumber ? <Text style={s.selectBtnLabel}>Seat {account.seatNumber}</Text> : <Text style={s.selectBtnPlaceholder}>Pick a seat</Text>}</View>
                                {loadingSeats ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="grid-outline" size={18} color={C.sub} />}
                            </TouchableOpacity>
                        </Field>
                        <TouchableOpacity style={[s.sectionCta, savingSeat && s.ctaDisabled]} onPress={saveSeat} disabled={savingSeat}>
                            <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.sectionCtaGrad}>
                                {savingSeat ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="grid-outline" size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={s.sectionCtaTxt}>Update Seat Assignment</Text></>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* SECTION 4: CHANGE PASSWORD (unchanged) */}
                    <View style={s.card}>
                        <Section icon="lock-closed-outline" title="Change Password" subtitle="Leave blank to keep current password" />
                        <WarningBanner text={WARNINGS.password} />
                        <Field label="New Password" hint="Minimum 6 characters">
                            <View style={s.passRow}>
                                <TextInput style={[s.input, { flex: 1 }]} value={passwordForm.newPassword} onChangeText={v => setPasswordForm(p => ({ ...p, newPassword: v }))} placeholder="Enter new password" secureTextEntry={!showPassword} autoCapitalize="none" />
                                <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={s.eyeBtn}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.sub} /></TouchableOpacity>
                            </View>
                        </Field>
                        <Field label="Confirm Password">
                            <View style={s.passRow}>
                                <TextInput style={[s.input, { flex: 1 }]} value={passwordForm.confirmPassword} onChangeText={v => setPasswordForm(p => ({ ...p, confirmPassword: v }))} placeholder="Re-enter new password" secureTextEntry={!showConfirm} autoCapitalize="none" />
                                <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={s.eyeBtn}><Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.sub} /></TouchableOpacity>
                            </View>
                            {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && <Text style={s.matchError}>Passwords do not match</Text>}
                            {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && <Text style={s.matchOk}>✓ Passwords match</Text>}
                        </Field>
                        <TouchableOpacity style={[s.sectionCta, savingPassword && s.ctaDisabled]} onPress={savePassword} disabled={savingPassword}>
                            <LinearGradient colors={[C.warn, '#D97706']} style={s.sectionCtaGrad}>
                                {savingPassword ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="key-outline" size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={s.sectionCtaTxt}>Change Password</Text></>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* ════════ SECTION 5: HARD EDIT (UPDATED) ════════ */}
                    <View style={s.card}>
                        <View style={s.hardEditHeader}>
                            <View style={{ flex: 1 }}>
                                <View style={s.sectionRow}>
                                    <View style={[s.sectionIcon, { backgroundColor: '#FEE2E2' }]}><Ionicons name="shield-outline" size={16} color={C.danger} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.sectionTitle, { color: C.danger }]}>Hard Edit</Text>
                                        <Text style={s.sectionSub}>Admin override — bypasses billing logic</Text>
                                    </View>
                                    <View style={s.sectionLine} />
                                </View>
                            </View>
                            <Switch value={hardEdit.enabled} onValueChange={v => setH('enabled', v)} trackColor={{ false: C.line, true: '#FEE2E2' }} thumbColor={hardEdit.enabled ? C.danger : '#ccc'} />
                        </View>

                        {!hardEdit.enabled ? (
                            <View style={s.hardEditDisabledMsg}>
                                <Ionicons name="lock-closed" size={20} color={C.sub} />
                                <Text style={s.hardEditDisabledTxt}>Enable Hard Edit to manually override statuses and computed account fields. A diff will be shown before saving.</Text>
                            </View>
                        ) : (
                            <>
                                <WarningBanner text={WARNINGS.hard_edit} color={C.danger} bgColor={C.dangerLt} />
                                <View style={s.hardCompareHeader}>
                                    <Text style={[s.hardCompareCol, { color: C.success }]}>System Computed</Text>
                                    <Text style={[s.hardCompareCol, { color: C.danger }]}>Your Override</Text>
                                </View>

                                {/* Status overrides */}
                                <Field label="Student Status">
                                    <View style={s.hardCompareRow}>
                                        <View style={[s.hardCompareCell, { backgroundColor: C.successLt }]}>
                                            <Text style={[s.hardCompareCellTxt, { color: '#065F46' }]}>{livePreview?.studentStatus || '—'}</Text>
                                        </View>
                                        <StatusChip value={hardEdit.studentStatus} options={STUDENT_STATUSES} onChange={v => setH('studentStatus', v)} colorMap={STATUS_COLORS} />
                                    </View>
                                </Field>
                                <Field label="Payment Status">
                                    <View style={s.hardCompareRow}>
                                        <View style={[s.hardCompareCell, { backgroundColor: C.successLt }]}>
                                            <Text style={[s.hardCompareCellTxt, { color: '#065F46' }]}>{livePreview?.paymentStatus || '—'}</Text>
                                        </View>
                                        <StatusChip value={hardEdit.paymentStatus} options={PAYMENT_STATUSES} onChange={v => setH('paymentStatus', v)} colorMap={STATUS_COLORS} />
                                    </View>
                                </Field>
                                <Field label="Seat Allocation Status" warning={WARNINGS.seat_status}>
                                    <StatusChip value={hardEdit.seatStatusStat} options={SEAT_STATUSES} onChange={v => setH('seatStatusStat', v)} colorMap={STATUS_COLORS} />
                                </Field>
                                <Field label="Seat Record Status">
                                    <StatusChip value={hardEdit.seatStatus} options={SEAT_STATUSES} onChange={v => setH('seatStatus', v)} colorMap={STATUS_COLORS} />
                                </Field>

                                {/* ── Core account overrides ── */}
                                <Field label="Remaining Days" hint="Positive = paid, zero/negative = due">
                                    <TextInput
                                        style={s.input}
                                        value={hardEdit.remainingDays}
                                        onChangeText={v => setH('remainingDays', v)}
                                        keyboardType="numeric"
                                        placeholder="e.g. 30"
                                    />
                                </Field>

                                <Field label="Valid Till (override)">
                                    <TouchableOpacity style={s.dateBtn} onPress={() => openDatePicker('validTill', 'hardEdit')}>
                                        <Ionicons name="calendar-outline" size={18} color={C.primary} style={{ marginRight: 10 }} />
                                        <Text style={s.dateBtnTxt}>{formatDate(hardEdit.validTill)}</Text>
                                    </TouchableOpacity>
                                </Field>

                                <Field label="Due From">
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity
                                            style={[s.dateBtn, { flex: 1 }]}
                                            onPress={() => openDatePicker('dueFrom', 'hardEdit')}>
                                            <Ionicons name="calendar-outline" size={16} color={C.primary} style={{ marginRight: 6 }} />
                                            <Text style={[s.dateBtnTxt, { fontSize: 13 }]}>
                                                {hardEdit.dueFrom ? formatDate(hardEdit.dueFrom) : 'Not set'}
                                            </Text>
                                        </TouchableOpacity>
                                        {hardEdit.dueFrom && (
                                            <TouchableOpacity onPress={() => setH('dueFrom', null)} style={{ padding: 8 }}>
                                                <Ionicons name="close-circle" size={20} color={C.danger} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Field>

                                <View style={s.hardNumericGrid}>
                                    {[
                                        { label: 'Due Days', key: 'dueDays', computed: livePreview?.dueDays || 0 },
                                        { label: 'Due Amount (₹)', key: 'dueAmount', computed: (livePreview?.dueAmount || 0).toFixed(0) },
                                    ].map(({ label, key, computed }) => (
                                        <View key={key} style={s.hardNumericCell}>
                                            <Text style={s.hardNumericLabel}>{label}</Text>
                                            <View style={s.hardNumericComputed}>
                                                <Text style={s.hardNumericComputedTxt}>Computed: {computed}</Text>
                                            </View>
                                            <TextInput
                                                style={[s.input, s.hardNumericInput,
                                                String(computed) !== String(hardEdit[key]) && { borderColor: C.warn }
                                                ]}
                                                value={hardEdit[key]}
                                                onChangeText={v => setH(key, v)}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    ))}
                                </View>

                                {/* ── Last Payment At ── */}
                                <Field label="Last Payment At">
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity
                                            style={[s.dateBtn, { flex: 1 }]}
                                            onPress={() => openDatePicker('lastPaymentAt', 'hardEdit')}
                                        >
                                            <Ionicons name="calendar-outline" size={16} color={C.primary} style={{ marginRight: 6 }} />
                                            <Text style={[s.dateBtnTxt, { fontSize: 13 }]}>
                                                {hardEdit.lastPaymentAt ? formatDate(hardEdit.lastPaymentAt) : 'Not set'}
                                            </Text>
                                        </TouchableOpacity>
                                        {hardEdit.lastPaymentAt && (
                                            <TouchableOpacity onPress={() => setH('lastPaymentAt', null)} style={{ padding: 8 }}>
                                                <Ionicons name="close-circle" size={20} color={C.danger} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Field>

                                {/* ── Last Invoice Number ── */}
                                <Field label="Last Invoice Number">
                                    <TextInput
                                        style={s.input}
                                        value={hardEdit.lastInvoiceNumber}
                                        onChangeText={v => setH('lastInvoiceNumber', v)}
                                        keyboardType="numeric"
                                        placeholder="Invoice number"
                                    />
                                </Field>

                                {/* ── Current Cycle Start ── */}
                                <Field label="Current Cycle Start">
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity
                                            style={[s.dateBtn, { flex: 1 }]}
                                            onPress={() => openDatePicker('currentCycleStart', 'hardEdit')}
                                        >
                                            <Ionicons name="calendar-outline" size={16} color={C.primary} style={{ marginRight: 6 }} />
                                            <Text style={[s.dateBtnTxt, { fontSize: 13 }]}>
                                                {hardEdit.currentCycleStart ? formatDate(hardEdit.currentCycleStart) : 'Not set'}
                                            </Text>
                                        </TouchableOpacity>
                                        {hardEdit.currentCycleStart && (
                                            <TouchableOpacity onPress={() => setH('currentCycleStart', null)} style={{ padding: 8 }}>
                                                <Ionicons name="close-circle" size={20} color={C.danger} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Field>

                                {/* ── Current Cycle End ── */}
                                <Field label="Current Cycle End">
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity
                                            style={[s.dateBtn, { flex: 1 }]}
                                            onPress={() => openDatePicker('currentCycleEnd', 'hardEdit')}
                                        >
                                            <Ionicons name="calendar-outline" size={16} color={C.primary} style={{ marginRight: 6 }} />
                                            <Text style={[s.dateBtnTxt, { fontSize: 13 }]}>
                                                {hardEdit.currentCycleEnd ? formatDate(hardEdit.currentCycleEnd) : 'Not set'}
                                            </Text>
                                        </TouchableOpacity>
                                        {hardEdit.currentCycleEnd && (
                                            <TouchableOpacity onPress={() => setH('currentCycleEnd', null)} style={{ padding: 8 }}>
                                                <Ionicons name="close-circle" size={20} color={C.danger} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Field>

                                <TouchableOpacity style={[s.sectionCta, savingHardEdit && s.ctaDisabled]} onPress={initiateHardEditSave} disabled={savingHardEdit}>
                                    <LinearGradient colors={[C.danger, '#B91C1C']} style={s.sectionCtaGrad}>
                                        {savingHardEdit ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="warning-outline" size={16} color="#fff" style={{ marginRight: 8 }} /><Text style={s.sectionCtaTxt}>Review & Save Hard Edits</Text></>}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                    <View style={{ height: 50 }} />
                </Animated.ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker Modal */}
            {activeDatePicker && <DateTimePicker value={getActiveDateValue()} mode="date" display="default" onChange={handleDateChange} />}

            {/* Shift Modal (unchanged) */}
            <Modal visible={shiftModal} transparent animationType="slide" onRequestClose={() => setShiftModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Select Shift</Text>
                            <TouchableOpacity onPress={() => setShiftModal(false)}><Ionicons name="close" size={22} color={C.ink} /></TouchableOpacity>
                        </View>
                        {loadingShifts ? <ActivityIndicator color={C.primary} style={{ margin: 30 }} /> : (
                            <FlatList data={shifts} keyExtractor={i => i._id} contentContainerStyle={{ paddingBottom: 20 }} renderItem={({ item }) => {
                                const active = item.code === account.shiftCode;
                                return (
                                    <TouchableOpacity style={[s.shiftRow, active && s.shiftRowActive]} onPress={() => handleShiftSelect(item)}>
                                        <View style={[s.shiftDot, { backgroundColor: active ? C.primary : C.line }]} />
                                        <View style={{ flex: 1 }}><Text style={[s.shiftLabel, active && { color: C.primary }]}>{item.label}</Text><Text style={s.shiftTime}>{item.displayTime}  ·  {item.durationLabel}</Text></View>
                                        <View style={[s.shiftPrice, active && { backgroundColor: C.primaryLt }]}><Text style={[s.shiftPriceTxt, active && { color: C.primary }]}>₹{item.price}</Text></View>
                                    </TouchableOpacity>
                                );
                            }} />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Seat Modal (unchanged) */}
            <Modal visible={seatModal} transparent animationType="slide" onRequestClose={() => setSeatModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Select Seat</Text>
                            <TouchableOpacity onPress={() => setSeatModal(false)}><Ionicons name="close" size={22} color={C.ink} /></TouchableOpacity>
                        </View>
                        {loadingSeats ? <ActivityIndicator color={C.primary} style={{ margin: 30 }} /> : (
                            <>
                                <Text style={s.seatCount}>{vacantSeats.length} seat(s) available</Text>
                                <View style={s.seatGrid}>
                                    {vacantSeats.map(seat => {
                                        const active = seat.seatNumber === account.seatNumber;
                                        const current = seat._current;
                                        return (
                                            <TouchableOpacity
                                                key={seat.seatNumber}
                                                style={[
                                                    s.seatTile,
                                                    active && s.seatTileActive,
                                                    current && s.seatTileCurrent,
                                                ]}
                                                onPress={() => handleSeatSelect(seat)}
                                            >
                                                <Text style={[s.seatTileNum, active && { color: '#fff' }]}>{seat.seatNumber}</Text>
                                                {current && <Text style={s.seatTileCurTxt}>current</Text>}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {vacantSeats.length === 0 && (
                                    <View style={s.emptySeats}>
                                        <Ionicons name="sad-outline" size={40} color={C.sub} />
                                        <Text style={s.emptySeatsTitle}>No seats available</Text>
                                        <Text style={s.emptySeatsMsg}>Try changing shift or freeing a seat.</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Diff Modal */}
            <DiffModal visible={diffModal} diffs={pendingDiffs} onConfirm={confirmHardEditSave} onCancel={() => setDiffModal(false)} saving={savingHardEdit} />
        </SafeAreaView>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { paddingBottom: 18, paddingTop: 8, elevation: 6, shadowColor: C.primaryDk, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
    avatarSection: { alignItems: 'center', marginBottom: 22 },
    avatarWrapper: { position: 'relative', marginBottom: 10 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.primary },
    avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.bg },
    avatarName: { fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 6 },
    statusPill: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 20 },
    statusPillTxt: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 14, elevation: 2, shadowColor: '#7C6EE0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 8 },
    sectionIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primaryLt, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
    sectionSub: { fontSize: 11, color: C.sub, marginTop: 1 },
    sectionLine: { flex: 1, height: 1, backgroundColor: C.line },
    sectionCta: { marginTop: 18, borderRadius: 12, overflow: 'hidden', elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
    ctaDisabled: { opacity: 0.6 },
    sectionCtaGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 13 },
    sectionCtaTxt: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
    readonlyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
    readonlyLabel: { fontSize: 13, color: C.sub },
    readonlyVal: { fontSize: 13, fontWeight: '600', color: C.ink },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 6 },
    hint: { fontSize: 11, color: C.sub, marginTop: 4 },
    warningBox: { backgroundColor: C.warnLt, borderRadius: 8, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: C.warn },
    warningTxt: { fontSize: 12, color: '#78350F', lineHeight: 17 },
    banner: { flexDirection: 'row', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: C.warn },
    bannerTxt: { fontSize: 12, flex: 1, lineHeight: 17 },
    input: { backgroundColor: C.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.line },
    disabled: { backgroundColor: '#F1F0F6', color: C.sub },
    textarea: { minHeight: 80, paddingTop: 12 },
    pickerWrap: { backgroundColor: C.inputBg, borderRadius: 10, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
    picker: { height: 50, color: C.ink },
    selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.line },
    disabledBtn: { opacity: 0.45 },
    selectBtnLabel: { fontSize: 15, fontWeight: '600', color: C.ink },
    selectBtnSub: { fontSize: 12, color: C.sub, marginTop: 2 },
    selectBtnPlaceholder: { fontSize: 15, color: '#AEAECB' },
    dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.line },
    dateBtnTxt: { fontSize: 15, color: C.ink, fontWeight: '500' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.line },
    switchLabel: { fontSize: 14, color: C.ink },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.inputBg, gap: 6 },
    disabledChip: { opacity: 0.5 },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    chipTxt: { fontSize: 13, color: C.sub, fontWeight: '500' },
    socialRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    socialIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.primaryLt, justifyContent: 'center', alignItems: 'center' },
    socialInput: { flex: 1 },
    passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn: { padding: 12, backgroundColor: C.inputBg, borderRadius: 10, borderWidth: 1, borderColor: C.line },
    matchError: { fontSize: 12, color: C.danger, marginTop: 6, fontWeight: '500' },
    matchOk: { fontSize: 12, color: C.success, marginTop: 6, fontWeight: '500' },
    livePreviewCard: { backgroundColor: C.previewBg, borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: C.previewBorder },
    livePreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    livePreviewTitle: { fontSize: 12, fontWeight: '700', color: C.primary, flex: 1, textTransform: 'uppercase', letterSpacing: 0.6 },
    liveDot: { width: 7, height: 7, borderRadius: 4 },
    livePreviewGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    livePreviewCell: { flex: 1, backgroundColor: C.card, borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: C.line },
    livePreviewCellLabel: { fontSize: 10, color: C.sub, marginBottom: 3, textAlign: 'center' },
    livePreviewCellValue: { fontSize: 15, fontWeight: '700', color: C.ink },
    liveStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    liveStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    liveStatusPillTxt: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    livePreviewDue: { fontSize: 11, color: C.danger, marginTop: 6, fontWeight: '500' },
    billingComputedRow: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, padding: 12, gap: 8, marginBottom: 14, marginTop: 4 },
    billingComputedCell: { flex: 1, alignItems: 'center' },
    billingComputedLabel: { fontSize: 10, color: C.sub, marginBottom: 3 },
    billingComputedValue: { fontSize: 14, fontWeight: '700', color: C.ink },
    hardEditHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    hardEditDisabledMsg: { flexDirection: 'row', gap: 10, backgroundColor: C.bg, borderRadius: 10, padding: 14, alignItems: 'flex-start', marginTop: 4 },
    hardEditDisabledTxt: { flex: 1, fontSize: 13, color: C.sub, lineHeight: 19 },
    hardCompareHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
    hardCompareCol: { flex: 1, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
    hardCompareRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    hardCompareCell: { flex: 1, borderRadius: 10, padding: 12, justifyContent: 'center', alignItems: 'center', minHeight: 46 },
    hardCompareCellTxt: { fontSize: 13, fontWeight: '700' },
    hardNumericGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
    hardNumericCell: { width: (width - 32 - 36 - 10) / 2 },
    hardNumericLabel: { fontSize: 12, fontWeight: '600', color: C.ink, marginBottom: 4 },
    hardNumericComputed: { backgroundColor: C.successLt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6, alignSelf: 'flex-start' },
    hardNumericComputedTxt: { fontSize: 11, color: '#065F46', fontWeight: '600' },
    hardNumericInput: { fontSize: 14 },
    diffOverlay: { flex: 1, backgroundColor: 'rgba(10,5,30,0.6)', justifyContent: 'center', padding: 20 },
    diffSheet: { backgroundColor: C.card, borderRadius: 20, padding: 20, maxHeight: '80%', elevation: 10 },
    diffHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    diffTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
    diffSubtitle: { fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 18 },
    diffScroll: { maxHeight: 300, marginBottom: 16 },
    diffRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', gap: 12 },
    diffRowWarn: { backgroundColor: C.warnLt, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 6 },
    diffField: { fontSize: 13, fontWeight: '700', color: C.ink, width: 110 },
    diffValues: { flex: 1 },
    diffOld: { fontSize: 12, color: C.sub },
    diffNew: { fontSize: 12, fontWeight: '600', color: C.ink, marginTop: 2 },
    diffExpected: { fontSize: 11, color: C.danger, marginTop: 2, fontStyle: 'italic' },
    diffActions: { flexDirection: 'row', gap: 10 },
    diffCancel: { flex: 1, padding: 13, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, alignItems: 'center' },
    diffCancelTxt: { fontSize: 14, fontWeight: '600', color: C.sub },
    diffConfirm: { flex: 1, padding: 13, borderRadius: 10, backgroundColor: C.danger, alignItems: 'center' },
    diffConfirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(10,5,30,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
    modalHandle: { width: 40, height: 4, backgroundColor: C.line, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 12 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
    modalSub: { fontSize: 12, color: C.sub, marginTop: 3 },
    shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
    shiftRowActive: { backgroundColor: C.primaryLt, marginHorizontal: -20, paddingHorizontal: 20, borderBottomColor: 'transparent' },
    shiftDot: { width: 10, height: 10, borderRadius: 5 },
    shiftLabel: { fontSize: 15, fontWeight: '600', color: C.ink },
    shiftTime: { fontSize: 12, color: C.sub, marginTop: 2 },
    shiftPrice: { backgroundColor: C.line, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    shiftPriceTxt: { fontSize: 13, fontWeight: '700', color: C.sub },
    seatCount: { fontSize: 12, color: C.sub, marginBottom: 14, fontWeight: '500' },
    seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    seatTile: { width: (width - 40 - 40 - 30) / 5, aspectRatio: 1, borderRadius: 10, backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.line, justifyContent: 'center', alignItems: 'center' },
    seatTileActive: { backgroundColor: C.primary, borderColor: C.primary },
    seatTileCurrent: { borderColor: C.accent, borderStyle: 'dashed' },
    seatTileNum: { fontSize: 13, fontWeight: '700', color: C.ink },
    seatTileCurTxt: { fontSize: 8, color: C.accent, fontWeight: '600', marginTop: 1 },
    emptySeats: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptySeatsTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
    emptySeatsMsg: { fontSize: 13, color: C.sub, textAlign: 'center' },
});

export default EditStudentProfile;