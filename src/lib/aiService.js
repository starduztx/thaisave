// File: src/lib/aiService.js
// Location: Logic สำหรับเชื่อมต่อ AI (Hugging Face)

const HF_API_KEY = process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN; // ต้องไปใส่ใน .env.local
const MODEL_ID = "google/vit-base-patch16-224"; // โมเดลสายตาดี (Vision Transformer)
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

/**
 * ฟังก์ชันหลัก: ส่งรูปไปวิเคราะห์
 * @param {File} imageFile - ไฟล์รูปจาก <input type="file">
 * @returns {Promise<Object>} - ผลลัพธ์ { type: 'Flood', confidence: 95, label: 'น้ำท่วม' }
 */
export async function analyzeDisasterImage(imageFile) {
  if (!HF_API_KEY) {
    console.error("❌ ไม่พบ API Key: กรุณาตั้งค่า NEXT_PUBLIC_HF_ACCESS_TOKEN ใน .env.local");
    // Return Mock Data แทน เพื่อให้เว็บไม่พังตอน Dev
    return { type: 'Unknown', label: 'ไม่ระบุ (No API Key)', confidence: 0 };
  }

  try {
    // 1. แปลงไฟล์รูปเป็น Binary (Blob)
    const imageBlob = await imageFile.arrayBuffer();

    // 2. ส่งไป Hugging Face
    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/octet-stream",
      },
      method: "POST",
      body: imageBlob,
    });

    if (!response.ok) {
      throw new Error("AI API Error: " + response.statusText);
    }

    const result = await response.json();
    console.log("🤖 AI Raw Result:", result);

    // 3. เข้าสู่กระบวนการแปลผล (Smart Logic)
    return interpretResult(result);

  } catch (error) {
    console.error("🚨 AI Error:", error);
    return { type: 'Error', label: 'เกิดข้อผิดพลาด', confidence: 0 };
  }
}

/**
 * ฟังก์ชันแปลผล: แปลงคำศัพท์ AI เป็นประเภทภัยพิบัติ
 * ใช้ระบบคะแนน (Weighted Scoring) เพื่อความแม่นยำ
 */
function interpretResult(predictions) {
  let scores = {
    Flood: 0,
    Fire: 0,
    Storm: 0, // รวมดินถล่ม/พายุ
    Traffic: 0
  };

  // คลังคำศัพท์และคะแนน
  const keywords = {
    Flood: [
      { word: 'water', weight: 1 }, { word: 'flood', weight: 2 }, 
      { word: 'lake', weight: 1.5 }, { word: 'river', weight: 1 },
      { word: 'sea', weight: 1 }, { word: 'ocean', weight: 1 },
      { word: 'sandbar', weight: 2 }, { word: 'boathouse', weight: 2 },
      { word: 'dam', weight: 2 }, { word: 'puddle', weight: 2 }
    ],
    Fire: [
      { word: 'fire', weight: 3 }, { word: 'flame', weight: 3 },
      { word: 'smoke', weight: 2 }, { word: 'volcano', weight: 2 },
      { word: 'burning', weight: 3 }, { word: 'heat', weight: 1 }
    ],
    Storm: [ // ดินถล่ม พายุ ต้นไม้ล้ม
      { word: 'rubble', weight: 3 }, { word: 'debris', weight: 3 },
      { word: 'ruin', weight: 2 }, { word: 'wreck', weight: 2 },
      { word: 'cliff', weight: 1 }, { word: 'valley', weight: 1 },
      { word: 'alp', weight: 1 }, { word: 'storm', weight: 3 },
      { word: 'tree', weight: 0.5 }, { word: 'wind', weight: 1 }
    ]
  };

  // คำนวณคะแนนจาก Top 5 predictions
  predictions.forEach(pred => {
    const label = pred.label.toLowerCase();
    const score = pred.score;

    Object.keys(keywords).forEach(category => {
      keywords[category].forEach(k => {
        if (label.includes(k.word)) {
          scores[category] += (k.weight * score);
        }
      });
    });
  });

  // หาผู้ชนะ (Category ที่คะแนนเยอะสุด)
  const winner = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  const maxScore = scores[winner];

  console.log("📊 AI Scores:", scores);

  // ตัดสินใจส่งค่ากลับ
  // Threshold 0.2: ถ้าคะแนนน้อยมากๆ ถือว่าไม่มั่นใจ
  if (maxScore > 0.2) {
    const labelMap = {
      'Flood': 'อุทกภัย (น้ำท่วม)',
      'Fire': 'อัคคีภัย (ไฟไหม้)',
      'Storm': 'วาตภัย/ดินถล่ม',
      'Traffic': 'อุบัติเหตุ'
    };
    return { 
      type: winner, 
      label: labelMap[winner], 
      confidence: Math.round(maxScore * 100) 
    };
  }

  return { type: 'Other', label: 'อื่นๆ (ระบุเอง)', confidence: 0 };
}