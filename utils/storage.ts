import AsyncStorage from '@react-native-async-storage/async-storage';

// 저장할 데이터 타입 정의
export interface TravelParams {
    startLocation?: string;
    endLocation?: string;
    leisureType?: string;
    experienceType?: string;
    travelDays?: string;
}

// 키 상수 정의
const STORAGE_KEYS = {
    TRAVEL_PARAMS: 'travel_params',
};

/**
 * 여행 파라미터를 AsyncStorage에 저장
 */
export const saveTravelParams = async (params: TravelParams): Promise<void> => {
    try {
        const jsonValue = JSON.stringify(params);
        await AsyncStorage.setItem(STORAGE_KEYS.TRAVEL_PARAMS, jsonValue);
        console.log('여행 정보가 저장되었습니다.');
    } catch (error) {
        console.error('여행 정보 저장 실패:', error);
    }
};

/**
 * AsyncStorage에서 여행 파라미터 불러오기
 */
export const loadTravelParams = async (): Promise<TravelParams | null> => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.TRAVEL_PARAMS);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
        console.error('여행 정보 불러오기 실패:', error);
        return null;
    }
};

/**
 * 특정 파라미터만 업데이트
 */
export const updateTravelParam = async (key: keyof TravelParams, value: string): Promise<void> => {
    try {
        // 기존 데이터 불러오기
        const currentParams = (await loadTravelParams()) || {};

        // 해당 키의 값 업데이트
        const updatedParams = {
            ...currentParams,
            [key]: value,
        };

        // 업데이트된 데이터 저장
        await saveTravelParams(updatedParams);
        console.log(`${key} 정보가 업데이트되었습니다.`);
    } catch (error) {
        console.error(`${key} 정보 업데이트 실패:`, error);
    }
};

/**
 * 여행 파라미터 삭제
 */
export const clearTravelParams = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TRAVEL_PARAMS);
        console.log('여행 정보가 삭제되었습니다.');
    } catch (error) {
        console.error('여행 정보 삭제 실패:', error);
    }
};
