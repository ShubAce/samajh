import { ImageResponse } from "next/og";

export const alt = "Samajh: the tutor that finds out why you got it wrong";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function googleFont(family: string, query: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:${query}&display=swap`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [anek, anekBold, kalam] = await Promise.all([
    googleFont("Anek+Latin", "wght@500"),
    googleFont("Anek+Latin", "wght@700"),
    googleFont("Kalam", "wght@400"),
  ]);
  const fonts = [
    anek && { name: "Anek", data: anek, weight: 500 as const, style: "normal" as const },
    anekBold && { name: "Anek", data: anekBold, weight: 700 as const, style: "normal" as const },
    kalam && { name: "Kalam", data: kalam, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 500 | 700 | 400; style: "normal" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 72px",
          backgroundColor: "#ffffff",
          backgroundImage:
            "linear-gradient(#c4dccd 1px, transparent 1px), linear-gradient(90deg, #c4dccd 1px, transparent 1px), linear-gradient(#e4efe8 1px, transparent 1px), linear-gradient(90deg, #e4efe8 1px, transparent 1px)",
          backgroundSize: "60px 60px, 60px 60px, 12px 12px, 12px 12px",
          fontFamily: "Anek",
          color: "#16204a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: "4px solid #1f3bb3",
              display: "flex",
              alignItems: "flex-end",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={{ width: "100%", height: "55%", background: "#1f3bb3" }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#1f3bb3" }}>Samajh</div>
          <div style={{ fontSize: 26, color: "#5a6283", marginLeft: 12 }}>Adaptive tutor for CBSE Class 10 Physics</div>
        </div>

        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, marginTop: 44, maxWidth: 1000 }}>
          Finds out why you got it wrong.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            padding: "26px 32px",
            background: "rgba(255,255,255,.92)",
            borderRadius: 18,
            border: "1px solid #e3e6ee",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontFamily: "Kalam", fontSize: 36, color: "#1f3bb3", flexWrap: "wrap" }}>
            <span>The first bulb is brighter because</span>
            <span style={{ display: "flex", border: "4px solid #e03131", borderRadius: 999, padding: "0 18px", margin: "0 10px" }}>
              it uses up the current
            </span>
          </div>
          <div style={{ display: "flex", fontFamily: "Kalam", fontSize: 34, color: "#e03131", marginTop: 14 }}>
            Misconception: current gets used up
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
