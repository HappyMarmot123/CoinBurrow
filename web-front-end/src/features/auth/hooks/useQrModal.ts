import { useSuspenseQuery } from "@tanstack/react-query";

const fetchQrSessionToken = async () => {
  const response = await fetch("/api/auth/qr-login", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch QR session token");
  }

  const data = await response.json();
  return data.sessionToken;
};

export const useQrModal = () => {
  const { data: sessionToken } = useSuspenseQuery<string>({
    queryKey: ["qrSession"],
    queryFn: fetchQrSessionToken,
  });

  return { sessionToken };
};
