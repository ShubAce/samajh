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
  const [sora, jakarta, kalam] = await Promise.all([
    googleFont("Sora", "wght@700"),
    googleFont("Plus+Jakarta+Sans", "wght@600"),
    googleFont("Kalam", "wght@400"),
  ]);
  const fonts = [
    sora && { name: "Sora", data: sora, weight: 700 as const, style: "normal" as const },
    jakarta && { name: "Jakarta", data: jakarta, weight: 600 as const, style: "normal" as const },
    kalam && { name: "Kalam", data: kalam, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 700 | 600 | 400; style: "normal" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "54px 70px",
          backgroundColor: "#070a17",
          backgroundImage:
            "radial-gradient(700px 420px at 8% 0%, rgba(108,92,255,.55), transparent 70%), radial-gradient(600px 400px at 100% 10%, rgba(31,182,255,.32), transparent 70%), radial-gradient(500px 360px at 60% 110%, rgba(255,79,139,.22), transparent 70%)",
          fontFamily: "Jakarta",
          color: "#eef0ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: "linear-gradient(135deg, #6c5cff, #46d3ff)",
              boxShadow: "0 0 30px rgba(108,92,255,.8)",
              fontSize: 26,
              fontFamily: "Sora",
              color: "white",
            }}
          >
            S
          </div>
          <div style={{ fontSize: 34, fontFamily: "Sora", color: "white" }}>Samajh</div>
          <div
            style={{
              display: "flex",
              marginLeft: 14,
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.06)",
              fontSize: 20,
              color: "#c9c3ff",
            }}
          >
            Adaptive tutor · CBSE Class 10 Physics · Gemini
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 74,
            fontFamily: "Sora",
            lineHeight: 1.04,
            letterSpacing: "-2px",
            marginTop: 40,
            maxWidth: 980,
            backgroundImage: "linear-gradient(100deg, #ffffff 0%, #d9d4ff 45%, #8f86ff 75%, #5fd9ff 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Finds out why you got it wrong.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 34,
            padding: "24px 30px",
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontFamily: "Kalam", fontSize: 34, color: "#b8c4ff", flexWrap: "wrap" }}>
            <span>The first bulb is brighter because</span>
            <span
              style={{
                display: "flex",
                border: "4px solid #ff5c7c",
                borderRadius: 999,
                padding: "0 18px",
                margin: "0 10px",
                boxShadow: "0 0 22px rgba(255,92,124,.7)",
              }}
            >
              it uses up the current
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#ff5c7c", marginTop: 14 }}>Misconception detected: current gets used up</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
