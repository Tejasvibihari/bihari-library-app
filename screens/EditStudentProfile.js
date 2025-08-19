import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    TextInput,
    Dimensions,
    StatusBar,
    SafeAreaView,
    Alert,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import client from '../service/axiosClient';

const { width } = Dimensions.get('window');

const EditStudentProfile = ({ route, navigation }) => {
    const { student: initialStudent } = route.params;
    console.log("hello")
    const [formData, setFormData] = useState({
        sid: '',
        name: '',
        email: '',
        mobile: '',
        father: '',
        guardian: '',
        gender: '',
        admissionDate: new Date(),
        shift: '',
        time: '',
        paymentAmount: '',
        address: '',
        image: '',
        seatNumber: '',
        instagram: '',
        facebook: '',
        youtube: '',
        nextPayment: new Date(),
        status: 'Active',
        seatShift: '' // For tracking seat shift logic
    });

    const [loading, setLoading] = useState(false);
    const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState(false);
    const [showNextPaymentPicker, setShowNextPaymentPicker] = useState(false);
    const [imageUri, setImageUri] = useState(null);

    /** Shift-Time mapping for dynamic rendering */
    const shiftTimeOptions = {
        Morning: [
            "07:00 AM - 11:00 AM",
            "07:00 AM - 07:00 PM"
        ],
        Afternoon: ["11:00 AM - 03:00 PM"],
        Evening: ["03:00PM - 07:00PM"],
        Night: [
            "07:00 PM - 11:00 PM",
            "07:00 PM - 07:00 AM"
        ],
        Double: [
            "07:00 AM - 03:00 PM",
            "11:00 AM - 07:00 PM"
        ],
        "24Hours": ["24 Hours"]
    };

    /** Handle shift change (reset time) */
    const handleShiftChange = (value) => {
        handleInputChange('shift', value);
        handleInputChange('time', '');
    };

    /** Handle time change & auto-set payment amount & seat shift */
    const handleTimeChange = (selectedTime) => {
        handleInputChange('time', selectedTime);

        let amount = 0;
        let newSeatShift = "";

        switch (selectedTime) {
            case "07:00 AM - 11:00 AM":
                amount = 300; newSeatShift = "morning"; break;
            case "11:00 AM - 03:00 PM":
                amount = 300; newSeatShift = "afternoon"; break;
            case "03:00PM - 07:00PM":
                amount = 300; newSeatShift = "evening"; break;
            case "07:00 PM - 11:00 PM":
                amount = 300; newSeatShift = "night"; break;
            case "07:00 PM - 07:00 AM":
                amount = 500; newSeatShift = "nightLong"; break;
            case "07:00 AM - 03:00 PM":
                amount = 500; newSeatShift = "doubleMorning"; break;
            case "11:00 AM - 07:00 PM":
                amount = 500; newSeatShift = "doubleEvening"; break;
            case "07:00 AM - 07:00 PM":
                amount = 700; newSeatShift = "morningLong"; break;
            case "24 Hours":
                amount = 1000; newSeatShift = "fullDay"; break;
            default:
                amount = 0; newSeatShift = "";
        }

        handleInputChange('paymentAmount', amount.toString());
        handleInputChange('seatShift', newSeatShift);
    };
    console.log("Initial time:", initialStudent.time);
    console.log("Available options:", shiftTimeOptions[initialStudent.shift]);

    /** Initialize form data with student info */
    useEffect(() => {
        if (initialStudent) {
            setFormData({
                sid: initialStudent.sid || '',
                name: initialStudent.name || '',
                email: initialStudent.email || '',
                mobile: initialStudent.mobile || '',
                father: initialStudent.father || '',
                guardian: initialStudent.guardian || '',
                gender: initialStudent.gender || '',
                admissionDate: initialStudent.admissionDate ? new Date(initialStudent.admissionDate) : new Date(),
                shift: initialStudent.shift || '', // must match picker option exactly
                time: normalizeTime(initialStudent.time) || '',
                paymentAmount: initialStudent.paymentAmount?.toString() || '',
                address: initialStudent.address || '',
                image: initialStudent.image || '',
                seatNumber: initialStudent.seatNumber || '',
                instagram: initialStudent.instagram || '',
                facebook: initialStudent.facebook || '',
                youtube: initialStudent.youtube || '',
                nextPayment: initialStudent.nextPayment ? new Date(initialStudent.nextPayment) : new Date(),
                status: initialStudent.status || 'Active',
                seatShift: initialStudent.seatShift || ''
            });

            if (initialStudent.image) {
                setImageUri(`https://api.biharilibrary.in/uploads/${initialStudent.image}`);
            }
        }
    }, [initialStudent]);
    const normalizeTime = (time) => {
        if (!time) return '';
        // Add space before AM/PM if missing and trim spaces
        return time
            .replace(/AM/g, ' AM')
            .replace(/PM/g, ' PM')
            .replace(/\s+/g, ' ')
            .trim();
    };
    /** Update formData state */
    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    /** Image picker handler */
    const handleImagePicker = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please grant camera roll permissions to change the profile picture.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setImageUri(asset.uri);
                setFormData(prev => ({
                    ...prev,
                    image: `data:image/jpeg;base64,${asset.base64}`
                }));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
            console.error('Image picker error:', error);
        }
    }, []);




    /** Validate form before submit */
    const validateForm = useCallback(() => {
        const requiredFields = ['name', 'email', 'mobile', 'sid'];
        const missingFields = requiredFields.filter(field => {
            const value = formData[field];
            return !value?.toString().trim();
        });

        if (missingFields.length > 0) {
            Alert.alert('Validation Error', `Please fill in: ${missingFields.join(', ')}`);
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert('Validation Error', 'Please enter a valid email address');
            return false;
        }

        // Mobile validation
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(formData.mobile)) {
            Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number');
            return false;
        }

        return true;
    }, [formData]);


    /** Submit handler with confirmation */
    const handleSubmit = useCallback(() => {
        if (!validateForm()) return;
        console.log("Handle Submit Clicked")
        Alert.alert(
            'Confirm Update',
            'Are you sure you want to update the student details?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Update', onPress: performUpdate }
            ]
        );
    }, [formData, validateForm]);

    /** Perform actual update API call */
    const performUpdate = useCallback(async () => {
        try {
            setLoading(true);

            const cleanedData = {
                ...formData,
                sid: formData.sid.toString().trim(),
                name: formData.name.trim(),
                email: formData.email.trim(),
                mobile: formData.mobile.trim(),
                father: formData.father?.trim() || '',
                guardian: formData.guardian?.trim() || '',
                address: formData.address?.trim() || '',
                instagram: formData.instagram?.trim() || '',
                facebook: formData.facebook?.trim() || '',
                youtube: formData.youtube?.trim() || '',
                seatNumber: formData.seatNumber?.trim() || '',
                admissionDate: formData.admissionDate.toISOString(),
                nextPayment: formData.nextPayment.toISOString(),
                paymentAmount: parseFloat(formData.paymentAmount) || 0
            };

            await client.post('/api/student/updatestudent', cleanedData);

            Alert.alert('Success', 'Student details updated successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }
            ]);
        } catch (error) {
            console.error('Update error:', error);

            let errorMessage = 'Failed to update student details';

            if (error.response?.data) {
                const data = error.response.data;

                // ✅ Backend returned a string (simple error)
                if (typeof data === 'string') {
                    errorMessage = data;
                }
                // ✅ Backend returned { message, errors[] } for validation failures
                else if (data.errors && Array.isArray(data.errors)) {
                    errorMessage = data.errors.join('\n');
                }
                // ✅ Backend returned { message, error }
                else if (data.message) {
                    errorMessage = data.message;
                    if (data.error) {
                        errorMessage += `\n${data.error}`;
                    }
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    }, [formData, navigation]);



    /** Date picker handler */
    const handleDateChange = useCallback((event, selectedDate, field) => {
        if (field === 'admissionDate') setShowAdmissionDatePicker(false);
        if (field === 'nextPayment') setShowNextPaymentPicker(false);

        if (selectedDate) handleInputChange(field, selectedDate);
    }, [handleInputChange]);

    /** Date formatting */
    const formatDate = useCallback((date) => {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }, []);

    /** --------- RETURN JSX (SAME AS YOUR CURRENT UI) -------- */
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
            {/* Header */}
            <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Student</Text>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="checkmark" size={24} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Profile Image Section */}
                    <View style={styles.imageSection}>
                        <TouchableOpacity onPress={handleImagePicker} style={styles.imageContainer}>
                            <Image
                                source={
                                    imageUri
                                        ? { uri: imageUri }
                                        : require('../assets/bihari.png')
                                }
                                style={styles.profileImage}
                            />
                            <View style={styles.imageOverlay}>
                                <Ionicons name="camera" size={24} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.imageHint}>Tap to change photo</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formContainer}>
                        {/* Basic Information */}
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Student ID (SID)*</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.sid?.toString() || ''} // convert to string
                                onChangeText={(text) => handleInputChange('sid', text)}
                                placeholder="Enter student ID"
                                editable={false}
                                selectTextOnFocus={false}
                            />

                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Full Name*</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.name}
                                onChangeText={(text) => handleInputChange('name', text)}
                                placeholder="Enter full name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address*</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.email}
                                onChangeText={(text) => handleInputChange('email', text)}
                                placeholder="Enter email address"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Mobile Number*</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.mobile}
                                onChangeText={(text) => handleInputChange('mobile', text)}
                                placeholder="Enter mobile number"
                                keyboardType="numeric"
                                maxLength={10}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Father's Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.father}
                                onChangeText={(text) => handleInputChange('father', text)}
                                placeholder="Enter father's name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Guardian Mobile No.</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.guardian}
                                onChangeText={(text) => handleInputChange('guardian', text)}
                                placeholder="Enter guardian Mobile"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Gender</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.gender}
                                    style={styles.picker}
                                    onValueChange={(value) => handleInputChange('gender', value)}
                                >
                                    <Picker.Item label="Select Gender" value="" />
                                    <Picker.Item label="Male" value="Male" />
                                    <Picker.Item label="Female" value="Female" />
                                    <Picker.Item label="Other" value="Other" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Address</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={formData.address}
                                onChangeText={(text) => handleInputChange('address', text)}
                                placeholder="Enter address"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Academic Information */}
                        <Text style={styles.sectionTitle}>Academic Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Admission Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowAdmissionDatePicker(true)}
                            >
                                <Text style={styles.dateText}>
                                    {formatDate(formData.admissionDate)}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>🕐 Shift</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.shift}
                                    style={styles.picker}
                                    onValueChange={(value) => {
                                        handleInputChange('shift', value);
                                        handleInputChange('time', ''); // Reset time if shift changes
                                    }}
                                >
                                    <Picker.Item label="Select shift" value="" />
                                    <Picker.Item label="Morning" value="Morning" />
                                    <Picker.Item label="Afternoon" value="Afternoon" />
                                    <Picker.Item label="Evening" value="Evening" />
                                    <Picker.Item label="Night" value="Night" />
                                    <Picker.Item label="Double Shift" value="Double" />
                                    <Picker.Item label="24 Hours" value="24Hours" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>⏰ Time</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.time}
                                    style={styles.picker}
                                    onValueChange={(value) => handleTimeChange(value)}
                                >
                                    <Picker.Item label="Select time" value="" />
                                    {shiftTimeOptions[formData.shift]?.map((timeOption) => (
                                        <Picker.Item key={timeOption} label={timeOption} value={timeOption} />
                                    ))}
                                </Picker>

                            </View>
                        </View>


                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Seat Number</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.seatNumber}
                                onChangeText={(text) => handleInputChange('seatNumber', text)}
                                placeholder="Enter seat number"
                            />
                        </View>

                        {/* Payment Information */}
                        <Text style={styles.sectionTitle}>Payment Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Payment Amount</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.paymentAmount}
                                onChangeText={(text) => handleInputChange('paymentAmount', text)}
                                placeholder="Enter payment amount"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Next Payment Date</Text>
                            <TouchableOpacity
                                style={styles.dateInput}
                                onPress={() => setShowNextPaymentPicker(true)}
                            >
                                <Text style={styles.dateText}>
                                    {formatDate(formData.nextPayment)}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Status */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Status</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={formData.status}
                                    style={styles.picker}
                                    onValueChange={(value) => handleInputChange('status', value)}
                                >
                                    <Picker.Item label="Active" value="Active" />
                                    <Picker.Item label="Trash" value="Trash" />
                                    <Picker.Item label="Pending" value="Pending" />
                                    <Picker.Item label="Deactive" value="Deactive" />
                                </Picker>
                            </View>
                        </View>

                        {/* Social Media (Optional) */}
                        <Text style={styles.sectionTitle}>Social Media (Optional)</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Instagram</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.instagram}
                                onChangeText={(text) => handleInputChange('instagram', text)}
                                placeholder="Instagram username"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Facebook</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.facebook}
                                onChangeText={(text) => handleInputChange('facebook', text)}
                                placeholder="Facebook profile"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>YouTube</Text>
                            <TextInput
                                style={styles.textInput}
                                value={formData.youtube}
                                onChangeText={(text) => handleInputChange('youtube', text)}
                                placeholder="YouTube channel"
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.submitButtonText}>Update Student Details</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Pickers */}
            {showAdmissionDatePicker && (
                <DateTimePicker
                    value={formData.admissionDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => handleDateChange(event, date, 'admissionDate')}
                />
            )}

            {showNextPaymentPicker && (
                <DateTimePicker
                    value={formData.nextPayment}
                    mode="date"
                    display="default"
                    onChange={(event, date) => handleDateChange(event, date, 'nextPayment')}
                />
            )}
        </SafeAreaView>
    );
};



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
    saveButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    imageSection: {
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 20,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#8B5CF6',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#8B5CF6',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    imageHint: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 20,
        marginBottom: 15,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    picker: {
        height: 50,
        color: '#1F2937',
    },
    dateInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    dateText: {
        fontSize: 16,
        color: '#1F2937',
    },
    submitButton: {
        backgroundColor: '#8B5CF6',
        marginHorizontal: 20,
        marginTop: 30,
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    submitButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default EditStudentProfile;