import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "TMDB API key not set" }), { status: 500 });
  if (!query) return new Response(JSON.stringify({ error: "Missing query parameter" }), { status: 400 });

  const url = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US`;
  const tmdbRes = await fetch(url);
  if (!tmdbRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch from TMDB" }), { status: tmdbRes.status });
  }
  const data = await tmdbRes.json();
  return new Response(JSON.stringify(data), { status: 200 });
} 