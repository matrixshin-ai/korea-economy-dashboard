import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, Building2 } from "lucide-react";

const REPORT_LINKS = [
  { 
    name: "오늘의 경제부처 보고서", 
    description: "정부 경제부처 발표자료 (KDI 경제정보센터)",
    url: "https://eiec.kdi.re.kr/policy/materialList.do" 
  },
  { 
    name: "오늘의 연구기관 보고서", 
    description: "국내 연구기관 발표자료 (KDI 경제정보센터)",
    url: "https://eiec.kdi.re.kr/policy/domesticList.do" 
  },
];

const PRIVATE_INSTITUTES = [
  { name: "한국금융연구원", nameEn: "Korea Institute of Finance", url: "https://www.kif.re.kr/" },
  { name: "대신경제연구소", nameEn: "Daishin Economic Research", url: "https://www.deri.co.kr/" },
  { name: "LG경제연구원", nameEn: "LG Business Research", url: "https://www.lgbr.co.kr/" },
  { name: "삼성글로벌리서치", nameEn: "Samsung Global Research", url: "https://www.samsungsgr.com/" },
  { name: "자본시장연구원", nameEn: "Korea Capital Market Institute", url: "https://www.kcmi.re.kr/" },
  { name: "현대경제연구원", nameEn: "Hyundai Research Institute", url: "https://www.hri.co.kr/" },
  { name: "세계경제연구원", nameEn: "Institute for Global Economics", url: "https://www.igenet.com/" },
  { name: "산업정책연구원", nameEn: "The Institute for Industrial Policy Studies", url: "https://www.ips.or.kr/" },
  { name: "세종연구소", nameEn: "The Sejong Institute", url: "https://www.sejong.org/" },
  { name: "아산정책연구원", nameEn: "The Asan Institute for Policy Studies", url: "https://www.asaninst.org/" },
];

export default function InstitutionalReportsPage() {
  const [showPrivateInstitutes, setShowPrivateInstitutes] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">기관 보고서</h1>
            <p className="text-muted-foreground">Institutional Reports - 주요 경제 기관 발표 자료</p>
          </div>

          <Card className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white border-none shadow-lg mb-8">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif">경제 보고서</h2>
                <p className="text-white/70 text-sm">정부 및 연구기관의 공식 보고서 바로가기</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {REPORT_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                data-testid={`report-link-${link.name}`}
              >
                <Card className="hover:border-indigo-300 transition-colors hover:shadow-md border">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                        {link.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">{link.description}</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                  </CardContent>
                </Card>
              </a>
            ))}

            <Card 
              className="cursor-pointer hover:border-indigo-300 transition-colors hover:shadow-md border"
              onClick={() => setShowPrivateInstitutes(!showPrivateInstitutes)}
              data-testid="private-institutes-toggle"
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      민간 경제연구소
                    </h3>
                    <p className="text-muted-foreground text-sm">Private Economic Research Institutes</p>
                  </div>
                </div>
                {showPrivateInstitutes ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </CardContent>
            </Card>

            {showPrivateInstitutes && (
              <div className="grid gap-2 pl-4 border-l-2 border-indigo-200">
                {PRIVATE_INSTITUTES.map((institute) => (
                  <a
                    key={institute.name}
                    href={institute.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-3 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                    data-testid={`private-institute-${institute.name}`}
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors">
                        {institute.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {institute.nameEn}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
