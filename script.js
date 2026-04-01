// --- 1. HÀM TẢI ẢNH ---
function downloadImg() {
    const img = document.getElementById('result-image');
    if (!img || !img.src || img.classList.contains('hidden')) return alert("Chưa có ảnh kết quả để tải sếp ơi!");
    const link = document.createElement('a');
    link.href = img.src; link.download = 'Sieu-Pham-FF-By-An.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 2. LOGIC XỬ LÝ CHÍNH ---
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const loadingState = document.getElementById('loading-state');
    const resultImage = document.getElementById('result-image');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const uploadSlots = document.querySelectorAll('.upload-slot');

    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
    }

    saveKeyBtn.onclick = () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
            alert("Đã lưu mã API thành công!");
        }
    };

    const selectedFiles = [null, null, null, null];
    uploadSlots.forEach((slot, index) => {
        const input = slot.querySelector('input[type="file"]');
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedFiles[index] = file;
                const r = new FileReader();
                r.onload = (ev) => {
                    slot.querySelector('.preview').src = ev.target.result;
                    slot.querySelector('.preview').classList.remove('hidden');
                    slot.querySelector('.placeholder').classList.add('hidden');
                };
                r.readAsDataURL(file);
            }
        };
        slot.onclick = () => input.click();
    });

    const fileToAI = (file) => {
        return new Promise((resolve) => {
            const r = new FileReader();
            r.readAsDataURL(file);
            r.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Tăng độ phân giải lên 2200px để AI soi chữ siêu nhỏ rõ mồn một
                    canvas.width = 2200; canvas.height = (img.height / img.width) * 2200;
                    canvas.getContext('2d', {alpha: false}).drawImage(img, 0, 0, 2200, canvas.height);
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.98).split(',')[1] });
                };
            };
        });
    };

    generateBtn.onclick = async () => {
        const API_KEY = apiKeyInput.value.trim();
        if (!API_KEY) return alert("Sếp chưa nhập mã Key!");
        const validFiles = selectedFiles.filter(f => f !== null);
        if (validFiles.length < 3) return alert("Sếp up đủ 3 ảnh (Nền, Prime, Súng) nhé!");

        generateBtn.disabled = true;
        document.getElementById('result-section').classList.remove('hidden');
        loadingState.classList.remove('hidden');
        resultImage.classList.add('hidden');
        document.getElementById('result-actions').classList.add('hidden');
        
        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
            
            // --- PROMPT CẤP ĐỘ "TỔ PHỤC" (Fix lỗi báo sai VIP 1) ---
            const prompt = `HÀNH ĐỘNG BẮT BUỘC:
            1. Soi ảnh 1: Tìm số sau chữ 'LV.' (Ví dụ LV.65 lấy 65).
            2. Soi ảnh 2: Tuyệt đối không nhìn số to ở giữa. Nhìn thanh màu vàng dưới chữ PRIME.
               - Nếu có chữ 'để về Prime 4' hoặc 'để về Prime [Số]': VIP BẮT BUỘC LÀ SỐ ĐÓ (Ví dụ VIP 4).
               - Nếu không có chữ 'để về' mà chỉ có 'tích lũy để đạt', lấy số Prime đang hiện.
            TRẢ VỀ DUY NHẤT DẠNG: LEVEL 65 - VIP 4 (Cấm thêm chữ khác).`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
            });

            const data = await res.json();
            
            // Kiểm tra lỗi từ API (Nếu Key hỏng hoặc bị khóa)
            if (data.error) {
                throw new Error("Mã Key có vấn đề: " + data.error.message);
            }

            if (res.ok && data.candidates && data.candidates[0].content.parts[0].text) {
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            } else {
                throw new Error("AI không trả về kết quả. Hãy thử lại!");
            }

            // --- PHẦN VẼ ẢNH (GIỮ NGUYÊN DECOR CỦA SẾP) ---
            const imageObjects = await Promise.all(validFiles.map(f => new Promise(r => { 
                const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(f); 
            })));
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const imgBg = imageObjects[0];
            const imgPrime = imageObjects[1];
            const imgWeapons = imageObjects[2];

            let H = imgBg.height; let W = imgBg.width;
            if (H > 1440) { W = (1440 / H) * W; H = 1440; }
            canvas.width = W; canvas.height = H;

            ctx.drawImage(imgBg, 0, 0, imgBg.width, imgBg.height, 0, 0, W, H);
            const gradDark = ctx.createLinearGradient(W * 0.2, 0, W, 0);
            gradDark.addColorStop(0, 'rgba(0,0,0,0.1)'); 
            gradDark.addColorStop(0.5, 'rgba(0,0,0,0.6)');
            gradDark.addColorStop(1, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = gradDark;
            ctx.fillRect(0, 0, W, H);

            const cr1 = { sx: imgPrime.width * 0.175, sy: imgPrime.height * 0.05, sw: imgPrime.width * 0.825, sh: imgPrime.height * 0.90 };
            const cr2 = { sx: imgWeapons.width * 0.18, sy: imgWeapons.height * 0.175, sw: imgWeapons.width * 0.81, sh: imgWeapons.height * 0.80 };
            const availH = H * 0.90 - (H * 0.03);
            const ratioPrime = cr1.sh / cr1.sw;
            const ratioWeapons = cr2.sh / cr2.sw;
            const dw = availH / (ratioPrime + ratioWeapons);
            const dh1 = dw * ratioPrime;
            const dh2 = dw * ratioWeapons;
            const dx = W - dw - (W * 0.03);
            const dy1 = H * 0.05; const dy2 = dy1 + dh1 + (H * 0.03);

            const drawVipCard = (srcImg, cr, rx, ry, rw, rh) => {
                const radius = 18;
                const createPath = () => {
                    ctx.beginPath();
                    ctx.moveTo(rx + radius, ry); ctx.lineTo(rx + rw - radius, ry);
                    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
                    ctx.lineTo(rx + rw, ry + rh - radius);
                    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
                    ctx.lineTo(rx + radius, ry + rh);
                    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
                    ctx.lineTo(rx, ry + radius);
                    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
                    ctx.closePath();
                };
                ctx.save(); createPath();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 35;
                ctx.shadowOffsetX = -10; ctx.shadowOffsetY = 15;
                ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
                ctx.save(); createPath(); ctx.clip();
                ctx.drawImage(srcImg, cr.sx, cr.sy, cr.sw, cr.sh, rx, ry, rw, rh); ctx.restore();
                ctx.save(); createPath(); ctx.lineWidth = 5;
                const goldGlow = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
                goldGlow.addColorStop(0, '#f9d423'); goldGlow.addColorStop(1, '#ff4e50');
                ctx.strokeStyle = goldGlow; ctx.stroke(); ctx.restore();
            };

            drawVipCard(imgPrime, cr1, dx, dy1, dw, dh1);
            drawVipCard(imgWeapons, cr2, dx, dy2, dw, dh2);

            ctx.save();
            const fontSize = Math.floor(H * 0.08);
            ctx.font = `italic 900 ${fontSize}px "Arial Black", Impact, sans-serif`;
            ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            const textWidth = ctx.measureText(vipSlogan).width;
            const paddingX = fontSize * 1.5; const paddingY = fontSize * 1.0;
            const bannerW = textWidth + (paddingX * 2);
            const bannerH = fontSize + paddingY;
            const startX = -20;
            const startY = H - bannerH - (H * 0.05);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + bannerW + (bannerH * 0.4), startY);
            ctx.lineTo(startX + bannerW, startY + bannerH);
            ctx.lineTo(startX, startY + bannerH);
            ctx.closePath();
            ctx.fillStyle = 'rgba(10, 10, 10, 0.85)'; ctx.fill();
            ctx.lineWidth = 6;
            const borderGrad = ctx.createLinearGradient(startX, startY, startX + bannerW, startY + bannerH);
            borderGrad.addColorStop(0, '#f9d423'); borderGrad.addColorStop(1, '#ff4e50');
            ctx.strokeStyle = borderGrad; ctx.stroke();

            const textX = startX + paddingX;
            const textY = startY + (bannerH / 2) + (fontSize * 0.05);
            ctx.shadowColor = 'rgba(0, 0, 0, 1)'; ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 6;
            ctx.lineWidth = 10; ctx.strokeStyle = '#000000';
            ctx.strokeText(vipSlogan, textX, textY);
            ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            const textGrad = ctx.createLinearGradient(0, textY - fontSize/2, 0, textY + fontSize/2);
            textGrad.addColorStop(0, '#ffffff'); textGrad.addColorStop(0.5, '#fff176'); textGrad.addColorStop(1, '#ffb300');
            ctx.fillStyle = textGrad; ctx.fillText(vipSlogan, textX, textY);
            ctx.restore();

            setTimeout(() => {
                loadingState.classList.add('hidden');
                resultImage.src = canvas.toDataURL('image/jpeg', 0.95);
                resultImage.classList.remove('hidden');
                document.getElementById('result-actions').classList.remove('hidden');
                generateBtn.disabled = false;
            }, 500);

        } catch (error) {
            alert("LỖI RỒI SẾP: " + error.message);
            loadingState.classList.add('hidden'); generateBtn.disabled = false;
        }
    };
});
