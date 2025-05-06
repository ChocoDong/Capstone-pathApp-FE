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
} from 'react-native';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { House, MapPin, Compass, User, MagnifyingGlass, CrosshairSimple, CaretDown } from 'phosphor-react-native';
import * as Location from 'expo-location';
import { loadTravelParams, saveTravelParams, TravelParams } from '../../utils/storage';

const { width, height } = Dimensions.get('window');

export default function Home() {
    // 여행 유형을 두 카테고리로 분리
    const leisureTravelTypes = [
        {
            id: 'leisure',
            title: '휴양',
            image: require('../assets/images/Cat.jpeg'),
        },
        {
            id: 'tourism',
            title: '관광',
            image: require('../assets/images/Cat.jpeg'),
        },
    ];

    const experienceTravelTypes = [
        {
            id: 'food',
            title: '식도락 여행',
            image: require('../assets/images/Cat.jpeg'),
        },
        {
            id: 'experience',
            title: '경험을 추구하는 여행',
            image: require('../assets/images/Cat.jpeg'),
        },
    ];

    // 각 카테고리별로 선택된 항목 상태 관리
    const [selectedLeisureType, setSelectedLeisureType] = useState<string | null>(null);
    const [selectedExperienceType, setSelectedExperienceType] = useState<string | null>(null);
    const [startLocation, setStartLocation] = useState<string>('');
    const [endLocation, setEndLocation] = useState<string>('');
    const [selectedDays, setSelectedDays] = useState<string>('3');
    const [showDaysDropdown, setShowDaysDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
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
        setShowDaysDropdown(false);
    };

    // 여행 타입 선택 컴포넌트
    const renderTravelTypeButtons = (types: any[], selectedType: string | null, onSelect: (id: string) => void) => {
        return (
            <View style={styles.travelTypeRow}>
                {types.map((type) => (
                    <TouchableOpacity key={type.id} style={styles.travelTypeCircle} onPress={() => onSelect(type.id)}>
                        <View
                            style={[styles.circleImageContainer, selectedType === type.id && styles.selectedTravelType]}
                        >
                            <Image source={type.image} style={styles.circleImage} />
                        </View>
                        <Text style={styles.travelTypeTitle}>{type.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchSection}>
                <View style={styles.locationRow}>
                    <Text style={styles.label}>출발지</Text>
                    <View style={styles.rightContainer}>
                        <TouchableOpacity
                            style={styles.locationInputContainer}
                            onPress={() => handleLocationSearch('start')}
                        >
                            <Text style={styles.locationText} numberOfLines={1}>
                                {isLoading ? '위치를 가져오는 중...' : startLocation || '위치를 검색해주세요'}
                            </Text>
                            <TouchableOpacity
                                style={styles.inlineButton}
                                onPress={getCurrentLocation}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                disabled={isLoading}
                            >
                                <CrosshairSimple size={20} color={isLoading ? '#cccccc' : '#007bff'} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.searchIconButton}
                            onPress={() => handleLocationSearch('start')}
                            disabled={isLoading}
                        >
                            <MagnifyingGlass size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.locationRow}>
                    <Text style={styles.label}>도착지</Text>
                    <View style={styles.rightContainer}>
                        <TouchableOpacity
                            style={styles.locationInputContainer}
                            onPress={() => handleLocationSearch('end')}
                        >
                            <Text style={styles.locationText} numberOfLines={1}>
                                {endLocation || '위치를 검색해주세요'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.searchIconButton} onPress={() => handleLocationSearch('end')}>
                            <MagnifyingGlass size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.locationRow}>
                    <Text style={styles.label}>여행 일수</Text>
                    <View style={styles.rightContainer}>
                        <TouchableOpacity
                            style={styles.daysDropdownContainer}
                            onPress={() => setShowDaysDropdown(true)}
                        >
                            <Text style={styles.daysText}>{selectedDays}일</Text>
                            <CaretDown size={16} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 드롭다운 모달 */}
                <Modal
                    transparent={true}
                    visible={showDaysDropdown}
                    animationType="fade"
                    onRequestClose={() => setShowDaysDropdown(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setShowDaysDropdown(false)}>
                        <View style={styles.dropdownContainer}>
                            <FlatList
                                data={daysOptions}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.dropdownItem,
                                            selectedDays === item && styles.selectedDropdownItem,
                                        ]}
                                        onPress={() => handleDaysSelect(item)}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                selectedDays === item && styles.selectedDropdownItemText,
                                            ]}
                                        >
                                            {item}일
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </Pressable>
                </Modal>
            </View>

            <View style={styles.travelTypeSection}>
                <Text style={styles.sectionTitle}>휴양과 관광 중 선택해주세요</Text>
                {renderTravelTypeButtons(leisureTravelTypes, selectedLeisureType, handleLeisureTypeSelect)}

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>식도락과 경험 추구 중 선택해주세요</Text>
                {renderTravelTypeButtons(experienceTravelTypes, selectedExperienceType, handleExperienceTypeSelect)}
            </View>

            <TouchableOpacity
                onPress={() => {
                    if (selectedLeisureType && selectedExperienceType) {
                        router.push({
                            pathname: '../(tabs)/List',
                            params: {
                                leisureType: selectedLeisureType,
                                experienceType: selectedExperienceType,
                                startLocation,
                                endLocation,
                                travelDays: selectedDays,
                            },
                        });
                    }
                }}
                style={[
                    styles.searchRouteButton,
                    (!selectedLeisureType || !selectedExperienceType) && styles.disabledButton,
                ]}
                disabled={!selectedLeisureType || !selectedExperienceType}
            >
                <Text style={styles.searchRouteButtonText}>추천 경로 검색하기</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
    },
    searchSection: {
        marginBottom: 20,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    label: {
        width: '18%',
        fontSize: 16,
        fontWeight: 'bold',
    },
    rightContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
    },
    locationText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    inlineButton: {
        padding: 4,
    },
    searchIconButton: {
        padding: 10,
        marginLeft: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    travelTypeSection: {
        alignItems: 'center',
    },
    sectionTitle: {
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 15,
    },
    travelTypeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    travelTypeCircle: {
        alignItems: 'center',
        marginHorizontal: 25,
    },
    circleImageContainer: {
        width: width * 0.25,
        height: width * 0.25,
        borderRadius: (width * 0.25) / 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 8,
    },
    circleImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    selectedTravelType: {
        opacity: 1,
        borderColor: '#007bff',
        borderWidth: 2,
    },
    travelTypeTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center',
    },
    searchRouteButton: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    disabledButton: {
        backgroundColor: '#cccccc',
    },
    searchRouteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    daysDropdownContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
    },
    daysText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownContainer: {
        width: '60%',
        maxHeight: 300,
        backgroundColor: 'white',
        borderRadius: 8,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedDropdownItem: {
        backgroundColor: '#e6f2ff',
    },
    dropdownItemText: {
        fontSize: 16,
        textAlign: 'center',
    },
    selectedDropdownItemText: {
        color: '#007bff',
        fontWeight: 'bold',
    },
});
