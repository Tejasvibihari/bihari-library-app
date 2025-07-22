import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    SafeAreaView,
    Share,
    Alert,
    Linking,
    Platform,
    FlatList,
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Loading from '../components/Loading';
import client from '../service/axiosClient';
import InvoiceCard from '../components/InvoiceCard';

const { width, height } = Dimensions.get('window');

const SingleStudentProfile = ({ route, navigation }) => {
    const [student, setStudent] = useState(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [scaleAnim] = useState(new Animated.Value(0.8));
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const passedStudent = route.params?.student;

    // Initialize student and animations
    useEffect(() => {
        if (passedStudent) {
            setStudent(passedStudent);
            startAnimations();
        }
    }, [passedStudent]);

    // Fetch invoices when student is available
    useEffect(() => {
        if (passedStudent?.sid) {
            fetchInvoices();
        }
    }, [passedStudent?.sid]);

    const startAnimations = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            })
        ]).start();
    }, [fadeAnim, slideAnim, scaleAnim]);

    const fetchInvoices = useCallback(async () => {
        if (!passedStudent?.sid) return;

        setLoading(true);
        try {
            const response = await client.get(`api/invoice/getinvoicebysid/${passedStudent.sid}`);
            setInvoices(response.data || []);
        } catch (error) {
            // console.error('Error fetching invoices:', error.message);
            // Alert.alert('Error', 'Failed to fetch invoice details.');
        } finally {
            setLoading(false);
        }
    }, [passedStudent?.sid]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchInvoices();
        setRefreshing(false);
    }, [fetchInvoices]);

    const formatDate = useCallback((dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }, []);

    const handleShare = useCallback(async () => {
        if (!student) return;

        try {
            const message = `Student Details:
Name: ${student.name || 'N/A'}
SID: ${student.sid || 'N/A'}
Shift: ${student.shift || 'N/A'}
Time: ${student.time || 'N/A'}
Mobile: ${student.mobile || 'N/A'}
Email: ${student.email || 'N/A'}`;

            await Share.share({ message });
        } catch (error) {
            Alert.alert('Error', 'Could not share student details');
        }
    }, [student]);

    const handleCall = useCallback(() => {
        if (!student?.mobile) {
            Alert.alert('Error', 'No phone number available');
            return;
        }

        const phoneUrl = `tel:${student.mobile}`;
        Linking.canOpenURL(phoneUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(phoneUrl);
                } else {
                    Alert.alert('Error', 'Phone dialer is not available on this device');
                }
            })
            .catch((err) => {
                Alert.alert('Error', 'Could not open phone dialer');
                console.error('Error opening dialer:', err);
            });
    }, [student?.mobile]);

    const handleSms = useCallback(() => {
        if (!student?.mobile) {
            Alert.alert('Error', 'No phone number available for SMS');
            return;
        }

        const body = `Dear ${student.name || 'Student'},

This is a gentle reminder that your library fee is due. Kindly make the payment at your earliest convenience to continue enjoying uninterrupted library services.

If you have already paid, please ignore this message.

Thank you for being a valued member.

Regards,  
Bihari Library  
📞 Mobile: 9608888400  
📧 Email: biharilibrary@gmail.com  
🌐 Website: https://biharilibrary.in/`;

        const separator = Platform.OS === 'ios' ? '&' : '?';
        const smsUrl = `sms:${student.mobile}${separator}body=${encodeURIComponent(body)}`;

        Linking.canOpenURL(smsUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(smsUrl);
                } else {
                    Alert.alert('Error', 'SMS client is not available on this device');
                }
            })
            .catch((err) => {
                Alert.alert('Error', 'Could not open SMS client');
                console.error('Error opening SMS:', err);
            });
    }, [student?.mobile, student?.name]);

    const handleWhatsApp = useCallback(() => {
        if (!student?.mobile) {
            Alert.alert('Error', 'No phone number available for WhatsApp');
            return;
        }

        const formattedDate = student.lastPayment
            ? formatDate(student.lastPayment)
            : 'Not Available';

        const message = `Hello ${student.name || 'Student'}, 👋

This is a reminder from *Bihari Library* regarding your membership (SID: ${student.sid || 'N/A'}).

📢 *Your monthly fee is due.*  
Please make the payment at your earliest convenience to continue enjoying uninterrupted services.

🧾 Total Due: ₹${student.paymentDue || '___'}  
📅 Last Payment Date: ${formattedDate}

You can make the payment by visiting the library or through the available methods.

📞 9608888400  
📧 biharilibrary@gmail.com  
🌐 https://biharilibrary.in/

Thank you for being a part of Bihari Library.  
– *Bihari Library*`;

        const whatsappUrl = `whatsapp://send?phone=91${student.mobile}&text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(whatsappUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(whatsappUrl);
                } else {
                    const webUrl = `https://wa.me/91${student.mobile}?text=${encodeURIComponent(message)}`;
                    return Linking.openURL(webUrl);
                }
            })
            .catch((err) => {
                Alert.alert('Error', 'Could not open WhatsApp');
                console.error('Error opening WhatsApp:', err);
            });
    }, [student, formatDate]);

    // Memoized components for better performance
    const InfoCard = useMemo(() => ({ icon, title, value, iconColor = '#8B5CF6' }) => (
        <Animated.View
            style={[
                styles.infoCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <View style={styles.infoCardContent}>
                <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                    <Ionicons name={icon} size={20} color={iconColor} />
                </View>
                <View style={styles.infoTextContainer}>
                    <Text style={styles.infoTitle}>{title}</Text>
                    <Text style={styles.infoValue} numberOfLines={2}>{value || 'N/A'}</Text>
                </View>
            </View>
        </Animated.View>
    ), [fadeAnim, slideAnim]);

    const ActionButton = useMemo(() => ({ icon, title, onPress, color = '#8B5CF6', disabled = false }) => (
        <TouchableOpacity
            style={[
                styles.actionButton,
                { backgroundColor: disabled ? '#9CA3AF' : color },
                disabled && styles.disabledButton
            ]}
            onPress={disabled ? null : onPress}
            activeOpacity={disabled ? 1 : 0.8}
            disabled={disabled}
        >
            <Ionicons name={icon} size={20} color="#fff" />
            <Text style={[styles.actionButtonText, { fontSize: 12 }]}>{title}</Text>
        </TouchableOpacity>
    ), []);

    if (!student) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Loading />
                </View>
            </SafeAreaView>
        );
    }

    const profileImageUri = student.image
        ? `https://api.biharilibrary.in/uploads/${student.image}`
        : null;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

            {/* Header */}
            <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Student Profile</Text>

                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleShare}
                    >
                        <Ionicons name="share-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Profile Section */}
                <Animated.View
                    style={[
                        styles.profileSection,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.profileImageContainer}>
                        <Image
                            source={
                                profileImageUri
                                    ? { uri: profileImageUri }
                                    : require('../assets/bihari.png')
                            }
                            style={styles.profileImage}
                            defaultSource={require('../assets/bihari.png')}
                        />
                        <View style={[
                            styles.statusIndicator,
                            { backgroundColor: student.isOnline ? '#10B981' : '#EF4444' }
                        ]}>
                            <Text style={styles.statusText}>
                                {student.isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.profileInfo}>
                        <Text style={styles.studentName}>{student.name || 'Unknown Student'}</Text>
                        <Text style={styles.studentId}>SID: {student.sid || 'N/A'}</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: student.status === 'Active' ? '#10B981' : '#EF4444' }
                        ]}>
                            <Text style={styles.statusBadgeText}>{student.status || 'Unknown'}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <ActionButton
                        icon="call"
                        title="Call"
                        onPress={handleCall}
                        color="#10B981"
                        disabled={!student.mobile}
                    />
                    <ActionButton
                        icon="logo-whatsapp"
                        title="WhatsApp"
                        onPress={handleWhatsApp}
                        color="#25D366"
                        disabled={!student.mobile}
                    />
                    <ActionButton
                        icon="chatbubble"
                        title="SMS"
                        onPress={handleSms}
                        color="#3B82F6"
                        disabled={!student.mobile}
                    />
                </View>

                {/* Information Cards */}
                <View style={styles.infoSection}>
                    {student.father && (
                        <InfoCard
                            icon="person"
                            title="Father's Name"
                            value={student.father}
                            iconColor="#8B5CF6"
                        />
                    )}

                    {student.gender && (
                        <InfoCard
                            icon="male-female"
                            title="Gender"
                            value={student.gender}
                            iconColor="#EC4899"
                        />
                    )}

                    {student.address && (
                        <InfoCard
                            icon="location"
                            title="Address"
                            value={student.address.replace(/\+/g, ' ')}
                            iconColor="#10B981"
                        />
                    )}

                    <InfoCard
                        icon="call"
                        title="Mobile Number"
                        value={student.mobile}
                        iconColor="#3B82F6"
                    />

                    <InfoCard
                        icon="mail"
                        title="Email Address"
                        value={student.email}
                        iconColor="#F59E0B"
                    />

                    <InfoCard
                        icon="calendar"
                        title="Admission Date"
                        value={formatDate(student.admissionDate)}
                        iconColor="#EF4444"
                    />

                    {(student.shift || student.time) && (
                        <InfoCard
                            icon="time"
                            title="Shift & Time"
                            value={`${student.shift || 'N/A'} (${student.time || 'N/A'})`}
                            iconColor="#8B5CF6"
                        />
                    )}

                    <InfoCard
                        icon="card"
                        title="Payment Amount"
                        value={`₹${student.paymentAmount || 0}`}
                        iconColor="#10B981"
                    />

                    {student.seatNumber && (
                        <InfoCard
                            icon="bookmark"
                            title="Seat Number"
                            value={student.seatNumber}
                            iconColor="#F59E0B"
                        />
                    )}

                    <InfoCard
                        icon="calendar"
                        title="Last Payment Date"
                        value={formatDate(student.lastPayment)}
                        iconColor="#8B5CF6"
                    />

                    <InfoCard
                        icon="calendar-outline"
                        title="Next Payment Date"
                        value={formatDate(student.nextPayment)}
                        iconColor="#F59E0B"
                    />

                    <InfoCard
                        icon="card"
                        title="Payment Due"
                        value={`₹${student.paymentDue || 0}`}
                        iconColor={Number(student.paymentDue) > 0 ? '#EF4444' : '#10B981'}
                    />

                    {student.guardian && (
                        <InfoCard
                            icon="shield"
                            title="Guardian"
                            value={student.guardian}
                            iconColor="#EC4899"
                        />
                    )}
                </View>

                {/* Payment Status Section */}
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionTitle}>Payment Status</Text>
                    <View style={[
                        styles.paymentStatusCard,
                        { backgroundColor: Number(student.paymentDue) > 0 ? '#FEF2F2' : '#F0FDF4' }
                    ]}>
                        <View style={styles.paymentStatusContent}>
                            <Ionicons
                                name={Number(student.paymentDue) > 0 ? "warning" : "checkmark-circle"}
                                size={24}
                                color={Number(student.paymentDue) > 0 ? "#EF4444" : "#10B981"}
                            />
                            <Text style={[
                                styles.paymentStatusText,
                                { color: Number(student.paymentDue) > 0 ? "#EF4444" : "#10B981" }
                            ]}>
                                {Number(student.paymentDue) > 0
                                    ? `Payment Due: ₹${student.paymentDue}`
                                    : 'Payment Up to Date'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Invoices Section */}
                {invoices.length > 0 && (
                    <View style={styles.invoicesSection}>
                        <Text style={styles.sectionTitle}>Recent Invoices</Text>
                        <FlatList
                            data={invoices}
                            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                            renderItem={({ item }) => <InvoiceCard invoice={item} />}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                )}

                {loading && (
                    <View style={styles.loadingContainer}>
                        <Loading />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    header: {
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        elevation: 8,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    shareButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    profileSection: {
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 20,
        marginHorizontal: 20,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#8B5CF6',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },
    profileInfo: {
        alignItems: 'center',
    },
    studentName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 5,
        textAlign: 'center',
    },
    studentId: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginHorizontal: 20,
        marginVertical: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minWidth: 90,
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 12,
    },
    infoSection: {
        paddingHorizontal: 20,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    infoCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '600',
        flexWrap: 'wrap',
    },
    paymentSection: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 15,
    },
    paymentStatusCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    paymentStatusContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentStatusText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
        flex: 1,
    },
    invoicesSection: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
});

export default SingleStudentProfile;
