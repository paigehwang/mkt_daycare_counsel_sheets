import fs from "fs"
import path from "path"
import DashboardShell from "@/components/DashboardShell"
import { getPipelineData } from "@/lib/data/pipeline"
import { getConsultationData } from "@/lib/data/consultation"

export const revalidate = 3600

export default async function DashboardPage() {
  const [consultResult, pipelineResult] = await Promise.allSettled([
    getConsultationData(),
    getPipelineData(),
  ])

  let html = fs.readFileSync(
    path.join(process.cwd(), "legacy/template.html"),
    "utf-8"
  )

  // 구글 시트에서 받아온 최신 데이터 주입
  if (consultResult.status === "fulfilled") {
    html = html.replace(
      "__DATA_JSON_PLACEHOLDER__",
      JSON.stringify(consultResult.value)
    )
  } else {
    console.error("[page] consultation data failed:", consultResult.reason)
    html = html.replace("__DATA_JSON_PLACEHOLDER__", JSON.stringify({
      counts: {}, channels: {}, months: [], centers_by_bonbu: {},
      all_channels: [], sheet_stats: {}, totals: { rows: 0 },
      sheets: ["등급신청", "유선상담", "대면상담", "계약상담", "상담요청"],
      detail: [],
    }))
  }

  // 파이프라인 상태 데이터 주입
  if (pipelineResult.status === "fulfilled") {
    const pipeline = pipelineResult.value
    const statusMap: Record<string, [string, string | null, string | null]> = {}

    for (const c of [...pipeline.inProgress, ...pipeline.converted, ...pipeline.dropped]) {
      const key = c.bonbu + "|" + c.sheetType + "|" + c.center + "|" + c.consultDate
      statusMap[key] = [c.stage, c.displayDate, c.convertedTo]
    }

    const script =
      "<script>window.PIPELINE_STATUS=" + JSON.stringify(statusMap) + ";</script>"
    html = html.replace("</body>", script + "</body>")
  } else {
    console.error("[page] pipeline injection failed:", pipelineResult.reason)
  }

  // 본사 성장팀 제거
  const excludeJs =
    `;(function(){var EXC=["본사 성장팀"];` +
    `if(DATA.centers_by_bonbu)for(var b in DATA.centers_by_bonbu)DATA.centers_by_bonbu[b]=DATA.centers_by_bonbu[b].filter(function(c){return EXC.indexOf(c)<0;});` +
    `if(DATA.detail)DATA.detail=DATA.detail.filter(function(r){return EXC.indexOf(r.c)<0;});` +
    `if(DATA.counts)for(var b in DATA.counts)for(var i=0;i<EXC.length;i++)delete DATA.counts[b][EXC[i]];` +
    `})()\n`
  html = html.replace("// boot\ninitDateInputs();", excludeJs + "// boot\ninitDateInputs();")

  return <DashboardShell html={html} />
}
