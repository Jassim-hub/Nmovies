const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Define types for TMDB API responses
interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: Array<{
    id: number;
    name: string;
  }>;
  // Add other movie properties as needed
}

interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  // Add other video properties as needed
}

interface TMDBTVSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  // Add other TV series properties as needed
}

interface TMDBSearchResults {
  page: number;
  results: Array<TMDBMovie | TMDBTVSeries>;
  total_pages: number;
  total_results: number;
}

export async function fetchTMDB<T = unknown>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}/${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY!);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB fetch failed: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Fetch a movie by TMDB ID
export async function getMovieById(id: string): Promise<TMDBMovie> {
  return fetchTMDB<TMDBMovie>(`movie/${id}`);
}

// Fetch a movie's trailers
export async function getMovieTrailers(id: string): Promise<{ results: TMDBVideo[] }> {
  return fetchTMDB<{ results: TMDBVideo[] }>(`movie/${id}/videos`);
}

// Fetch a TV series by TMDB ID
export async function getSeriesById(id: string): Promise<TMDBTVSeries> {
  return fetchTMDB<TMDBTVSeries>(`tv/${id}`);
}

// Fetch a TV series' trailers
export async function getSeriesTrailers(id: string): Promise<{ results: TMDBVideo[] }> {
  return fetchTMDB<{ results: TMDBVideo[] }>(`tv/${id}/videos`);
}

// Search movies/TV shows
export async function searchTMDB(query: string): Promise<TMDBSearchResults> {
  return fetchTMDB<TMDBSearchResults>('search/multi', { query });
}