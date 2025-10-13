export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            접근 권한이 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            유효한 초대 코드로 먼저 등록해주세요.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            처음으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
