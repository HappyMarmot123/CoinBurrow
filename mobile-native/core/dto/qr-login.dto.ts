export interface QrLoginRequestDto {
  sessionToken: string;
  mobileToken: string;
  user: {
    id: string;
  };
}
