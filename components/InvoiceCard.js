import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Alert,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons'; // or react-native-vector-icons/Feather
import axios from 'axios';
import client from '../service/axiosClient';

const { width } = Dimensions.get('window');

const InvoiceCard = ({
    invoice,
    onPress = () => { },
    onDelete = () => { }, // Optional callback after successful deletion
    // Configure your API endpoint
}) => {
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(false);
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

    // Delete invoice function
    const handleDelete = async () => {
        Alert.alert(
            "Delete Invoice",
            "Are you sure you want to delete this invoice? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteInvoice()
                }
            ]
        );
    };

    useEffect(() => {
        const fetchAllStudent = async () => {
            try {
                setLoading(true)
                const response = await client.get(`/api/student/getstudentbysid/${invoice?.sid}`);
                setStudent(response.data);
                setLoading(false);
            } catch (error) {
                setLoading(false);
                console.log(error);
            }
        }
        fetchAllStudent();
    }, [invoice])

    const deleteInvoice = async () => {
        try {
            const response = await client.delete(`/api/invoice/deleteinvoice/${invoice?._id}/${invoice?.sid}`);

            if (response.status === 200 || response.status === 204) {
                // Success - call the onDelete callback
                onDelete(invoice._id);
                Alert.alert("Success", "Invoice deleted successfully");
            }
        } catch (error) {
            console.error('Delete error:', error);
            Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete invoice. Please try again."
            );
        }
    };

    const paymentStatus = getPaymentStatus();

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Header with Profile, Info, Status, and Delete Button */}
            <View style={styles.header}>
                <View style={styles.leftSection}>
                    {/* Student Profile Picture */}
                    <Image
                        source={
                            student?.image
                                ? { uri: `https://api.biharilibrary.in/uploads/${student?.image}` }
                                : require('../assets/bihari.png') // fallback image
                        }
                        style={styles.profilePicture}
                        defaultSource={require('../assets/bihari.png')} // (for Android fade-in)
                        resizeMode="cover"
                    />

                    {/* Student Info */}
                    <View style={styles.invoiceInfo}>
                        <Text style={styles.studentId}>SID: {invoice.sid}</Text>
                        {student?.name && (
                            <Text style={styles.studentName}>{student.name}</Text>
                        )}
                        <Text style={styles.invoiceIdHeader}>#{invoice._id.slice(-8)}</Text>
                    </View>
                </View>

                <View style={styles.headerActions}>
                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: paymentStatus.bgColor }]}>
                        <Text style={[styles.statusText, { color: paymentStatus.color }]}>
                            {paymentStatus.status}
                        </Text>
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDelete}
                        activeOpacity={0.7}
                    >
                        <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
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
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profilePicture: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    invoiceInfo: {
        flex: 1,
    },
    studentId: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    studentName: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 2,
    },
    invoiceIdHeader: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '400',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
    deleteButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
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
