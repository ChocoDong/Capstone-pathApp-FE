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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../../constants/Theme';
import { Envelope, Lock, ArrowRight } from 'phosphor-react-native';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('알림', '이메일과 비밀번호를 모두 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('로그인 성공:', userCredential.user);
            router.replace('/Home');
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
            } else {
                Alert.alert('로그인 실패', '알 수 없는 오류가 발생했습니다.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const navigateToSignup = () => {
        router.push('./SignUp');
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

                        <Text style={styles.title}>로그인</Text>
                        <Text style={styles.subtitle}>계정 정보를 입력하여 로그인하세요</Text>

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

                            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
                                {isLoading ? (
                                    <Text style={styles.loginButtonText}>로그인 중...</Text>
                                ) : (
                                    <View style={styles.loginBtnContent}>
                                        <Text style={styles.loginButtonText}>로그인</Text>
                                        <ArrowRight size={20} color={COLORS.white} weight="bold" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.signupContainer}>
                            <Text style={styles.signupText}>아이디가 없으신가요? </Text>
                            <TouchableOpacity onPress={navigateToSignup}>
                                <Text style={styles.signupLink}>회원가입</Text>
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
    loginButton: {
        backgroundColor: COLORS.button,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        height: 56,
        justifyContent: 'center',
        ...SHADOWS.medium,
    },
    loginButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    loginBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        marginBottom: 50,
    },
    signupText: {
        color: COLORS.textLight,
        fontSize: 15,
    },
    signupLink: {
        color: COLORS.accent,
        fontWeight: 'bold',
        fontSize: 15,
    },
});
