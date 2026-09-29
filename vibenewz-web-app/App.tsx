import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { WellbeingProvider } from "./src/context/WellbeingContext";
import { BookmarksProvider } from "./src/context/BookmarksContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

// Load the two brand fonts (Newsreader + DM Sans) from Google Fonts
// and set the page background. Runs once, in the browser only.
if (
  Platform.OS === "web" &&
  typeof document !== "undefined" &&
  !document.getElementById("vibenewz-fonts")
) {
  const link = document.createElement("link");
  link.id = "vibenewz-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap";
  document.head.appendChild(link);
  document.body.style.backgroundColor = "#FFF7E1";
}

export default function App() {
  return (
    <AuthProvider>
      <WellbeingProvider>
        <BookmarksProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </BookmarksProvider>
      </WellbeingProvider>
    </AuthProvider>
  );
}
