import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
    Alert,
    TextInput,
    Modal,
    FlatList,
    Pressable,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import {
    House,
    MapPin,
    Compass,
    User,
    MagnifyingGlass,
    CrosshairSimple,
    CaretDown,
    Tree,
    Buildings,
    ForkKnife,
    Confetti,
    X,
} from 'phosphor-react-native';
import * as Location from 'expo-location';
import { loadTravelParams, saveTravelParams, TravelParams } from '../../utils/storage';
import { COLORS, SHADOWS, CARD_STYLES, TYPOGRAPHY, SPACING } from '../../constants/Theme';

const { width, height } = Dimensions.get('window');

export default function Home() {
    // 여행 유형을 두 카테고리로 분리
    const leisureTravelTypes = [
        {
            id: 'leisure',
            title: '휴양',
            description: '편안한 휴식을 즐길 수 있는 여행',
            icon: <Tree size={40} weight="duotone" color={COLORS.accent} />,
        },
        {
            id: 'tourism',
            title: '관광',
            description: '다양한 명소를 방문하는 여행',
            icon: <Buildings size={40} weight="duotone" color={COLORS.accent} />,
        },
    ];

    const experienceTravelTypes = [
        {
            id: 'food',
            title: '음식',
            description: '맛집 탐방 중심의 여행',
            icon: <ForkKnife size={40} weight="duotone" color={COLORS.accent} />,
        },
        {
            id: 'culture',
            title: '문화',
            description: '역사와 문화를 체험하는 여행',
            icon: <Confetti size={40} weight="duotone" color={COLORS.accent} />,
        },
    ];

    // 각 카테고리별로 선택된 항목 상태 관리
    const [selectedLeisureType, setSelectedLeisureType] = useState<string | null>(null);
    const [selectedExperienceType, setSelectedExperienceType] = useState<string | null>(null);
    const [startLocation, setStartLocation] = useState<string>('');
    const [endLocation, setEndLocation] = useState<string>('');
    const [selectedDays, setSelectedDays] = useState<string>('3');
    const [showDaysModal, setShowDaysModal] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const daysOptions = ['1', '2', '3', '4', '5', '6', '7'];

    const params = useLocalSearchParams();
    const router = useRouter();

    // 초기 데이터 로드
    useEffect(() => {
        // AsyncStorage에서 이전 설정값 불러오기
        const loadSavedParams = async () => {
            try {
                const savedParams = await loadTravelParams();
                if (savedParams) {
                    // 저장된 값이 있으면 상태 설정
                    if (savedParams.startLocation) setStartLocation(savedParams.startLocation);
                    if (savedParams.endLocation) setEndLocation(savedParams.endLocation);
                    if (savedParams.leisureType) setSelectedLeisureType(savedParams.leisureType);
                    if (savedParams.experienceType) setSelectedExperienceType(savedParams.experienceType);
                    if (savedParams.travelDays) setSelectedDays(savedParams.travelDays);
                }
                setInitialDataLoaded(true);
            } catch (error) {
                console.error('저장된 데이터 불러오기 실패:', error);
                setInitialDataLoaded(true);
            }
        };

        loadSavedParams();
    }, []);

    // URL 파라미터에서 위치 정보 받기
    useEffect(() => {
        if (params.selectedLocation && params.locationType && initialDataLoaded) {
            const location = params.selectedLocation as string;
            const type = params.locationType as 'start' | 'end';

            if (type === 'start') {
                setStartLocation(location);
                // AsyncStorage에 저장
                saveParamToStorage('startLocation', location);
            } else {
                setEndLocation(location);
                // AsyncStorage에 저장
                saveParamToStorage('endLocation', location);
            }
        }
    }, [params, initialDataLoaded]);

    // 파라미터 변경 시 AsyncStorage에 저장
    useEffect(() => {
        if (initialDataLoaded) {
            // 모든 파라미터를 하나의 객체로 저장
            const params: TravelParams = {
                startLocation: startLocation || undefined,
                endLocation: endLocation || undefined,
                leisureType: selectedLeisureType || undefined,
                experienceType: selectedExperienceType || undefined,
                travelDays: selectedDays,
            };

            saveTravelParams(params);
        }
    }, [startLocation, endLocation, selectedLeisureType, selectedExperienceType, selectedDays, initialDataLoaded]);

    // AsyncStorage에 특정 파라미터만 저장
    const saveParamToStorage = async (key: keyof TravelParams, value: string) => {
        try {
            const currentParams = (await loadTravelParams()) || {};
            saveTravelParams({
                ...currentParams,
                [key]: value,
            });
        } catch (error) {
            console.error('파라미터 저장 실패:', error);
        }
    };

    // 위치 검색 화면으로 이동하는 함수
    const handleLocationSearch = (locationType: 'start' | 'end') => {
        router.push({
            pathname: '../map/Map',
            params: { locationType },
        });
    };

    // 현재 위치 가져오기
    const getCurrentLocation = async () => {
        setIsLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('알림', '위치 접근 권한이 필요합니다.');
            setIsLoading(false);
            return;
        }

        try {
            // 위치 정보 가져오기
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });

            // 위치 정보를 주소로 변환 (역지오코딩)
            const addresses = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (addresses && addresses.length > 0) {
                const address = addresses[0];

                // 지역명 중심으로 주소 구성 (한국 주소체계 고려)
                let formattedAddress = '';

                // 한국 주소 형식으로 구성
                if (address.country === 'South Korea' || address.country === '대한민국') {
                    const parts = [];
                    // 시/도
                    if (address.region) parts.push(address.region);
                    // 시/군/구
                    if (address.city) parts.push(address.city);
                    // 동/읍/면
                    if (address.subregion) parts.push(address.subregion);
                    // 동/읍/면이 없는 경우 district 활용
                    else if (address.district) parts.push(address.district);

                    formattedAddress = parts.join(' ');
                } else {
                    // 해외 주소의 경우
                    const parts = [];
                    if (address.country) parts.push(address.country);
                    if (address.region) parts.push(address.region);
                    if (address.city) parts.push(address.city);

                    formattedAddress = parts.join(', ');
                }

                if (formattedAddress) {
                    setStartLocation(formattedAddress);
                    // AsyncStorage에 저장
                    saveParamToStorage('startLocation', formattedAddress);
                } else {
                    // 주소 정보가 없을 경우 좌표로 표시
                    const coordsString = `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(
                        5
                    )}`;
                    setStartLocation(coordsString);
                    saveParamToStorage('startLocation', coordsString);
                    Alert.alert('알림', '주소를 찾을 수 없어 좌표로 표시합니다.');
                }
            } else {
                // 주소 변환 실패 시 좌표로 표시
                const coordsString = `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`;
                setStartLocation(coordsString);
                saveParamToStorage('startLocation', coordsString);
            }
        } catch (error) {
            Alert.alert('오류', '위치를 가져오는데 실패했습니다.');
            console.error('Location error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 여행 타입 선택 처리 함수
    const handleLeisureTypeSelect = (typeId: string) => {
        const newValue = typeId === selectedLeisureType ? null : typeId;
        setSelectedLeisureType(newValue);
        if (newValue) {
            saveParamToStorage('leisureType', newValue);
        }
    };

    const handleExperienceTypeSelect = (typeId: string) => {
        const newValue = typeId === selectedExperienceType ? null : typeId;
        setSelectedExperienceType(newValue);
        if (newValue) {
            saveParamToStorage('experienceType', newValue);
        }
    };

    // 여행 날짜 선택
    const handleDaysSelect = (days: string) => {
        setSelectedDays(days);
        saveParamToStorage('travelDays', days);
        setShowDaysModal(false);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>나만의 여행 플래너</Text>
                <Text style={styles.headerSubtitle}>여행 정보를 입력하고 맞춤 코스를 만들어보세요</Text>
            </View>

            <View style={styles.content}>
                {/* 장소 입력 섹션 */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>여행 장소</Text>

                    {/* 출발지 */}
                    <View style={styles.locationInputContainer}>
                        <View style={[styles.iconContainer, styles.startIconContainer]}>
                            <MapPin size={22} color="#4CAF50" weight="fill" />
                        </View>
                        <Pressable
                            style={[styles.locationInput, startLocation ? styles.filledInput : {}]}
                            onPress={() => handleLocationSearch('start')}
                        >
                            <Text
                                style={startLocation ? styles.inputText : styles.placeholderText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {startLocation || '출발지를 입력하세요'}
                            </Text>
                            <TouchableOpacity
                                style={[styles.locationButton, styles.startLocationButton]}
                                onPress={getCurrentLocation}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <CrosshairSimple size={14} color={COLORS.white} weight="bold" />
                                )}
                            </TouchableOpacity>
                        </Pressable>
                    </View>

                    {/* 도착지 */}
                    <View style={styles.locationInputContainer}>
                        <View style={[styles.iconContainer, styles.endIconContainer]}>
                            <MapPin size={22} color="#FF9800" weight="fill" />
                        </View>
                        <Pressable
                            style={[styles.locationInput, endLocation ? styles.filledInput : {}]}
                            onPress={() => handleLocationSearch('end')}
                        >
                            <Text
                                style={endLocation ? styles.inputText : styles.placeholderText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {endLocation || '도착지를 입력하세요'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* 여행 일수 선택 */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>여행 일수</Text>

                    <TouchableOpacity style={styles.daysSelector} onPress={() => setShowDaysModal(true)}>
                        <Text style={styles.inputText}>{selectedDays}일</Text>
                        <CaretDown size={16} color={COLORS.text} weight="bold" />
                    </TouchableOpacity>

                    {/* 일수 선택 모달 */}
                    <Modal
                        visible={showDaysModal}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowDaysModal(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>여행 일수 선택</Text>
                                    <TouchableOpacity onPress={() => setShowDaysModal(false)}>
                                        <X size={20} color={COLORS.textLight} weight="bold" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.modalDaysList}>
                                    {daysOptions.map((day) => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[styles.dayOption, selectedDays === day && styles.selectedDayOption]}
                                            onPress={() => handleDaysSelect(day)}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayOptionText,
                                                    selectedDays === day && styles.selectedDayOptionText,
                                                ]}
                                            >
                                                {day}일
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </Modal>
                </View>

                {/* 여행 타입 - 휴양/관광 */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>여행 유형 선택</Text>
                    <Text style={styles.sectionSubtitle}>즐기고 싶은 여행 유형을 선택하세요</Text>

                    {/* 첫 번째 타입 옵션 */}
                    <View style={styles.travelTypeContainer}>
                        {leisureTravelTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.travelTypeButton,
                                    selectedLeisureType === type.id && styles.selectedTypeButton,
                                ]}
                                onPress={() => handleLeisureTypeSelect(type.id)}
                            >
                                <View style={styles.iconWrapper}>{type.icon}</View>
                                <Text
                                    style={[
                                        styles.travelTypeTitle,
                                        selectedLeisureType === type.id && styles.selectedTypeText,
                                    ]}
                                >
                                    {type.title}
                                </Text>
                                <Text style={styles.travelTypeDescription}>{type.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* 두 번째 타입 옵션 */}
                    <View style={styles.travelTypeContainer}>
                        {experienceTravelTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.travelTypeButton,
                                    selectedExperienceType === type.id && styles.selectedTypeButton,
                                ]}
                                onPress={() => handleExperienceTypeSelect(type.id)}
                            >
                                <View style={styles.iconWrapper}>{type.icon}</View>
                                <Text
                                    style={[
                                        styles.travelTypeTitle,
                                        selectedExperienceType === type.id && styles.selectedTypeText,
                                    ]}
                                >
                                    {type.title}
                                </Text>
                                <Text style={styles.travelTypeDescription}>{type.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 여행 경로 생성 버튼 */}
                <TouchableOpacity
                    style={[styles.generateButton, (!startLocation || !endLocation) && styles.disabledButton]}
                    onPress={() => {
                        if (startLocation && endLocation) {
                            setIsGenerating(true);
                            setTimeout(() => {
                                setIsGenerating(false);
                                router.push({
                                    pathname: '../route/result',
                                    params: {
                                        start: startLocation,
                                        end: endLocation,
                                        days: selectedDays,
                                        type:
                                            selectedLeisureType && selectedExperienceType
                                                ? `${selectedLeisureType},${selectedExperienceType}`
                                                : selectedLeisureType || selectedExperienceType || '',
                                    },
                                });
                            }, 500);
                        } else {
                            Alert.alert('알림', '출발지와 도착지를 모두 입력해주세요.');
                        }
                    }}
                    disabled={!startLocation || !endLocation || isGenerating}
                >
                    {isGenerating ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <>
                            <Text style={styles.generateButtonText}>여행 경로 생성하기</Text>
                            <Compass style={styles.buttonIcon} size={22} color={COLORS.white} weight="bold" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 20,
    },
    header: {
        marginBottom: 25,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: COLORS.textLight,
    },
    content: {
        paddingBottom: 80,
    },
    sectionCard: {
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 16,
    },
    locationInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    startIconContainer: {
        backgroundColor: '#E8F5E9',
    },
    endIconContainer: {
        backgroundColor: '#FFF3E0',
    },
    startLocationButton: {
        backgroundColor: '#78A9FF',
    },
    locationInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    filledInput: {
        borderColor: COLORS.accent,
    },
    placeholderText: {
        color: COLORS.textLight,
        opacity: 0.6,
        flex: 1,
        marginRight: 8,
        fontSize: 14,
    },
    inputText: {
        fontSize: 15,
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    locationButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1,
        elevation: 1,
    },
    travelTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    travelTypeButton: {
        flex: 1,
        padding: 16,
        marginHorizontal: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
    },
    selectedTypeButton: {
        borderColor: COLORS.accent,
        backgroundColor: COLORS.selected,
    },
    iconWrapper: {
        marginBottom: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    travelTypeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    travelTypeDescription: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    selectedTypeText: {
        color: COLORS.accent,
    },
    daysSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        backgroundColor: COLORS.white,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    modalDaysList: {
        maxHeight: height * 0.4,
    },
    dayOption: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'center',
    },
    selectedDayOption: {
        backgroundColor: COLORS.selected,
    },
    dayOptionText: {
        fontSize: 16,
        color: COLORS.text,
    },
    selectedDayOptionText: {
        color: COLORS.accent,
        fontWeight: 'bold',
    },
    generateButton: {
        backgroundColor: COLORS.button,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 40,
        minHeight: 56,
        flexDirection: 'row',
    },
    generateButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 8,
    },
    buttonIcon: {
        marginLeft: 8,
    },
    disabledButton: {
        backgroundColor: COLORS.border,
        opacity: 0.7,
    },
});
