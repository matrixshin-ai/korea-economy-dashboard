import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ExternalLink } from "lucide-react";

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

export default function PrivateInstitutesPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">민간 경제연구소</h1>
            <p className="text-muted-foreground">Private Economic Research Institutes</p>
          </div>

          <div className="grid gap-3">
            {PRIVATE_INSTITUTES.map((institute) => (
              <a
                key={institute.name}
                href={institute.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                data-testid={`private-institute-${institute.name}`}
              >
                <Card className="hover:border-indigo-300 transition-colors hover:shadow-md border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                        {institute.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">{institute.nameEn}</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
