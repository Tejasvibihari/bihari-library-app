import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert } from "react-native"
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import axios from 'axios';
import client from "../service/axiosClient";

export const StudentCard = ({ student, onPress }) => {
    const navigation = useNavigation();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [extraDueAmount, setExtraDueAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCardPress = () => {
        navigation.navigate('SingleStudentProfile', { student }); // Pass the student data
    };

    const handlePaymentButtonPress = (e) => {
        e.stopPropagation(); // Prevent card click
        setShowPaymentModal(true);
    };

    const handleCancelPayment = () => {
        setShowPaymentModal(false);
        setExtraDueAmount('');
    };

    const handleConfirmPayment = async () => {
        if (isProcessing) return;

        setIsProcessing(true);

        try {
            // Replace with your actual API endpoint
            const response = await client.post('/api/payment/makepayment', {
                sid: student.sid,
                extraPaymentAmount: parseFloat(extraDueAmount) || 0,
            });
            console.log(response)
            if (response.data.message === 'Payment processed and invoice created.') {
                Alert.alert(
                    'सफलता',
                    'भुगतान सफलतापूर्वक प्रोसेस हो गया!',
                    [{ text: 'ठीक है' }]
                );
                setShowPaymentModal(false);
                setExtraDueAmount('');
                // You might want to refresh the student data here
                if (onPress) {
                    onPress(student);
                }
            } else {
                Alert.alert(
                    'त्रुटि',
                    'भुगतान प्रोसेस करने में समस्या आई।',
                    [{ text: 'ठीक है' }]
                );
            }
        } catch (error) {
            console.error('Payment error:', error);
            Alert.alert(
                'त्रुटि',
                'भुगतान प्रोसेस करने में समस्या आई।',
                [{ text: 'ठीक है' }]
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusColor = () => {
        switch (student?.status) {
            case 'Active': return '#10B981'
            case 'Pending': return '#F59E0B'
            case 'Inactive': return '#EF4444'
            default: return '#6B7280'
        }
    }

    const getSPaymentDueColor = () => {
        if (student?.paymentDue < 0) {
            return '#EF4444'; // Red for due
        } else {
            return '#F59E0B'; // Yellow for due
        }
    }

    const formatTime = (time) => {
        if (!time) return 'N/A'
        return time
    }

    const formatAmount = (amount) => {
        if (!amount) return 'N/A'
        return `₹${amount}`
    }

    return (
        <>
            <TouchableOpacity
                style={styles.studentCard}
                onPress={handleCardPress}
                activeOpacity={0.7}
            >
                <View style={styles.studentHeader}>
                    <View style={styles.profileSection}>
                        <Image
                            source={
                                student?.image
                                    ? { uri: `https://api.biharilibrary.in/uploads/${student.image}` }
                                    : require('../assets/bihari.png') // fallback image
                            }
                            style={styles.profilePicture}
                            defaultSource={require('../assets/bihari.png')} // (for Android fade-in)
                            resizeMode="cover"
                        />
                        <View style={styles.nameContainer}>
                            <Text style={styles.studentName}>{student?.name || 'N/A'}</Text>
                            <Text style={styles.shiftText}>{student?.shift || 'N/A'}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                        <Text style={styles.statusText}>{(student?.status || 'Unknown').toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                        <Text style={styles.labelText}>SID:</Text>
                        <Text style={styles.valueText}>{student?.sid || 'N/A'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.labelText}>Time:</Text>
                        <Text style={styles.valueText}>{formatTime(student?.time)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.labelText}>Seat:</Text>
                        <Text style={styles.valueText}>{student?.seatNumber || 'N/A'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.labelText}>Due Amount:</Text>
                        <Text style={[styles.amountText, { color: getSPaymentDueColor() }]}>{formatAmount(student?.paymentDue)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.labelText}>Amount:</Text>
                        <Text style={styles.amountText}>{formatAmount(student?.paymentAmount)}</Text>
                    </View>
                </View>

                {/* Payment Button Section */}
                <View style={styles.paymentSection}>
                    <TouchableOpacity
                        style={styles.paymentButton}
                        onPress={handlePaymentButtonPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.paymentButtonText}>भुगतान करें</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {/* Payment Modal */}
            <Modal
                visible={showPaymentModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancelPayment}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>भुगतान विवरण</Text>
                        <Text style={styles.studentNameModal}>{student?.name || 'N/A'}</Text>

                        <View style={styles.paymentDetails}>
                            <Text style={styles.detailLabel}>वर्तमान बकाया राशि: <Text style={styles.detailValue}>{formatAmount(student?.paymentDue)}</Text></Text>
                            <Text style={styles.detailLabel}>नियमित राशि: <Text style={styles.detailValue}>{formatAmount(student?.paymentAmount)}</Text></Text>
                        </View>

                        <Text style={styles.inputLabel}>क्या कोई अतिरिक्त बकाया राशि है?</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="अतिरिक्त राशि दर्ज करें (वैकल्पिक)"
                            value={extraDueAmount}
                            onChangeText={setExtraDueAmount}
                            keyboardType="numeric"
                            placeholderTextColor="#9CA3AF"
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={handleCancelPayment}
                                disabled={isProcessing}
                            >
                                <Text style={styles.cancelButtonText}>रद्द करें</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton, isProcessing && styles.disabledButton]}
                                onPress={handleConfirmPayment}
                                disabled={isProcessing}
                            >
                                <Text style={styles.confirmButtonText}>
                                    {isProcessing ? 'प्रोसेस हो रहा है...' : 'भुगतान पुष्टि करें'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    studentCard: {
        backgroundColor: '#ffffff',
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#8B5CF6',
    },
    studentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    profilePicture: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#F3F4F6',
    },
    nameContainer: {
        flex: 1,
    },
    studentName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    shiftText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    detailsContainer: {
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        flex: 1,
    },
    valueText: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },
    amountText: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },
    // Payment Button Styles
    paymentSection: {
        marginTop: 16,
        alignItems: 'flex-end',
    },
    paymentButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#8B5CF6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    paymentButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    studentNameModal: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8B5CF6',
        textAlign: 'center',
        marginBottom: 20,
    },
    paymentDetails: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    detailValue: {
        fontWeight: '600',
        color: '#1F2937',
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
        marginBottom: 24,
        backgroundColor: '#ffffff',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#8B5CF6',
    },
    confirmButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#D1D5DB',
    },
});