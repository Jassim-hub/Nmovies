import { NextRequest, NextResponse } from 'next/server'
import { searchTMDBTV } from '@/lib/tmdb-fetchers'

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

    // Search via Reelplexi
    const data = await searchTMDBTV(query)

    // Transform data
    const animes = (data.results || [])
      .slice(0, 20)
      .map((item: any) => ({
        id: item.id,
        title: item.name,
        description: item.overview,
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        backdrop_url: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
        thumbnail_medium: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null,
        rating: item.vote_average,
        release_date: item.first_air_date,
        genre: item.genre_ids || [],
        year: item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : null,
        published: true,
        trending: false,
        popular: true,
        recommend: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        media_type: 'anime' as const
      }))

    return NextResponse.json(animes)
  } catch (error) {
    console.error('Error in anime search API:', error)
    return NextResponse.json(
      { error: 'Failed to search anime' },
      { status: 500 }
    )
  }
}