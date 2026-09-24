import { Link } from "wouter";

const LAST_UPDATED = "2026-09-24";

export default function MailToObsidianPrivacy() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/mail-to-obsidian" className="text-sm text-blue-600 hover:underline">
          ← Mail to Obsidian 소개로 돌아가기
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
          개인정보처리방침
        </h1>
        <p className="text-gray-500 mb-8">Mail to Obsidian · 최종 수정일 {LAST_UPDATED}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            1. 이 도구가 접근하는 정보
          </h2>
          <p className="text-gray-800 leading-relaxed mb-2">
            Mail to Obsidian은 Google Gmail API의{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">
              https://www.googleapis.com/auth/gmail.readonly
            </code>{" "}
            권한(읽기 전용)만 사용합니다.
          </p>
          <ul className="list-disc list-inside text-gray-800 leading-relaxed space-y-1">
            <li>메일 전체가 아니라, 사용자가 지정한 라벨이 붙은 메일만 조회합니다.</li>
            <li>
              그중에서도 제목이 사용자가 지정한 문구로 시작하는 메일만 실제로
              처리 대상이 됩니다.
            </li>
            <li>
              접근하는 정보는 해당 메일의 제목, 수신 시각, 첨부파일 원본에
              한정됩니다.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            2. 정보의 저장 위치와 처리 방식
          </h2>
          <ul className="list-disc list-inside text-gray-800 leading-relaxed space-y-1">
            <li>
              대상 메일의 첨부파일은 <strong>사용자 본인 PC의 로컬 폴더</strong>에만
              저장됩니다. 외부 서버, 클라우드 저장소, 제3의 서비스로 전송되지
              않습니다.
            </li>
            <li>
              중복 다운로드를 막기 위한 처리 기록(메일 ID 목록)도 동일한 PC에만
              저장되며, 외부로 전송되지 않습니다.
            </li>
            <li>
              Gmail 인증 정보(OAuth 토큰)는 사용자 PC에만 저장되며, 개발자를
              포함한 어떤 제3자도 열람할 수 없습니다.
            </li>
            <li>
              이 도구는 접근한 메일 원본을 삭제, 읽음 처리, 라벨 변경 등 어떤
              방식으로도 수정하지 않습니다. 조회만 수행합니다.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            3. 제3자 제공 및 외부 공개
          </h2>
          <p className="text-gray-800 leading-relaxed">
            이 도구를 통해 수집·저장되는 정보는 어떤 형태로도 제3자에게 제공되거나
            외부에 공개되지 않습니다. 첨부파일 및 관련 기록은 사용자 본인의 PC
            안에만 존재하며, 다른 서버로 업로드되거나 다른 사람과 공유되지
            않습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            4. 사용 범위
          </h2>
          <p className="text-gray-800 leading-relaxed">
            이 도구는 개발자 본인의 업무 자동화를 위한 개인용 프로그램으로,
            사용자 본인의 Gmail 계정 한 곳에만 연결되어 동작합니다. 여러 사용자를
            대상으로 하는 서비스가 아닙니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            5. 접근 권한 해제
          </h2>
          <p className="text-gray-800 leading-relaxed">
            사용자는 언제든{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google 계정의 타사 앱 액세스 권한 설정
            </a>
            에서 이 도구의 Gmail 접근 권한을 직접 해제할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 문의</h2>
          <p className="text-gray-800 leading-relaxed">
            이 도구 또는 개인정보 처리방식에 대한 문의는{" "}
            <a href="mailto:matrix.shin@gmail.com" className="text-blue-600 hover:underline">
              matrix.shin@gmail.com
            </a>
            으로 연락해 주세요.
          </p>
        </section>
      </div>
    </div>
  );
}
