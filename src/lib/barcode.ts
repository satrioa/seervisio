const CODE128B_ENCODINGS: [number, number, number, number, number, number][] = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],
  [1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],
  [1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],
  [1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],
  [1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],
  [3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],
  [3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],
  [2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],
  [1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],
  [1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],
  [3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],
  [2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],
  [3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
  [3,1,4,1,1,1],[2,2,1,4,1,2],[2,4,1,2,1,2],[2,2,1,2,1,4],
  [2,2,1,4,1,2],[2,4,1,2,1,2],[2,2,1,2,1,4],[2,2,2,1,1,4],
  [2,2,1,1,2,4],[2,4,1,1,2,2],[2,4,2,1,1,2],[2,2,2,4,1,1],
  [2,4,2,2,1,1],[2,2,2,1,4,1],[2,4,1,1,4,1],[4,1,2,1,2,2],
  [4,1,2,2,2,1],[4,2,2,1,2,1],[4,1,4,1,1,1],[2,1,3,2,3,1],
  [1,2,1,1,3,4],[1,4,1,1,3,2],[1,2,1,4,3,1],[1,1,3,2,1,4],
  [1,4,3,2,1,1],[1,1,4,2,3,1],[3,1,1,2,1,4],[3,1,1,4,1,2],
  [3,4,1,1,1,2],[3,2,1,4,1,1],[3,4,1,2,1,1],[1,1,1,2,4,3],
  [1,1,1,4,3,2],[1,2,1,1,3,4],[1,2,1,4,3,1],[1,1,3,4,1,2],
  [1,2,4,1,3,1],[3,1,1,2,4,1],[1,1,3,2,4,1],[1,2,3,1,4,1],
  [4,1,3,1,2,1],[2,1,1,4,3,1],[3,1,4,1,1,1],[4,1,1,2,1,3],
  [4,1,1,3,1,2],[4,2,1,1,1,3],[4,2,1,3,1,1],[4,1,2,1,2,1],
  [4,1,2,2,1,1],[4,2,2,1,1,1],[1,1,1,2,1,5],[1,1,1,5,1,2],
  [1,1,2,1,1,5],[1,1,2,5,1,1],[1,2,1,1,1,5],[1,2,1,5,1,1],
];

const START_B = 104;
const STOP = 106;

function code128BEncode(text: string): number[] {
  const codes: number[] = [START_B];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode >= 32 && charCode <= 126) {
      codes.push(charCode - 32);
    } else {
      codes.push(0);
    }
  }
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);
  return codes;
}

export function generateBarcodeSvg(text: string, height: number = 50, barColor: string = "#000000"): string {
  const codes = code128BEncode(text);
  const modules: number[] = [];
  for (const code of codes) {
    const enc = CODE128B_ENCODINGS[code];
    if (!enc) continue;
    for (const m of enc) modules.push(m);
  }

  const totalModules = modules.reduce((s, m) => s + m, 0);
  const barWidth = 1;

  let svgModules: { isBar: boolean; width: number }[] = [];
  for (let i = 0; i < modules.length; i++) {
    svgModules.push({ isBar: i % 2 === 0, width: modules[i] * barWidth });
  }

  const totalWidth = svgModules.reduce((s, m) => s + m.width, 0);

  let pathData = "";
  let x = 0;
  for (const m of svgModules) {
    if (m.isBar) {
      pathData += `M${x},0v${height}h${m.width}V0Z`;
    }
    x += m.width;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}">
  <path fill="${barColor}" d="${pathData}"/>
</svg>`;
}

export function barcodeSvgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
