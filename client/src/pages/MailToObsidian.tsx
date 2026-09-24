import { Link } from "wouter";

export default function MailToObsidian() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Korea Economy Dashboard로 돌아가기
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
          Mail to Obsidian
        </h1>
        <p className="text-gray-500 mb-8">Gmail 첨부파일 자동 다운로드 도구</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">목적</h2>
          <p className="text-gray-800 leading-relaxed">
            Mail to Obsidian은 특정 조건에 맞는 Gmail 메일의 첨부파일을 자동으로
            찾아 사용자 개인 PC에 저장하는 개인용 자동화 도구입니다. 매번 메일함을
            열어 첨부파일을 하나씩 내려받는 반복 작업을 줄이기 위해 만들어졌습니다.
            현재 단계에서는 첨부파일을 원본 그대로 로컬에 내려받는 기능까지만
            제공하며, 이후 단계로 Obsidian 노트 변환 기능을 추가할 예정입니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Gmail 첨부파일 자동 다운로드 기능
          </h2>
          <ul className="list-disc list-inside text-gray-800 leading-relaxed space-y-2">
            <li>Gmail에서 사용자가 지정한 라벨이 붙은 메일만 확인합니다.</li>
            <li>
              그중에서도 제목이 지정된 문구로 시작하는 메일만 골라 처리합니다.
              (예: 특정 발신 경로를 통해 전달되는 업무 메일)
            </li>
            <li>
              대상 메일의 첨부파일을 원본 파일명·확장자를 유지한 채 사용자 PC의
              지정된 폴더에 저장합니다.
            </li>
            <li>
              이미 처리한 메일과 첨부파일은 기록해 두어 같은 파일을 중복으로
              내려받지 않습니다.
            </li>
            <li>
              Gmail 메일 원본은 읽기 전용으로만 조회하며, 삭제·읽음 처리·라벨
              변경 등 어떤 방식으로도 수정하지 않습니다.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">사용 범위</h2>
          <p className="text-gray-800 leading-relaxed">
            이 도구는 개발자 본인의 업무 자동화를 위해 만들어진 개인용 프로그램으로,
            사용자 본인의 Gmail 계정 한 곳에만 연결되어 동작합니다. 제3자에게
            서비스로 제공되지 않으며, 여러 사용자를 대상으로 운영되지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">권한 및 개인정보</h2>
          <p className="text-gray-800 leading-relaxed">
            이 도구가 사용하는 Gmail 접근 권한의 범위와 수집한 정보의 처리 방식은{" "}
            <Link href="/mail-to-obsidian/privacy" className="text-blue-600 hover:underline">
              개인정보처리방침
            </Link>
            에서 확인하실 수 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
}
