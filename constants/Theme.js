export const COLORS = {
    primary: '#E5A25E', // 따뜻한 오렌지-베이지
    secondary: '#F8EDE3', // 연한 베이지
    background: '#FCF9F5', // 아주 연한 베이지
    text: '#51392D', // 다크 브라운 (텍스트)
    textLight: '#8B7D75', // 라이트 브라운 (보조 텍스트)
    accent: '#D67D3E', // 진한 오렌지 (액센트)
    border: '#E9DDD3', // 테두리 색상
    white: '#FFFFFF',
    star: '#F7B26A', // 별점 색상
    button: '#D17D61', // 버튼 색상
    card: '#FFFFFF',
    selected: '#FFF0E6', // 선택된 항목 배경색
    shadow: '#00000010', // 그림자 색상
    heart: '#FF6B6B', // 즐겨찾기 하트 색상
};

export const TYPOGRAPHY = {
    h1: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    h2: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    h3: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    body: {
        fontSize: 16,
        color: COLORS.text,
    },
    bodySmall: {
        fontSize: 14,
        color: COLORS.text,
    },
    caption: {
        fontSize: 12,
        color: COLORS.textLight,
    },
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
};

export const CARD_STYLES = {
    basic: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...SHADOWS.medium,
    },
    compact: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        ...SHADOWS.small,
    },
};
