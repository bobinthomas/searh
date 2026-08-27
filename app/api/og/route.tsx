import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "serahbobin";
  const subtitle = searchParams.get("subtitle") || "drawing portfolio";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#0f0f0f",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "#fbfaf3",
              lineHeight: 1.1,
              fontFamily: "sans-serif",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "32px",
              color: "#d0fa66",
              fontFamily: "sans-serif",
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              marginTop: "48px",
              fontSize: "24px",
              color: "#6b6b64",
              fontFamily: "sans-serif",
            }}
          >
            serahbobin
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
