import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Platform,
    SafeAreaView,
    RefreshControl,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopHeader from '../components/TopBar';
import client from '../service/axiosClient';

const { width } = Dimensions.get('window');

// ─── formatting helpers ───────────────────────────────────────────────────

const formatINR = (value = 0) => {
    const n = Math.round(Number(value) || 0);
    return `₹${n.toLocaleString('en-IN')}`;
};

const formatCompactINR = (value = 0) => {
    const n = Number(value) || 0;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
};

const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diff / (1000 * 60 * 60 * 24));
};

const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

// ─── small presentational pieces ──────────────────────────────────────────

const Avatar = ({ student, size = 38, urgent = false }) => {
    const [failed, setFailed] = useState(false);
    const hasImage = !!student?.image && !failed;
    const initial = (student?.name || '?').charAt(0).toUpperCase();

    if (hasImage) {
        return (
            <Image
                source={{ uri: `https://api.biharilibrary.in/uploads/${student.image}` }}
                style={[styles.listAvatarImage, { width: size, height: size, borderRadius: size / 2 }]}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <View
            style={[
                styles.listAvatarFallback,
                urgent && styles.listAvatarUrgent,
                { width: size, height: size, borderRadius: size / 2 },
            ]}
        >
            <Text style={styles.listAvatarInitial}>{initial}</Text>
        </View>
    );
};

const Eyebrow = ({ children, right }) => (
    <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>{children}</Text>
        {right ? <Text style={styles.eyebrowRight}>{right}</Text> : null}
    </View>
);

const Sparkline = ({ data }) => {
    const max = Math.max(...data.map((d) => d.collected), 1);
    return (
        <View style={styles.sparkRow}>
            {data.map((d, i) => {
                const h = Math.max((d.collected / max) * 36, 3);
                const isLast = i === data.length - 1;
                return (
                    <View key={i} style={styles.sparkBarWrap}>
                        <View
                            style={[
                                styles.sparkBar,
                                { height: h, backgroundColor: isLast ? '#FFFFFF' : 'rgba(255,255,255,0.38)' },
                            ]}
                        />
                        <Text style={styles.sparkLabel}>{d.label.split(' ')[0]}</Text>
                    </View>
                );
            })}
        </View>
    );
};

const OccupancyRow = ({ shift }) => {
    const occupiedPct = shift.total > 0 ? Math.round((shift.occupied / shift.total) * 100) : 0;
    return (
        <View style={styles.occRow}>
            <View style={styles.occLabelCol}>
                <Text style={styles.occLabel}>{shift.label}</Text>
                <Text style={styles.occTime}>{shift.displayTime}</Text>
            </View>
            <View style={styles.occTrack}>
                <View style={[styles.occFill, { width: `${occupiedPct}%` }]} />
            </View>
            <Text style={styles.occCount}>
                {shift.occupied}/{shift.total}
            </Text>
        </View>
    );
};

const KpiTile = ({ label, value, tone, onPress }) => (
    <TouchableOpacity style={styles.kpiTile} activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
        <View style={[styles.kpiDot, { backgroundColor: tone }]} />
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
    </TouchableOpacity>
);

const DueRow = ({ student, onPress }) => {
    const overdueDays = student.account?.dueFrom
        ? Math.max(0, -daysUntil(student.account.dueFrom))
        : null;
    return (
        <TouchableOpacity style={styles.listRow} activeOpacity={0.7} onPress={onPress}>
            <Avatar student={student} />
            <View style={styles.listRowMid}>
                <Text style={styles.listRowTitle} numberOfLines={1}>{student.name}</Text>
                <Text style={styles.listRowSub}>
                    Seat {student.seat?.seatNumber || '—'} · {student.shift?.label || 'No shift'}
                </Text>
            </View>
            <View style={styles.listRowEnd}>
                <Text style={styles.dueAmount}>{formatINR(student.account?.dueAmount)}</Text>
                {overdueDays !== null && (
                    <Text style={styles.dueDaysText}>{overdueDays > 0 ? `${overdueDays}d overdue` : 'due today'}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const ExpiryRow = ({ student, onPress }) => {
    const d = daysUntil(student.account?.validTill);
    const urgent = d !== null && d <= 2;
    return (
        <TouchableOpacity style={styles.listRow} activeOpacity={0.7} onPress={onPress}>
            <Avatar student={student} urgent={urgent} />
            <View style={styles.listRowMid}>
                <Text style={styles.listRowTitle} numberOfLines={1}>{student.name}</Text>
                <Text style={styles.listRowSub}>
                    Seat {student.seat?.seatNumber || '—'} · {student.shift?.label || 'No shift'}
                </Text>
            </View>
            <View style={styles.listRowEnd}>
                <Text style={[styles.expiryDays, urgent && styles.expiryDaysUrgent]}>
                    {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d}d left`}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const ActivityRow = ({ payment }) => (
    <View style={styles.activityRow}>
        <View style={styles.activityDot} />
        <View style={styles.listRowMid}>
            <Text style={styles.listRowTitle} numberOfLines={1}>
                {payment.student?.name || `SID ${payment.sid}`}
            </Text>
            <Text style={styles.listRowSub}>
                {payment.method || 'cash'} · {payment.shiftSnapshot?.label || ''} · {timeAgo(payment.paymentDate)}
            </Text>
        </View>
        <Text style={styles.activityAmount}>+{formatINR(payment.amountPaid)}</Text>
    </View>
);

const EmptyState = ({ text }) => (
    <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{text}</Text>
    </View>
);

const SectionCard = ({ children, style }) => <View style={[styles.sectionCard, style]}>{children}</View>;

// ─── main screen ───────────────────────────────────────────────────────────

const Home = ({ navigation }) => {
    const [overview, setOverview] = useState(null);
    const [trend, setTrend] = useState([]);
    const [shiftOccupancy, setShiftOccupancy] = useState([]);
    const [dueStudents, setDueStudents] = useState([]);
    const [expiryStudents, setExpiryStudents] = useState([]);
    const [recentPayments, setRecentPayments] = useState([]);
    const [recentStudents, setRecentStudents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchDashboard = useCallback(async () => {
        try {
            setError(null);
            const [
                overviewRes,
                trendRes,
                occupancyRes,
                dueRes,
                expiryRes,
                activityRes,
            ] = await Promise.all([
                client.get('/api/v2/dashboard/overview'),
                client.get('/api/v2/dashboard/revenue-trend', { params: { months: 6 } }),
                client.get('/api/v2/dashboard/shift-occupancy'),
                client.get('/api/v2/dashboard/due-students', { params: { limit: 8, sortBy: 'dueAmount', sortDir: 'desc' } }),
                client.get('/api/v2/dashboard/expiry-forecast', { params: { days: 7 } }),
                client.get('/api/v2/dashboard/recent-activity', { params: { limit: 8 } }),
            ]);

            setOverview(overviewRes.data);
            setTrend(trendRes.data?.trend || []);
            setShiftOccupancy(occupancyRes.data?.occupancy || []);
            setDueStudents(dueRes.data?.students || []);
            setExpiryStudents(expiryRes.data?.students || []);
            setRecentPayments(activityRes.data?.recentPayments || []);
            setRecentStudents(activityRes.data?.recentStudents || []);
        } catch (err) {
            console.error('Dashboard fetch failed:', err);
            setError('Could not load dashboard data. Pull down to retry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    }, [fetchDashboard]);

    const goToStudents = useCallback((filter, title) => {
        if (navigation) {
            navigation.navigate('StudentsList', { filter, title });
        }
    }, [navigation]);

    const goToStudentProfile = useCallback((student) => {
        if (navigation) {
            navigation.navigate('SingleStudentProfile', { student });
        }
    }, [navigation]);

    const students = overview?.students || { total: 0, active: 0, pending: 0, due: 0, newToday: 0 };
    const seats = overview?.seats || { total: 0, occupied: 0, vacant: 0, occupancyRate: 0 };
    const collections = overview?.collections || { today: { totalCollected: 0, count: 0 }, thisMonth: { totalCollected: 0, count: 0 }, totalOutstandingDue: 0 };

    const trendForSpark = useMemo(() => (trend.length ? trend : []), [trend]);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />
                <TopHeader heading="Bihari Library" />
                <View style={styles.fullLoader}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.fullLoaderText}>Loading today's snapshot…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#4C1D95" translucent={false} />
            <TopHeader heading="Bihari Library" />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} tintColor="#7C3AED" />
                }
            >
                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                )}

                {/* ── Hero: today's & month's collection, with sparkline ── */}
                <LinearGradient
                    colors={['#4C1D95', '#6D28D9', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroTopRow}>
                        <View>
                            <Text style={styles.heroEyebrow}>COLLECTED TODAY</Text>
                            <Text style={styles.heroAmount}>{formatINR(collections.today.totalCollected)}</Text>
                            <Text style={styles.heroSub}>{collections.today.count} payment{collections.today.count === 1 ? '' : 's'}</Text>
                        </View>
                        <View style={styles.heroDivider} />
                        <View style={styles.heroMonthCol}>
                            <Text style={styles.heroEyebrow}>THIS MONTH</Text>
                            <Text style={styles.heroAmountSmall}>{formatCompactINR(collections.thisMonth.totalCollected)}</Text>
                            <Text style={styles.heroSub}>{collections.thisMonth.count} payments</Text>
                        </View>
                    </View>

                    {trendForSpark.length > 0 && (
                        <View style={styles.sparkBlock}>
                            <Sparkline data={trendForSpark} />
                        </View>
                    )}

                    <View style={styles.heroDueStrip}>
                        <Text style={styles.heroDueLabel}>Outstanding dues</Text>
                        <Text style={styles.heroDueValue}>{formatINR(collections.totalOutstandingDue)}</Text>
                    </View>
                </LinearGradient>

                {/* ── KPI tiles (updated with "New Today") ── */}
                <View style={styles.kpiGrid}>
                    <KpiTile label="Total students" value={students.total} tone="#7C3AED" onPress={() => goToStudents('all', 'All Students')} />
                    <KpiTile label="Active" value={students.active} tone="#10B981" onPress={() => goToStudents('active', 'Active Students')} />
                    <KpiTile label="Pending" value={students.pending} tone="#EAB308" onPress={() => goToStudents('pending', 'Pending Students')} />
                    <KpiTile label="In due" value={students.due} tone="#DC2626" onPress={() => goToStudents('due', 'Students in Due')} />
                    <KpiTile label="New Today" value={students.newToday} tone="#3B82F6" onPress={() => goToStudents('newToday', 'New Today')} />
                </View>

                {/* ── Seat occupancy ── */}
                <SectionCard>
                    <Eyebrow right={`${seats.occupancyRate}% full`}>SEAT OCCUPANCY · {seats.occupied}/{seats.total}</Eyebrow>
                    {shiftOccupancy.length > 0 ? (
                        shiftOccupancy.map((s) => <OccupancyRow key={s.code} shift={s} />)
                    ) : (
                        <EmptyState text="No shifts configured yet." />
                    )}
                </SectionCard>

                {/* ── Needs attention: due students ── */}
                <SectionCard>
                    <Eyebrow right={dueStudents.length ? 'View all →' : null}>NEEDS ATTENTION · FEE DUE</Eyebrow>
                    {dueStudents.length > 0 ? (
                        dueStudents.map((s) => (
                            <DueRow key={s._id} student={s} onPress={() => goToStudentProfile(s)} />
                        ))
                    ) : (
                        <EmptyState text="No pending dues. Everyone's paid up." />
                    )}
                </SectionCard>

                {/* ── Expiring soon ── */}
                <SectionCard>
                    <Eyebrow>EXPIRING WITHIN 7 DAYS</Eyebrow>
                    {expiryStudents.length > 0 ? (
                        expiryStudents.map((s) => (
                            <ExpiryRow key={s._id} student={s} onPress={() => goToStudentProfile(s)} />
                        ))
                    ) : (
                        <EmptyState text="No memberships expiring this week." />
                    )}
                </SectionCard>

                {/* ── Recent activity: payments ── */}
                <SectionCard>
                    <Eyebrow>RECENT PAYMENTS</Eyebrow>
                    {recentPayments.length > 0 ? (
                        recentPayments.map((p) => <ActivityRow key={p._id} payment={p} />)
                    ) : (
                        <EmptyState text="No payments recorded yet." />
                    )}
                </SectionCard>

                {/* ── Recent admissions ── */}
                <SectionCard style={styles.lastSection}>
                    <Eyebrow>RECENT ADMISSIONS</Eyebrow>
                    {recentStudents.length > 0 ? (
                        recentStudents.map((s) => (
                            <TouchableOpacity
                                key={s._id}
                                style={styles.listRow}
                                activeOpacity={0.7}
                                onPress={() => goToStudentProfile(s)}
                            >
                                <Avatar student={s} />
                                <View style={styles.listRowMid}>
                                    <Text style={styles.listRowTitle} numberOfLines={1}>{s.name}</Text>
                                    <Text style={styles.listRowSub}>{s.shift?.label || 'No shift'} · SID {s.sid}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.statusPill,
                                        s.statuses?.student === 'active' ? styles.statusPillActive : styles.statusPillPending,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusPillText,
                                            s.statuses?.student === 'active' ? styles.statusPillTextActive : styles.statusPillTextPending,
                                        ]}
                                    >
                                        {s.statuses?.student || 'pending'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <EmptyState text="No admissions yet." />
                    )}
                </SectionCard>
            </ScrollView>
        </SafeAreaView>
    );
};

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#4C1D95',
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F3FF',
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 32,
    },
    fullLoader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F3FF',
    },
    fullLoaderText: {
        marginTop: 10,
        color: '#6B7280',
        fontSize: 13,
    },
    errorBanner: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorBannerText: {
        color: '#B91C1C',
        fontSize: 13,
        fontWeight: '500',
    },

    // hero
    heroCard: {
        borderRadius: 22,
        padding: 20,
        marginBottom: 14,
        shadowColor: '#4C1D95',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 8,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    heroEyebrow: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    heroAmount: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    heroAmountSmall: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
    },
    heroSub: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 12,
        marginTop: 4,
    },
    heroDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 18,
    },
    heroMonthCol: {
        flex: 1,
        justifyContent: 'center',
    },
    sparkBlock: {
        marginTop: 18,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
    },
    sparkRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    sparkBarWrap: {
        alignItems: 'center',
        flex: 1,
    },
    sparkBar: {
        width: 10,
        borderRadius: 4,
        marginBottom: 6,
    },
    sparkLabel: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 10,
        fontWeight: '600',
    },
    heroDueStrip: {
        marginTop: 16,
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroDueLabel: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: '500',
    },
    heroDueValue: {
        color: '#FCA5A5',
        fontSize: 15,
        fontWeight: '700',
    },

    // kpi grid (updated for 5 tiles)
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 14,
        gap: 10,
    },
    kpiTile: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        width: (width - 32 - 10) / 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    kpiDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    kpiValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E1B2E',
    },
    kpiLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
        fontWeight: '500',
    },

    // section card
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    lastSection: {
        marginBottom: 4,
    },
    eyebrowRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
        color: '#7C3AED',
    },
    eyebrowRight: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9333EA',
    },

    // occupancy
    occRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    occLabelCol: {
        width: 78,
    },
    occLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E1B2E',
    },
    occTime: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 1,
    },
    occTrack: {
        flex: 1,
        height: 8,
        backgroundColor: '#EDE9FE',
        borderRadius: 4,
        marginHorizontal: 10,
        overflow: 'hidden',
    },
    occFill: {
        height: 8,
        backgroundColor: '#7C3AED',
        borderRadius: 4,
    },
    occCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        width: 42,
        textAlign: 'right',
    },

    // list rows (shared by due / expiry / admissions)
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F0FF',
    },
    listAvatarImage: {
        marginRight: 12,
        backgroundColor: '#EDE9FE',
        borderWidth: 1,
        borderColor: '#E5E0FB',
    },
    listAvatarFallback: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    listAvatarUrgent: {
        backgroundColor: '#FEE2E2',
    },
    listAvatarInitial: {
        fontSize: 15,
        fontWeight: '700',
        color: '#6D28D9',
    },
    listRowMid: {
        flex: 1,
        marginRight: 8,
    },
    listRowTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
    },
    listRowSub: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    listRowEnd: {
        alignItems: 'flex-end',
    },
    dueAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#DC2626',
    },
    dueDaysText: {
        fontSize: 10,
        color: '#F87171',
        marginTop: 2,
        fontWeight: '500',
    },
    expiryDays: {
        fontSize: 13,
        fontWeight: '700',
        color: '#D97706',
    },
    expiryDaysUrgent: {
        color: '#DC2626',
    },

    // activity rows
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F0FF',
    },
    activityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 14,
    },
    activityAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#059669',
    },

    // status pill
    statusPill: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusPillActive: {
        backgroundColor: '#D1FAE5',
    },
    statusPillPending: {
        backgroundColor: '#FEF3C7',
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    statusPillTextActive: {
        color: '#065F46',
    },
    statusPillTextPending: {
        color: '#92400E',
    },

    // empty state
    emptyState: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default Home;