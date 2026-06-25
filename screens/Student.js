import React, { useEffect, useState } from 'react'
import {
    View, Text, StatusBar, SafeAreaView, StyleSheet,
    TouchableOpacity, FlatList
} from 'react-native'
import TopBar from '../components/TopBar'
import { StudentCardV2 } from '../components/StudentCard'
import client from '../service/axiosClient'
import Loading from '../components/Loading'

const TABS = [
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    // { key: 'trash', label: '' },
    // { key: 'left', label: 'Left' },
]

export function statusColor(status) {
    switch (status) {
        case 'active': return '#10B981'
        case 'pending': return '#F59E0B'
        case 'inactive': return '#EF4444'
        case 'left': return '#94A3B8'
        default: return '#8B5CF6'
    }
}

export default function Student() {
    const [activeTab, setActiveTab] = useState('active')
    const [allStudent, setAllStudent] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAllStudent = async () => {
            try {
                setLoading(true)
                const response = await client.get('/api/v2/student/getallstudent')
                setAllStudent(response.data)
            } catch (error) {
                console.error('Failed to fetch students:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchAllStudent()
    }, [])

    const filtered = allStudent.filter(s => s?.statuses?.student === activeTab)

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
            <TopBar heading="All Students" />

            {/* Tab Strip */}
            <View style={styles.tabContainer}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab.key
                    const count = allStudent.filter(s => s?.statuses?.student === tab.key).length
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, isActive && styles.activeTab]}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                                    <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.indicator, isActive && styles.activeIndicator]} />
                        </TouchableOpacity>
                    )
                })}
            </View>

            {/* Summary bar */}
            <View style={styles.summaryBar}>
                <View style={[styles.summaryDot, { backgroundColor: statusColor(activeTab) }]} />
                <Text style={styles.summaryText}>
                    {filtered.length} {TABS.find(t => t.key === activeTab)?.label} student{filtered.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* List */}
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
                        data={filtered}
                        keyExtractor={(item, index) => item._id?.toString() || index.toString()}
                        renderItem={({ item }) => <StudentCardV2 student={item} />}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>🎓</Text>
                                <Text style={styles.emptyTitle}>No students here</Text>
                                <Text style={styles.emptySubtitle}>
                                    No {activeTab} students found.
                                </Text>
                            </View>
                        }
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

    /* ── Tabs — same capsule style as original ── */
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
        paddingVertical: 11,
        paddingHorizontal: 6,
        alignItems: 'center',
        borderRadius: 8,
        position: 'relative',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 5,
    },
    activeTab: {
        backgroundColor: '#8B5CF6',
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabLabel: {
        color: '#ffffff',
    },
    tabBadge: {
        backgroundColor: '#EDE9FE',
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    activeTabBadge: {
        backgroundColor: 'rgba(255,255,255,0.28)',
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    activeTabBadgeText: {
        color: '#ffffff',
    },
    indicator: {
        position: 'absolute',
        bottom: 4,
        height: 3,
        width: 24,
        borderRadius: 2,
        backgroundColor: 'transparent',
    },
    activeIndicator: {
        backgroundColor: '#ffffff',
    },

    /* ── Summary bar ── */
    summaryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 14,
        marginBottom: 2,
        gap: 7,
    },
    summaryDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    summaryText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },

    /* ── List ── */
    contentContainer: {
        flex: 1,
        marginTop: 10,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        paddingTop: 4,
    },

    /* ── Empty state ── */
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        gap: 8,
    },
    emptyIcon: {
        fontSize: 44,
        marginBottom: 6,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#374151',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
    },
})