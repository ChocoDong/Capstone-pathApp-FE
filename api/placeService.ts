import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '../app/env/apiKeys';
import { auth } from '../firebase/config';

// 서버 API 기본 URL - 로컬 개발 서버 주소 (필요시 수정)
// const API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://192.168.1.114:3000'; // 기존 IP 주소

export interface Review {
    id: string;
    place_id: string;
    place_name: string;
    user_name: string;
    rating: number;
    comment: string;
    review_date: string;
    source: 'google' | 'user';
    created_at?: string;
    updated_at?: string;
}

export interface PlaceDetail {
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
}

/**
 * 장소 이름으로 검색
 */
export const searchPlaceByName = async (
    placeName: string
): Promise<{ placeId: string; name: string; address: string } | null> => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/places/search`,
            {
                placeName,
                apiKey: GOOGLE_MAPS_API_KEY,
            },
            {
                timeout: 10000, // 10초 타임아웃
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.success) {
            return {
                placeId: response.data.placeId,
                name: response.data.name,
                address: response.data.address,
            };
        }

        return null;
    } catch (error: any) {
        console.error('장소 검색 중 오류 발생:', error);
        if (error.code === 'ECONNABORTED') {
            console.error('요청 타임아웃');
        } else if (error.response) {
            console.error('서버 응답:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('응답 없음. 서버 연결 실패');
        }
        return null;
    }
};

/**
 * 장소 ID로 상세 정보 및 리뷰 조회
 */
export const getPlaceDetails = async (placeId: string): Promise<PlaceDetail | null> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/places/${placeId}/details`);

        if (response.data.success) {
            return response.data;
        }

        return null;
    } catch (error) {
        console.error('장소 상세 정보 조회 중 오류 발생:', error);
        return null;
    }
};

/**
 * 장소 이름으로 상세 정보 조회
 */
export const getPlaceDetailsByName = async (placeName: string): Promise<PlaceDetail | null> => {
    try {
        // 1. 장소 이름으로 place_id 검색
        const searchResult = await searchPlaceByName(placeName);

        if (!searchResult) {
            return null;
        }

        // 2. Google API에서 장소 리뷰 가져와 DB에 동기화
        await syncPlaceReviews(searchResult.placeId, searchResult.name);

        // 3. 상세 정보 조회
        return await getPlaceDetails(searchResult.placeId);
    } catch (error) {
        console.error('장소 이름으로 상세 정보 조회 중 오류 발생:', error);
        return null;
    }
};

/**
 * Google Places API에서 리뷰 가져와 서버 DB에 동기화
 */
export const syncPlaceReviews = async (placeId: string, placeName: string): Promise<Review[]> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/places/sync-reviews`, {
            placeId,
            placeName,
            apiKey: GOOGLE_MAPS_API_KEY,
        });

        if (response.data.success) {
            return response.data.reviews;
        }

        return [];
    } catch (error) {
        console.error('리뷰 동기화 중 오류 발생:', error);
        return [];
    }
};

/**
 * 장소 ID로 리뷰 목록 조회
 */
export const getReviewsByPlaceId = async (placeId: string, limit = 10, offset = 0): Promise<Review[]> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/reviews/${placeId}?limit=${limit}&offset=${offset}`);

        if (response.data.success) {
            return response.data.reviews;
        }

        return [];
    } catch (error) {
        console.error('리뷰 조회 중 오류 발생:', error);
        return [];
    }
};

/**
 * 사용자 리뷰 작성
 */
export const addUserReview = async (
    placeId: string,
    placeName: string,
    userName: string,
    rating: number,
    comment: string
): Promise<boolean> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/reviews`, {
            placeId,
            placeName,
            userName,
            rating,
            comment,
        });

        return response.data.success;
    } catch (error) {
        console.error('리뷰 작성 중 오류 발생:', error);
        return false;
    }
};

/**
 * 장소 즐겨찾기 추가
 */
export const addToFavorites = async (placeId: string): Promise<boolean> => {
    try {
        // 인증 토큰 가져오기
        const token = await getAuthToken();
        if (!token) {
            console.error('즐겨찾기 추가 실패: 토큰이 없습니다');
            return false;
        }

        console.log('즐겨찾기 추가 요청:', placeId);
        const response = await axios.post(
            `${API_BASE_URL}/places/favorites`,
            { place_id: placeId },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        console.log('즐겨찾기 추가 응답:', response.data);
        return response.data.success;
    } catch (error: any) {
        console.error('즐겨찾기 추가 중 오류 발생:', error);
        // 더 자세한 에러 정보 출력
        if (error.response) {
            // 서버 응답이 있는 경우
            console.error('서버 응답 데이터:', error.response.data);
            console.error('서버 응답 상태:', error.response.status);
            console.error('서버 응답 헤더:', error.response.headers);
        } else if (error.request) {
            // 요청은 보냈지만 응답이 없는 경우
            console.error('응답을 받지 못했습니다:', error.request);
        } else {
            // 요청 설정 중 에러가 발생한 경우
            console.error('요청 에러:', error.message);
        }
        return false;
    }
};

/**
 * 장소 즐겨찾기 제거
 */
export const removeFromFavorites = async (placeId: string): Promise<boolean> => {
    try {
        // 인증 토큰 가져오기
        const token = await getAuthToken();
        if (!token) return false;

        const response = await axios.delete(`${API_BASE_URL}/places/favorites`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            data: { place_id: placeId },
        });

        return response.data.success;
    } catch (error) {
        console.error('즐겨찾기 제거 중 오류 발생:', error);
        return false;
    }
};

/**
 * 장소 즐겨찾기 상태 확인
 */
export const checkFavoriteStatus = async (placeId: string): Promise<boolean> => {
    try {
        // 인증 토큰 가져오기
        const token = await getAuthToken();
        if (!token) {
            console.error('즐겨찾기 상태 확인 실패: 토큰이 없습니다');
            return false;
        }

        console.log('즐겨찾기 상태 확인 요청:', placeId);
        const response = await axios.get(`${API_BASE_URL}/places/favorites/${placeId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log('즐겨찾기 상태 확인 응답:', response.data);
        return response.data.isFavorite;
    } catch (error: any) {
        console.error('즐겨찾기 상태 확인 중 오류 발생:', error);
        // 더 자세한 에러 정보 출력
        if (error.response) {
            // 서버 응답이 있는 경우
            console.error('서버 응답 데이터:', error.response.data);
            console.error('서버 응답 상태:', error.response.status);
            console.error('서버 응답 헤더:', error.response.headers);
        } else if (error.request) {
            // 요청은 보냈지만 응답이 없는 경우
            console.error('응답을 받지 못했습니다:', error.request);
        } else {
            // 요청 설정 중 에러가 발생한 경우
            console.error('요청 에러:', error.message);
        }
        return false;
    }
};

/**
 * 사용자의 즐겨찾기 목록 가져오기
 */
export const getFavorites = async () => {
    try {
        // 인증 토큰 가져오기
        const token = await getAuthToken();
        if (!token) {
            console.error('즐겨찾기 목록 가져오기 실패: 인증 토큰이 없습니다');
            return [];
        }

        console.log('즐겨찾기 목록 요청 시작:', `${API_BASE_URL}/places/favorites`);
        // 서버 라우팅과 일치하는 경로 사용
        const response = await axios.get(`${API_BASE_URL}/places/favorites`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log('즐겨찾기 목록 응답:', response.data);
        if (response.data.success) {
            return response.data.favorites;
        }

        return [];
    } catch (error: any) {
        console.error('즐겨찾기 목록 가져오기 중 오류 발생:', error);
        // 더 자세한 에러 정보 출력
        if (error.response) {
            // 서버 응답이 있는 경우
            console.error('서버 응답 데이터:', error.response.data);
            console.error('서버 응답 상태:', error.response.status);
            console.error('서버 응답 헤더:', error.response.headers);
        } else if (error.request) {
            // 요청은 보냈지만 응답이 없는 경우
            console.error('응답을 받지 못했습니다. 서버가 실행 중인지 확인하세요:', error.request);
        } else {
            // 요청 설정 중 에러가 발생한 경우
            console.error('요청 설정 중 에러:', error.message);
        }
        return [];
    }
};

/**
 * Firebase 인증 토큰 가져오기
 */
const getAuthToken = async (): Promise<string | null> => {
    try {
        // Firebase 현재 사용자 가져오기
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.error('로그인된 사용자가 없습니다.');
            return null;
        }

        // 토큰 가져오기
        console.log('Firebase 사용자 UID:', currentUser.uid);
        const token = await currentUser.getIdToken(true); // true로 설정하여 항상 새로운 토큰을 강제로 가져옴
        console.log('토큰 가져오기 성공:', token ? '토큰 받음' : '토큰 없음');
        return token;
    } catch (error) {
        console.error('인증 토큰 가져오기 실패:', error);
        return null;
    }
};
