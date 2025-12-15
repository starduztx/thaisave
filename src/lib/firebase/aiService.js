// File: src/lib/aiService.js
// Location: Logic สำหรับเชื่อมต่อ AI (Hugging Face) + ระบบปลุก AI (Retry Logic)

const HF_API_KEY = process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN; 
const MODEL_ID = "google/vit-base-patch16-224"; 
const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

/**
 * ฟังก์ชันช่วย: รอเวลา (Sleep)
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ฟังก์ชันหลัก: ส่งรูปไปวิเคราะห์ (พร้อมระบบ Auto Retry)
 * @param {File} imageFile - ไฟล์รูปจาก <input type="file">
 */
export async function analyzeDisasterImage(imageFile) {
  // 1. เช็ค API Key ก่อนเลย
  if (!HF_API_KEY) {
    console.error("❌ ไม่พบ API Key: กรุณาตรวจสอบ .env.local");
    // กรณีไม่มี Key ให้ User กรอกเอง
    return { type: 'Other', label: '', confidence: 0 };
  }

  try {
    // 2. แปลงไฟล์รูปเป็น Binary
    const imageBlob = await imageFile.arrayBuffer();

    // 3. เริ่มกระบวนการส่ง (ลองได้สูงสุด 3 ครั้ง)
    let retries = 3;
    
    while (retries > 0) {
      console.log(`📡 กำลังส่งข้อมูลไปหา AI... (เหลือโควตาลองใหม่ ${retries} ครั้ง)`);
      
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
        method: "POST",
        body: imageBlob,
      });

      // กรณี: AI กำลังโหลด (503) -> รอแล้วลองใหม่
      if (response.status === 503) {
        const errorData = await response.json();
        const waitTime = errorData.estimated_time || 5; // ถ้าระบบไม่บอกเวลารอ ให้รอ 5 วิ
        
        console.warn(`⏳ AI กำลังตื่น... รออีก ${waitTime} วินาที`);
        await delay(waitTime * 1000);
        retries--;
        continue; // วนลูปใหม่
      }

      // กรณี: 401 Unauthorized (Token ผิด)
      if (response.status === 401) {
         throw new Error("Token ไม่ถูกต้อง (401 Unauthorized)");
      }

      // กรณี: Error อื่นๆ
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      // กรณี: สำเร็จ (200 OK)
      const result = await response.json();
      console.log("🤖 AI ตอบกลับมาว่า:", result);
      
      // แปลผลและส่งกลับทันที
      return interpretResult(result);
    }

    // ถ้าวนลูปจนครบแล้วยังไม่ได้
    throw new Error("AI Timeout (ลองหลายครั้งแล้วไม่ตอบสนอง)");

  } catch (error) {
    console.error("🚨 AI Error Final:", error);
    // ปรับแก้: คืนค่า label เป็นว่าง "" เพื่อให้หน้าเว็บเปิดช่องให้ User พิมพ์ระบุเอง
    return { type: 'Other', label: '', confidence: 0 };
  }
}

/**
 * ฟังก์ชันแปลผล: แปลงคำศัพท์ AI เป็นประเภทภัยพิบัติ
 * ใช้ระบบคะแนน (Weighted Scoring)
 */
function interpretResult(predictions) {
  if (!Array.isArray(predictions)) {
    // กรณีข้อมูลผิดพลาด ก็ให้ User กรอกเอง
    return { type: 'Other', label: '', confidence: 0 };
  }

  let scores = {
    Flood: 0,
    Fire: 0,
    Storm: 0,
    Traffic: 0
  };

  const keywords = {
    Flood: [
      { word: 'water', weight: 1 }, { word: 'flood', weight: 2 }, 
      { word: 'lake', weight: 1.5 }, { word: 'river', weight: 1 },
      { word: 'sea', weight: 1 }, { word: 'ocean', weight: 1 },
      { word: 'dam', weight: 2 }, { word: 'puddle', weight: 2 },
      { word: 'seashore', weight: 1 }, { word: 'coast', weight: 1 }
    ],
    Fire: [
      { word: 'fire', weight: 3 }, { word: 'flame', weight: 3 },
      { word: 'smoke', weight: 2 }, { word: 'volcano', weight: 2 },
      { word: 'burning', weight: 3 }, { word: 'heat', weight: 1 },
      { word: 'stove', weight: 1 }
    ],
    Storm: [
      { word: 'rubble', weight: 3 }, { word: 'debris', weight: 3 },
      { word: 'ruin', weight: 2 }, { word: 'wreck', weight: 2 },
      { word: 'cliff', weight: 1 }, { word: 'storm', weight: 3 },
      { word: 'tree', weight: 0.5 }, { word: 'wind', weight: 1 }
    ],
    Traffic: [
       { word: 'car', weight: 1 }, { word: 'traffic', weight: 2 },
       { word: 'crash', weight: 2 }, { word: 'street', weight: 1 },
       { word: 'highway', weight: 1 }
    ]
  };

  // คำนวณคะแนน
  predictions.forEach(pred => {
    const label = pred.label ? pred.label.toLowerCase() : '';
    const score = pred.score || 0;

    Object.keys(keywords).forEach(category => {
      keywords[category].forEach(k => {
        if (label.includes(k.word)) {
          scores[category] += (k.weight * score);
        }
      });
    });
  });

  // หาผู้ชนะ
  const winner = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  const maxScore = scores[winner];

  console.log("📊 คะแนนความมั่นใจ:", scores);

  // Threshold 0.2: ต้องมั่นใจเกิน 20% ถึงจะฟันธง
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
      confidence: Math.round(Math.min(maxScore * 100, 99)) // ไม่ให้เกิน 99%
    };
  }

  // ปรับแก้: ถ้าคะแนนต่ำหรือไม่มั่นใจ ให้ส่ง label ว่าง "" กลับไป
  // เพื่อให้ UI แสดงเป็นช่องว่างให้คนใช้พิมพ์เอง
  return { type: 'Other', label: '', confidence: 0 };
}