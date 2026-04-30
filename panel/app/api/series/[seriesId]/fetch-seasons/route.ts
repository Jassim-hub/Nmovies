import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Define the TMDB season type
interface TMDBSeason {
  name: string;
  season_number: number;
  episode_count: number;
  overview: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await context.params;

  // 1. Get the TMDB ID for this series from your DB
  const { data: series, error: seriesError } = await supabase
    .from("series")
    .select("tmdb_id")
    .eq("id", seriesId)
    .single();

  if (seriesError || !series?.tmdb_id) {
    return NextResponse.json({ error: "No TMDB ID found for this series" }, { status: 400 });
  }

  // 2. Fetch from TMDB
  const apiKey = process.env.TMDB_API_KEY;
  const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${series.tmdb_id}?api_key=${apiKey}`);
  const tmdbData = await tmdbRes.json();

  if (!tmdbData.seasons) {
    return NextResponse.json({ error: "No seasons found in TMDB response" }, { status: 404 });
  }

  // 3. Return seasons (do NOT save to DB)
  const seasons = (tmdbData.seasons as TMDBSeason[]).map((season) => ({
    name: season.name,
    order: season.season_number,
    episode_count: season.episode_count,
    overview: season.overview,
    published: true, 
  }));

  return NextResponse.json({ seasons });
}