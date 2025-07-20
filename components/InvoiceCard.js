import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const InvoiceCard = ({
    invoice,
    onPress = () => { }
}) => {
    // Format date helper
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };


    // Format currency helper
    const formatCurrency = (amount) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    // Get payment status
    const getPaymentStatus = () => {
        if (invoice.remainingDue < 0) {
            return { status: 'Due', color: '#EF4444', bgColor: '#FEF2F2' };
        } else if (invoice.remainingDue === 0) {
            return { status: 'Paid', color: '#10B981', bgColor: '#ECFDF5' };
        } else {
            return { status: 'OverPaid', color: '#10B981', bgColor: '#ECFDF5' };
        }
    };

    const paymentStatus = getPaymentStatus();

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Header with SID and Status */}
            <View style={styles.header}>
                <View style={styles.invoiceInfo}>
                    <Text style={styles.studentId}>SID: {invoice.sid}</Text>
                    <Text style={styles.invoiceIdHeader}>#{invoice._id.slice(-8)}</Text>
                </View>

                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: paymentStatus.bgColor }]}>
                    <Text style={[styles.statusText, { color: paymentStatus.color }]}>
                        {paymentStatus.status}
                    </Text>
                </View>
            </View>

            {/* Invoice Details */}
            <View style={styles.detailsContainer}>
                {/* Payment Date */}
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Date</Text>
                    <Text style={styles.detailValue}>
                        {formatDate(invoice.paymentDate)}
                    </Text>
                </View>

                {/* Cycle Period */}
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cycle Period</Text>
                    <Text style={styles.detailValue}>
                        {formatDate(invoice.cycleStart)} - {formatDate(invoice.cycleEnd)}
                    </Text>
                </View>

                {/* Amount Paid */}
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount Paid</Text>
                    <Text style={[styles.detailValue, styles.amountPaid]}>
                        {formatCurrency(invoice.amountPaid)}
                    </Text>
                </View>

                {/* Extra Amount (if any) */}
                {invoice.extraAmountPaid > 0 && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Extra Amount</Text>
                        <Text style={[styles.detailValue, styles.extraAmount]}>
                            {formatCurrency(invoice.extraAmountPaid)}
                        </Text>
                    </View>
                )}

                {/* Remaining Due */}
                <View style={[styles.detailRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>
                        {invoice.remainingDue < 0 ? 'Overpaid' : 'Remaining Due'}
                    </Text>
                    <Text style={[
                        styles.totalValue,
                        invoice.remainingDue > 0 ? styles.overpaid : styles.due
                    ]}>
                        {formatCurrency(Math.abs(invoice.remainingDue))}
                    </Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.invoiceId}>Invoice ID: {invoice._id}</Text>
                <Text style={styles.createdDate}>
                    Created: {formatDate(invoice.createdAt)}
                </Text>
            </View>

            {/* Updated Date */}
            <View style={styles.updatedContainer}>
                <Text style={styles.updatedDate}>
                    Updated: {formatDate(invoice.updatedAt)}
                </Text>
                <Text style={styles.version}>v{invoice.__v}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    invoiceInfo: {
        flex: 1,
    },
    studentId: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    invoiceIdHeader: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    detailsContainer: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
    },
    amountPaid: {
        color: '#8B5CF6',
        fontWeight: '600',
    },
    extraAmount: {
        color: '#10B981',
        fontWeight: '600',
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 12,
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    due: {
        color: '#EF4444',
    },
    overpaid: {
        color: '#10B981',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    invoiceId: {
        fontSize: 12,
        color: '#9CA3AF',
        flex: 1,
    },
    createdDate: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
    },
    updatedContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    updatedDate: {
        fontSize: 11,
        color: '#9CA3AF',
        flex: 1,
    },
    version: {
        fontSize: 11,
        color: '#9CA3AF',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
});

export default InvoiceCard;