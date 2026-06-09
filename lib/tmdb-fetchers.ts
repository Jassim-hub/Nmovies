import * as Reelplexi from './reelplexi'
import type { TMDBMovie, TMDBTVShow, TMDBTrendingItem, TMDBSeason, TMDBMovieDetails, TMDBTVDetails, TMDBEpisode } from './types/tmdb'

// Mappers to convert Reelplexi types to TMDB types
const mapMovieToTMDB = (r: any): TMDBMovie => ({
  id: r.id,
  title: r.title,
  overview: r.description,
  poster_path: r.thumbnail_url?.replace('https://image.tmdb.org/t/p/w500', '') || null,
  backdrop_path: r.cover_image_url?.replace('https://image.tmdb.org/t/p/original', '') || null,
  release_date: r.release_date,
  vote_average: 8.0, // Mock
  vote_count: 1000,
  popularity: 100,
  adult: false,
  original_language: 'en',
  original_title: r.title,
  genre_ids: [1], // Mock
  video: true,
  runtime: r.duration || 120,
  media_type: 'movie'
});

const mapSeriesToTMDB = (r: any): TMDBTVShow => ({
  id: r.id,
  name: r.title,
  overview: r.description,
  poster_path: r.thumbnail_url?.replace('https://image.tmdb.org/t/p/w500', '') || null,
  backdrop_path: r.cover_image_url?.replace('https://image.tmdb.org/t/p/original', '') || null,
  first_air_date: r.release_date,
  vote_average: 8.0, // Mock
  vote_count: 1000,
  popularity: 100,
  adult: false,
  original_language: 'en',
  original_name: r.title,
  genre_ids: [1], // Mock
  origin_country: ['US'],
  number_of_seasons: r.seasons?.length || 1,
  media_type: 'tv'
});

export async function getPopularMovies() {
  const data = await Reelplexi.getReelplexiTrendingMovies(1, 20);
  return { results: data.map(mapMovieToTMDB) };
}

export async function getPopularTV() {
  const data = await Reelplexi.getReelplexiTrendingSeries(1, 20);
  return { results: data.map(mapSeriesToTMDB) };
}

export async function getPopularAnimations() {
  const data = await Reelplexi.getReelplexiMoviesByGenre('animation', 1, 50);
  return data.map(mapMovieToTMDB);
}

export async function getPopularAnimationsForSlider() {
  const data = await getPopularAnimations();
  return data.slice(0, 20);
}

export async function getTrending() {
  const data = await Reelplexi.getReelplexiTrendingAll(1, 20);
  return data.map((item: any) => item.type === 'movie' ? mapMovieToTMDB(item) : mapSeriesToTMDB(item));
}

export async function getTrendingForSlider() {
  const data = await getTrending();
  return data.slice(0, 20);
}

export async function getLatestMovies() {
  const data = await Reelplexi.getReelplexiMovies(1, 50);
  return data.map(mapMovieToTMDB);
}

export async function getLatestMoviesForSlider() {
  const data = await getLatestMovies();
  return data.slice(0, 20);
}

export async function getLatestSeries() {
  const data = await Reelplexi.getReelplexiSeries(1, 50);
  return data.map(mapSeriesToTMDB);
}

export async function getLatestSeriesForSlider() {
  const data = await getLatestSeries();
  return data.slice(0, 20);
}

export async function getAnime() {
  const data = await Reelplexi.getReelplexiSeriesByGenre('anime', 1, 50);
  return data.map(mapSeriesToTMDB);
}

export async function getAnimeForSlider() {
  const data = await getAnime();
  return data.slice(0, 20);
}

export async function getTMDBMovieDetails(movieId: string): Promise<TMDBMovieDetails> {
  const movie = await Reelplexi.getReelplexiMovieById(movieId);
  if (!movie) throw new Error("Movie not found");
  
  return {
    ...mapMovieToTMDB(movie),
    runtime: movie.duration || 120,
    belongs_to_collection: null,
    budget: 0,
    homepage: '',
    imdb_id: '',
    production_companies: [],
    production_countries: [],
    revenue: 0,
    spoken_languages: [],
    status: 'Released',
    tagline: '',
    genres: (movie.genre_ids || []).map((g: string, i: number) => ({ id: i, name: g }))
  };
}

export async function getTMDBTVDetails(tvId: string): Promise<TMDBTVDetails> {
  const tv = await Reelplexi.getReelplexiSeriesById(tvId);
  if (!tv) throw new Error("Series not found");
  
  // We'll mock the seasons using a single season for now
  // Real implementation would fetch seasons if Reelplexi provided them
  const episodes = await Reelplexi.getReelplexiEpisodes(tvId, 1);
  const tmdbEpisodes: TMDBEpisode[] = episodes.map((ep: any) => ({
    id: ep.id,
    name: ep.title,
    overview: ep.description,
    vote_average: 8.0,
    vote_count: 100,
    air_date: ep.created_at,
    episode_number: ep.episode_number,
    production_code: '',
    runtime: ep.duration || 45,
    season_number: 1,
    show_id: tvId as any,
    still_path: ep.thumbnail_url?.replace('https://image.tmdb.org/t/p/original', '') || null
  }));

  const seasons: TMDBSeason[] = [{
    id: `${tvId}:season:1`,
    name: "Season 1",
    overview: "",
    poster_path: null,
    season_number: 1,
    episode_count: episodes.length,
    air_date: tv.release_date,
    episodes: tmdbEpisodes
  }];

  return {
    ...mapSeriesToTMDB(tv),
    created_by: [],
    episode_run_time: [45],
    homepage: '',
    in_production: false,
    languages: ['en'],
    last_air_date: tv.release_date,
    last_episode_to_air: tmdbEpisodes[tmdbEpisodes.length - 1] || null,
    next_episode_to_air: null,
    networks: [],
    production_companies: [],
    production_countries: [],
    seasons: seasons,
    spoken_languages: [],
    status: 'Returning Series',
    tagline: '',
    type: 'Scripted',
    genres: (tv.genre_ids || []).map((g: string, i: number) => ({ id: i, name: g }))
  };
}

export async function getSimilarMovies(movieId: string) {
  const data = await Reelplexi.getReelplexiRelatedMoviesByGenre(movieId, 1, 10);
  return data.map(mapMovieToTMDB);
}

export async function getSimilarTV(tvId: string) {
  const data = await Reelplexi.getReelplexiRelatedSeriesByGenre(tvId, 1, 10);
  return data.map(mapSeriesToTMDB);
}

export async function searchTMDBMovies(query: string) {
  const data = await Reelplexi.getReelplexiMovies(1, 50);
  const filtered = data.filter((m: any) => 
    m.title.toLowerCase().includes(query.toLowerCase())
  );
  return { results: filtered.map(mapMovieToTMDB) };
}

export async function searchTMDBTV(query: string) {
  const data = await Reelplexi.getReelplexiSeries(1, 50);
  const filtered = data.filter((s: any) => 
    s.title.toLowerCase().includes(query.toLowerCase())
  );
  return { results: filtered.map(mapSeriesToTMDB) };
}
