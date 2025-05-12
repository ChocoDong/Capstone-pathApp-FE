import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadTravelParams } from '../../utils/storage';
import { COLORS, SHADOWS, CARD_STYLES, TYPOGRAPHY, SPACING } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as placeService from '../../api/placeService';

// 여행 추천 인터페이스
interface Place {
    name: string;
    description: string;
    activity: string;
    time: string;
    place_id?: string; // 즐겨찾기 확인을 위한 장소 ID 필드 추가
}

interface Day {
    day: number;
    places: Place[];
}

interface TravelRoute {
    title: string;
    description: string;
    days: Day[];
}

interface RouteResponse {
    success: boolean;
    startLocation: string;
    endLocation: string;
    preferences: {
        leisureType: string;
        experienceType: string;
    };
    routeRecommendation: TravelRoute;
}

export default function List() {
    const [loading, setLoading] = useState(false);
    const [route, setRoute] = useState<RouteResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<Record<string, boolean>>({});
    const [favoritesLoading, setFavoritesLoading] = useState(false);

    const router = useRouter();

    // URL 파라미터 가져오기
    const params = useLocalSearchParams();
    const { leisureType, experienceType, startLocation, endLocation, travelDays } = params;

    useEffect(() => {
        const loadAndFetchData = async () => {
            // URL 파라미터가 있는 경우
            if (leisureType && experienceType) {
                console.log('URL 파라미터로 여행 정보 로드:', {
                    startLocation,
                    endLocation,
                    leisureType,
                    experienceType,
                    travelDays,
                });

                fetchTravelRoute({
                    startLocation: startLocation as string,
                    endLocation: endLocation as string,
                    leisureType: leisureType as string,
                    experienceType: experienceType as string,
                    travelDays: travelDays as string,
                });
            } else {
                // URL 파라미터가 없는 경우 AsyncStorage에서 불러오기
                try {
                    const savedParams = await loadTravelParams();
                    console.log('저장된 여행 정보 로드:', savedParams);

                    if (savedParams && savedParams.leisureType && savedParams.experienceType) {
                        const params = {
                            startLocation: savedParams.startLocation || '현재 위치',
                            endLocation: savedParams.endLocation || '서울',
                            leisureType: savedParams.leisureType,
                            experienceType: savedParams.experienceType,
                            travelDays: savedParams.travelDays || '3',
                        };

                        console.log('저장된 여행 정보로 요청:', params);
                        fetchTravelRoute(params);
                    } else {
                        console.log('저장된 여행 정보 없음');
                    }
                } catch (error) {
                    console.error('저장된 여행 정보 불러오기 실패:', error);
                    setError('저장된 여행 정보를 불러오는데 실패했습니다.');
                }
            }
        };

        loadAndFetchData();
    }, [leisureType, experienceType, startLocation, endLocation, travelDays]);

    // 즐겨찾기 목록 로드 함수
    const loadFavorites = async () => {
        try {
            setFavoritesLoading(true);
            const favoritesList = await placeService.getFavorites();
            const favoritesMap: Record<string, boolean> = {};

            favoritesList.forEach((fav: any) => {
                if (fav.place_id) {
                    favoritesMap[fav.place_id] = true;
                }
            });

            setFavorites(favoritesMap);
        } catch (error) {
            console.error('즐겨찾기 목록 로드 실패:', error);
        } finally {
            setFavoritesLoading(false);
        }
    };

    const fetchTravelRoute = async (travelParams: any) => {
        setLoading(true);
        setError(null);

        try {
            console.log('여행 경로 요청 파라미터:', JSON.stringify(travelParams));
            // API 요청
            const response = await axios.post('http://192.168.1.114:3000/recommend-route/travel-route', travelParams, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10초 타임아웃
            });
            console.log('여행 경로 응답 상태:', response.status);

            // 각 장소명을 수집
            const placeNames: string[] = [];
            const placeMap: Record<string, Place> = {};

            if (response.data.routeRecommendation && response.data.routeRecommendation.days) {
                for (const day of response.data.routeRecommendation.days) {
                    for (const place of day.places) {
                        placeNames.push(place.name);
                        placeMap[place.name] = place;
                    }
                }
            }

            // 중복 없는 장소명 목록으로 변환
            const uniquePlaceNames = [...new Set(placeNames)];

            // 장소명 목록이 있다면 한 번에 place_id 조회 시도
            if (uniquePlaceNames.length > 0) {
                try {
                    // 이 부분은 서버 API에 따라 조정이 필요합니다
                    // 이상적으로는 서버 측에서 장소명 배열을 받아 place_id를 한 번에 반환하는 API가 있으면 좋습니다
                    // 현재는 각각 조회하는 방식으로 구현
                    const promises = uniquePlaceNames.map((name) => placeService.getPlaceDetailsByName(name));
                    const results = await Promise.allSettled(promises);

                    results.forEach((result, index) => {
                        if (result.status === 'fulfilled' && result.value && result.value.place_id) {
                            const name = uniquePlaceNames[index];
                            if (placeMap[name]) {
                                placeMap[name].place_id = result.value.place_id;
                            }
                        }
                    });
                } catch (err) {
                    console.error('장소 ID 일괄 조회 실패:', err);
                }
            }

            setRoute(response.data);

            // 즐겨찾기 목록 로드
            loadFavorites();
        } catch (err: any) {
            console.error('여행 경로 불러오기 실패:', err);

            let errorMessage = '여행 경로를 불러오는데 실패했습니다. ';

            if (err.response) {
                // 서버 응답이 있는 경우
                console.error('서버 응답 데이터:', err.response.data);
                console.error('서버 응답 상태:', err.response.status);
                errorMessage += `서버 응답: ${err.response.status}`;

                if (err.response.data && err.response.data.message) {
                    errorMessage += ` - ${err.response.data.message}`;
                }
            } else if (err.request) {
                // 요청은 보냈지만 응답이 없는 경우
                console.error('응답을 받지 못했습니다:', err.request);
                errorMessage += '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
            } else {
                // 요청 설정 중 에러가 발생한 경우
                console.error('요청 에러:', err.message);
                errorMessage += err.message;
            }

            setError(errorMessage);
            Alert.alert('오류', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePlacePress = (place: Place) => {
        router.push({
            pathname: '/(stack)/place-detail',
            params: {
                place: JSON.stringify(place),
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>여행 경로를 불러오는 중...</Text>
                <Text style={styles.loadingSubText}>서버에 요청하는 데 시간이 걸릴 수 있습니다.</Text>
                <Text style={styles.loadingSubText}>잠시만 기다려 주세요.</Text>
            </View>
        );
    }

    if (error && !route) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle" size={60} color="red" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.errorSubText}>네트워크 연결을 확인하고 다시 시도해 주세요.</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={async () => {
                        // URL 파라미터가 있으면 우선 사용
                        if (leisureType && experienceType) {
                            fetchTravelRoute({
                                startLocation: startLocation as string,
                                endLocation: endLocation as string,
                                leisureType: leisureType as string,
                                experienceType: experienceType as string,
                                travelDays: travelDays as string,
                            });
                        } else {
                            // URL 파라미터가 없으면 저장된 값 사용
                            const savedParams = await loadTravelParams();
                            if (savedParams && savedParams.leisureType && savedParams.experienceType) {
                                fetchTravelRoute({
                                    startLocation: savedParams.startLocation || '현재 위치',
                                    endLocation: savedParams.endLocation || '서울',
                                    leisureType: savedParams.leisureType,
                                    experienceType: savedParams.experienceType,
                                    travelDays: savedParams.travelDays || '3',
                                });
                            } else {
                                Alert.alert('설정 필요', '여행 정보가 없습니다. 홈 화면에서 설정해주세요.');
                            }
                        }
                    }}
                >
                    <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!route) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyStateText}>여행 경로 정보가 없습니다.</Text>
                <Text style={styles.emptyStateSubText}>
                    홈 화면에서 출발지, 도착지와 여행 스타일을 선택하고 '추천 경로 검색하기'를 눌러주세요.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.routeContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>{route.routeRecommendation.title}</Text>
                    <Text style={styles.description}>{route.routeRecommendation.description}</Text>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>출발지: {route.startLocation}</Text>
                    <Text style={styles.infoText}>도착지: {route.endLocation}</Text>
                    <Text style={styles.infoText}>
                        여행 스타일: {route.preferences.leisureType}, {route.preferences.experienceType}
                    </Text>
                </View>

                {route.routeRecommendation.days.map((day) => (
                    <View key={day.day} style={styles.dayContainer}>
                        <Text style={styles.dayTitle}>Day {day.day}</Text>

                        {day.places.map((place, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.placeContainer}
                                onPress={() => handlePlacePress(place)}
                            >
                                <View style={styles.placeHeader}>
                                    <Text style={styles.placeName}>{place.name}</Text>
                                    {place.place_id && favorites[place.place_id] && (
                                        <Ionicons name="heart" size={20} color={COLORS.heart} />
                                    )}
                                </View>
                                <Text style={styles.placeDescription}>{place.description}</Text>
                                <View style={styles.placeDetailsContainer}>
                                    <Text style={styles.placeDetails}>추천 활동: {place.activity}</Text>
                                    <Text style={styles.placeDetails}>추천 시간: {place.time}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.text,
    },
    loadingSubText: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 5,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: COLORS.text,
    },
    emptyStateSubText: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    retryButton: {
        backgroundColor: COLORS.button,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    routeContainer: {
        padding: 16,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: COLORS.text,
    },
    description: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: 16,
    },
    infoContainer: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        ...SHADOWS.medium,
    },
    infoText: {
        fontSize: 16,
        marginBottom: 8,
        color: COLORS.text,
    },
    dayContainer: {
        marginBottom: 24,
    },
    dayTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        backgroundColor: COLORS.accent,
        color: COLORS.white,
        padding: 10,
        borderRadius: 8,
    },
    placeContainer: {
        backgroundColor: COLORS.white,
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        ...SHADOWS.medium,
    },
    placeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    placeName: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        color: COLORS.text,
        marginRight: 8,
    },
    placeDescription: {
        fontSize: 16,
        color: COLORS.text,
        marginBottom: 12,
    },
    placeDetailsContainer: {
        backgroundColor: COLORS.secondary,
        padding: 10,
        borderRadius: 8,
    },
    placeDetails: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    errorIcon: {
        marginBottom: 20,
    },
    errorSubText: {
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: 20,
    },
});
