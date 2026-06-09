import { NextRequest, NextResponse } from 'next/server'
import { searchTMDBMovies } from '@/lib/tmdb-fetchers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Search English movies via Reelplexi
    const data = await searchTMDBMovies(query)

    // Transform data
    const englishMovies = (data.results || [])
      .slice(0, 20)
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.overview,
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
        thumbnail_medium: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null,
        rating: item.vote_average,
        release_date: item.release_date,
        genre: item.genre_ids || [],
        year: item.release_date ? new Date(item.release_date).getFullYear().toString() : null,
        published: true,
        trending: false,
        popular: true,
        recommend: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        media_type: 'movie' as const
      }))

    return NextResponse.json(englishMovies)
  } catch (error) {
    console.error('Error in English movies search API:', error)
    return NextResponse.json(
      { error: 'Failed to search English movies' },
      { status: 500 }
    )
  }
}