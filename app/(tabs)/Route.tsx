import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, CARD_STYLES, TYPOGRAPHY, SPACING } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import * as placeService from '../../api/placeService';

interface FavoritePlace {
    id: number;
    place_id: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    created_at?: string;
    // 추가 필드들은 서버 응답에 따라 확장 가능
}

export default function Route() {
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    // 즐겨찾기 목록 가져오기
    const loadFavorites = async () => {
        try {
            setLoading(true);
            const favoritesList = await placeService.getFavorites();

            if (Array.isArray(favoritesList)) {
                setFavorites(favoritesList);
            } else {
                console.error('즐겨찾기 목록 형식 오류:', favoritesList);
                setFavorites([]);
            }
        } catch (error) {
            console.error('즐겨찾기 목록 로드 실패:', error);
            setError('즐겨찾기 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 즐겨찾기 목록 로드
    useEffect(() => {
        loadFavorites();
    }, []);

    // 상세 페이지로 이동
    const handlePlacePress = (place: FavoritePlace) => {
        // 이 부분은 즐겨찾기 목록에서 직접 상세 페이지로 이동할 때 필요한 정보를 포함시켜야 함
        router.push({
            pathname: '/(stack)/place-detail',
            params: {
                place: JSON.stringify({
                    name: place.name,
                    place_id: place.place_id,
                    description: place.address || '', // 주소를 설명으로 대체
                    location:
                        place.latitude && place.longitude
                            ? {
                                  lat: place.latitude,
                                  lng: place.longitude,
                              }
                            : undefined,
                }),
            },
        });
    };

    // 새로고침
    const handleRefresh = () => {
        loadFavorites();
    };

    // 로딩 중 표시
    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>즐겨찾기 목록을 불러오는 중...</Text>
            </View>
        );
    }

    // 에러 발생 시 표시
    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                    <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // 즐겨찾기 없을 때 표시
    if (favorites.length === 0) {
        return (
            <View style={styles.centered}>
                <Ionicons name="heart-outline" size={60} color={COLORS.heart} style={styles.emptyIcon} />
                <Text style={styles.emptyStateText}>즐겨찾기한 장소가 없습니다.</Text>
                <Text style={styles.emptyStateSubText}>여행 경로 목록에서 마음에 드는 장소를 즐겨찾기 해보세요.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                    <Text style={styles.retryButtonText}>새로고침</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // 즐겨찾기 목록 표시
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>내 즐겨찾기</Text>
                <Text style={styles.subtitle}>총 {favorites.length}개의 즐겨찾기한 장소가 있습니다.</Text>
            </View>

            <View style={styles.listContainer}>
                {favorites.map((place) => (
                    <TouchableOpacity
                        key={place.id}
                        style={styles.placeContainer}
                        onPress={() => handlePlacePress(place)}
                    >
                        <View style={styles.placeHeader}>
                            <Text style={styles.placeName}>{place.name}</Text>
                            <Ionicons name="heart" size={20} color={COLORS.heart} />
                        </View>

                        {place.address && <Text style={styles.placeDescription}>{place.address}</Text>}

                        <View style={styles.placeFooter}>
                            <Text style={styles.placeDateText}>
                                {place.created_at
                                    ? new Date(place.created_at).toLocaleDateString('ko-KR', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                      }) + ' 추가됨'
                                    : ''}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                        </View>
                    </TouchableOpacity>
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
    header: {
        padding: 16,
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.text,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyIcon: {
        marginBottom: 16,
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
        marginBottom: 20,
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
    listContainer: {
        padding: 16,
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
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 12,
    },
    placeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        marginTop: 4,
    },
    placeDateText: {
        fontSize: 12,
        color: COLORS.textLight,
    },
});
