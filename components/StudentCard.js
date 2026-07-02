import React, { useState, useEffect, useRef } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    Modal, TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import client from '../service/axiosClient'
import convertTo12Hour from '../helpers/timeFormat'

/* ────────────────────────────────────────────────────────────────
   Client‑side Billing Helpers (mirroring billingServiceV2.js)
   ──────────────────────────────────────────────────────────────── */

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfDay(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function diffDays(from, to) {
    return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY)
}

function addDays(dateInput, days) {
    const d = startOfDay(dateInput)
    d.setDate(d.getDate() + Number(days || 0))
    return d
}

function deriveAccountFromDays({ remainingDays, dailyRate, asOfDate, dueFromDate = null }) {
    const today = startOfDay(asOfDate || new Date())
    const days = Math.round(Number(remainingDays || 0))
    const rate = Number(dailyRate || 0)

    const isPaid = days > 0
    const validTill = isPaid
        ? addDays(today, days)
        : (dueFromDate ? startOfDay(dueFromDate) : today)

    const dueDays = !isPaid ? Math.abs(days) : 0
    const dueAmount = rate > 0 ? parseFloat((dueDays * rate).toFixed(2)) : 0
    const dueFrom = !isPaid ? (dueFromDate ? startOfDay(dueFromDate) : today) : null

    const paymentStatus = isPaid ? 'paid' : 'due'
    const studentStatus = isPaid ? 'active' : 'pending'

    return {
        remainingDays: days,
        dueDays,
        dueAmount,
        validTill,
        dueFrom,
        paymentStatus,
        studentStatus
    }
}

function applyPayment({ currentRemainingDays, currentValidTill, amountPaid, dailyRate, asOfDate, dueFromDate = null }) {
    const today = startOfDay(asOfDate || new Date())
    const rate = Number(dailyRate || 0)
    const paid = Number(amountPaid || 0)

    const purchasedDays = rate > 0 ? Math.floor(paid / rate) : 0
    const currentDays = Math.round(Number(currentRemainingDays || 0))

    let effectiveCurrentDays = currentDays
    if (currentDays > 0 && currentValidTill) {
        const daysLeftByValidTill = diffDays(today, startOfDay(currentValidTill))
        effectiveCurrentDays = Math.min(currentDays, daysLeftByValidTill)
    }

    const newRemainingDays = effectiveCurrentDays + purchasedDays
    const newDueFrom = newRemainingDays <= 0
        ? (dueFromDate || (currentValidTill ? startOfDay(currentValidTill) : today))
        : null

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
    }
}

/* ────────────────────────────────────────────────────────────────
   UI Helpers
   ──────────────────────────────────────────────────────────────── */

function statusColor(status) {
    switch (status) {
        case 'active': return '#10B981'
        case 'pending': return '#F59E0B'
        case 'inactive': return '#EF4444'
        case 'left': return '#94A3B8'
        default: return '#8B5CF6'
    }
}

function paymentColor(status) {
    switch (status) {
        case 'paid': return '#10B981'
        case 'partial': return '#F59E0B'
        case 'due': return '#EF4444'
        case 'advance': return '#3B82F6'
        default: return '#94A3B8'
    }
}

function paymentLabel(status) {
    switch (status) {
        case 'paid': return '✓ Paid'
        case 'partial': return '◑ Partial'
        case 'due': return '! Due'
        case 'advance': return '↑ Advance'
        default: return status || '—'
    }
}

function fmt(amount) {
    if (amount === undefined || amount === null) return '—'
    return `₹${Number(amount).toLocaleString('en-IN')}`
}

function capitalize(str) {
    if (!str) return '—'
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ────────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────────── */

export const StudentCardV2 = ({ student, onDelete }) => {
    const navigation = useNavigation()
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [amountPaid, setAmountPaid] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // ─── Preview state ──────────────────────────────────────────
    const [previewData, setPreviewData] = useState(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const previewTimeoutRef = useRef(null)

    const studentStatus = student?.statuses?.student || 'pending'
    const paymentStatus = student?.statuses?.payment || 'due'
    const seatStatus = student?.statuses?.seat || 'not_allotted'

    const sColor = statusColor(studentStatus)
    const pColor = paymentColor(paymentStatus)

    const formattedShiftTime = convertTo12Hour(student?.shift?.displayTime)

    const handleCardPress = () => navigation.navigate('SingleStudentProfile', { student })

    // ─── Client‑side preview calculation ──────────────────────
    const calculatePreview = (amount) => {
        const parsed = parseFloat(amount)
        if (!parsed || parsed <= 0) {
            setPreviewData(null)
            return
        }

        setPreviewLoading(true)
        // Tiny delay to show the spinner (improves UX)
        setTimeout(() => {
            const dailyRate = student?.billing?.dailyRate || 0
            const currentRemainingDays = student?.account?.remainingDays || 0
            const currentValidTill = student?.account?.validTill
                ? new Date(student.account.validTill)
                : new Date()

            const result = applyPayment({
                currentRemainingDays,
                currentValidTill,
                amountPaid: parsed,
                dailyRate,
                asOfDate: new Date(),
                dueFromDate: student?.account?.dueFrom
                    ? new Date(student.account.dueFrom)
                    : null
            })

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
            })
            setPreviewLoading(false)
        }, 300)
    }

    // Debounced preview on amount change
    useEffect(() => {
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current)
        if (!showPaymentModal) {
            setPreviewData(null)
            return
        }
        const val = amountPaid
        if (!val || parseFloat(val) <= 0) {
            setPreviewData(null)
            return
        }
        previewTimeoutRef.current = setTimeout(() => {
            calculatePreview(val)
        }, 500)
        return () => clearTimeout(previewTimeoutRef.current)
    }, [amountPaid, showPaymentModal])

    // ─── Confirm Payment ──────────────────────────────────────
    const handleConfirmPayment = async () => {
        if (isProcessing) return
        const parsed = parseFloat(amountPaid)
        if (!parsed || parsed <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid payment amount.')
            return
        }
        setIsProcessing(true)
        try {
            await client.post('/api/v2/payment/makepayment', {
                sid: student.sid,
                amountPaid: parsed,
            })
            Alert.alert('सफलता', 'भुगतान सफलतापूर्वक प्रोसेस हो गया!', [{ text: 'ठीक है' }])
            setShowPaymentModal(false)
            setAmountPaid('')
            setPreviewData(null)
        } catch (err) {
            const msg = err.response?.data?.message || 'भुगतान प्रोसेस करने में समस्या आई।'
            Alert.alert('त्रुटि', msg, [{ text: 'ठीक है' }])
        } finally {
            setIsProcessing(false)
        }
    }

    // ─── Delete ────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        if (isDeleting) return
        setIsDeleting(true)
        try {
            const response = await client.delete(`/api/v2/student/delete?studentId=${student._id}`)
            console.log(response)
            if (response.status === 200) {
                Alert.alert('सफलता', 'छात्र सफलतापूर्वक हटा दिया गया!', [{ text: 'ठीक है' }])
                setShowDeleteModal(false)
                if (onDelete) onDelete(student.sid)
            } else {
                Alert.alert('त्रुटि', 'छात्र को हटाने में समस्या आई।', [{ text: 'ठीक है' }])
            }
        } catch {
            Alert.alert('त्रुटि', 'छात्र को हटाने में समस्या आई।', [{ text: 'ठीक है' }])
        } finally {
            setIsDeleting(false)
        }
    }

    /* ──────────────────────────────────────────────────────────────
       Render
       ────────────────────────────────────────────────────────────── */

    return (
        <>
            {/* ─── Card ─── */}
            <TouchableOpacity
                style={[styles.card, { borderLeftColor: sColor }]}
                onPress={handleCardPress}
                activeOpacity={0.78}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={
                            student?.image
                                ? { uri: `https://api.biharilibrary.in/uploads/${student.image}` }
                                : require('../assets/bihari.png')
                        }
                        style={styles.avatar}
                        defaultSource={require('../assets/bihari.png')}
                        resizeMode="cover"
                    />
                    <View style={styles.nameBlock}>
                        <Text style={styles.name} numberOfLines={1}>{student?.name || '—'}</Text>
                        <Text style={styles.shiftLabel} numberOfLines={1}>
                            {student?.shift?.label || '—'}
                            {student?.shift?.displayTime ? `  ·  ${formattedShiftTime}` : ''}
                        </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: `${sColor}18`, borderColor: `${sColor}40` }]}>
                        <View style={[styles.statusDot, { backgroundColor: sColor }]} />
                        <Text style={[styles.statusPillText, { color: sColor }]}>
                            {capitalize(studentStatus)}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Info rows */}
                <View style={styles.details}>
                    <DetailRow label="SID" value={student?.sid ?? '—'} />
                    <DetailRow label="Seat" value={student?.seat?.seatNumber || '—'} />
                    <DetailRow label="Shift time" value={formattedShiftTime} />
                    <DetailRow
                        label="Valid till"
                        value={student?.account?.validTill ? formatDate(student.account.validTill) : '—'}
                    />
                    <DetailRow
                        label="Remaining Days"
                        value={student?.account?.remainingDays !== undefined ? `${student.account.remainingDays} days` : '—'}
                        valueColor={student?.account?.remainingDays > 0 ? '#10B981' : '#EF4444'}
                    />
                    {student?.account?.dueDays > 0 && (
                        <DetailRow
                            label="Due days"
                            value={`${student.account.dueDays} days`}
                            valueColor="#EF4444"
                        />
                    )}
                </View>

                {/* Finance chips */}
                <View style={styles.financeRow}>
                    <FinanceChip label="Monthly" value={fmt(student?.billing?.netCycleAmount)} color="#8B5CF6" />
                    <FinanceChip
                        label="Due"
                        value={fmt(student?.account?.dueAmount)}
                        color={student?.account?.dueAmount > 0 ? '#EF4444' : '#10B981'}
                    />
                </View>

                {/* Badges */}
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: `${pColor}15`, borderColor: `${pColor}35` }]}>
                        <Text style={[styles.badgeText, { color: pColor }]}>
                            {paymentLabel(paymentStatus)}
                        </Text>
                    </View>
                    <View style={styles.badgeMuted}>
                        <Text style={styles.badgeMutedText}>
                            🪑 {seatStatus.replace(/_/g, ' ')}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.btnDelete}
                        onPress={() => setShowDeleteModal(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnDeleteText}>हटाएं</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.btnPay}
                        onPress={() => setShowPaymentModal(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnPayText}>भुगतान करें</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {/* ─── Payment Modal with Live Preview ─── */}
            <Modal
                visible={showPaymentModal}
                transparent
                animationType="fade"
                onRequestClose={() => { setShowPaymentModal(false); setAmountPaid(''); setPreviewData(null) }}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>भुगतान विवरण</Text>
                        <Text style={styles.modalStudentName}>{student?.name || '—'}</Text>

                        {/* Current info */}
                        <View style={styles.modalInfoCard}>
                            <ModalRow
                                label="वर्तमान बकाया"
                                value={fmt(student?.account?.dueAmount)}
                                valueColor="#EF4444"
                            />
                            <ModalRow
                                label="मासिक राशि"
                                value={fmt(student?.billing?.netCycleAmount)}
                            />
                            <ModalRow
                                label="शेष दिन"
                                value={student?.account?.remainingDays !== undefined ? `${student.account.remainingDays} दिन` : '—'}
                                valueColor={student?.account?.remainingDays > 0 ? '#10B981' : '#EF4444'}
                            />
                        </View>

                        {/* Amount input */}
                        <Text style={styles.inputLabel}>भुगतान राशि</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                            value={amountPaid}
                            onChangeText={setAmountPaid}
                            keyboardType="numeric"
                        />

                        {/* ─── Preview Section ─── */}
                        {previewLoading && (
                            <View style={styles.previewLoading}>
                                <ActivityIndicator size="small" color="#8B5CF6" />
                                <Text style={styles.previewLoadingText}>प्रभाव की गणना हो रही है…</Text>
                            </View>
                        )}

                        {previewData && !previewLoading && (
                            <View style={styles.previewCard}>
                                <Text style={styles.previewTitle}>📊 भुगतान के बाद का प्रभाव</Text>

                                {/* ── Breakdown equation ── */}
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
                                            {formatDate(previewData.newValidTill)}
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

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalBtnCancel}
                                onPress={() => { setShowPaymentModal(false); setAmountPaid(''); setPreviewData(null) }}
                            >
                                <Text style={styles.modalBtnCancelText}>रद्द करें</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalBtnConfirm,
                                    (isProcessing || !amountPaid || parseFloat(amountPaid) <= 0) && styles.btnDisabled
                                ]}
                                onPress={handleConfirmPayment}
                                disabled={isProcessing || !amountPaid || parseFloat(amountPaid) <= 0}
                            >
                                <Text style={styles.modalBtnConfirmText}>
                                    {isProcessing ? 'प्रोसेस हो रहा है…' : 'पुष्टि करें'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── Delete Modal ─── */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>छात्र हटाएं</Text>
                        <Text style={styles.modalStudentName}>{student?.name || '—'}</Text>

                        <View style={styles.warningCard}>
                            <Text style={styles.warningTitle}>⚠️ चेतावनी</Text>
                            <Text style={styles.warningBody}>
                                क्या आप वाकई इस छात्र को हटाना चाहते हैं? यह क्रिया वापस नहीं की जा सकती।
                            </Text>
                        </View>

                        <View style={styles.modalInfoCard}>
                            <ModalRow label="छात्र ID" value={student?.sid ?? '—'} />
                            <ModalRow label="सीट नंबर" value={student?.seat?.seatNumber || '—'} />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowDeleteModal(false)}>
                                <Text style={styles.modalBtnCancelText}>रद्द करें</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnDelete, isDeleting && styles.btnDisabled]}
                                onPress={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                <Text style={styles.modalBtnConfirmText}>
                                    {isDeleting ? 'हटा रहे हैं…' : 'हटाएं'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    )
}

/* ────────────────────────────────────────────────────────────────
   Sub‑Components
   ──────────────────────────────────────────────────────────────── */

const DetailRow = ({ label, value, valueColor }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{String(value)}</Text>
    </View>
)

const FinanceChip = ({ label, value, color }) => (
    <View style={[styles.financeChip, { borderColor: `${color}25` }]}>
        <Text style={[styles.financeValue, { color }]}>{value}</Text>
        <Text style={styles.financeLabel}>{label}</Text>
    </View>
)

const ModalRow = ({ label, value, valueColor }) => (
    <View style={styles.modalRow}>
        <Text style={styles.modalRowLabel}>{label}</Text>
        <Text style={[styles.modalRowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
)

const PreviewRow = ({ label, before, after, isPositive, isMoney = false }) => {
    const fmtVal = (v) => (isMoney ? fmt(v) : `${v} दिन`)
    let color = '#6B7280'
    if (isPositive === true) color = '#10B981'
    else if (isPositive === false) color = '#EF4444'

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
    )
}

/* ────────────────────────────────────────────────────────────────
   Styles
   ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
        borderLeftWidth: 4,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        paddingBottom: 10,
        gap: 10,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    nameBlock: {
        flex: 1,
        gap: 3,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: 0.1,
    },
    shiftLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 14,
    },
    details: {
        paddingHorizontal: 14,
        paddingTop: 10,
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    detailLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        flex: 1,
    },
    detailValue: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },
    financeRow: {
        flexDirection: 'row',
        marginHorizontal: 14,
        marginTop: 12,
        gap: 8,
    },
    financeChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        gap: 2,
    },
    financeValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    financeLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    badgeRow: {
        flexDirection: 'row',
        marginHorizontal: 14,
        marginTop: 10,
        gap: 8,
        flexWrap: 'wrap',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    badgeMuted: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    badgeMutedText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    actions: {
        flexDirection: 'row',
        margin: 14,
        marginTop: 12,
        gap: 10,
    },
    btnDelete: {
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 20,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    btnDeleteText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '700',
    },
    btnPay: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    btnPayText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },

    /* ─── Modal ─── */
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 22,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 4,
    },
    modalStudentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B5CF6',
        textAlign: 'center',
        marginBottom: 16,
    },
    modalInfoCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    modalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalRowLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    modalRowValue: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '700',
    },
    inputLabel: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 16,
        color: '#111827',
        marginBottom: 18,
    },
    previewLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
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
        marginBottom: 18,
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
    warningCard: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderLeftWidth: 4,
        borderColor: '#FECACA',
        borderLeftColor: '#EF4444',
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 6,
    },
    warningBody: {
        fontSize: 13,
        color: '#7F1D1D',
        textAlign: 'center',
        lineHeight: 19,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalBtnCancel: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    modalBtnCancelText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
    },
    modalBtnConfirm: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
    },
    modalBtnDelete: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        alignItems: 'center',
    },
    modalBtnConfirmText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    btnDisabled: {
        opacity: 0.45,
    },
})