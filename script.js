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

    // FIX 1: Thêm lớp bảo vệ, nếu sếp có đổi ID trong HTML thì code cũng không bị sập
    if (apiKeyInput && saveKeyBtn) {
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
    }

    const selectedFiles = [null, null, null, null];
    
    // FIX 2: Bọc chống lỗi cho slot up ảnh
    if (uploadSlots) {
        uploadSlots.forEach((slot, index) => {
            const input = slot.querySelector('input[type="file"]');
            if (input) {
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        selectedFiles[index] = file;
                        const r = new FileReader();
                        r.onload = (ev) => {
                            const preview = slot.querySelector('.preview');
                            const placeholder = slot.querySelector('.placeholder');
                            if (preview) { preview.src = ev.target.result; preview.classList.remove('hidden'); }
                            if (placeholder) { placeholder.classList.add('hidden'); }
                        };
                        r.readAsDataURL(file);
                    }
                };
                slot.onclick = () => input.click();
            }
        });
    }

    const fileToAI = (file) => {
        return new Promise((resolve) => {
            const r = new FileReader();
            r.readAsDataURL(file);
            r.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1600; canvas.height = (img.height / img.width) * 1600;
                    canvas.getContext('2d').drawImage(img, 0, 0, 1600, canvas.height);
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1] });
                };
            };
        });
    };

    if (generateBtn) {
        generateBtn.onclick = async () => {
            const API_KEY = apiKeyInput ? apiKeyInput.value.trim() : "";
            if (!API_KEY) return alert("Sếp chưa nhập mã Key!");
            
            const validFiles = selectedFiles.filter(f => f !== null);
            if (validFiles.length < 3) return alert("Sếp up đủ 3 ảnh (Nền, Prime, Súng) nhé!");

            generateBtn.disabled = true;
            if (document.getElementById('result-section')) document.getElementById('result-section').classList.remove('hidden');
            if (loadingState) loadingState.classList.remove('hidden');
            if (resultImage) resultImage.classList.add('hidden');
            if (document.getElementById('result-actions')) document.getElementById('result-actions').classList.add('hidden');
            
            let vipSlogan = "LEVEL ? - VIP ?";

            try {
                // ==========================================
                // 1. AI ĐỌC SỐ
                // ==========================================
                const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
                
                // CÂU LỆNH MỚI: Chỉ soi dòng chữ nhỏ, cấm AI nhìn số to.
                const prompt = "Soi ảnh 1 lấy số Level góc trái trên. Soi ảnh 2: Tuyệt đối BỎ QUA số Prime to ở giữa. Hãy nhìn dòng chữ nhỏ ở thanh màu vàng dưới chữ PRIME. Nếu có chữ 'để về Prime [Số]' thì VIP là [Số] đó. Nếu có chữ 'để đạt Prime' thì VIP là số to đang hiện. Trả về đúng mẫu: LEVEL [Số] - VIP [Số].";
                
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
                });
                
                const data = await res.json();
                
                // Báo lỗi rõ ràng nếu Key sai hoặc lỗi mạng
                if (data.error) {
                    throw new Error(data.error.message);
                }

                if (res.ok && data.candidates && data.candidates.length > 0) {
                    vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
                }

                // ==========================================
                // 2. VẼ CANVAS
                // ==========================================
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
                
                // Dán Nền
                ctx.drawImage(imgBg, 0, 0, imgBg.width, imgBg.height, 0, 0, W, H);
                
                // Phủ kính mờ tối nền
                const gradDark = ctx.createLinearGradient(W * 0.2, 0, W, 0);
                gradDark.addColorStop(0, 'rgba(0,0,0,0.1)'); 
                gradDark.addColorStop(0.5, 'rgba(0,0,0,0.6)');
                gradDark.addColorStop(1, 'rgba(0,0,0,0.9)');
                ctx.fillStyle = gradDark;
                ctx.fillRect(0, 0, W, H);
                
                // Vẽ thẻ Prime & Kho Đồ
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
                
                // ==========================================
                // 3. VẼ CHỮ LEVEL - VIP SIÊU TO KHỔNG LỒ
                // ==========================================
                ctx.save();
                const fontSize = Math.floor(H * 0.08);
                ctx.font = `italic 900 ${fontSize}px "Arial Black", Impact, sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                
                const textWidth = ctx.measureText(vipSlogan).width;
                const paddingX = fontSize * 1.5; 
                const paddingY = fontSize * 1.0; 
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

                ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
                ctx.fill();
                
                ctx.lineWidth = 6;
                const borderGrad = ctx.createLinearGradient(startX, startY, startX + bannerW, startY + bannerH);
                borderGrad.addColorStop(0, '#f9d423');
                borderGrad.addColorStop(1, '#ff4e50');
                ctx.strokeStyle = borderGrad;
                ctx.stroke();
                
                const textX = startX + paddingX;
                const textY = startY + (bannerH / 2) + (fontSize * 0.05);
                
                ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 6;
                ctx.shadowOffsetY = 6;

                ctx.lineWidth = 10;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(vipSlogan, textX, textY);

                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                const textGrad = ctx.createLinearGradient(0, textY - fontSize/2, 0, textY + fontSize/2);
                textGrad.addColorStop(0, '#ffffff'); 
                textGrad.addColorStop(0.5, '#fff176'); 
                textGrad.addColorStop(1, '#ffb300'); 
                ctx.fillStyle = textGrad;
                ctx.fillText(vipSlogan, textX, textY);
                
                ctx.restore();

                // ==========================================
                // XUẤT ẢNH
                // ==========================================
                setTimeout(() => {
                    if (loadingState) loadingState.classList.add('hidden');
                    if (resultImage) {
                        resultImage.src = canvas.toDataURL('image/jpeg', 0.95);
                        resultImage.classList.remove('hidden');
                    }
                    if (document.getElementById('result-actions')) document.getElementById('result-actions').classList.remove('hidden');
                    generateBtn.disabled = false;
                }, 500);
            } catch (error) {
                // FIX 3: Nếu AI lỗi, nó sẽ hiện thông báo cho sếp biết luôn
                alert("LỖI RỒI SẾP: " + error.message);
                if (loadingState) loadingState.classList.add('hidden'); 
                generateBtn.disabled = false;
            }
        };
    }
});
