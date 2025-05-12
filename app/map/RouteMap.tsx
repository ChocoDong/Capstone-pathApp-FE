import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_MAPS_API_KEY } from '../env/apiKeys';
import { router, useLocalSearchParams } from 'expo-router';

const RouteMap = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [mapRegion, setMapRegion] = useState({
        latitude: 37.566826, // 서울 시청 위치(기본값)
        longitude: 126.9786567,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02 * (Dimensions.get('window').width / Dimensions.get('window').height),
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showError, setShowError] = useState<boolean>(false);
    const mapRef = useRef<MapView | null>(null);
    const navigation = useNavigation();

    // 경로 관련 상태
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [distance, setDistance] = useState<string>('');
    const [duration, setDuration] = useState<string>('');
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    // URL 파라미터 읽기
    const params = useLocalSearchParams();
    const destinationLat = params.destinationLat ? parseFloat(params.destinationLat as string) : null;
    const destinationLng = params.destinationLng ? parseFloat(params.destinationLng as string) : null;
    const destinationName = params.destinationName as string;

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
                const currentCoords = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };

                setCurrentLocation(currentCoords);

                // 기본 지도 위치를 현재 위치로 설정
                setMapRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02 * (Dimensions.get('window').width / Dimensions.get('window').height),
                });

                // 목적지 정보가 제공된 경우
                if (destinationLat && destinationLng) {
                    const destinationCoords = {
                        latitude: destinationLat,
                        longitude: destinationLng,
                    };

                    // 경로를 가져온다
                    await getDirections(currentCoords, destinationCoords);

                    // 현재 위치와 목적지를 모두 포함하는 지도 영역 설정
                    setTimeout(() => {
                        if (mapRef.current && currentCoords && destinationCoords) {
                            try {
                                mapRef.current.fitToCoordinates([currentCoords, destinationCoords], {
                                    edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                                    animated: true,
                                });
                                console.log('지도 영역 설정 완료');
                            } catch (error) {
                                console.error('지도 영역 설정 중 오류:', error);
                                // 오류 발생 시 기본 위치로 설정
                                mapRef.current.animateToRegion(
                                    {
                                        latitude: (currentCoords.latitude + destinationCoords.latitude) / 2,
                                        longitude: (currentCoords.longitude + destinationCoords.longitude) / 2,
                                        latitudeDelta: 0.05,
                                        longitudeDelta:
                                            0.05 * (Dimensions.get('window').width / Dimensions.get('window').height),
                                    },
                                    1000
                                );
                            }
                        }
                    }, 1000);
                }

                setIsLoading(false);
            } catch (error) {
                console.error('현재 위치를 가져오는 중 오류가 발생했습니다:', error);
                setIsLoading(false);
            }
        })();
    }, [destinationLat, destinationLng]);

    // Google Directions API를 사용하여 경로 데이터 가져오기
    const getDirections = async (
        startLoc: { latitude: number; longitude: number },
        destinationLoc: { latitude: number; longitude: number }
    ) => {
        try {
            console.log('경로 가져오기 시작:', startLoc, destinationLoc);

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc.latitude},${startLoc.longitude}&destination=${destinationLoc.latitude},${destinationLoc.longitude}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`
            );

            const data = await response.json();
            console.log('경로 응답 상태:', data.status);

            if (data.status !== 'OK') {
                console.error('경로를 찾을 수 없습니다:', data.status, data.error_message || '');

                // ZERO_RESULTS일 경우 특별한 메시지 표시
                if (data.status === 'ZERO_RESULTS') {
                    setErrorMsg(
                        '현재 위치에서 목적지까지의 도보 경로를 찾을 수 없습니다. 목적지가 너무 멀거나 도보로 접근이 불가능한 곳일 수 있습니다.'
                    );
                } else {
                    setErrorMsg('경로를 찾을 수 없습니다. 다시 시도해주세요.');
                }

                setShowError(true);
                return;
            }

            if (!data.routes || data.routes.length === 0 || !data.routes[0].legs || data.routes[0].legs.length === 0) {
                console.error('경로 데이터가 없습니다:', data);
                setErrorMsg('경로 데이터를 불러올 수 없습니다.');
                setShowError(true);
                return;
            }

            // 경로 좌표 추출
            const points = data.routes[0].legs[0].steps.flatMap((step: any) => {
                if (!step.polyline || !step.polyline.points) {
                    console.warn('유효하지 않은 polyline 데이터:', step);
                    return [];
                }
                const decodedPoints = decodePolyline(step.polyline.points);
                return decodedPoints.map((point: [number, number]) => ({
                    latitude: point[0],
                    longitude: point[1],
                }));
            });

            console.log(`경로 포인트 ${points.length}개 가져옴`);

            if (points.length === 0) {
                setErrorMsg('경로 포인트를 가져올 수 없습니다.');
                setShowError(true);
                return;
            }

            // 거리와 소요 시간 정보 추출
            const distanceText = data.routes[0].legs[0].distance?.text || '알 수 없음';
            const durationText = data.routes[0].legs[0].duration?.text || '알 수 없음';

            setRouteCoordinates(points);
            setDistance(distanceText);
            setDuration(durationText);
            setShowError(false);
        } catch (error) {
            console.error('경로를 가져오는 중 오류가 발생했습니다:', error);
            setErrorMsg('경로를 가져오는 중 오류가 발생했습니다.');
            setShowError(true);
        }
    };

    // Google의 인코딩된 폴리라인 포인트를 디코딩하는 함수
    function decodePolyline(encoded: string): [number, number][] {
        const poly: [number, number][] = [];
        let index = 0,
            lat = 0,
            lng = 0;

        while (index < encoded.length) {
            let b,
                shift = 0,
                result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = result & 1 ? ~(result >> 1) : result >> 1;
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = result & 1 ? ~(result >> 1) : result >> 1;
            lng += dlng;

            poly.push([lat * 1e-5, lng * 1e-5]);
        }

        return poly;
    }

    // 현재 위치로 이동 버튼 핸들러
    const moveToCurrentLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({});
            console.log('현재 위치를 가져왔습니다:', location.coords);

            if (!mapRef.current) {
                console.error('지도 참조를 찾을 수 없습니다');
                return;
            }

            if (destinationLat && destinationLng) {
                // 현재 위치와 목적지를 모두 포함하는 영역 설정
                try {
                    const currentCoords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                    const destinationCoords = {
                        latitude: destinationLat,
                        longitude: destinationLng,
                    };

                    mapRef.current.fitToCoordinates([currentCoords, destinationCoords], {
                        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                        animated: true,
                    });
                    console.log('현재 위치와 목적지를 포함하는 영역으로 지도를 이동했습니다');
                } catch (error) {
                    console.error('지도 영역 설정 중 오류 발생:', error);

                    // 오류 발생 시, 중간 지점으로 이동
                    mapRef.current.animateToRegion(
                        {
                            latitude: (location.coords.latitude + destinationLat) / 2,
                            longitude: (location.coords.longitude + destinationLng) / 2,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05 * (Dimensions.get('window').width / Dimensions.get('window').height),
                        },
                        1000
                    );
                }
            } else {
                // 목적지가 없으면 현재 위치로만 이동
                mapRef.current.animateToRegion(
                    {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01 * (Dimensions.get('window').width / Dimensions.get('window').height),
                    },
                    1000
                );
                console.log('현재 위치로 지도를 이동했습니다');
            }
        } catch (error) {
            console.error('현재 위치를 가져오는 중 오류가 발생했습니다:', error);
        }
    };

    // 뒤로가기 핸들러
    const handleGoBack = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>경로를 불러오는 중...</Text>
                </View>
            ) : (
                <>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        region={mapRegion}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                        showsCompass={true}
                        loadingEnabled={true}
                        toolbarEnabled={false}
                        rotateEnabled={true}
                        pitchEnabled={true}
                        zoomEnabled={true}
                        scrollEnabled={true}
                    >
                        {/* 현재 위치 마커는 showsUserLocation으로 대체 */}

                        {/* 목적지 마커 */}
                        {destinationLat && destinationLng && (
                            <Marker
                                coordinate={{
                                    latitude: destinationLat,
                                    longitude: destinationLng,
                                }}
                                title={destinationName || '목적지'}
                                description="목적지 위치"
                                pinColor="red"
                            />
                        )}

                        {/* 경로 표시 */}
                        {routeCoordinates.length > 0 && (
                            <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor="#4A89F3" />
                        )}
                    </MapView>

                    {/* 뒤로가기 버튼 */}
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>

                    {/* 경로 정보 표시 */}
                    <View style={styles.directionsContainer}>
                        <View style={styles.directionsHeader}>
                            <Text style={styles.directionsTitle}>경로 정보</Text>
                            <Ionicons name="navigate" size={22} color="#007AFF" />
                        </View>
                        <View style={styles.divider} />

                        {showError ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="warning-outline" size={24} color="#FF3B30" />
                                <Text style={styles.errorText}>{errorMsg || '오류가 발생했습니다.'}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={() => {
                                        if (currentLocation && destinationLat && destinationLng) {
                                            getDirections(currentLocation, {
                                                latitude: destinationLat,
                                                longitude: destinationLng,
                                            });
                                        }
                                    }}
                                >
                                    <Text style={styles.retryButtonText}>다시 시도</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.directionsInfo}>
                                    <View style={styles.directionsInfoItem}>
                                        <Ionicons name="walk-outline" size={22} color="#333" />
                                        <Text style={styles.directionsInfoText}>거리: {distance || '계산 중...'}</Text>
                                    </View>
                                    <View style={styles.directionsInfoItem}>
                                        <Ionicons name="time-outline" size={22} color="#333" />
                                        <Text style={styles.directionsInfoText}>
                                            소요 시간: {duration || '계산 중...'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.directionsInfoItem}>
                                    <Ionicons name="location" size={22} color="#FF3B30" />
                                    <Text style={styles.destinationText} numberOfLines={2}>
                                        목적지: {destinationName || '목적지'}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* 현재 위치로 이동 버튼 */}
                    <TouchableOpacity style={styles.myLocationButton} onPress={moveToCurrentLocation}>
                        <Ionicons name="locate" size={24} color="#007AFF" />
                    </TouchableOpacity>
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
        color: '#333',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 20,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 10,
    },
    directionsContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 70,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    directionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
    },
    directionsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    directionsInfo: {
        marginBottom: 10,
    },
    directionsInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    directionsInfoText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    destinationText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
        flex: 1,
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    errorText: {
        fontSize: 14,
        color: '#FF3B30',
        marginTop: 8,
        marginBottom: 10,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    myLocationButton: {
        position: 'absolute',
        right: 16,
        bottom: 30,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});

export default RouteMap;
