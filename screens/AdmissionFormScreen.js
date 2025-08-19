import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, StyleSheet, TouchableOpacity, Image, Platform, ActivityIndicator, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import client from "../service/axiosClient"
import InputField from '../components/InputField';
import Loading from '../components/Loading';
import TopHeader from '../components/TopBar';

const NewAdmissionForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [father, setFather] = useState('');
    const [guardian, setGuardian] = useState('');
    const [gender, setGender] = useState('Male');
    const [admissionDate, setAdmissionDate] = useState('');
    const [shift, setShift] = useState('');
    const [time, setTime] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [address, setAddress] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [lastPayment, setLastPayment] = useState('');
    const [seatNumber, setSeatNumber] = useState('');
    const [seatShift, setSeatShift] = useState('');
    const [vacantSeat, setVacantSeat] = useState([]);

    const [loading, setLoading] = useState(false);
    // Date picker states
    const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState(false);
    const [showLastPaymentDatePicker, setShowLastPaymentDatePicker] = useState(false);
    const [admissionDateObj, setAdmissionDateObj] = useState(new Date());
    const [lastPaymentDateObj, setLastPaymentDateObj] = useState(new Date());

    // Time options map
    const timeOptions = {
        Morning: ["07:00 AM - 11:00 AM", "07:00 AM - 07:00 PM"],
        Afternoon: ["11:00 AM - 03:00 PM"],
        Evening: ["03:00PM - 07:00PM"],
        Night: ["07:00 PM - 11:00 PM", "07:00 PM - 07:00 AM"],
        Double: ["07:00 AM - 03:00 PM", "11:00 AM - 07:00 PM"],
        "24Hours": ["24 Hours"]
    };

    const pickImage = async () => {
        Alert.alert(
            'Select Image Source',
            'Choose the image source',
            [
                {
                    text: '📷 Camera',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission denied', 'Camera permission is required.');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.7, // Reduced quality for better upload
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        });

                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const asset = result.assets[0];

                            // Fixed image object with proper MIME type
                            const imageObj = {
                                uri: asset.uri,
                                type: asset.mimeType || "image/jpeg", // Use mimeType instead of type
                                name: asset.fileName || `photo_${Date.now()}.jpg`,
                                size: asset.fileSize || 0
                            };

                            // console.log('Image selected:', imageObj);
                            setImage(imageObj);
                            setImagePreview(asset.uri);
                            Alert.alert('✅ Success', 'Image captured successfully');
                        }
                    },
                },
                {
                    text: '🖼️ Gallery',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission denied', 'Gallery permission is required.');
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.7, // Reduced quality for better upload
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        });

                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const asset = result.assets[0];

                            // Fixed image object with proper MIME type
                            const imageObj = {
                                uri: asset.uri,
                                type: asset.mimeType || "image/jpeg", // Use mimeType instead of type
                                name: asset.fileName || `photo_${Date.now()}.jpg`,
                                size: asset.fileSize || 0
                            };

                            // console.log('Image selected:', imageObj);
                            setImage(imageObj);
                            setImagePreview(asset.uri);
                            Alert.alert('✅ Success', 'Image selected successfully');
                        }
                    },
                },
                {
                    text: '❌ Cancel',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    const handleShiftChange = (selectedShift) => {
        setShift(selectedShift);
        setTime(''); // reset time to avoid invalid selection
        setSeatShift('');
        setVacantSeat([]); // Clear vacant seats when shift changes
    };

    const handleTimeChange = async (selectedTime) => {
        setTime(selectedTime);
        let amount = 0;
        let newSeatShift = "";

        switch (selectedTime) {
            case "07:00 AM - 11:00 AM":
                amount = 300;
                newSeatShift = "morning";
                break;
            case "11:00 AM - 03:00 PM":
                amount = 300;
                newSeatShift = "afternoon";
                break;
            case "03:00PM - 07:00PM":
                amount = 300;
                newSeatShift = "evening";
                break;
            case "07:00 PM - 11:00 PM":
                amount = 300;
                newSeatShift = "night";
                break;
            case "07:00 PM - 07:00 AM":
                amount = 500;
                newSeatShift = "nightLong";
                break;
            case "07:00 AM - 03:00 PM":
                amount = 500;
                newSeatShift = "doubleMorning";
                break;
            case "11:00 AM - 07:00 PM":
                amount = 500;
                newSeatShift = "doubleEvening";
                break;
            case "07:00 AM - 07:00 PM":
                amount = 700;
                newSeatShift = "morningLong";
                break;
            case "24 Hours":
                amount = 1000;
                newSeatShift = "fullDay";
                break;
            default:
                amount = 0;
                newSeatShift = "";
        }

        setPaymentAmount(amount.toString());
        setSeatShift(newSeatShift);

        if (newSeatShift) {
            try {
                setLoading(true);
                const response = await client.get(`/api/seat/getVacantSeatsByShift`, {
                    params: { seatShift: newSeatShift },
                });
                setVacantSeat(response.data || []);
                setLoading(false);
            } catch (error) {
                setLoading(false);
                console.error('Error fetching seats:', error.response?.data || error.message);
                Alert.alert('⚠️ Warning', 'Failed to fetch available seats');
                setVacantSeat([]);
            }
        }
    };

    const handleSeatChange = (selectedSeat) => {
        setSeatNumber(selectedSeat);
    }

    // Date picker handlers
    const onAdmissionDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || admissionDateObj;
        setShowAdmissionDatePicker(Platform.OS === 'ios');
        setAdmissionDateObj(currentDate);

        const formattedDate = currentDate.toISOString().split('T')[0];
        setAdmissionDate(formattedDate);
    };

    const onLastPaymentDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || lastPaymentDateObj;
        setShowLastPaymentDatePicker(Platform.OS === 'ios');
        setLastPaymentDateObj(currentDate);

        const formattedDate = currentDate.toISOString().split('T')[0];
        setLastPayment(formattedDate);
    };

    const showAdmissionDatePickerModal = () => {
        setShowAdmissionDatePicker(true);
    };

    // Enhanced form validation
    const validateForm = () => {
        const errors = [];

        if (!name.trim()) errors.push('Name is required');
        if (!email.trim()) errors.push('Email is required');
        if (!mobile.trim()) errors.push('Mobile number is required');
        if (!father.trim()) errors.push("Father's name is required");
        if (!guardian.trim()) errors.push('Guardian mobile number is required');
        if (!admissionDate) errors.push('Admission date is required');
        if (!shift) errors.push('Shift is required');
        if (!time) errors.push('Time is required');
        if (!paymentAmount) errors.push('Payment amount is required');
        if (!address.trim()) errors.push('Address is required');
        if (!image) errors.push('Profile image is required');
        if (!seatNumber) errors.push('Seat number is required');

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            errors.push('Please enter a valid email address');
        }

        // Mobile number validation (basic)
        if (mobile && mobile.length < 10) {
            errors.push('Mobile number should be at least 10 digits');
        }

        if (guardian && guardian.length < 10) {
            errors.push('Guardian mobile number should be at least 10 digits');
        }

        return errors;
    };

    // console.log("Rerender AdmissionFormScreen");

    const handleSubmit = async () => {
        // Enhanced validation
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            Alert.alert('⚠️ Validation Error', validationErrors.join('\n'));
            return;
        }

        // Check image size (optional - you can adjust the limit)
        if (image && image.size && image.size > 5 * 1024 * 1024) { // 5MB limit
            Alert.alert('⚠️ Image Too Large', 'Please select an image smaller than 5MB');
            return;
        }

        setLoading(true);

        try {
            // Create FormData properly for React Native
            const formData = new FormData();

            // Append all text fields
            formData.append("name", name.trim());
            formData.append("email", email.trim().toLowerCase());
            formData.append("mobile", mobile.trim());
            formData.append("father", father.trim());
            formData.append("guardian", guardian.trim());
            formData.append("gender", gender);
            formData.append("admissionDate", admissionDate);
            formData.append("shift", shift);
            formData.append("time", time);
            formData.append("paymentAmount", paymentAmount.toString());
            formData.append("address", address.trim());
            formData.append("seatNumber", seatNumber);
            formData.append("seatShift", seatShift);

            // Add lastPayment if available
            if (lastPayment) {
                formData.append("lastPayment", lastPayment);
            }

            // Handle image properly for React Native
            if (image) {
                // React Native specific image object
                formData.append("image", {
                    uri: image.uri,
                    type: image.type || "image/jpeg",
                    name: image.name || `student_${Date.now()}.jpg`,
                });
            }

            console.log('Submitting form...');

            // CRITICAL FIX: Use fetch instead of axios for FormData in React Native
            const response = await fetch(`${client.defaults.baseURL}/api/student/create-new-student`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json',
                },
            });

            const responseData = await response.json();
            setLoading(false);

            if (response.status === 201) {
                Alert.alert(
                    '🎉 Success',
                    responseData.message || 'Student admission completed successfully!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                resetForm();
                            }
                        }
                    ]
                );
            } else {
                // Handle non-201 responses
                throw new Error(responseData.message || `Server returned status ${response.status}`);
            }

        } catch (error) {
            setLoading(false);
            console.error('Submission error:', error);

            // Check if it's a fetch error vs parsing error
            if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                Alert.alert(
                    '🌐 Network Error',
                    'Unable to connect to server. Please check your internet connection and try again.'
                );
            } else if (error.message.includes('JSON')) {
                Alert.alert(
                    '❌ Server Error',
                    'Server returned invalid response. Please try again.'
                );
            } else {
                Alert.alert(
                    '❌ Error',
                    error.message || 'An unexpected error occurred'
                );
            }
        }
    };

    // Helper function to reset form
    const resetForm = () => {
        setName('');
        setEmail('');
        setMobile('');
        setFather('');
        setGuardian('');
        setGender('Male');
        setAdmissionDate('');
        setShift('');
        setTime('');
        setPaymentAmount('');
        setAddress('');
        setImage(null);
        setImagePreview(null);
        setLastPayment('');
        setSeatNumber('');
        setSeatShift('');
        setVacantSeat([]);
    };

    const DatePickerField = ({ label, value, onPress, icon }) => (
        <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
                <Text style={styles.inputIcon}>{icon}</Text>
                <Text style={styles.label}>{label}</Text>
            </View>
            <TouchableOpacity style={styles.dateInput} onPress={onPress}>
                <Text style={[styles.dateInputText, !value && styles.placeholderStyle]}>
                    {value || 'Select date (YYYY-MM-DD)'}
                </Text>
                <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
        </View>
    );

    const GenderPicker = () => (
        <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
                <Text style={styles.inputIcon}>👤</Text>
                <Text style={styles.label}>Gender</Text>
            </View>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={gender}
                    style={styles.picker}
                    onValueChange={(itemValue) => setGender(itemValue)}
                    dropdownIconColor="#8B5CF6"
                >
                    <Picker.Item label="👨 Male" value="Male" />
                    <Picker.Item label="👩 Female" value="Female" />
                    <Picker.Item label="🧑 Other" value="Other" />
                </Picker>
            </View>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <TopHeader heading='New Admission Form' />

            {/* Profile Image Section */}
            <View style={styles.imageSection}>
                <Text style={styles.sectionTitle}>📸 Profile Photo</Text>
                <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                    {imagePreview ? (
                        <>
                            <Image source={{ uri: imagePreview }} style={styles.profileImage} />
                            <View style={styles.imageOverlay}>
                                <Text style={styles.overlayText}>✏️</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Text style={styles.cameraIcon}>📷</Text>
                            <Text style={styles.placeholderText}>Tap to add photo</Text>
                            <Text style={styles.placeholderSubText}>Required</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {/* {image && (
                    <Text style={styles.imageInfo}>
                        📁 {image.name} ({image.size ? `${(image.size / 1024).toFixed(1)}KB` : 'Size unknown'})
                    </Text>
                )} */}
            </View>

            {/* Personal Information Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Personal Information</Text>

                <InputField
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    icon="✏️"
                />
                <InputField
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    icon="📧"
                    autoCapitalize="none"
                />
                <InputField
                    label="Mobile Number"
                    value={mobile}
                    onChangeText={setMobile}
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                    icon="📱"
                    maxLength={15}
                />
                <InputField
                    label="Father's Name"
                    value={father}
                    onChangeText={setFather}
                    placeholder="Enter father's name"
                    icon="👨"
                />
                <InputField
                    label="Guardian Mobile Number"
                    value={guardian}
                    onChangeText={setGuardian}
                    placeholder="Enter guardian Mobile Number"
                    keyboardType="phone-pad"
                    icon="🤝"
                    maxLength={15}
                />

                <GenderPicker />

                <InputField
                    label="Address"
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter your complete address"
                    multiline={true}
                    icon="🏠"
                />
            </View>

            {/* Admission Details Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📚 Admission Details</Text>

                <DatePickerField
                    label="Admission Date"
                    value={admissionDate}
                    onPress={showAdmissionDatePickerModal}
                    icon="📅"
                />

                {/* Shift Picker */}
                <View style={styles.inputContainer}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.inputIcon}>🕐</Text>
                        <Text style={styles.label}>Shift</Text>
                    </View>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={shift}
                            onValueChange={handleShiftChange}
                            style={styles.picker}
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

                {/* Time Picker */}
                <View style={styles.inputContainer}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.inputIcon}>⏰</Text>
                        <Text style={styles.label}>Time</Text>
                    </View>
                    <View style={styles.pickerContainer}>
                        <Picker
                            key={shift} // force re-render when shift changes
                            selectedValue={time}
                            onValueChange={handleTimeChange}
                            style={styles.picker}
                            enabled={!!shift} // Disable if no shift selected
                        >
                            <Picker.Item label="Select time" value="" />
                            {timeOptions[shift]?.map((t) => (
                                <Picker.Item key={t} label={t} value={t} />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Seat Picker */}
                <View style={styles.inputContainer}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.inputIcon}>💺</Text>
                        <Text style={styles.label}>Select Seat</Text>
                    </View>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={seatNumber}
                            onValueChange={handleSeatChange}
                            style={styles.picker}
                            enabled={!!seatShift} // Disable if no seat shift
                        >
                            <Picker.Item label="Select Seat" value="" />
                            <Picker.Item label="Other" value="Other" />
                            {vacantSeat.map((seat) => (
                                <Picker.Item
                                    key={seat._id}
                                    label={`Seat ${seat.seatNumber}`}
                                    value={seat.seatNumber}
                                />
                            ))}
                        </Picker>
                    </View>
                </View>
            </View>

            {/* Payment Information Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💰 Payment Information</Text>

                <InputField
                    label="Payment Amount"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    icon="💵"
                    editable={false} // Auto-calculated based on time selection
                />
            </View>

            {/* Submit Button */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    {/* <Text style={styles.loadingText}>Submitting admission form...</Text>
                    <Text style={styles.loadingSubText}>Please wait while we process your request</Text> */}
                </View>
            ) : (
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitIcon}>✅</Text>
                    <Text style={styles.submitButtonText}>Submit Admission</Text>
                </TouchableOpacity>
            )}

            {/* Date Pickers */}
            {showAdmissionDatePicker && (
                <DateTimePicker
                    testID="admissionDateTimePicker"
                    value={admissionDateObj}
                    mode="date"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onAdmissionDateChange}
                />
            )}

            {showLastPaymentDatePicker && (
                <DateTimePicker
                    testID="lastPaymentDateTimePicker"
                    value={lastPaymentDateObj}
                    mode="date"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onLastPaymentDateChange}
                />
            )}
        </ScrollView>
    );
};


const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#F8FAFC',
        paddingBottom: 30,
    },
    headerContainer: {
        background: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
        backgroundColor: '#8B5CF6',
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    headerEmoji: {
        fontSize: 40,
        marginBottom: 10,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 5,
    },
    subHeader: {
        fontSize: 16,
        color: '#E9D5FF',
        textAlign: 'center',
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 25,
        marginHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 20,
        textAlign: 'center',
    },
    imageContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#F3F4F6',
        borderWidth: 4,
        borderColor: '#8B5CF6',
        borderStyle: 'solid',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 76,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#8B5CF6',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    placeholderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        fontSize: 50,
        marginBottom: 10,
    },
    placeholderText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 4,
    },
    placeholderSubText: {
        fontSize: 12,
        color: '#8B5CF6',
        fontWeight: '500',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    inputContainer: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        color: '#111827',
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: '#111827',
    },
    dateInput: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 15,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateInputText: {
        fontSize: 16,
        color: '#111827',
        flex: 1,
    },
    placeholderStyle: {
        color: '#A1A1AA',
    },
    calendarIcon: {
        fontSize: 18,
        marginLeft: 10,
    },
    submitButton: {
        backgroundColor: '#8B5CF6',
        marginHorizontal: 20,
        paddingVertical: 18,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    submitIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default NewAdmissionForm;