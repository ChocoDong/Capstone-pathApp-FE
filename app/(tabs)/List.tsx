import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { useLocalSearchParams } from 'expo-router';
import { loadTravelParams } from '../../utils/storage';

// 여행 추천 인터페이스
interface Place {
    name: string;
    description: string;
    activity: string;
    time: string;
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

    // URL 파라미터 가져오기
    const params = useLocalSearchParams();
    const { leisureType, experienceType, startLocation, endLocation, travelDays } = params;

    useEffect(() => {
        const loadAndFetchData = async () => {
            // URL 파라미터가 있는 경우
            if (leisureType && experienceType) {
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
                    if (savedParams && savedParams.leisureType && savedParams.experienceType) {
                        fetchTravelRoute({
                            startLocation: savedParams.startLocation || '현재 위치',
                            endLocation: savedParams.endLocation || '서울',
                            leisureType: savedParams.leisureType,
                            experienceType: savedParams.experienceType,
                            travelDays: savedParams.travelDays || '3',
                        });
                    }
                } catch (error) {
                    console.error('저장된 여행 정보 불러오기 실패:', error);
                    setError('저장된 여행 정보를 불러오는데 실패했습니다.');
                }
            }
        };

        loadAndFetchData();
    }, [leisureType, experienceType, startLocation, endLocation, travelDays]);

    const fetchTravelRoute = async (travelParams: any) => {
        setLoading(true);
        setError(null);

        try {
            // API 요청
            const response = await axios.post('http://192.0.0.2:3000/recommend-route/travel-route', travelParams);
            setRoute(response.data);
        } catch (err) {
            console.error('여행 경로 불러오기 실패:', err);
            setError('여행 경로를 불러오는데 실패했습니다. 다시 시도해주세요.');
            Alert.alert('오류', '여행 경로를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>여행 경로를 불러오는 중...</Text>
            </View>
        );
    }

    if (error && !route) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
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
                            <View key={index} style={styles.placeContainer}>
                                <Text style={styles.placeName}>{place.name}</Text>
                                <Text style={styles.placeDescription}>{place.description}</Text>
                                <View style={styles.placeDetailsContainer}>
                                    <Text style={styles.placeDetails}>추천 활동: {place.activity}</Text>
                                    <Text style={styles.placeDetails}>추천 시간: {place.time}</Text>
                                </View>
                            </View>
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
        backgroundColor: '#f5f5f5',
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
    },
    emptyStateSubText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
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
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    infoContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    infoText: {
        fontSize: 16,
        marginBottom: 8,
    },
    dayContainer: {
        marginBottom: 24,
    },
    dayTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        backgroundColor: '#007AFF',
        color: 'white',
        padding: 8,
        borderRadius: 4,
    },
    placeContainer: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    placeName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    placeDescription: {
        fontSize: 16,
        color: '#333',
        marginBottom: 12,
    },
    placeDetailsContainer: {
        backgroundColor: '#f9f9f9',
        padding: 8,
        borderRadius: 4,
    },
    placeDetails: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
});
