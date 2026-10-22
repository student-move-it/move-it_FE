const fail = (res, status, message) => res.status(status).json({success: false, error: {message}});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return fail(res, 405, "조회 요청만 지원합니다.");
  }
  const route = req.query.path;
  if (typeof route !== "string" || !/^classes(?:\/[1-9]\d*)?$/.test(route))
    return fail(res, 404, "지원하지 않는 API 경로입니다.");
  const apiKey = process.env.BACKEND_API_KEY?.trim();
  if (!apiKey) return fail(res, 503, "프론트 배포 서버의 BACKEND_API_KEY 설정이 필요합니다.");
  try {
    const upstream = await fetch(`https://move-it-be.vercel.app/${route}`, {
      headers: {Accept: "application/json", "X-API-Key": apiKey},
      signal: AbortSignal.timeout(9000),
      redirect: "error",
    });
    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json"))
      return fail(res, 502, "백엔드가 JSON 응답을 반환하지 않았습니다.");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(upstream.status).send(body);
  } catch {
    return fail(res, 502, "백엔드에 연결할 수 없거나 응답 시간이 초과되었습니다.");
  }
}
