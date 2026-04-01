// --- 1. HÀM TẢI ẢNH --- [cite: 1]
function downloadImg() {
    const img = document.getElementById('result-image'); [cite: 1]
    if (!img || !img.src || img.classList.contains('hidden')) return alert("Chưa có ảnh kết quả để tải sếp ơi!"); [cite: 2]
    const link = document.createElement('a'); [cite: 2]
    link.href = img.src; link.download = 'Sieu-Pham-FF-By-An.jpg'; [cite: 3]
    document.body.appendChild(link); [cite: 3]
    link.click(); [cite: 3]
    document.body.removeChild(link); [cite: 3]
}

// --- 2. LOGIC XỬ LÝ CHÍNH --- [cite: 3]
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn'); [cite: 3]
    const loadingState = document.getElementById('loading-state'); [cite: 3]
    const resultImage = document.getElementById('result-image'); [cite: 3]
    const apiKeyInput = document.getElementById('api-key-input'); [cite: 3]
    const saveKeyBtn = document.getElementById('save-key-btn'); [cite: 3]
    const uploadSlots = document.querySelectorAll('.upload-slot'); [cite: 3]

    if (localStorage.getItem('gemini_api_key')) { [cite: 3]
        apiKeyInput.value = localStorage.getItem('gemini_api_key'); [cite: 3]
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu'; [cite: 3]
    }

    saveKeyBtn.onclick = () => { [cite: 3, 4]
        const key = apiKeyInput.value.trim(); [cite: 4]
        if (key) { [cite: 4]
            localStorage.setItem('gemini_api_key', key); [cite: 4]
            saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu'; [cite: 4]
            alert("Đã lưu mã API thành công!"); [cite: 4]
        }
    };

    const selectedFiles = [null, null, null, null]; [cite: 4]
    uploadSlots.forEach((slot, index) => { [cite: 5]
        const input = slot.querySelector('input[type="file"]'); [cite: 5]
        input.onchange = (e) => { [cite: 5]
            const file = e.target.files[0]; [cite: 5]
            if (file) { [cite: 5]
                selectedFiles[index] = file; [cite: 5]
                const r = new FileReader(); [cite: 5]
                r.onload = (ev) => { [cite: 6]
                    slot.querySelector('.preview').src = ev.target.result; [cite: 6]
                    slot.querySelector('.preview').classList.remove('hidden'); [cite: 6]
                    slot.querySelector('.placeholder').classList.add('hidden'); [cite: 6]
                };
                r.readAsDataURL(file); [cite: 7]
            }
        };
        slot.onclick = () => input.click(); [cite: 7]
    });

    const fileToAI = (file) => { [cite: 8]
        return new Promise((resolve) => { [cite: 8]
            const r = new FileReader(); [cite: 8]
            r.readAsDataURL(file); [cite: 8]
            r.onload = (e) => { [cite: 8]
                const img = new Image(); [cite: 8]
                img.src = e.target.result; [cite: 8]
                img.onload = () => { [cite: 9]
                    const canvas = document.createElement('canvas'); [cite: 9]
                    // Nâng lên 2000px để AI nhìn rõ chữ nhỏ ở thanh tiến trình
                    canvas.width = 2000; canvas.height = (img.height / img.width) * 2000; [cite: 9]
                    canvas.getContext('2d').drawImage(img, 0, 0, 2000, canvas.height); [cite: 9]
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.95).split(',')[1] }); [cite: 10]
                };
            };
        });
    };

    generateBtn.onclick = async () => { [cite: 11]
        const API_KEY = apiKeyInput.value.trim(); [cite: 11]
        if (!API_KEY) return alert("Sếp chưa nhập mã Key!"); [cite: 12]
        const validFiles = selectedFiles.filter(f => f !== null); [cite: 12]
        if (validFiles.length < 3) return alert("Sếp up đủ 3 ảnh (Nền, Prime, Súng) nhé!"); [cite: 13]

        generateBtn.disabled = true; [cite: 13]
        document.getElementById('result-section').classList.remove('hidden'); [cite: 13]
        loadingState.classList.remove('hidden'); [cite: 13]
        resultImage.classList.add('hidden'); [cite: 13]
        document.getElementById('result-actions').classList.add('hidden'); [cite: 14]
        
        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            // --- 1. AI ĐỌC LEVEL & VIP (LOGIC FIX) ---
            const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
            
            // Ép AI soi thanh tiến trình màu vàng
            const prompt = "NHIỆM VỤ: Đọc chỉ số từ ảnh Free Fire.\n" +
                           "1. Ảnh 1: Lấy số Level sau chữ 'LV.'.\n" +
                           "2. Ảnh 2: Soi kỹ thanh tiến trình màu vàng dưới chữ PRIME.\n" +
                           "- Nếu thấy chữ 'để về Prime [Số]': Lấy [Số] đó làm VIP (Ví dụ: 'để về Prime 4' thì VIP là 4). Tuyệt đối bỏ qua số Prime to đang hiện.\n" +
                           "- Nếu thấy chữ 'để đạt Prime [Số]': Lấy số Prime to đang hiển thị làm VIP.\n" +
                           "Trả về đúng mẫu: LEVEL [Số] - VIP [Số]. Không giải thích gì thêm.";

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
            });

            const data = await res.json(); [cite: 17]
            if (res.ok && data.candidates) { [cite: 17]
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, ''); [cite: 17]
            }

            // --- 2. VẼ CANVAS --- [cite: 18]
            const imageObjects = await Promise.all(validFiles.map(f => new Promise(r => { 
                const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(f); 
            }))); [cite: 19]
            
            const canvas = document.createElement('canvas'); [cite: 19]
            const ctx = canvas.getContext('2d'); [cite: 19]
            const imgBg = imageObjects[0]; [cite: 19]
            const imgPrime = imageObjects[1]; [cite: 20]
            const imgWeapons = imageObjects[2]; [cite: 20]

            let H = imgBg.height; let W = imgBg.width; [cite: 20]
            if (H > 1440) { W = (1440 / H) * W; H = 1440; } [cite: 21, 22]
            canvas.width = W; canvas.height = H; [cite: 22]

            ctx.drawImage(imgBg, 0, 0, imgBg.width, imgBg.height, 0, 0, W, H); [cite: 23]
            const gradDark = ctx.createLinearGradient(W * 0.2, 0, W, 0); [cite: 24]
            gradDark.addColorStop(0, 'rgba(0,0,0,0.1)'); 
            gradDark.addColorStop(0.5, 'rgba(0,0,0,0.6)');
            gradDark.addColorStop(1, 'rgba(0,0,0,0.9)'); [cite: 25]
            ctx.fillStyle = gradDark; [cite: 25]
            ctx.fillRect(0, 0, W, H); [cite: 25]

            const cr1 = { sx: imgPrime.width * 0.175, sy: imgPrime.height * 0.05, sw: imgPrime.width * 0.825, sh: imgPrime.height * 0.90 }; [cite: 26]
            const cr2 = { sx: imgWeapons.width * 0.18, sy: imgWeapons.height * 0.175, sw: imgWeapons.width * 0.81, sh: imgWeapons.height * 0.80 }; [cite: 27]
            const availH = H * 0.90 - (H * 0.03); [cite: 28]
            const ratioPrime = cr1.sh / cr1.sw; [cite: 28]
            const ratioWeapons = cr2.sh / cr2.sw; [cite: 29]
            const dw = availH / (ratioPrime + ratioWeapons); [cite: 29]
            const dh1 = dw * ratioPrime; [cite: 29]
            const dh2 = dw * ratioWeapons; [cite: 30]
            const dx = W - dw - (W * 0.03); [cite: 30]
            const dy1 = H * 0.05; const dy2 = dy1 + dh1 + (H * 0.03); [cite: 31]

            const drawVipCard = (srcImg, cr, rx, ry, rw, rh) => { [cite: 32]
                const radius = 18; [cite: 32]
                const createPath = () => { [cite: 33]
                    ctx.beginPath(); [cite: 33]
                    ctx.moveTo(rx + radius, ry); ctx.lineTo(rx + rw - radius, ry); [cite: 34]
                    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius); [cite: 34]
                    ctx.lineTo(rx + rw, ry + rh - radius); [cite: 35]
                    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh); [cite: 35]
                    ctx.lineTo(rx + radius, ry + rh); [cite: 36]
                    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius); [cite: 36]
                    ctx.lineTo(rx, ry + radius); [cite: 36]
                    ctx.quadraticCurveTo(rx, ry, rx + radius, ry); [cite: 37]
                    ctx.closePath(); [cite: 37]
                };
                ctx.save(); createPath(); [cite: 37]
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 35; [cite: 37]
                ctx.shadowOffsetX = -10; ctx.shadowOffsetY = 15; [cite: 38]
                ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); [cite: 38]
                ctx.save(); createPath(); ctx.clip(); [cite: 38]
                ctx.drawImage(srcImg, cr.sx, cr.sy, cr.sw, cr.sh, rx, ry, rw, rh); ctx.restore(); [cite: 39]
                ctx.save(); createPath(); ctx.lineWidth = 5; [cite: 39]
                const goldGlow = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh); [cite: 40]
                goldGlow.addColorStop(0, '#f9d423'); goldGlow.addColorStop(1, '#ff4e50'); [cite: 40]
                ctx.strokeStyle = goldGlow; ctx.stroke(); ctx.restore(); [cite: 40]
            };

            drawVipCard(imgPrime, cr1, dx, dy1, dw, dh1); [cite: 41]
            drawVipCard(imgWeapons, cr2, dx, dy2, dw, dh2); [cite: 41]

            // --- 3. VẼ CHỮ LEVEL - VIP --- [cite: 42]
            ctx.save(); [cite: 42]
            const fontSize = Math.floor(H * 0.08); [cite: 43]
            ctx.font = `italic 900 ${fontSize}px "Arial Black", Impact, sans-serif`; [cite: 44]
            ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; [cite: 44]
            const textWidth = ctx.measureText(vipSlogan).width; [cite: 45]
            const paddingX = fontSize * 1.5; const paddingY = fontSize * 1.0; [cite: 46, 47]
            const bannerW = textWidth + (paddingX * 2); [cite: 47]
            const bannerH = fontSize + paddingY; [cite: 48]
            const startX = -20; const startY = H - bannerH - (H * 0.05); [cite: 48, 49]

            ctx.beginPath(); [cite: 50]
            ctx.moveTo(startX, startY); [cite: 51]
            ctx.lineTo(startX + bannerW + (bannerH * 0.4), startY); [cite: 51]
            ctx.lineTo(startX + bannerW, startY + bannerH); [cite: 52]
            ctx.lineTo(startX, startY + bannerH); [cite: 53]
            ctx.closePath(); [cite: 54]

            ctx.fillStyle = 'rgba(10, 10, 10, 0.85)'; ctx.fill(); [cite: 54, 55]
            ctx.lineWidth = 6; [cite: 55]
            const borderGrad = ctx.createLinearGradient(startX, startY, startX + bannerW, startY + bannerH); [cite: 56]
            borderGrad.addColorStop(0, '#f9d423'); borderGrad.addColorStop(1, '#ff4e50'); [cite: 56]
            ctx.strokeStyle = borderGrad; ctx.stroke(); [cite: 56]

            const textX = startX + paddingX; [cite: 57]
            const textY = startY + (bannerH / 2) + (fontSize * 0.05); [cite: 58]
            ctx.shadowColor = 'rgba(0, 0, 0, 1)'; ctx.shadowBlur = 15; [cite: 59, 60]
            ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 6; [cite: 60]
            ctx.lineWidth = 10; ctx.strokeStyle = '#000000'; [cite: 60, 61]
            ctx.strokeText(vipSlogan, textX, textY); [cite: 61]

            ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; [cite: 61, 62]
            const textGrad = ctx.createLinearGradient(0, textY - fontSize/2, 0, textY + fontSize/2); [cite: 62]
            textGrad.addColorStop(0, '#ffffff'); textGrad.addColorStop(0.5, '#fff176'); [cite: 63]
            textGrad.addColorStop(1, '#ffb300'); [cite: 64, 65]
            ctx.fillStyle = textGrad; [cite: 65]
            ctx.fillText(vipSlogan, textX, textY); [cite: 66]
            ctx.restore(); [cite: 66]

            setTimeout(() => { [cite: 66]
                loadingState.classList.add('hidden'); [cite: 67]
                resultImage.src = canvas.toDataURL('image/jpeg', 0.95); [cite: 67]
                resultImage.classList.remove('hidden'); [cite: 67]
                document.getElementById('result-actions').classList.remove('hidden'); [cite: 67]
                generateBtn.disabled = false; [cite: 67]
            }, 500); [cite: 67]
        } catch (error) { [cite: 68]
            alert("Lỗi phần mềm: " + error.message); [cite: 68]
            loadingState.classList.add('hidden'); generateBtn.disabled = false; [cite: 69]
        }
    };
});    uploadSlots.forEach((slot, index) => {
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
                    // Tăng độ phân giải lên 2000px để AI nhìn chữ nhỏ rõ hơn
                    canvas.width = 2000; 
                    canvas.height = (img.height / img.width) * 2000;
                    canvas.getContext('2d').drawImage(img, 0, 0, 2000, canvas.height);
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.95).split(',')[1] });
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
            
            // --- PROMPT SIÊU GẮT (UPDATE) ---
            const prompt = `NHIỆM VỤ: Đọc chỉ số từ ảnh Free Fire.
            1. Ảnh 1: Lấy số LEVEL sau chữ 'LV.' (Ví dụ: LV.65 thì là LEVEL 65).
            2. Ảnh 2: Tập trung nhìn vào THANH TIẾN TRÌNH màu vàng nằm dưới chữ PRIME 1.
               - Nếu thấy dòng chữ 'để về Prime [X]' (Ví dụ: 'để về Prime 4'): VIP PHẢI LÀ X. Tuyệt đối không lấy số 1 to tướng.
               - Nếu thấy dòng chữ 'để đạt Prime [X]': VIP là con số lớn đang hiển thị (Số 1).
            TRẢ VỀ ĐÚNG MẪU: LEVEL [Số] - VIP [Số]. Không giải thích gì thêm.`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
            });

            const data = await res.json();
            if (res.ok && data.candidates) {
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            }

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
            alert("Lỗi phần mềm: " + error.message);
            loadingState.classList.add('hidden'); generateBtn.disabled = false;
        }
    };
});
