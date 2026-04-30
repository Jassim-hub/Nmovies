import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get('movieId');
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "TMDB API key not set" }), { status: 500 });
  if (!movieId) return new Response(JSON.stringify({ error: "Missing movieId parameter" }), { status: 400 });

  const url = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=en-US`;
  const tmdbRes = await fetch(url);
  if (!tmdbRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch from TMDB" }), { status: tmdbRes.status });
  }
  const data = await tmdbRes.json();
  return new Response(JSON.stringify(data), { status: 200 });
} 