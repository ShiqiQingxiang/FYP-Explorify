// @ts-nocheck - Deno uses URL imports that TypeScript doesn't recognize
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'

serve(async (req) => {
  try {
    // 获取请求数据
    const body = await req.json()
    console.log('Received request:', JSON.stringify(body))
    
    // 简单返回成功结果，模拟图像识别
    return new Response(
      JSON.stringify({
        success: true,
        isCompleted: true,
        confidence: 95,
        matchedLabels: ["warrior", "terracotta", "statue"],
        testMode: true
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 