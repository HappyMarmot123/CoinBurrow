import { Button } from "@/shared/components/Button";
import { Apple, Play, X } from "lucide-react";

export const SignUpSuccessView = ({
  closeModal,
}: {
  closeModal: () => void;
}) => (
  <div className="text-center">
    <h2 className="text-4xl font-extrabold mb-4 text-gray-900">
      Sign Up Complete
    </h2>
    <p className="text-gray-600 mb-6">
      Your sign up was successful. <br />
      From now on, you can easily log in by scanning a QR code after logging in
      on the mobile application.
    </p>
    <div className="flex justify-center gap-4 my-6">
      <Button
        variant="secondary"
        className="flex-1 flex items-center justify-center gap-2"
        disabled
      >
        <Play className="w-5 h-5" />
        Google Play
      </Button>
      <Button
        variant="secondary"
        className="flex-1 flex items-center justify-center gap-2"
        disabled
      >
        <Apple className="w-5 h-5" />
        App Store
      </Button>
    </div>
    <Button
      type="button"
      onClick={closeModal}
      className="w-full flex items-center justify-center gap-2"
      variant="primaryGreen"
      size="large"
    >
      <X className="w-5 h-5" />
      Close
    </Button>
  </div>
);
