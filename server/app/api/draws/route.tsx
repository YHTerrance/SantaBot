import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server';
import { saveDraw } from '../actions';

/*
export async function POST() {

  const current_time = Date.now()

  let draw = {
    id: "0x7c7467075a5a7f0cd1f3945668c9577336a13e8d",
    created_at: current_time,
    deadline: current_time + 3 * 24 * 60 * 60 * 1000, // Set deadline to be due in 3 days
    criteria: "like",
    total_awardees: 2,
    token: "USDC",
    total_award: 100,
    awardees: [],
    author: "yhterrance",
    status: 0, // 0: "open", 1: "closed"
  }

  await saveDraw(draw);

  return NextResponse.json({
    message: "Draw created successfully",
    draw_id: draw.id
  })
}
*/

export async function GET() {
  const user = await kv.hgetall('draw:0x7c7467075a5a7f0cd1f3945668c9577336a13e8d');
  return NextResponse.json(user);
}

