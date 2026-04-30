import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  // List all series from the database
  const { data, error } = await supabase
    .from("series")
    .select("id, title, description, cover_image_url, published, release_date, created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  // Import a series from TMDB (expects JSON body)
  const body = await req.json();
  const { title, description, cover_image_url, release_date, published = false } = body;

  const { data, error } = await supabase.from("series").insert([
    { title, description, cover_image_url, release_date, published }
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}