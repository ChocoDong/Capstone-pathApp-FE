import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { COLORS, SHADOWS } from '../../constants/Theme';
import { Envelope, Lock, ArrowRight, User } from 'phosphor-react-native';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert('알림', '모든 필드를 입력해주세요.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('회원가입 성공:', userCredential.user);
            Alert.alert('성공', '회원가입이 완료되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
        } catch (error) {
            Alert.alert('회원가입 실패', (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const navigateToLogin = () => {
        router.back();
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/images/new/app_logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.appName}>나만의 여행 플래너</Text>
                        </View>

                        <Text style={styles.title}>회원가입</Text>
                        <Text style={styles.subtitle}>새로운 계정을 만들어 여행을 시작하세요</Text>

                        <View style={styles.formContainer}>
                            <View style={styles.inputContainer}>
                                <Envelope size={20} color={COLORS.textLight} weight="regular" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="이메일"
                                    placeholderTextColor={COLORS.textLight}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Lock size={20} color={COLORS.textLight} weight="regular" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="비밀번호"
                                    placeholderTextColor={COLORS.textLight}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Lock size={20} color={COLORS.textLight} weight="regular" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="비밀번호 확인"
                                    placeholderTextColor={COLORS.textLight}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={isLoading}>
                                {isLoading ? (
                                    <Text style={styles.signupButtonText}>처리 중...</Text>
                                ) : (
                                    <View style={styles.signupBtnContent}>
                                        <Text style={styles.signupButtonText}>가입하기</Text>
                                        <ArrowRight size={20} color={COLORS.white} weight="bold" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
                            <TouchableOpacity onPress={navigateToLogin}>
                                <Text style={styles.loginLink}>로그인</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardAvoidView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'flex-start',
        marginTop: 60,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    logo: {
        width: 110,
        height: 110,
        marginBottom: 15,
        backgroundColor: 'transparent',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    appName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 50,
        textAlign: 'center',
    },
    formContainer: {
        marginBottom: 40,
        marginHorizontal: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 56,
        ...SHADOWS.small,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        color: COLORS.text,
        fontSize: 16,
        height: '100%',
    },
    signupButton: {
        backgroundColor: COLORS.button,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        height: 56,
        justifyContent: 'center',
        ...SHADOWS.medium,
    },
    signupButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    signupBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        marginBottom: 50,
    },
    loginText: {
        color: COLORS.textLight,
        fontSize: 15,
    },
    loginLink: {
        color: COLORS.accent,
        fontWeight: 'bold',
        fontSize: 15,
    },
});
