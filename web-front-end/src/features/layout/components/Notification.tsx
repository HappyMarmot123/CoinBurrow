import Link from "next/link";

export const Notification = ({
  notificationData,
  notifyRoute,
}: {
  notificationData: {
    id: number;
    message: string;
  }[];
  notifyRoute: string;
}) => {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-72 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
      <ul className="py-2 px-3 max-h-60 overflow-y-auto">
        {notificationData.length === 0 ? (
          <li className="py-2 text-sm text-gray-400 text-center">
            알림이 없습니다.
          </li>
        ) : (
          notificationData.map((notif) => (
            <li
              key={notif.id}
              className="py-2 border-b border-gray-700 text-sm text-gray-300 last:border-b-0"
            >
              {notif.message}
            </li>
          ))
        )}
      </ul>
      <div className="p-2 border-t border-gray-700">
        <Link
          href={notifyRoute}
          className="block text-center text-sm text-green-400 hover:underline"
        >
          더 보기
        </Link>
      </div>
    </div>
  );
};
