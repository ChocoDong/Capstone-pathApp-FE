/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { COLORS } from './Theme';

const tintColorLight = COLORS.accent;
const tintColorDark = COLORS.primary;

export const Colors = {
    light: {
        text: COLORS.text,
        background: COLORS.background,
        tint: tintColorLight,
        icon: COLORS.accent,
        tabIconDefault: COLORS.textLight,
        tabIconSelected: tintColorLight,
    },
    dark: {
        text: COLORS.white,
        background: '#2D231B', // Darker version of our brown
        tint: tintColorDark,
        icon: COLORS.primary,
        tabIconDefault: '#9BA1A6',
        tabIconSelected: tintColorDark,
    },
};
