import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    Image,
    Alert,
    TextInput,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as placeService from '../../api/placeService';
import { COLORS, SHADOWS, CARD_STYLES, TYPOGRAPHY, SPACING } from '../../constants/Theme';
import { auth } from '../../firebase/config';

interface Review {
    id: string;
    user_name: string;
    rating: number;
    comment: string;
    review_date: string;
    source?: 'google' | 'user';
}

interface PlaceDetail {
    id?: number;
    place_id: string;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    opening_hours?: string;
    closed_days?: string;
    latitude?: number;
    longitude?: number;
    average_rating?: number;
    reviews?: Review[];
    activities?: Array<{
        id: number;
        place_id: string;
        activity_type: string;
        description: string;
        recommended_time: string;
    }>;
    activity?: string;
    time?: string;
    location?: {
        lat: number;
        lng: number;
    };
}

export default function PlaceDetail() {
    const params = useLocalSearchParams();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [place, setPlace] = useState<PlaceDetail | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [averageRating, setAverageRating] = useState(0);
    const [mapRegion, setMapRegion] = useState({
        latitude: 37.566826, // 서울 시청 위치(기본값)
        longitude: 126.9786567,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005 * (Dimensions.get('window').width / Dimensions.get('window').height),
    });

    // 리뷰 로딩 상태
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [loadMoreReviews, setLoadMoreReviews] = useState(false);
    const [currentReviewPage, setCurrentReviewPage] = useState(0);
    const REVIEWS_PER_PAGE = 5;

    // 리뷰 작성 상태
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [newReview, setNewReview] = useState({
        userName: '',
        rating: 5,
        comment: '',
    });

    // 즐겨찾기 상태
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    // 장소 데이터 가져오기 함수를 useCallback으로 감싸서 함수 참조가 변경되지 않도록 함
    const fetchPlaceData = useCallback(async () => {
        try {
            if (!params.place) return;

            setLoading(true);
            const parsedPlace = JSON.parse(params.place as string);

            // 먼저 파싱된 데이터로 기본 정보 설정
            const initialPlace: PlaceDetail = {
                place_id: parsedPlace.id || 'temp-id',
                name: parsedPlace.name,
                description: parsedPlace.description,
                activity: parsedPlace.activity,
                time: parsedPlace.time,
                location: parsedPlace.location,
            };

            setPlace(initialPlace);

            // 지도 위치 설정 (파싱된 데이터에서)
            if (parsedPlace.location && parsedPlace.location.lat && parsedPlace.location.lng) {
                setMapRegion((prev) => ({
                    ...prev,
                    latitude: parsedPlace.location.lat,
                    longitude: parsedPlace.location.lng,
                }));
            }

            // 서버에서 장소 상세 정보와 리뷰 가져오기 시도
            try {
                setReviewsLoading(true);
                const placeData = await placeService.getPlaceDetailsByName(parsedPlace.name);

                if (placeData) {
                    // 서버 응답 데이터가 있으면 업데이트
                    setPlace(placeData);

                    // 리뷰 설정
                    if (placeData.reviews && placeData.reviews.length > 0) {
                        const formattedReviews: Review[] = placeData.reviews.map((review) => ({
                            id: review.id,
                            user_name: review.user_name,
                            rating: review.rating,
                            comment: review.comment,
                            review_date: review.review_date,
                            source: review.source,
                        }));
                        setReviews(formattedReviews.slice(0, REVIEWS_PER_PAGE));
                        setCurrentReviewPage(1);
                    }

                    // 평균 평점 설정
                    if (placeData.average_rating !== undefined && placeData.average_rating !== null) {
                        setAverageRating(Number(placeData.average_rating) || 0);
                    } else if (placeData.reviews && placeData.reviews.length > 0) {
                        const totalRating = placeData.reviews.reduce(
                            (sum, review) => sum + (Number(review.rating) || 0),
                            0
                        );
                        setAverageRating(totalRating / placeData.reviews.length);
                    }

                    // 지도 위치 설정 (서버 데이터에서)
                    if (placeData.latitude && placeData.longitude) {
                        setMapRegion({
                            ...mapRegion,
                            latitude: placeData.latitude || 37.566826, // 기본값 추가
                            longitude: placeData.longitude || 126.9786567, // 기본값 추가
                        });
                    }

                    // 즐겨찾기 상태 확인
                    if (placeData.place_id) {
                        checkFavoriteStatus(placeData.place_id);
                    }
                }
            } catch (reviewError) {
                console.error('리뷰 데이터 로딩 중 오류 발생:', reviewError);
                // 리뷰 로드 실패시 기본 데이터는 유지
            } finally {
                setReviewsLoading(false);
            }
        } catch (error) {
            console.error('장소 데이터 로딩 중 오류 발생:', error);
            Alert.alert('오류', '장소 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [params.place, REVIEWS_PER_PAGE]); // params.place만 의존성으로 지정

    // 즐겨찾기 상태 확인
    const checkFavoriteStatus = async (placeId: string) => {
        try {
            setFavoriteLoading(true);
            const status = await placeService.checkFavoriteStatus(placeId);
            setIsFavorite(status);
        } catch (error) {
            console.error('즐겨찾기 상태 확인 중 오류 발생:', error);
        } finally {
            setFavoriteLoading(false);
        }
    };

    // 즐겨찾기 토글 (추가/제거)
    const toggleFavorite = async () => {
        if (!place || !place.place_id || favoriteLoading) return;

        try {
            setFavoriteLoading(true);
            let success = false;

            if (isFavorite) {
                // 즐겨찾기 제거
                success = await placeService.removeFromFavorites(place.place_id);
                if (success) {
                    setIsFavorite(false);
                    Alert.alert('알림', '즐겨찾기에서 제거되었습니다.');
                }
            } else {
                // 즐겨찾기 추가
                success = await placeService.addToFavorites(place.place_id);
                if (success) {
                    setIsFavorite(true);
                    Alert.alert('알림', '즐겨찾기에 추가되었습니다.');
                }
            }

            if (!success) {
                Alert.alert('오류', '즐겨찾기 처리 중 문제가 발생했습니다.');
            }
        } catch (error) {
            console.error('즐겨찾기 토글 중 오류 발생:', error);
            Alert.alert('오류', '즐겨찾기 처리 중 문제가 발생했습니다.');
        } finally {
            setFavoriteLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaceData();
    }, [fetchPlaceData]); // fetchPlaceData만 의존성으로 지정

    // 더 많은 리뷰 불러오기
    const handleLoadMoreReviews = async () => {
        if (!place || !place.place_id || loadMoreReviews) return;

        try {
            setLoadMoreReviews(true);

            const nextPage = currentReviewPage + 1;
            const apiReviews = await placeService.getReviewsByPlaceId(
                place.place_id,
                REVIEWS_PER_PAGE,
                (nextPage - 1) * REVIEWS_PER_PAGE
            );

            if (apiReviews.length > 0) {
                const formattedReviews: Review[] = apiReviews.map((review) => ({
                    id: review.id,
                    user_name: review.user_name,
                    rating: review.rating,
                    comment: review.comment,
                    review_date: review.review_date,
                    source: review.source,
                }));

                setReviews((prevReviews) => [...prevReviews, ...formattedReviews]);
                setCurrentReviewPage(nextPage);
            }
        } catch (error) {
            console.error('추가 리뷰 로딩 중 오류 발생:', error);
        } finally {
            setLoadMoreReviews(false);
        }
    };

    // 리뷰 작성하기
    const handleSubmitReview = async () => {
        if (!place || !place.place_id) return;

        if (!newReview.userName.trim()) {
            Alert.alert('알림', '이름을 입력해주세요.');
            return;
        }

        try {
            const success = await placeService.addUserReview(
                place.place_id,
                place.name,
                newReview.userName,
                newReview.rating,
                newReview.comment
            );

            if (success) {
                Alert.alert('성공', '리뷰가 성공적으로 등록되었습니다.');

                // 새 리뷰 추가
                const newReviewObj: Review = {
                    id: `temp-${Date.now()}`,
                    user_name: newReview.userName,
                    rating: newReview.rating,
                    comment: newReview.comment,
                    review_date: new Date().toISOString().split('T')[0],
                    source: 'user',
                };

                setReviews([newReviewObj, ...reviews]);

                // 평균 평점 업데이트
                const allReviews = [newReviewObj, ...reviews];
                const totalRating = allReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
                setAverageRating(totalRating / allReviews.length);

                // 폼 초기화
                setNewReview({
                    userName: '',
                    rating: 5,
                    comment: '',
                });

                setShowReviewForm(false);
            } else {
                Alert.alert('오류', '리뷰 등록 중 문제가 발생했습니다.');
            }
        } catch (error) {
            console.error('리뷰 작성 중 오류 발생:', error);
            Alert.alert('오류', '리뷰 등록 중 문제가 발생했습니다.');
        }
    };

    // 별점 렌더링 함수
    const renderStars = (rating: number) => {
        // undefined, null, NaN 처리
        const safeRating = rating !== undefined && rating !== null && !isNaN(rating) ? rating : 0;

        const stars = [];
        const fullStars = Math.floor(safeRating);
        const halfStar = safeRating % 1 >= 0.5;

        // 꽉 찬 별
        for (let i = 0; i < fullStars; i++) {
            stars.push(
                <Ionicons key={`full-${i}`} name="star" size={16} color={COLORS.star} style={styles.starIcon} />
            );
        }

        // 반 별
        if (halfStar) {
            stars.push(<Ionicons key="half" name="star-half" size={16} color={COLORS.star} style={styles.starIcon} />);
        }

        // 빈 별
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars.push(
                <Ionicons
                    key={`empty-${i}`}
                    name="star-outline"
                    size={16}
                    color={COLORS.star}
                    style={styles.starIcon}
                />
            );
        }

        return stars;
    };

    // 리뷰 작성 시 별점 선택 렌더링
    const renderSelectableStars = () => {
        const stars = [];

        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity
                    key={`rate-${i}`}
                    onPress={() => setNewReview({ ...newReview, rating: i })}
                    style={{ padding: 5 }}
                >
                    <Ionicons name={i <= newReview.rating ? 'star' : 'star-outline'} size={32} color={COLORS.star} />
                </TouchableOpacity>
            );
        }

        return <View style={styles.selectableStarsContainer}>{stars}</View>;
    };

    // 헤더 컴포넌트 추가 - 이름과 주소가 null이 아닐 때만 표시
    const HeaderTitle = () => {
        if (!place) return null;

        return (
            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>{place.name}</Text>
                {place.address && <Text style={styles.headerSubtitle}>{place.address}</Text>}
            </View>
        );
    };

    // 헤더 설정
    useLayoutEffect(() => {
        if (place) {
            try {
                navigation.setOptions({
                    headerTitle: () => <HeaderTitle />,
                    headerTitleAlign: 'center',
                    headerLeft: () => (
                        <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => {
                        // Firebase 현재 사용자 확인
                        if (!auth.currentUser) {
                            // 로그인하지 않은 경우 즐겨찾기 버튼을 표시하지 않음
                            return null;
                        }

                        // 로그인한 경우 즐겨찾기 버튼 표시
                        return (
                            <TouchableOpacity
                                style={{ marginRight: 16 }}
                                onPress={toggleFavorite}
                                disabled={favoriteLoading}
                            >
                                {favoriteLoading ? (
                                    <ActivityIndicator size="small" color={COLORS.accent} />
                                ) : (
                                    <Ionicons
                                        name={isFavorite ? 'heart' : 'heart-outline'}
                                        size={28}
                                        color={isFavorite ? COLORS.accent : COLORS.text}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    },
                });
            } catch (error) {
                console.log('Navigation options update error:', error);
            }
        }
    }, [place, isFavorite, favoriteLoading]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    if (!place) {
        return (
            <View style={styles.centered}>
                <Text style={styles.noPlaceText}>장소 정보를 찾을 수 없습니다.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* 맵에서 오버레이 제거하고 심플하게 표시 */}
            <TouchableOpacity
                style={styles.mapContainer}
                onPress={() => {
                    // 경로 탐색 전 사용자에게 안내 메시지 표시
                    Alert.alert(
                        '길찾기 안내',
                        '목적지까지의 도보 경로를 검색합니다. 거리가 멀 경우 경로를 찾지 못할 수 있습니다.',
                        [
                            {
                                text: '취소',
                                style: 'cancel',
                            },
                            {
                                text: '계속',
                                onPress: () => {
                                    router.push({
                                        pathname: '/map/RouteMap',
                                        params: {
                                            destinationLat: mapRegion.latitude,
                                            destinationLng: mapRegion.longitude,
                                            destinationName: place.name,
                                        },
                                    });
                                },
                            },
                        ]
                    );
                }}
            >
                <MapView
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation={true}
                    showsCompass={true}
                    zoomEnabled={false}
                    scrollEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                >
                    <Marker
                        coordinate={{
                            latitude: mapRegion.latitude,
                            longitude: mapRegion.longitude,
                        }}
                        title={place.name}
                    >
                        <Ionicons name="location" size={32} color={COLORS.accent} />
                    </Marker>
                </MapView>
                <View style={styles.viewRouteOverlay}>
                    <Text style={styles.viewRouteText}>길찾기 보기</Text>
                    <Ionicons name="navigate" size={16} color={COLORS.white} />
                </View>
            </TouchableOpacity>

            <View style={styles.contentContainer}>
                {/* 평균 평점 카드 크기 축소 */}
                <View style={styles.ratingCardCompact}>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.ratingValue}>
                            {typeof averageRating === 'number' && !isNaN(averageRating)
                                ? averageRating.toFixed(1)
                                : '0.0'}
                        </Text>
                        <View style={styles.starsContainer}>{renderStars(averageRating)}</View>
                        <Text style={styles.reviewCount}>({reviews.length})</Text>
                    </View>
                </View>

                {/* 장소 설명 */}
                {place.description && (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>소개</Text>
                        <Text style={styles.description}>{place.description}</Text>
                    </View>
                )}

                {/* 기본 정보 섹션 */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>기본 정보</Text>

                    {/* 전화번호 */}
                    <View style={styles.contactRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="call-outline" size={20} color={COLORS.accent} />
                        </View>
                        <Text style={styles.contactText}>{place.phone || '등록된 전화번호가 없습니다.'}</Text>
                    </View>

                    {/* 영업 시간 */}
                    <View style={styles.contactRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="time-outline" size={20} color={COLORS.accent} />
                        </View>
                        <View style={styles.hoursContainer}>
                            <Text style={styles.contactLabel}>영업 시간</Text>
                            <Text style={styles.contactText}>
                                {place.opening_hours
                                    ? place.opening_hours.split('\n').map((line, index) => (
                                          <Text key={index}>
                                              {line}
                                              {index < place.opening_hours!.split('\n').length - 1 ? '\n' : ''}
                                          </Text>
                                      ))
                                    : '등록된 영업시간 정보가 없습니다.'}
                            </Text>
                        </View>
                    </View>

                    {/* 휴무일 */}
                    <View style={styles.contactRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>휴무일</Text>
                            <Text style={styles.contactText}>
                                {place.closed_days || '등록된 휴무일 정보가 없습니다.'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 활동 정보 표시 */}
                {place.activities && place.activities.length > 0 ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>추천 활동</Text>
                        {place.activities.map((activity, index) => (
                            <View key={`activity-${index}`} style={styles.activityItem}>
                                <Text style={styles.activityTitle}>{activity.activity_type}</Text>
                                <Text style={styles.activityDesc}>{activity.description}</Text>
                                {activity.recommended_time && (
                                    <View style={styles.recommendedTimeContainer}>
                                        <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                                        <Text style={styles.recommendedTimeText}>{activity.recommended_time}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    // 기존 활동/시간 정보 표시 (레거시 지원)
                    <>
                        {(place.activity || place.time) && (
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>추천 활동</Text>
                                {place.activity && (
                                    <View style={styles.activityItem}>
                                        <Text style={styles.activityTitle}>활동</Text>
                                        <Text style={styles.activityDesc}>{place.activity}</Text>
                                    </View>
                                )}
                                {place.time && (
                                    <View style={styles.activityItem}>
                                        <Text style={styles.activityTitle}>추천 시간</Text>
                                        <Text style={styles.activityDesc}>{place.time}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}

                {/* 리뷰 섹션 */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>리뷰 ({reviews.length})</Text>

                    {reviewsLoading ? (
                        <View style={styles.reviewsLoadingContainer}>
                            <ActivityIndicator size="small" color={COLORS.accent} />
                            <Text style={styles.reviewsLoadingText}>리뷰를 불러오는 중...</Text>
                        </View>
                    ) : reviews.length > 0 ? (
                        <>
                            {reviews.map((review, index) => (
                                <View key={`review-${review.id || index}`} style={styles.reviewItem}>
                                    <View style={styles.reviewHeader}>
                                        <View style={styles.reviewProfileContainer}>
                                            <View style={styles.userIcon}>
                                                <Ionicons name="person-circle" size={36} color={COLORS.primary} />
                                            </View>
                                            <View style={styles.reviewHeaderText}>
                                                <Text style={styles.reviewerName}>{review.user_name}</Text>
                                                <View style={styles.reviewMeta}>
                                                    <View style={styles.reviewRatingContainer}>
                                                        {renderStars(review.rating)}
                                                    </View>
                                                    <Text style={styles.reviewDate}>{review.review_date}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        {review.source && (
                                            <View
                                                style={[
                                                    styles.reviewSourceBadge,
                                                    review.source === 'google' ? styles.googleBadge : styles.userBadge,
                                                ]}
                                            >
                                                <Text style={styles.reviewSourceText}>
                                                    {review.source === 'google' ? 'Google' : '직접 작성'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.reviewComment}>{review.comment}</Text>
                                </View>
                            ))}

                            {/* 리뷰 더 보기 버튼 */}
                            {place.reviews && reviews.length < place.reviews.length && (
                                <TouchableOpacity
                                    style={styles.moreReviewsButton}
                                    onPress={handleLoadMoreReviews}
                                    disabled={loadMoreReviews}
                                >
                                    {loadMoreReviews ? (
                                        <ActivityIndicator size="small" color={COLORS.accent} />
                                    ) : (
                                        <Text style={styles.moreReviewsText}>리뷰 더보기</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <View style={styles.noReviewsContainer}>
                            <Ionicons name="chatbox-outline" size={48} color={COLORS.textLight} />
                            <Text style={styles.noReviewsText}>아직 리뷰가 없습니다.</Text>
                        </View>
                    )}
                </View>

                {/* 리뷰 작성 버튼을 하단으로 이동 */}
                <TouchableOpacity style={styles.writeReviewButton} onPress={() => setShowReviewForm(!showReviewForm)}>
                    <Ionicons name="create-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.writeReviewText}>리뷰 작성하기</Text>
                </TouchableOpacity>

                {/* 리뷰 작성 폼 */}
                {showReviewForm && (
                    <View style={styles.formCard}>
                        <Text style={styles.sectionTitle}>리뷰 작성</Text>

                        <View style={styles.formField}>
                            <Text style={styles.formLabel}>이름</Text>
                            <TextInput
                                style={styles.reviewInput}
                                placeholder="이름을 입력하세요"
                                value={newReview.userName}
                                onChangeText={(text) => setNewReview({ ...newReview, userName: text })}
                                placeholderTextColor={COLORS.textLight}
                            />
                        </View>

                        <View style={styles.formField}>
                            <Text style={styles.formLabel}>평점</Text>
                            {renderSelectableStars()}
                        </View>

                        <View style={styles.formField}>
                            <Text style={styles.formLabel}>리뷰 내용</Text>
                            <TextInput
                                style={[styles.reviewInput, styles.reviewTextArea]}
                                placeholder="리뷰 내용을 입력하세요"
                                value={newReview.comment}
                                onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                                multiline
                                numberOfLines={4}
                                placeholderTextColor={COLORS.textLight}
                            />
                        </View>

                        <View style={styles.reviewFormButtonContainer}>
                            <TouchableOpacity
                                style={[styles.reviewFormButton, styles.reviewCancelButton]}
                                onPress={() => setShowReviewForm(false)}
                            >
                                <Text style={styles.reviewCancelButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.reviewFormButton, styles.reviewSubmitButton]}
                                onPress={handleSubmitReview}
                            >
                                <Text style={styles.reviewSubmitButtonText}>등록</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
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
    },
    noPlaceText: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
    },
    // 맵 관련 스타일
    mapContainer: {
        height: 250,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    viewRouteOverlay: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: COLORS.accent,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    viewRouteText: {
        color: COLORS.white,
        fontWeight: '600',
        marginRight: 5,
        fontSize: 14,
    },
    // 콘텐츠 컨테이너
    contentContainer: {
        padding: 16,
    },
    // 카드 스타일
    sectionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    ratingCardCompact: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    // 타이틀 스타일
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    // 주소 및 설명
    address: {
        fontSize: 14,
        color: COLORS.white,
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        color: COLORS.text,
    },
    // 평점 관련 스타일
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
    },
    ratingValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginRight: 8,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 8,
    },
    starIcon: {
        marginRight: 2,
    },
    reviewCount: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    // 기본 정보 스타일
    contactRow: {
        flexDirection: 'row',
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
    hoursContainer: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    contactText: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
    },
    // 활동 정보 스타일
    activityItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    activityDesc: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
    },
    recommendedTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    recommendedTimeText: {
        fontSize: 13,
        color: COLORS.textLight,
        marginLeft: 6,
    },
    // 리뷰 작성 버튼
    writeReviewButton: {
        backgroundColor: COLORS.button,
        padding: 14,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    writeReviewText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '500',
    },
    // 리뷰 작성 폼
    formField: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    reviewInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS.text,
        backgroundColor: COLORS.white,
    },
    reviewTextArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    selectableStarsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    reviewFormButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    reviewFormButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginLeft: 8,
    },
    reviewCancelButton: {
        backgroundColor: COLORS.secondary,
    },
    reviewCancelButtonText: {
        color: COLORS.text,
    },
    reviewSubmitButton: {
        backgroundColor: COLORS.button,
    },
    reviewSubmitButtonText: {
        color: COLORS.white,
    },
    // 리뷰 목록
    reviewsLoadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    reviewsLoadingText: {
        marginTop: 8,
        color: COLORS.textLight,
    },
    reviewItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    reviewProfileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userIcon: {
        marginRight: 12,
    },
    reviewHeaderText: {
        flex: 1,
    },
    reviewerName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    reviewMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    reviewDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    reviewComment: {
        fontSize: 14,
        lineHeight: 20,
        color: COLORS.text,
    },
    reviewSourceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    googleBadge: {
        backgroundColor: '#E6F3FF',
    },
    userBadge: {
        backgroundColor: '#FFF0E6',
    },
    reviewSourceText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    moreReviewsButton: {
        backgroundColor: COLORS.secondary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    moreReviewsText: {
        fontSize: 14,
        color: COLORS.accent,
        fontWeight: '500',
    },
    noReviewsContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    noReviewsText: {
        marginTop: 12,
        fontSize: 16,
        color: COLORS.textLight,
    },
    headerTitleContainer: {
        padding: 5,
        maxWidth: 220,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
        marginTop: 2,
    },
});
