import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Dimensions,
    TextInput,
    Platform,
    Keyboard,
    FlatList,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_MAPS_API_KEY } from '../env/apiKeys';
import { router, useLocalSearchParams, useRouter } from 'expo-router';

// Google Places API 키 설정
const GOOGLE_PLACES_API_KEY = GOOGLE_MAPS_API_KEY;

interface LocationData {
    latitude: number;
    longitude: number;
    address?: string;
}

interface MapProps {
    initialLatitude?: number;
    initialLongitude?: number;
    initialZoom?: number;
    onLocationSelect?: (location: LocationData) => void;
}

interface PlaceSuggestion {
    id: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}

const Map: React.FC<MapProps> = ({
    initialLatitude = 37.566826,
    initialLongitude = 126.9786567,
    initialZoom = 14,
    onLocationSelect,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
    const [mapRegion, setMapRegion] = useState({
        latitude: initialLatitude,
        longitude: initialLongitude,
        latitudeDelta: 0.005 * (15 / initialZoom),
        longitudeDelta: 0.005 * (15 / initialZoom) * (Dimensions.get('window').width / Dimensions.get('window').height),
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const mapRef = useRef<MapView | null>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const navigation = useNavigation();

    const params = useLocalSearchParams();
    const router = useRouter();
    const locationType = params.locationType as string;

    // 위치 권한 요청 및 현재 위치 가져오기
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMsg('위치 접근 권한이 거부되었습니다');
                    setIsLoading(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                setMapRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: mapRegion.latitudeDelta,
                    longitudeDelta: mapRegion.longitudeDelta,
                });

                // 초기 위치의 주소 가져오기
                await getAddressFromCoordinates(location.coords.latitude, location.coords.longitude);
                setIsLoading(false);
            } catch (error) {
                console.error('현재 위치를 가져오는 중 오류가 발생했습니다:', error);
                setIsLoading(false);
            }
        })();
    }, []);

    // 검색어가 변경될 때마다 자동완성 실행
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // 디바운스 처리: 타이핑 중간에 너무 많은 API 요청을 보내지 않기 위함
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            fetchPlacesSuggestions(searchQuery);
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery]);

    // Google Places API로 자동완성 결과 가져오기
    const fetchPlacesSuggestions = async (query: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            // Google Places Autocomplete API 호출
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                    query
                )}&language=ko&key=${GOOGLE_PLACES_API_KEY}`
            );
            const data = await response.json();

            if (data.predictions && data.predictions.length > 0) {
                // 결과를 PlaceSuggestion 형태로 변환
                const placeSuggestions: PlaceSuggestion[] = data.predictions.map((prediction: any) => ({
                    id: prediction.place_id,
                    name: prediction.structured_formatting?.main_text || prediction.description,
                    address: prediction.structured_formatting?.secondary_text || '',
                }));

                setSuggestions(placeSuggestions);
                setShowSuggestions(true);
            } else {
                setSuggestions([{ id: 'no-results', name: '검색 결과가 없습니다', address: '' }]);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error('주소 검색 중 오류:', error);
            setSuggestions([{ id: 'error', name: '검색 중 오류가 발생했습니다', address: '' }]);
        } finally {
            setIsSearching(false);
        }
    };

    // Google Places API로 장소 상세 정보 가져오기
    const getPlaceDetails = async (placeId: string) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_API_KEY}`
            );
            const data = await response.json();

            if (data.result && data.result.geometry && data.result.geometry.location) {
                return {
                    latitude: data.result.geometry.location.lat,
                    longitude: data.result.geometry.location.lng,
                    address: data.result.formatted_address,
                };
            }
            return null;
        } catch (error) {
            console.error('장소 상세 정보를 가져오는 중 오류:', error);
            return null;
        }
    };

    // 좌표로부터 주소 가져오기 (Google Geocoding API 사용)
    const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=ko&key=${GOOGLE_PLACES_API_KEY}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const formattedAddress = data.results[0].formatted_address;

                setSelectedLocation({
                    latitude,
                    longitude,
                    address: formattedAddress,
                });
            } else {
                setSelectedLocation({
                    latitude,
                    longitude,
                    address: '주소를 찾을 수 없습니다',
                });
            }
        } catch (error) {
            console.error('주소 변환 중 오류:', error);
            setSelectedLocation({
                latitude,
                longitude,
                address: '주소 변환 오류',
            });
        }
    };

    const handleRegionChange = async (region: any) => {
        setMapRegion(region);
        await getAddressFromCoordinates(region.latitude, region.longitude);
    };

    // 검색 기능
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            // Google Places API의 Autocomplete 결과를 사용
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
                    searchQuery
                )}&inputtype=textquery&fields=formatted_address,geometry&key=${GOOGLE_PLACES_API_KEY}`
            );
            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                const place = data.candidates[0];
                const latitude = place.geometry.location.lat;
                const longitude = place.geometry.location.lng;

                // 지도 이동
                if (mapRef.current) {
                    mapRef.current.animateToRegion(
                        {
                            latitude,
                            longitude,
                            latitudeDelta: mapRegion.latitudeDelta,
                            longitudeDelta: mapRegion.longitudeDelta,
                        },
                        1000
                    );
                }

                setSelectedLocation({
                    latitude,
                    longitude,
                    address: place.formatted_address,
                });

                Keyboard.dismiss();
                setShowSuggestions(false);
            } else {
                console.log('검색 결과가 없습니다');
            }
        } catch (error) {
            console.error('주소 검색 중 오류:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // 자동완성 항목 선택 처리
    const handleSuggestionSelect = async (suggestion: PlaceSuggestion) => {
        // 특수 ID 처리 (에러 메시지 등)
        if (suggestion.id === 'no-results' || suggestion.id === 'error') {
            setShowSuggestions(false);
            return;
        }

        setIsSearching(true);

        try {
            // Google Places API로 상세 정보 가져오기
            const placeDetails = await getPlaceDetails(suggestion.id);

            if (placeDetails) {
                const { latitude, longitude, address } = placeDetails;

                // 지도 이동
                if (mapRef.current) {
                    mapRef.current.animateToRegion(
                        {
                            latitude,
                            longitude,
                            latitudeDelta: mapRegion.latitudeDelta,
                            longitudeDelta: mapRegion.longitudeDelta,
                        },
                        1000
                    );
                }

                setSelectedLocation({
                    latitude,
                    longitude,
                    address,
                });
            } else {
                // 상세 정보를 가져오지 못한 경우, 검색어로 검색
                setSearchQuery(suggestion.name);
                handleSearch();
            }
        } catch (error) {
            console.error('장소 상세 정보를 가져오는 중 오류:', error);
        } finally {
            Keyboard.dismiss();
            setShowSuggestions(false);
            setIsSearching(false);
        }
    };

    // 현재 위치 선택 핸들러
    const handleConfirmLocation = () => {
        if (selectedLocation) {
            // 위치와 타입을 홈 화면으로 전달
            const locationAddress =
                selectedLocation.address || `${selectedLocation.latitude}, ${selectedLocation.longitude}`;

            // expo-router를 사용하여 홈 화면으로 되돌아가기
            router.replace({
                pathname: '/Home',
                params: {
                    selectedLocation: locationAddress,
                    locationType: locationType,
                },
            });
        } else {
            router.back();
        }
    };

    // 현재 위치로 이동 버튼 핸들러
    const moveToCurrentLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({});
            if (mapRef.current) {
                mapRef.current.animateToRegion(
                    {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: mapRegion.latitudeDelta,
                        longitudeDelta: mapRegion.longitudeDelta,
                    },
                    1000
                );
            }
            await getAddressFromCoordinates(location.coords.latitude, location.coords.longitude);
        } catch (error) {
            console.error('현재 위치를 가져오는 중 오류가 발생했습니다:', error);
        }
    };

    // 줌 인 버튼 핸들러
    const handleZoomIn = () => {
        if (mapRef.current) {
            const newRegion = {
                ...mapRegion,
                latitudeDelta: mapRegion.latitudeDelta / 2,
                longitudeDelta: mapRegion.longitudeDelta / 2,
            };

            mapRef.current.animateToRegion(newRegion, 300);
            setMapRegion(newRegion);
        }
    };

    // 줌 아웃 버튼 핸들러
    const handleZoomOut = () => {
        if (mapRef.current) {
            const newRegion = {
                ...mapRegion,
                latitudeDelta: mapRegion.latitudeDelta * 2,
                longitudeDelta: mapRegion.longitudeDelta * 2,
            };

            mapRef.current.animateToRegion(newRegion, 300);
            setMapRegion(newRegion);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
                </View>
            ) : (
                <>
                    {/* 검색 바 */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="주소 검색..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                            returnKeyType="search"
                            clearButtonMode="while-editing"
                        />
                        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
                            {isSearching ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="search" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* 자동완성 결과 */}
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleSuggestionSelect(item)}
                                    >
                                        <Ionicons
                                            name="location-outline"
                                            size={16}
                                            color="#666"
                                            style={styles.suggestionIcon}
                                        />
                                        <View style={styles.suggestionTextContainer}>
                                            <Text style={styles.suggestionName}>{item.name}</Text>
                                            {item.address && (
                                                <Text style={styles.suggestionAddress} numberOfLines={1}>
                                                    {item.address}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={styles.suggestionsList}
                            />
                        </View>
                    )}

                    <MapView
                        ref={mapRef}
                        // provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        region={mapRegion}
                        onRegionChangeComplete={handleRegionChange}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                        showsCompass={true}
                        zoomEnabled={true}
                        pitchEnabled={true}
                        rotateEnabled={true}
                        onPress={() => {
                            Keyboard.dismiss();
                            setShowSuggestions(false);
                        }}
                    >
                        {/* 중앙 마커는 표시하지 않고 고정 이미지를 사용 */}
                    </MapView>

                    {/* 고정된 중앙 마커 이미지 */}
                    <View style={styles.markerFixed}>
                        <Ionicons name="location" size={32} color="#FF0000" />
                    </View>

                    {selectedLocation && (
                        <View style={styles.addressContainer}>
                            <Text style={styles.addressText} numberOfLines={2}>
                                {selectedLocation.address || '주소를 찾을 수 없습니다'}
                            </Text>
                        </View>
                    )}

                    {/* 줌 컨트롤 버튼
                    <View style={styles.zoomControlContainer}>
                        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                            <Ionicons name="add" size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
                            <Ionicons name="remove" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View> */}

                    {/* 현재 위치로 이동하는 버튼 */}
                    <TouchableOpacity style={styles.myLocationButton} onPress={moveToCurrentLocation}>
                        <Ionicons name="locate" size={24} color="#007AFF" />
                    </TouchableOpacity>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleConfirmLocation}
                            disabled={!selectedLocation}
                        >
                            <Text style={styles.confirmButtonText}>현재 위치로 설정하기</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    searchContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        zIndex: 2,
    },
    searchInput: {
        backgroundColor: 'white',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        fontSize: 16,
    },
    searchButton: {
        backgroundColor: '#007AFF',
        marginLeft: 10,
        borderRadius: 8,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 105,
        left: 20,
        right: 20,
        zIndex: 3,
        maxHeight: 200,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    suggestionsList: {
        flex: 1,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionIcon: {
        marginRight: 10,
    },
    suggestionTextContainer: {
        flex: 1,
    },
    suggestionName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    suggestionAddress: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    markerFixed: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -16,
        marginTop: -32, // 마커의 중앙이 아닌 하단이 중앙에 오도록 조정
        zIndex: 1,
    },
    addressContainer: {
        position: 'absolute',
        top: 110,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 1, // 자동완성 목록보다 낮은 zIndex로 설정
    },
    addressText: {
        fontSize: 14,
        color: '#333',
    },
    zoomControlContainer: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -50,
    },
    zoomButton: {
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 20,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    myLocationButton: {
        position: 'absolute',
        right: 16,
        bottom: 120,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        width: width - 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Map;
