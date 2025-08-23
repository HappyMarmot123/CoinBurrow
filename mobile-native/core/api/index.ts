import axios from "axios";
import Constants from "expo-constants";

let API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (__DEV__) {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ipAddress = hostUri.split(":")[0];
    API_BASE_URL = `http://${ipAddress}:4000`;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
