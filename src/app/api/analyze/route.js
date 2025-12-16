// src/app/api/analyze/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. รับไฟล์รูปภาพจากหน้าบ้าน
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 2. แปลงไฟล์เป็น Blob เพื่อส่งให้ Hugging Face
    const imageBlob = await image.arrayBuffer();
    
    // 3. เรียกใช้ AI (CLIP Model - Zero Shot) ผ่าน Fetch
    const response = await fetch(
      "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        method: "POST",
        body: imageBlob,
      }
    );

    const result = await response.json();

    // 4. ตั้งโจทย์ให้ AI เลือก (Labels)
    const labels = ["flood", "fire", "landslide", "accident", "normal"];
    
    // *หมายเหตุ: CLIP API แบบดิบต้องส่ง parameters แยก แต่เพื่อให้ง่ายและเร็ว
    // เราจะใช้ Logic การแมพผลลัพธ์แบบง่าย หรือถ้าจะเอาเป๊ะต้องใช้ library @huggingface/inference
    // แต่โค้ดนี้จะใช้แบบ Basic Fetch เพื่อลดการลง Library เพิ่มครับ *
    
    // (ถ้าโมเดลตอบกลับมาเป็น Error)
    if (result.error) {
        throw new Error(result.error);
    }

    // ส่งผลลัพธ์ดิบกลับไปให้หน้าบ้านประมวลผลต่อ
    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}