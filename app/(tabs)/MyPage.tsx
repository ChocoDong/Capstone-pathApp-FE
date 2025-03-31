import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Alert, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';

const MyPage = () => {
    const [nickname, setNickname] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [newNickname, setNewNickname] = useState<string>('');
    const router = useRouter();
    const segments = useSegments();

    // 닉네임 불러오기
    useEffect(() => {
        const loadNickname = async () => {
            try {
                const savedNickname = await AsyncStorage.getItem('userNickname');
                if (savedNickname) {
                    setNickname(savedNickname);
                    setNewNickname(savedNickname);
                }
            } catch (error) {
                console.error('닉네임을 불러오는데 실패했습니다:', error);
            }
        };

        loadNickname();
    }, []);

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
            setIsEditing(false);
            Alert.alert('성공', '닉네임이 변경되었습니다.');
        } catch (error) {
            console.error('닉네임 저장에 실패했습니다:', error);
            Alert.alert('오류', '닉네임 저장에 실패했습니다. 다시 시도해주세요.');
        }
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
                            // 다른 사용자 관련 데이터도 필요에 따라 제거할 수 있습니다
                            // await AsyncStorage.removeItem('userNickname');

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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>마이페이지</Text>
            </View>

            <View style={styles.profileContainer}>
                <View style={styles.profileCircle}>
                    <Text style={styles.profileInitial}>{nickname ? nickname.charAt(0).toUpperCase() : '?'}</Text>
                </View>

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

            <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                    <Text style={styles.menuItemText}>로그아웃</Text>
                </TouchableOpacity>
                {/* 추가 메뉴 아이템*/}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
        backgroundColor: '#ffffff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    profileContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
        marginBottom: 10,
    },
    profileCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    profileInitial: {
        fontSize: 36,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    nicknameContainer: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    nickname: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    editNicknameButton: {
        marginLeft: 10,
        padding: 5,
    },
    editNicknameButtonText: {
        color: '#3498db',
        fontSize: 14,
    },
    editContainer: {
        alignItems: 'center',
    },
    nicknameInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        width: 200,
        textAlign: 'center',
        marginBottom: 10,
    },
    editButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    editButton: {
        backgroundColor: '#3498db',
        padding: 8,
        width: 70,
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
    },
    editButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    menuContainer: {
        backgroundColor: '#ffffff',
        marginTop: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    menuItemText: {
        fontSize: 16,
        color: '#333',
    },
});

export default MyPage;
