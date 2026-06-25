import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, Alert, ScrollView, StyleSheet,
    TouchableOpacity, Image, Platform, ActivityIndicator, Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import client from "../service/axiosClient";
import TopHeader from '../components/TopBar';

// ─── Step Config ───────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Photo',     icon: '📸' },
    { id: 2, label: 'Personal',  icon: '👤' },
    { id: 3, label: 'Admission', icon: '📚' },
    { id: 4, label: 'Payment',   icon: '💰' },
    { id: 5, label: 'Review',    icon: '✅' },
];

// ─── Reusable Field ─────────────────────────────────────────────
const Field = ({ label, value, placeholder, onChangeText, keyboardType = 'default',
    multiline = false, editable = true, maxLength, autoCapitalize }) => (
    <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>{label}</Text>
        <TextInput
            style={[s.input, multiline && s.inputMulti, !editable && s.inputDisabled]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#A1A1AA"
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            editable={editable}
            maxLength={maxLength}
            autoCapitalize={autoCapitalize}
        />
    </View>
);

// ─── Review Row ─────────────────────────────────────────────────
const ReviewRow = ({ label, value, highlight }) => (
    <View style={s.reviewRow}>
        <Text style={s.reviewLabel}>{label}</Text>
        <Text style={[s.reviewValue, highlight && s.reviewHighlight]}>{value || '—'}</Text>
    </View>
);

// ─── Step Indicator ─────────────────────────────────────────────
const StepBar = ({ current }) => (
    <View style={s.stepBar}>
        {STEPS.map((step, idx) => {
            const done = current > step.id;
            const active = current === step.id;
            return (
                <React.Fragment key={step.id}>
                    <View style={s.stepItem}>
                        <View style={[s.stepDot,
                            done && s.stepDotDone,
                            active && s.stepDotActive]}>
                            <Text style={[s.stepDotText, (done || active) && s.stepDotTextActive]}>
                                {done ? '✓' : step.icon}
                            </Text>
                        </View>
                        <Text style={[s.stepLabel, active && s.stepLabelActive]}>{step.label}</Text>
                    </View>
                    {idx < STEPS.length - 1 && (
                        <View style={[s.stepLine, done && s.stepLineDone]} />
                    )}
                </React.Fragment>
            );
        })}
    </View>
);

// ─── Main Component ──────────────────────────────────────────────
const NewAdmissionForm = () => {
    const [step, setStep] = useState(1);

    // Personal
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [father, setFather] = useState('');
    const [guardian, setGuardian] = useState('');
    const [gender, setGender] = useState('Male');
    const [address, setAddress] = useState('');

    // Admission
    const [admissionDate, setAdmissionDate] = useState('');
    const [admissionDateObj, setAdmissionDateObj] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [shifts, setShifts] = useState([]);
    const [selectedShiftCode, setSelectedShiftCode] = useState('');
    const [shiftAmount, setShiftAmount] = useState(0);
    const [shiftLabel, setShiftLabel] = useState('');
    const [seatNumber, setSeatNumber] = useState('');
    const [vacantSeats, setVacantSeats] = useState([]);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [loadingSeats, setLoadingSeats] = useState(false);

    // Payment
    const [paymentMade, setPaymentMade] = useState(false);
    const [payFullCycle, setPayFullCycle] = useState(true);
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentNote, setPaymentNote] = useState('');
    const [fixedDiscountAmount, setFixedDiscountAmount] = useState('');
    const [fixedDiscountReason, setFixedDiscountReason] = useState('');
    const [cycleDays, setCycleDays] = useState('30');

    // Image
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const [loading, setLoading] = useState(false);

    // Computed
    const discount = parseFloat(fixedDiscountAmount) || 0;
    const netCycleAmount = Math.max(shiftAmount - discount, 0);
    const dailyRate = cycleDays && parseInt(cycleDays) > 0
        ? netCycleAmount / parseInt(cycleDays) : 0;
    const willPay = paymentMade && parseFloat(amountPaid) > 0;

    function convertTo12Hour(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    useEffect(() => { fetchShifts(); }, []);

    const fetchShifts = async () => {
        try {
            setLoadingShifts(true);
            const res = await client.get('/api/v2/seat/shifts');
            setShifts(res.data?.shifts || []);
        } catch {
            Alert.alert('Error', 'Failed to load shifts.');
        } finally { setLoadingShifts(false); }
    };

    const handleShiftChange = async (shiftCode) => {
        setSelectedShiftCode(shiftCode);
        setSeatNumber('');
        setVacantSeats([]);
        const selected = shifts.find(s => s.code === shiftCode);
        if (selected) {
            setShiftAmount(selected.price || 0);
            let timeDisplay = '';
            if (selected.displayTime) {
                const parts = selected.displayTime.split(' - ').map(t => t.trim());
                timeDisplay = parts.map(t => convertTo12Hour(t)).join(' - ');
            } else if (selected.startTime && selected.endTime) {
                timeDisplay = `${convertTo12Hour(selected.startTime)} – ${convertTo12Hour(selected.endTime)}`;
            }
            setShiftLabel(`${selected.label || 'Shift'} (${timeDisplay})`);
            if (paymentMade && payFullCycle) {
                const net = Math.max((selected.price || 0) - discount, 0);
                setAmountPaid(net.toString());
            }
            try {
                setLoadingSeats(true);
                const res = await client.get('/api/v2/seat/getVacantSeatsByShift', { params: { shiftCode } });
                setVacantSeats(res.data || []);
            } catch {
                Alert.alert('Warning', 'Failed to fetch available seats.');
            } finally { setLoadingSeats(false); }
        } else {
            setShiftAmount(0); setShiftLabel(''); setAmountPaid('');
        }
    };

    const onDateChange = (event, selectedDate) => {
        const d = selectedDate || admissionDateObj;
        setShowDatePicker(Platform.OS === 'ios');
        setAdmissionDateObj(d);
        setAdmissionDate(d.toISOString().split('T')[0]);
    };

    const pickImage = async () => {
        Alert.alert('Select Image Source', '', [
            {
                text: '📷 Camera', onPress: async () => {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Permission denied'); return; }
                    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
                    if (!result.canceled && result.assets?.length > 0) {
                        const a = result.assets[0];
                        setImage({ uri: a.uri, type: a.mimeType || 'image/jpeg', name: a.fileName || `photo_${Date.now()}.jpg`, size: a.fileSize || 0 });
                        setImagePreview(a.uri);
                    }
                }
            },
            {
                text: '🖼️ Gallery', onPress: async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') { Alert.alert('Permission denied'); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
                    if (!result.canceled && result.assets?.length > 0) {
                        const a = result.assets[0];
                        setImage({ uri: a.uri, type: a.mimeType || 'image/jpeg', name: a.fileName || `photo_${Date.now()}.jpg`, size: a.fileSize || 0 });
                        setImagePreview(a.uri);
                    }
                }
            },
            { text: '❌ Cancel', style: 'cancel' },
        ], { cancelable: true });
    };

    // ── Per-step validation ──
    const validateStep = () => {
        const err = [];
        if (step === 1 && !image) err.push('Please upload a profile photo.');
        if (step === 2) {
            if (!name.trim()) err.push('Full name is required.');
            if (!email.trim()) err.push('Email is required.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.push('Invalid email address.');
            if (!mobile.trim() || mobile.length < 10) err.push('Valid mobile number required.');
            if (!father.trim()) err.push("Father's name is required.");
            if (!guardian.trim() || guardian.length < 10) err.push('Valid guardian mobile required.');
            if (!address.trim()) err.push('Address is required.');
        }
        if (step === 3) {
            if (!admissionDate) err.push('Admission date is required.');
            if (!selectedShiftCode) err.push('Please select a shift.');
            if (!seatNumber) err.push('Please select a seat.');
        }
        if (step === 4 && paymentMade && (!amountPaid || parseFloat(amountPaid) <= 0)) {
            err.push('Enter a valid payment amount.');
        }
        return err;
    };

    const goNext = () => {
        const errors = validateStep();
        if (errors.length > 0) { Alert.alert('⚠️ Incomplete', errors.join('\n')); return; }
        setStep(prev => Math.min(prev + 1, 5));
    };

    const goBack = () => setStep(prev => Math.max(prev - 1, 1));

    // ── Submit ──
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('email', email.trim().toLowerCase());
            formData.append('mobile', mobile.trim());
            formData.append('father', father.trim());
            formData.append('guardian', guardian.trim());
            formData.append('gender', gender);
            formData.append('admissionDate', admissionDate);
            formData.append('address', address.trim());
            formData.append('shiftCode', selectedShiftCode);
            formData.append('seatNumber', seatNumber);
            formData.append('cycleDays', cycleDays);
            if (fixedDiscountAmount) formData.append('fixedDiscountAmount', fixedDiscountAmount);
            if (fixedDiscountReason) formData.append('fixedDiscountReason', fixedDiscountReason);
            if (paymentMade && amountPaid && parseFloat(amountPaid) > 0) {
                formData.append('feePaid', payFullCycle ? 'true' : 'false');
                formData.append('amountPaid', amountPaid);
                formData.append('paymentMethod', paymentMethod);
                if (paymentNote) formData.append('paymentNote', paymentNote);
            } else {
                formData.append('feePaid', 'false');
                formData.append('amountPaid', '0');
            }
            // ✅ Correct way to append image in React Native FormData
            if (image) {
                formData.append('image', {
                    uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
                    type: image.type || 'image/jpeg',
                    name: image.name || `student_${Date.now()}.jpg`,
                });
            }

            // ✅ Use axios instead of fetch — axios handles RN FormData correctly.
            // Do NOT set Content-Type manually; let axios/RN set the boundary automatically.
            const response = await client.post(
                '/api/v2/student/create-new-student',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Accept': 'application/json',
                    },
                    transformRequest: (data) => data, // prevent axios from JSON-serialising FormData
                }
            );

            if (response.status === 201) {
                Alert.alert('🎉 Success', response.data?.message || 'Admission completed!', [
                    { text: 'OK', onPress: resetForm },
                ]);
            } else {
                throw new Error(response.data?.message || `Server error ${response.status}`);
            }
        } catch (error) {
            const msg = error?.response?.data?.message
                || error?.message
                || 'An unexpected error occurred';
            Alert.alert('❌ Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setName(''); setEmail(''); setMobile(''); setFather(''); setGuardian('');
        setGender('Male'); setAddress(''); setAdmissionDate(''); setAdmissionDateObj(new Date());
        setSelectedShiftCode(''); setShiftAmount(0); setShiftLabel('');
        setSeatNumber(''); setVacantSeats([]);
        setPaymentMade(false); setPayFullCycle(true); setAmountPaid('');
        setPaymentMethod('cash'); setPaymentNote('');
        setFixedDiscountAmount(''); setFixedDiscountReason(''); setCycleDays('30');
        setImage(null); setImagePreview(null);
    };

    // ── Step Screens ──────────────────────────────────────────────

    const renderStep1 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepHeading}>Upload Profile Photo</Text>
            <Text style={s.stepSubtext}>A clear face photo helps identify the student.</Text>
            <TouchableOpacity style={s.photoPicker} onPress={pickImage}>
                {imagePreview ? (
                    <>
                        <Image source={{ uri: imagePreview }} style={s.photoPreview} />
                        <View style={s.photoEditBadge}><Text style={s.photoEditText}>✏️ Change</Text></View>
                    </>
                ) : (
                    <View style={s.photoPlaceholder}>
                        <Text style={s.photoIcon}>📷</Text>
                        <Text style={s.photoPlaceholderText}>Tap to upload photo</Text>
                        <Text style={s.photoPlaceholderSub}>Camera or Gallery · Required</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepHeading}>Personal Information</Text>
            <Text style={s.stepSubtext}>Fill in the student's details below.</Text>
            <Field label="Full Name *" value={name} onChangeText={setName} placeholder="e.g. Rahul Sharma" />
            <Field label="Email Address *" value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Mobile Number *" value={mobile} onChangeText={setMobile} placeholder="10-digit number" keyboardType="phone-pad" maxLength={15} />
            <Field label="Father's Name *" value={father} onChangeText={setFather} placeholder="Father's full name" />
            <Field label="Guardian Mobile *" value={guardian} onChangeText={setGuardian} placeholder="Guardian phone number" keyboardType="phone-pad" maxLength={15} />

            <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Gender</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={gender} onValueChange={setGender} style={s.picker}>
                        <Picker.Item label="👨 Male" value="Male" />
                        <Picker.Item label="👩 Female" value="Female" />
                        <Picker.Item label="🧑 Other" value="Other" />
                    </Picker>
                </View>
            </View>

            <Field label="Address *" value={address} onChangeText={setAddress} placeholder="Complete residential address" multiline />
        </View>
    );

    const renderStep3 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepHeading}>Admission Details</Text>
            <Text style={s.stepSubtext}>Choose date, shift and seat number.</Text>

            <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Admission Date *</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <Text style={admissionDate ? s.dateBtnText : s.dateBtnPlaceholder}>
                        {admissionDate || 'Select date'}
                    </Text>
                    <Text>📅</Text>
                </TouchableOpacity>
            </View>

            <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Shift *</Text>
                <View style={s.pickerBox}>
                    {loadingShifts ? <ActivityIndicator size="small" color="#7C3AED" style={{ margin: 12 }} /> : (
                        <Picker selectedValue={selectedShiftCode} onValueChange={handleShiftChange} style={s.picker}>
                            <Picker.Item label="Select shift…" value="" />
                            {shifts.map(sh => {
                                let td = '';
                                if (sh.displayTime) {
                                    td = sh.displayTime.split(' - ').map(t => convertTo12Hour(t.trim())).join(' – ');
                                } else if (sh.startTime && sh.endTime) {
                                    td = `${convertTo12Hour(sh.startTime)} – ${convertTo12Hour(sh.endTime)}`;
                                }
                                return <Picker.Item key={sh.code || sh._id} label={`${sh.label || 'Shift'} · ${td}`} value={sh.code} />;
                            })}
                        </Picker>
                    )}
                </View>
                {selectedShiftCode && shiftAmount > 0 && (
                    <Text style={s.shiftAmountHint}>Fee: ₹{shiftAmount} / cycle</Text>
                )}
            </View>

            <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>Seat Number *</Text>
                <View style={[s.pickerBox, !selectedShiftCode && s.pickerDisabled]}>
                    {loadingSeats ? <ActivityIndicator size="small" color="#7C3AED" style={{ margin: 12 }} /> : (
                        <Picker selectedValue={seatNumber} onValueChange={setSeatNumber} style={s.picker} enabled={!!selectedShiftCode}>
                            <Picker.Item label="Select seat…" value="" />
                            <Picker.Item label="Other" value="Other" />
                            {vacantSeats.map(seat => (
                                <Picker.Item key={seat._id} label={`Seat ${seat.seatNumber}`} value={seat.seatNumber} />
                            ))}
                        </Picker>
                    )}
                </View>
                {!selectedShiftCode && <Text style={s.hintText}>Select a shift first to see available seats.</Text>}
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepHeading}>Payment & Billing</Text>
            <Text style={s.stepSubtext}>Configure fees, discounts and payment details.</Text>

            {/* Discount section */}
            <View style={s.miniCard}>
                <Text style={s.miniCardTitle}>🏷️ Discount (optional)</Text>
                <Field label="Fixed Discount (₹)" value={fixedDiscountAmount} onChangeText={setFixedDiscountAmount} placeholder="0" keyboardType="numeric" />
                <Field label="Discount Reason" value={fixedDiscountReason} onChangeText={setFixedDiscountReason} placeholder="e.g. Sibling discount" />
                <Field label="Cycle Days" value={cycleDays} onChangeText={setCycleDays} placeholder="30" keyboardType="numeric" />
            </View>

            {/* Billing summary mini */}
            <View style={s.summaryStrip}>
                <View style={s.summaryStripItem}>
                    <Text style={s.stripLabel}>Shift Fee</Text>
                    <Text style={s.stripValue}>₹{shiftAmount}</Text>
                </View>
                <Text style={s.stripSep}>–</Text>
                <View style={s.summaryStripItem}>
                    <Text style={s.stripLabel}>Discount</Text>
                    <Text style={[s.stripValue, { color: '#10B981' }]}>₹{discount}</Text>
                </View>
                <Text style={s.stripSep}>=</Text>
                <View style={s.summaryStripItem}>
                    <Text style={s.stripLabel}>Net</Text>
                    <Text style={[s.stripValue, { color: '#7C3AED', fontWeight: '800' }]}>₹{netCycleAmount}</Text>
                </View>
            </View>

            {/* Payment toggle */}
            <View style={s.switchRow}>
                <View>
                    <Text style={s.switchLabel}>Payment received now?</Text>
                    <Text style={s.switchSub}>{willPay ? `₹${amountPaid} via ${paymentMethod}` : 'Will be marked as Due'}</Text>
                </View>
                <Switch value={paymentMade} onValueChange={(val) => {
                    setPaymentMade(val);
                    if (val && selectedShiftCode && payFullCycle) setAmountPaid(netCycleAmount.toString());
                    else if (!val) setAmountPaid('');
                }} trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }} thumbColor={paymentMade ? '#7C3AED' : '#9CA3AF'} />
            </View>

            {paymentMade && (
                <View style={s.miniCard}>
                    <Text style={s.miniCardTitle}>💳 Payment Details</Text>
                    <View style={s.switchRow}>
                        <Text style={s.switchLabel}>Pay full cycle amount</Text>
                        <Switch value={payFullCycle} onValueChange={(val) => {
                            setPayFullCycle(val);
                            if (val) setAmountPaid(netCycleAmount.toString());
                            else setAmountPaid('');
                        }} trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }} thumbColor={payFullCycle ? '#7C3AED' : '#9CA3AF'} />
                    </View>
                    <Field label="Amount Paid (₹)" value={amountPaid} onChangeText={setAmountPaid}
                        placeholder={payFullCycle ? 'Auto-calculated' : 'Enter amount'} keyboardType="numeric" editable={!payFullCycle} />
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Payment Method</Text>
                        <View style={s.pickerBox}>
                            <Picker selectedValue={paymentMethod} onValueChange={setPaymentMethod} style={s.picker}>
                                <Picker.Item label="Cash" value="cash" />
                                <Picker.Item label="UPI" value="upi" />
                                <Picker.Item label="Card" value="card" />
                                <Picker.Item label="Bank Transfer" value="bank" />
                            </Picker>
                        </View>
                    </View>
                    <Field label="Payment Note (optional)" value={paymentNote} onChangeText={setPaymentNote} placeholder="Any remarks" />
                </View>
            )}
        </View>
    );

    const renderStep5 = () => (
        <View style={s.stepContent}>
            <Text style={s.stepHeading}>Review & Confirm</Text>
            <Text style={s.stepSubtext}>Check all details before submitting the admission.</Text>

            {/* Photo */}
            <View style={s.reviewPhotoRow}>
                {imagePreview && <Image source={{ uri: imagePreview }} style={s.reviewPhoto} />}
                <View style={{ flex: 1, paddingLeft: 14 }}>
                    <Text style={s.reviewName}>{name || '—'}</Text>
                    <Text style={s.reviewGender}>{gender}</Text>
                    <View style={[s.statusBadge, { backgroundColor: willPay ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Text style={[s.statusText, { color: willPay ? '#065F46' : '#991B1B' }]}>
                            {willPay ? '✅ Paid' : '⏳ Due'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={s.reviewSection}>
                <Text style={s.reviewSectionTitle}>👤 Personal Information</Text>
                <ReviewRow label="Full Name" value={name} />
                <ReviewRow label="Email" value={email} />
                <ReviewRow label="Mobile" value={mobile} />
                <ReviewRow label="Father's Name" value={father} />
                <ReviewRow label="Guardian Mobile" value={guardian} />
                <ReviewRow label="Gender" value={gender} />
                <ReviewRow label="Address" value={address} />
            </View>

            <View style={s.reviewSection}>
                <Text style={s.reviewSectionTitle}>📚 Admission Details</Text>
                <ReviewRow label="Admission Date" value={admissionDate} />
                <ReviewRow label="Shift" value={shiftLabel || selectedShiftCode} highlight />
                <ReviewRow label="Seat Number" value={seatNumber ? `Seat ${seatNumber}` : ''} highlight />
            </View>

            <View style={s.reviewSection}>
                <Text style={s.reviewSectionTitle}>💰 Billing Summary</Text>
                <ReviewRow label="Shift Fee" value={`₹${shiftAmount}`} />
                {discount > 0 && <ReviewRow label="Discount" value={`-₹${discount}${fixedDiscountReason ? ` (${fixedDiscountReason})` : ''}`} />}
                <ReviewRow label="Net Cycle Amount" value={`₹${netCycleAmount}`} highlight />
                <ReviewRow label="Daily Rate" value={`₹${dailyRate.toFixed(2)}`} />
                <ReviewRow label="Cycle Days" value={`${cycleDays} days`} />
                <ReviewRow label="Payment Status" value={willPay ? `Paid ₹${amountPaid} via ${paymentMethod}` : 'Due'} />
                {paymentNote && <ReviewRow label="Payment Note" value={paymentNote} />}
            </View>

            {loading ? (
                <View style={s.loadingBox}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={s.loadingText}>Submitting admission…</Text>
                </View>
            ) : (
                <TouchableOpacity style={s.submitBtn} onPress={handleSubmit}>
                    <Text style={s.submitBtnText}>✅  Confirm & Submit</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderCurrentStep = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return null;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
            <TopHeader heading="New Admission" />
            <StepBar current={step} />

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {renderCurrentStep()}

                {/* Navigation buttons */}
                <View style={s.navRow}>
                    {step > 1 && (
                        <TouchableOpacity style={s.backBtn} onPress={goBack}>
                            <Text style={s.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                    )}
                    {step < 5 && (
                        <TouchableOpacity style={[s.nextBtn, step === 1 && { flex: 1 }]} onPress={goNext}>
                            <Text style={s.nextBtnText}>Next →</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {showDatePicker && (
                <DateTimePicker
                    value={admissionDateObj}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                />
            )}
        </View>
    );
};

// ─── Styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
    scroll: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 40 },

    // Step bar
    stepBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EDE9FE' },
    stepItem: { alignItems: 'center', minWidth: 44 },
    stepDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
    stepDotActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
    stepDotDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
    stepDotText: { fontSize: 14, color: '#9CA3AF' },
    stepDotTextActive: { color: '#FFFFFF' },
    stepLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4, fontWeight: '500' },
    stepLabelActive: { color: '#7C3AED', fontWeight: '700' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 12 },
    stepLineDone: { backgroundColor: '#10B981' },

    // Step content
    stepContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, marginTop: 14, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
    stepHeading: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
    stepSubtext: { fontSize: 14, color: '#6B7280', marginBottom: 22 },

    // Fields
    fieldWrap: { marginBottom: 18 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 7 },
    input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, fontSize: 15, color: '#111827', backgroundColor: '#FAFAFA' },
    inputMulti: { height: 90, textAlignVertical: 'top' },
    inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
    pickerBox: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FAFAFA', overflow: 'hidden' },
    pickerDisabled: { opacity: 0.5 },
    picker: { height: 50, color: '#111827' },
    dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, backgroundColor: '#FAFAFA' },
    dateBtnText: { fontSize: 15, color: '#111827' },
    dateBtnPlaceholder: { fontSize: 15, color: '#A1A1AA' },
    shiftAmountHint: { marginTop: 6, fontSize: 13, color: '#7C3AED', fontWeight: '600' },
    hintText: { marginTop: 5, fontSize: 12, color: '#9CA3AF' },

    // Photo
    photoPicker: { alignSelf: 'center', width: 180, height: 180, borderRadius: 90, backgroundColor: '#F5F3FF', borderWidth: 3, borderColor: '#7C3AED', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginTop: 10 },
    photoPreview: { width: '100%', height: '100%' },
    photoEditBadge: { position: 'absolute', bottom: 10, backgroundColor: '#7C3AED', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    photoEditText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    photoPlaceholder: { alignItems: 'center' },
    photoIcon: { fontSize: 52, marginBottom: 10 },
    photoPlaceholderText: { fontSize: 15, color: '#7C3AED', fontWeight: '700' },
    photoPlaceholderSub: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

    // Payment mini cards
    miniCard: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EDE9FE' },
    miniCardTitle: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 12 },
    summaryStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: '#EDE9FE' },
    summaryStripItem: { flex: 1, alignItems: 'center' },
    stripLabel: { fontSize: 11, color: '#6B7280', marginBottom: 3 },
    stripValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
    stripSep: { fontSize: 20, color: '#D1D5DB', marginHorizontal: 4 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
    switchLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
    switchSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

    // Review
    reviewPhotoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    reviewPhoto: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#7C3AED' },
    reviewName: { fontSize: 20, fontWeight: '800', color: '#111827' },
    reviewGender: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    statusText: { fontSize: 13, fontWeight: '700' },
    reviewSection: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#F3F4F6' },
    reviewSectionTitle: { fontSize: 14, fontWeight: '700', color: '#7C3AED', marginBottom: 10 },
    reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    reviewLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
    reviewValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1.5, textAlign: 'right' },
    reviewHighlight: { color: '#7C3AED' },
    reviewName_: { fontSize: 20, fontWeight: '800', color: '#1F2937' },

    // Nav buttons
    navRow: { flexDirection: 'row', marginTop: 18, gap: 12 },
    backBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    backBtnText: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
    nextBtn: { flex: 2, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    // Submit
    submitBtn: { backgroundColor: '#059669', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 8, shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    submitBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    loadingBox: { paddingVertical: 28, alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 15, color: '#6B7280' },
});

export default NewAdmissionForm;