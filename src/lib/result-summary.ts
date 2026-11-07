export function summarizeResults(rows:Array<{result:string|null;source?:string|null}>){
  const count=(values:string[])=>rows.filter(r=>values.includes(r.result || '')).length;
  return {gebeld:rows.filter(r=>r.source!=='public_booking').length,enquetes:count(['enqueteTel']),afspraken:count(['afspraak']),verstuurd:count(['enqueteVerstuurd']),afgevallen:count(['nietInteressant','nietBellen']),geenGehoor:count(['geenGehoor','voicemail']),callbacks:count(['terugbellenGepland'])};
}