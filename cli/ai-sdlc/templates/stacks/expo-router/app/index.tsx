import { useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";

export default function Index() {
  const [count, setCount] = useState(0);
  return (
    <View>
      <Stack.Screen options={{ title: "__projectName__" }} />
      <Text onPress={() => setCount(count + 1)}>Tapped {count} times</Text>
    </View>
  );
}
