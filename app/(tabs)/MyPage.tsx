import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    SafeAreaView,
    ScrollView,
    Switch,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SHADOWS } from '../../constants/Theme';
import {
    User,
    SignOut,
    Bell,
    Lock,
    Info,
    Heart,
    Eye,
    Gear,
    Question,
    MapPin,
    ShieldCheck,
    Camera,
} from 'phosphor-react-native';

// 사용자 DB 속성에 맞게 인터페이스 정의
interface UserProfile {
    nickname: string;
    profileImage: string | null;
    notificationsEnabled: boolean;
    privacyMode: string; // 'public', 'friends', 'private'
    preferredTheme: string; // 'light', 'dark', 'system'
    favoriteLocations: number; // 저장한 장소 개수
    historyVisible: boolean;
}

const MyPage = () => {
    const [nickname, setNickname] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [newNickname, setNewNickname] = useState<string>('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile>({
        nickname: '',
        profileImage: null,
        notificationsEnabled: true,
        privacyMode: 'public',
        preferredTheme: 'light',
        favoriteLocations: 0,
        historyVisible: true,
    });
    const router = useRouter();
    const segments = useSegments();

    // 사용자 프로필 불러오기
    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                // 닉네임 불러오기
                const savedNickname = await AsyncStorage.getItem('userNickname');
                if (savedNickname) {
                    setNickname(savedNickname);
                    setNewNickname(savedNickname);
                    setUserProfile((prev) => ({ ...prev, nickname: savedNickname }));
                }

                // 프로필 이미지 불러오기
                const savedProfileImage = await AsyncStorage.getItem('userProfileImage');
                if (savedProfileImage) {
                    setProfileImage(savedProfileImage);
                    setUserProfile((prev) => ({ ...prev, profileImage: savedProfileImage }));
                }

                // 다른 사용자 설정 불러오기 (실제로는 DB에서 가져올 것)
                const savedNotifications = await AsyncStorage.getItem('userNotifications');
                const savedPrivacyMode = await AsyncStorage.getItem('userPrivacyMode');
                const savedTheme = await AsyncStorage.getItem('userTheme');
                const savedFavorites = await AsyncStorage.getItem('userFavorites');
                const savedHistoryVisible = await AsyncStorage.getItem('userHistoryVisible');

                setUserProfile((prev) => ({
                    ...prev,
                    notificationsEnabled: savedNotifications === 'true',
                    privacyMode: savedPrivacyMode || 'public',
                    preferredTheme: savedTheme || 'light',
                    favoriteLocations: parseInt(savedFavorites || '0'),
                    historyVisible: savedHistoryVisible === 'true',
                }));
            } catch (error) {
                console.error('사용자 프로필을 불러오는데 실패했습니다:', error);
            }
        };

        loadUserProfile();
    }, []);

    // 프로필 이미지 선택
    const pickImage = async () => {
        try {
            // 카메라 롤 접근 권한 요청
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('권한 필요', '사진을 선택하려면 권한이 필요합니다.');
                return;
            }

            // 이미지 선택기 실행
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0].uri) {
                const selectedImageUri = result.assets[0].uri;
                setProfileImage(selectedImageUri);
                setUserProfile((prev) => ({ ...prev, profileImage: selectedImageUri }));

                // AsyncStorage에 저장
                await AsyncStorage.setItem('userProfileImage', selectedImageUri);
                Alert.alert('성공', '프로필 이미지가 업데이트되었습니다.');
            }
        } catch (error) {
            console.error('이미지 선택 중 오류 발생:', error);
            Alert.alert('오류', '이미지를 선택하는 중 문제가 발생했습니다.');
        }
    };

    // 사진 촬영하기
    const takePhoto = async () => {
        try {
            // 카메라 접근 권한 요청
            const { status } = await ImagePicker.requestCameraPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('권한 필요', '카메라를 사용하려면 권한이 필요합니다.');
                return;
            }

            // 카메라 실행
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets[0].uri) {
                const capturedImageUri = result.assets[0].uri;
                setProfileImage(capturedImageUri);
                setUserProfile((prev) => ({ ...prev, profileImage: capturedImageUri }));

                // AsyncStorage에 저장
                await AsyncStorage.setItem('userProfileImage', capturedImageUri);
                Alert.alert('성공', '프로필 이미지가 업데이트되었습니다.');
            }
        } catch (error) {
            console.error('카메라 사용 중 오류 발생:', error);
            Alert.alert('오류', '사진 촬영 중 문제가 발생했습니다.');
        }
    };

    // 프로필 이미지 변경 옵션 표시
    const showProfileImageOptions = () => {
        Alert.alert(
            '프로필 이미지 변경',
            '원하는 옵션을 선택하세요',
            [
                {
                    text: '갤러리에서 선택',
                    onPress: pickImage,
                },
                {
                    text: '사진 촬영',
                    onPress: takePhoto,
                },
                {
                    text: '취소',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    // 닉네임 수정 모드
    const toggleEditMode = () => {
        setIsEditing(!isEditing);
        if (!isEditing) {
            setNewNickname(nickname);
        }
    };

    // 닉네임 저장
    const saveNickname = async () => {
        if (!newNickname.trim()) {
            Alert.alert('알림', '닉네임을 입력해주세요.');
            return;
        }

        try {
            await AsyncStorage.setItem('userNickname', newNickname);
            setNickname(newNickname);
            setUserProfile((prev) => ({ ...prev, nickname: newNickname }));
            setIsEditing(false);
            Alert.alert('성공', '닉네임이 변경되었습니다.');
        } catch (error) {
            console.error('닉네임 저장에 실패했습니다:', error);
            Alert.alert('오류', '닉네임 저장에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 알림 설정 변경
    const toggleNotifications = async (value: boolean) => {
        try {
            await AsyncStorage.setItem('userNotifications', value.toString());
            setUserProfile((prev) => ({ ...prev, notificationsEnabled: value }));
        } catch (error) {
            console.error('알림 설정 저장에 실패했습니다:', error);
        }
    };

    // 개인정보 보호 설정 열기
    const openPrivacySettings = () => {
        Alert.alert('개인정보 보호 설정', '계정 공개 범위를 선택하세요', [
            {
                text: '전체 공개',
                onPress: () => savePrivacySetting('public'),
            },
            {
                text: '친구만',
                onPress: () => savePrivacySetting('friends'),
            },
            {
                text: '비공개',
                onPress: () => savePrivacySetting('private'),
            },
            {
                text: '취소',
                style: 'cancel',
            },
        ]);
    };

    // 개인정보 보호 설정 저장
    const savePrivacySetting = async (mode: string) => {
        try {
            await AsyncStorage.setItem('userPrivacyMode', mode);
            setUserProfile((prev) => ({ ...prev, privacyMode: mode }));
        } catch (error) {
            console.error('개인정보 보호 설정 저장에 실패했습니다:', error);
        }
    };

    // 내 여행 경로 확인
    const viewMyRoutes = () => {
        Alert.alert('안내', '내 여행 경로 기능은 준비 중입니다.');
        // 실제로는 router.push('/my-routes') 등으로 페이지 이동
    };

    // 저장한 장소 보기
    const viewSavedPlaces = () => {
        Alert.alert('안내', '저장한 장소 기능은 준비 중입니다.');
        // 실제로는 router.push('/saved-places') 등으로 페이지 이동
    };

    // 방문 기록 표시 설정 변경
    const toggleHistoryVisibility = async (value: boolean) => {
        try {
            await AsyncStorage.setItem('userHistoryVisible', value.toString());
            setUserProfile((prev) => ({ ...prev, historyVisible: value }));
        } catch (error) {
            console.error('방문 기록 표시 설정 저장에 실패했습니다:', error);
        }
    };

    // 고객센터 문의
    const contactSupport = () => {
        Alert.alert('안내', '고객센터 문의 기능은 준비 중입니다.');
        // 실제로는 router.push('/contact-support') 등으로 페이지 이동
    };

    // 앱 정보 보기
    const viewAppInfo = () => {
        Alert.alert('앱 정보', '나만의 여행 플래너\n버전: 1.0.0\n개발자: 여행 플래너 개발팀');
    };

    // 로그아웃
    const handleLogout = async () => {
        Alert.alert(
            '로그아웃',
            '로그아웃 하시겠습니까?',
            [
                {
                    text: '취소',
                    style: 'cancel',
                },
                {
                    text: '확인',
                    onPress: async () => {
                        try {
                            // 로그인 상태 또는 토큰 제거
                            await AsyncStorage.removeItem('userToken');
                            router.replace('../auth/Login');
                        } catch (error) {
                            console.error('로그아웃 처리 중 오류 발생:', error);
                            Alert.alert('오류', '로그아웃 처리 중 문제가 발생했습니다.');
                        }
                    },
                },
            ],
            { cancelable: false }
        );
    };

    // 개인정보 보호 모드 텍스트
    const getPrivacyModeText = () => {
        switch (userProfile.privacyMode) {
            case 'public':
                return '전체 공개';
            case 'friends':
                return '친구만';
            case 'private':
                return '비공개';
            default:
                return '전체 공개';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>마이페이지</Text>
                </View>

                <View style={styles.profileContainer}>
                    <TouchableOpacity onPress={showProfileImageOptions} style={styles.profileImageContainer}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.profileCircle}>
                                <Text style={styles.profileInitial}>
                                    {nickname ? nickname.charAt(0).toUpperCase() : '?'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.cameraIconContainer}>
                            <Camera size={18} color={COLORS.white} weight="bold" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.nicknameContainer}>
                        {isEditing ? (
                            <View style={styles.editContainer}>
                                <TextInput
                                    style={styles.nicknameInput}
                                    value={newNickname}
                                    onChangeText={setNewNickname}
                                    placeholder="새 닉네임 입력"
                                    maxLength={10}
                                    autoFocus
                                    placeholderTextColor={COLORS.textLight}
                                />
                                <View style={styles.editButtonContainer}>
                                    <TouchableOpacity style={styles.editButton} onPress={saveNickname}>
                                        <Text style={styles.editButtonText}>저장</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.editButton, styles.cancelButton]}
                                        onPress={toggleEditMode}
                                    >
                                        <Text style={styles.editButtonText}>취소</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.nickname}>{nickname || '닉네임을 설정해주세요'}</Text>
                                <TouchableOpacity style={styles.editNicknameButton} onPress={toggleEditMode}>
                                    <Text style={styles.editNicknameButtonText}>수정</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* 계정 설정 섹션 */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>계정 설정</Text>
                </View>

                <View style={styles.menuContainer}>
                    {/* 알림 설정 */}
                    <View style={styles.switchMenuRow}>
                        <View style={styles.menuItemLeft}>
                            <Bell size={22} color={COLORS.accent} weight="regular" />
                            <Text style={styles.menuItemText}>알림 설정</Text>
                        </View>
                        <Switch
                            trackColor={{ false: COLORS.border, true: COLORS.accent }}
                            thumbColor={userProfile.notificationsEnabled ? COLORS.white : '#f4f3f4'}
                            ios_backgroundColor={COLORS.border}
                            onValueChange={toggleNotifications}
                            value={userProfile.notificationsEnabled}
                        />
                    </View>

                    {/* 개인정보 보호 설정 */}
                    <TouchableOpacity style={styles.menuItem} onPress={openPrivacySettings}>
                        <ShieldCheck size={22} color={COLORS.accent} weight="regular" />
                        <Text style={styles.menuItemText}>개인정보 보호</Text>
                        <View style={styles.menuItemRight}>
                            <Text style={styles.menuItemValue}>{getPrivacyModeText()}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* 히스토리 표시 */}
                    <View style={styles.switchMenuRow}>
                        <View style={styles.menuItemLeft}>
                            <Eye size={22} color={COLORS.accent} weight="regular" />
                            <Text style={styles.menuItemText}>방문 기록 표시</Text>
                        </View>
                        <Switch
                            trackColor={{ false: COLORS.border, true: COLORS.accent }}
                            thumbColor={userProfile.historyVisible ? COLORS.white : '#f4f3f4'}
                            ios_backgroundColor={COLORS.border}
                            onValueChange={toggleHistoryVisibility}
                            value={userProfile.historyVisible}
                        />
                    </View>
                </View>

                {/* 내 여행 관련 섹션 */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>내 여행</Text>
                </View>

                <View style={styles.menuContainer}>
                    {/* 내 여행 경로 */}
                    <TouchableOpacity style={styles.menuItem} onPress={viewMyRoutes}>
                        <MapPin size={22} color={COLORS.accent} weight="regular" />
                        <Text style={styles.menuItemText}>내 여행 경로</Text>
                    </TouchableOpacity>

                    {/* 저장한 장소 */}
                    <TouchableOpacity style={styles.menuItem} onPress={viewSavedPlaces}>
                        <Heart size={22} color={COLORS.accent} weight="regular" />
                        <Text style={styles.menuItemText}>저장한 장소</Text>
                        <View style={styles.menuItemRight}>
                            <Text style={styles.menuItemValue}>{userProfile.favoriteLocations}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 도움말 및 정보 섹션 */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>도움말 및 정보</Text>
                </View>

                <View style={styles.menuContainer}>
                    {/* 고객센터 */}
                    <TouchableOpacity style={styles.menuItem} onPress={contactSupport}>
                        <Question size={22} color={COLORS.accent} weight="regular" />
                        <Text style={styles.menuItemText}>고객센터</Text>
                    </TouchableOpacity>

                    {/* 앱 정보 */}
                    <TouchableOpacity style={styles.menuItem} onPress={viewAppInfo}>
                        <Info size={22} color={COLORS.accent} weight="regular" />
                        <Text style={styles.menuItemText}>앱 정보</Text>
                    </TouchableOpacity>

                    {/* 로그아웃 */}
                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                        <SignOut size={22} color={COLORS.accent} weight="regular" />
                        <Text style={styles.menuItemText}>로그아웃</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    header: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    profileContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        backgroundColor: COLORS.white,
        marginTop: 20,
        marginHorizontal: 20,
        borderRadius: 15,
        ...SHADOWS.medium,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    profileCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    profileImage: {
        width: 110,
        height: 110,
        borderRadius: 55,
        ...SHADOWS.small,
    },
    cameraIconContainer: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.accent,
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
        ...SHADOWS.small,
    },
    profileInitial: {
        fontSize: 46,
        color: COLORS.white,
        fontWeight: 'bold',
    },
    nicknameContainer: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    nickname: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
    },
    editNicknameButton: {
        marginLeft: 12,
        padding: 6,
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    editNicknameButtonText: {
        color: COLORS.accent,
        fontSize: 14,
        fontWeight: '500',
    },
    editContainer: {
        alignItems: 'center',
        width: '100%',
    },
    nicknameInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 12,
        width: '100%',
        textAlign: 'center',
        marginBottom: 15,
        backgroundColor: COLORS.white,
        color: COLORS.text,
        fontSize: 16,
    },
    editButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    editButton: {
        backgroundColor: COLORS.button,
        padding: 10,
        width: 80,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 5,
        ...SHADOWS.small,
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
    },
    editButtonText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    sectionHeader: {
        marginTop: 25,
        marginBottom: 10,
        marginHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    menuContainer: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 15,
        ...SHADOWS.medium,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    switchMenuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
        marginLeft: 12,
    },
    menuItemRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    menuItemValue: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
    },
});

export default MyPage;
