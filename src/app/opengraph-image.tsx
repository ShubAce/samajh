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

const LINE = "#17171c";

export default async function OpengraphImage() {
  const [bricolage, figtree, kalam] = await Promise.all([
    googleFont("Bricolage+Grotesque", "wght@800"),
    googleFont("Figtree", "wght@700"),
    googleFont("Kalam", "wght@400"),
  ]);
  const fonts = [
    bricolage && { name: "Bricolage", data: bricolage, weight: 800 as const, style: "normal" as const },
    figtree && { name: "Figtree", data: figtree, weight: 700 as const, style: "normal" as const },
    kalam && { name: "Kalam", data: kalam, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 800 | 700 | 400; style: "normal" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "52px 64px",
          backgroundColor: "#ffffff",
          backgroundImage: "radial-gradient(rgba(23,23,28,.14) 1.5px, transparent 1.5px)",
          backgroundSize: "26px 26px",
          fontFamily: "Figtree",
          color: LINE,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#3355ff",
              border: `3px solid ${LINE}`,
              boxShadow: `4px 4px 0 ${LINE}`,
              fontSize: 28,
              fontFamily: "Bricolage",
              color: "white",
            }}
          >
            S
          </div>
          <div style={{ fontSize: 38, fontFamily: "Bricolage", letterSpacing: "-1px" }}>Samajh</div>
          <div
            style={{
              display: "flex",
              marginLeft: 12,
              padding: "6px 18px",
              borderRadius: 999,
              border: `3px solid ${LINE}`,
              background: "#ffd23f",
              fontSize: 21,
            }}
          >
            CBSE Class 10 Physics · Gemini
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", fontSize: 84, fontFamily: "Bricolage", lineHeight: 1.02, letterSpacing: "-3px", marginTop: 38 }}>
          <span>Find out</span>
          <span
            style={{
              display: "flex",
              margin: "0 18px",
              padding: "0 18px",
              border: "6px solid #ef4a36",
              borderRadius: 999,
            }}
          >
            why
          </span>
          <span>you got</span>
        </div>
        <div style={{ display: "flex", fontSize: 84, fontFamily: "Bricolage", lineHeight: 1.02, letterSpacing: "-3px" }}>it wrong.</div>

        <div style={{ display: "flex", marginTop: 34, alignItems: "flex-start", gap: 26 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 26px",
              borderRadius: 20,
              border: `3px solid ${LINE}`,
              background: "#ffffff",
              boxShadow: `6px 6px 0 ${LINE}`,
              width: 640,
            }}
          >
            <div style={{ display: "flex", fontSize: 18, color: "#54576a" }}>Student&apos;s answer</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontFamily: "Kalam", fontSize: 32, color: "#1f3fc9", marginTop: 6 }}>
              <span>The first bulb is brighter because</span>
              <span style={{ display: "flex", border: "4px solid #ef4a36", borderRadius: 999, padding: "0 14px", marginLeft: 8 }}>
                it uses up the current
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "18px 22px",
              borderRadius: 8,
              border: `3px solid ${LINE}`,
              background: "#fff1a8",
              boxShadow: `5px 5px 0 ${LINE}`,
              width: 300,
              transform: "rotate(-3deg)",
            }}
          >
            <div style={{ display: "flex", fontSize: 18, color: "#ef4a36" }}>Misconception detected</div>
            <div style={{ display: "flex", fontSize: 30, fontFamily: "Bricolage", marginTop: 4, lineHeight: 1.05 }}>Current gets used up</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
