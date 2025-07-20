import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const InputField = ({ label, value, onChangeText, placeholder, keyboardType, icon }) => {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={styles.inputWrapper}>
                {icon && <Text style={styles.icon}>{icon}</Text>}
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    keyboardType={keyboardType}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginVertical: 8 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 8,
        borderRadius: 8,
    },
    icon: { marginRight: 8, fontSize: 16 },
    input: { flex: 1, fontSize: 16 },
});

export default InputField;
