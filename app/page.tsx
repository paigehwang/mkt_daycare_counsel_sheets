import fs from "fs"
import path from "path"
import DashboardShell from "@/components/DashboardShell"
import { getPipelineData } from "@/lib/data/pipeline"

export const revalidate = 3600

export default async function DashboardPage() {
  let html = fs.readFileSync(
    path.join(process.cwd(), "legacy/consultation.html"),
    "utf-8"
  )

  // 파이프라인 상태 데이터 주입 (실패해도 대시보드는 정상 표시)
  try {
    const pipeline = await getPipelineData()
    // [진행단계 레이블, 날짜 "M/D", 계약여부]
    const statusMap: Record<string, [string, string | null, string | null]> = {}

    for (const c of [...pipeline.inProgress, ...pipeline.converted, ...pipeline.dropped]) {
      const key = c.bonbu + "|" + c.sheetType + "|" + c.center + "|" + c.consultDate
      statusMap[key] = [c.stage, c.displayDate, c.convertedTo]
    }

    const script =
      "<script>window.PIPELINE_STATUS=" + JSON.stringify(statusMap) + ";</script>"
    html = html.replace("</body>", script + "</body>")
  } catch (e) {
    console.error("[page] pipeline injection failed:", e)
  }

  // 본사 성장팀 제거: 기존 <script> 블록 내부이므로 태그 없이 JS만 삽입
  const excludeJs =
    `;(function(){var EXC=["본사 성장팀"];` +
    `if(DATA.centers_by_bonbu)for(var b in DATA.centers_by_bonbu)DATA.centers_by_bonbu[b]=DATA.centers_by_bonbu[b].filter(function(c){return EXC.indexOf(c)<0;});` +
    `if(DATA.detail)DATA.detail=DATA.detail.filter(function(r){return EXC.indexOf(r.c)<0;});` +
    `if(DATA.counts)for(var b in DATA.counts)for(var i=0;i<EXC.length;i++)delete DATA.counts[b][EXC[i]];` +
    `})()\n`
  html = html.replace("// boot\ninitDateInputs();", excludeJs + "// boot\ninitDateInputs();")

  return <DashboardShell html={html} />
}
