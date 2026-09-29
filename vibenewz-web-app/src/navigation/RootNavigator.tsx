// All pages share the top nav, so the bottom tab bar is gone and everything lives in one stack.
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import { LoginScreen } from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { GlobalMapScreen } from "../screens/GlobalMapScreen";
import { BookmarksScreen } from "../screens/BookmarksScreen";
import { WellbeingScreen } from "../screens/WellbeingScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ArticleDetailScreen } from "../screens/ArticleDetailScreen";

const Stack = createNativeStackNavigator();

// Gives each page its own browser URL (so refresh + back button work)
const linking: LinkingOptions<any> = {
  prefixes: [],
  config: {
    screens: {
      Home: "",
      GlobalMap: "map",
      Bookmarks: "bookmarks",
      Wellbeing: "wellbeing",
      Profile: "preferences",
      ArticleDetail: "article/:id",
      Login: "login",
    },
  },
};

export function RootNavigator() {
  const { username, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      linking={linking}
      documentTitle={{
        formatter: (options) =>
          options?.title ? `${options.title} · VibeNewz` : "VibeNewz",
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {username ? (
          <>
            <Stack.Screen
              name="Home"
              component={DashboardScreen}
              options={{ title: "Home" }}
            />
            <Stack.Screen
              name="GlobalMap"
              component={GlobalMapScreen}
              options={{ title: "Global map" }}
            />
            <Stack.Screen
              name="Bookmarks"
              component={BookmarksScreen}
              options={{ title: "Bookmarks" }}
            />
            <Stack.Screen
              name="Wellbeing"
              component={WellbeingScreen}
              options={{ title: "My wellbeing" }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: "Preferences" }}
            />
            <Stack.Screen
              name="ArticleDetail"
              component={ArticleDetailScreen}
              options={{ title: "Story" }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: "Sign in" }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
