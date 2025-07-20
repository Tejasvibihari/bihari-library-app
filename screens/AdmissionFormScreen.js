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
                            base64: true,
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 1,
                        });

                        if (!result.canceled) {
                            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
                            setImage(base64);
                            setImagePreview(base64);
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
                            base64: true,
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 1,
                        });

                        if (!result.canceled) {
                            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
                            setImage(base64);
                            setImagePreview(base64);
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
                const response = await client.get(`/api/seat/getVacantSeatsByShift`, {
                    params: { seatShift: newSeatShift },
                });
                setVacantSeat(response.data || []);

            } catch (error) {
                console.error('Error fetching seats:', error.response?.data || error.message);

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

    console.log("Rerender AdmissionFormScreen");


    const handleSubmit = async () => {
        if (!name || !email || !mobile || !father || !guardian || !gender || !admissionDate || !shift || !time || !paymentAmount || !address || !image || !seatNumber) {
            Alert.alert('⚠️ Warning', 'Please fill all fields and select an image');
            return;
        }

        const data = {
            name,
            email,
            mobile,
            father,
            guardian,
            gender,
            admissionDate,
            shift,
            time,
            paymentAmount: parseFloat(paymentAmount),
            address,
            image,
            seatNumber,
            seatShift

        };

        setLoading(true);
        try {
            const response = await client.post('/api/student/create-new-student', data);
            setLoading(false);
            // console.log('Response:', response);
            if (response.status === 201) {
                Alert.alert('🎉 Success', response.data.message || 'Admission Success');
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
            }

        } catch (error) {
            setLoading(false);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data.message || 'An error occurred';
                if (status === 400) {
                    Alert.alert('❌ Error', message);
                } else if (status === 500) {
                    Alert.alert('❌ Error', 'Internal Server Error');
                } else {
                    Alert.alert('❌ Error', message);
                }
            } else {
                Alert.alert('❌ Error', 'Network error or server unreachable');
            }
        }
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
            {/* Header with Gradient Background */}
            {/* <View style={styles.headerContainer}>
                <Text style={styles.headerEmoji}>🎓</Text>
                <Text style={styles.header}>New Student Admission</Text>
                <Text style={styles.subHeader}>Fill in the details below</Text>
            </View> */}
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
                />

                <InputField
                    label="Mobile Number"
                    value={mobile}
                    onChangeText={setMobile}
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                    icon="📱"
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
                <Text style={styles.label}>🕐 Shift</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={shift}
                        onValueChange={(itemValue) => setShift(itemValue)}
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

                {/* Time Picker */}
                <Text style={styles.label}>⏰ Time</Text>
                <Picker
                    selectedValue={time}
                    onValueChange={(itemValue) => handleTimeChange(itemValue)}
                >
                    <Picker.Item label="Select time" value="" />
                    {shift === "Morning" && <Picker.Item label="07:00 AM - 11:00 AM" value="07:00 AM - 11:00 AM" />}
                    {shift === "Morning" && <Picker.Item label="07:00 AM - 07:00 PM" value="07:00 AM - 07:00 PM" />}
                    {shift === "Afternoon" && <Picker.Item label="11:00 AM - 03:00 PM" value="11:00 AM - 03:00 PM" />}
                    {shift === "Evening" && <Picker.Item label="03:00PM - 07:00PM" value="03:00PM - 07:00PM" />}
                    {shift === "Night" && <Picker.Item label="07:00 PM - 11:00 PM" value="07:00 PM - 11:00 PM" />}
                    {shift === "Night" && <Picker.Item label="07:00 PM - 07:00 AM" value="07:00 PM - 07:00 AM" />}
                    {shift === "Double" && <Picker.Item label="07:00 AM - 03:00 PM" value="07:00 AM - 03:00 PM" />}
                    {shift === "Double" && <Picker.Item label="11:00 AM - 07:00 PM" value="11:00 AM - 07:00 PM" />}
                    {shift === "24Hours" && <Picker.Item label="24 Hours" value="24 Hours" />}
                </Picker>

                <Text style={styles.label}>💺 Select Seat</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={seatNumber}
                        onValueChange={(itemValue) => handleSeatChange(itemValue)}
                    >

                        <Picker.Item label="Select Seat" value="" />
                        <Picker.Item label="Other" value="Other" />
                        {vacantSeat.map((seat) => (
                            <Picker.Item key={seat._id} label={`${seat.seatNumber}`} value={seat.seatNumber} />
                        ))}
                    </Picker>
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
                />
            </View>

            {/* Submit Button */}
            {loading ? (
                <>
                    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={{ marginTop: 10, fontSize: 16, color: '#6B7280' }}>Submitting...</Text>
                    </SafeAreaView>
                </>
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