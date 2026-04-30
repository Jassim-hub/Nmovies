import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

interface TMDBEpisode {
  name: string;
  overview: string;
  episode_number: number;
  air_date: string;
  still_path: string | null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ seasonId: string }> }
) {
  const { seasonId } = await context.params;

  // 1. Fetch season data (to get series_id and season order)
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("series_id, order")
    .eq("id", seasonId)
    .single();

  if (seasonError || !season?.series_id || !season?.order) {
    return NextResponse.json({ error: "Missing season or series info" }, { status: 400 });
  }

  // 2. Fetch TMDB ID of the series
  const { data: series, error: seriesError } = await supabase
    .from("series")
    .select("tmdb_id")
    .eq("id", season.series_id)
    .single();

  if (seriesError || !series?.tmdb_id) {
    return NextResponse.json({ error: "Missing TMDB ID for series" }, { status: 400 });
  }

  // 3. Fetch episodes from TMDB
  const apiKey = process.env.TMDB_API_KEY;
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/tv/${series.tmdb_id}/season/${season.order}?api_key=${apiKey}`
  );
  const tmdbData = await tmdbRes.json();

  if (!tmdbData.episodes || !Array.isArray(tmdbData.episodes)) {
    return NextResponse.json({ error: "No episodes found in TMDB response" }, { status: 404 });
  }

  // 4. Map and return the episodes (not saving to DB)
  const episodes = (tmdbData.episodes as TMDBEpisode[]).map((ep) => ({
    title: ep.name,
    description: ep.overview,
    episode_number: ep.episode_number,
    season_number: season.order,
    video_url: "",
    release_date: ep.air_date,
    published: true,
    premium: false,
    thumbnail_url: ep.still_path ? `https://image.tmdb.org/t/p/original${ep.still_path}` : null,
  }));

  return NextResponse.json({ episodes });
}