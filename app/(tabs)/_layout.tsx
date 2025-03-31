import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { House, MapPin, Compass, User } from 'phosphor-react-native';

export default function TabLayout() {
    return (
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: '#007bff',
                    tabBarInactiveTintColor: '#666',
                }}
            >
                <Tabs.Screen
                    name="Home"
                    options={{
                        title: '홈',
                        tabBarIcon: ({ color }) => <House weight="fill" color={color} size={24} />,
                    }}
                />
                <Tabs.Screen
                    name="List"
                    options={{
                        title: '선호한 곳',
                        tabBarIcon: ({ color }) => <MapPin weight="fill" color={color} size={24} />,
                    }}
                />
                <Tabs.Screen
                    name="Route"
                    options={{
                        title: '저장경로',
                        tabBarIcon: ({ color }) => <Compass weight="fill" color={color} size={24} />,
                    }}
                />
                <Tabs.Screen
                    name="MyPage"
                    options={{
                        title: '마이페이지',
                        tabBarIcon: ({ color }) => <User weight="fill" color={color} size={24} />,
                    }}
                />
            </Tabs>
        </SafeAreaView>
    );
}
