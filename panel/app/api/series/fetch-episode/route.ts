import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seriesId = searchParams.get('seriesId');
  const seasonNumber = searchParams.get('seasonNumber');
  const episodeNumber = searchParams.get('episodeNumber');
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) return new Response(JSON.stringify({ error: "TMDB API key not set" }), { status: 500 });
  if (!seriesId || !seasonNumber || !episodeNumber) return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });

  const url = `https://api.themoviedb.org/3/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${apiKey}&language=en-US`;
  const tmdbRes = await fetch(url);
  
  if (!tmdbRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch episode from TMDB" }), { status: tmdbRes.status });
  }
  
  const data = await tmdbRes.json();
  return new Response(JSON.stringify(data), { status: 200 });
}
