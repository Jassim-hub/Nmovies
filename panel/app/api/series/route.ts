import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { verifyAdminRequest } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  // SECURITY: Verify the caller is an authenticated admin
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) return auth.response;

  // List all series from the database
  const { data, error } = await supabase
    .from("series")
    .select("id, title, description, cover_image_url, published, release_date, created_at");

  if (error) {
    console.error('Series GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch series' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  // SECURITY: Verify the caller is an authenticated admin
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.response;

  // Import a series from TMDB (expects JSON body)
  const body = await req.json();
  const { title, description, cover_image_url, release_date, published = false } = body;

  const { data, error } = await supabase.from("series").insert([
    { title, description, cover_image_url, release_date, published }
  ]);

  if (error) {
    console.error('Series POST error:', error);
    return NextResponse.json({ error: 'Failed to create series' }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}