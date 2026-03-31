// --- 1. HÀM TẢI ẢNH (Bảo đảm không lỗi nút) ---
function downloadImg() {
    const img = document.getElementById('result-image');
    if (!img || !img.src || img.classList.contains('hidden')) return alert("Chưa có ảnh kết quả để tải sếp ơi!");
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'Sieu-Pham-FF-Cua-An.jpg';
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
    const progressFill = document.querySelector('.progress-fill');
    const loadingText = document.querySelector('.loading-state p');

    // Móc API Key
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
                    canvas.width = 1600; canvas.height = (img.height / img.width) * 1600;
                    canvas.getContext('2d').drawImage(img, 0, 0, 1600, canvas.height);
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1] });
                };
            };
        });
    };

    generateBtn.onclick = async () => {
        const API_KEY = apiKeyInput.value.trim();
        if (!API_KEY) return alert("Sếp nhập mã Key đi!");
        const validFiles = selectedFiles.filter(f => f !== null);
        if (validFiles.length < 3) return alert("Sếp up đủ 3 ảnh (Nền, Prime, Kho đồ) nhé!");

        generateBtn.disabled = true;
        document.getElementById('result-section').classList.remove('hidden');
        loadingState.classList.remove('hidden');
        resultImage.classList.add('hidden');
        document.getElementById('result-actions').classList.add('hidden');
        
        if(progressFill) progressFill.style.width = '20%';
        if(loadingText) loadingText.textContent = "AI đang soi cấp độ...";

        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            // ==========================================
            // PHẦN 1: AI ĐỌC SỐ (Dùng Gemini 2.5 Flash)
            // ==========================================
            const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
            const prompt = "Soi ảnh 1 lấy số Level góc trái trên. Soi ảnh 2 lấy số nhỏ trong vương miện (BỎ QUA PRIME TO). Trả về: LEVEL [Số] - VIP [Số].";

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
            });

            const data = await res.json();
            if (res.ok && data.candidates) {
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            }

            if(progressFill) progressFill.style.width = '60%';
            if(loadingText) loadingText.textContent = "Đang dập nổi 3D & Hiệu ứng chiến trường...";

            // ==========================================
            // PHẦN 2: CANVAS VẼ SIÊU PHẨM
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

            // 1. Dán tấm Nền chiếm TẤT CẢ DIỆN TÍCH
            ctx.drawImage(imgBg, 0, 0, imgBg.width, imgBg.height, 0, 0, W, H);

            // 2. YÊU CẦU 1: LÀM MỜ/TỐI NỀN ĐỂ NỔI BẬT THẺ CHÍNH 
            const gradDark = ctx.createLinearGradient(W * 0.2, 0, W, 0); // Làm tối từ 20% màn hình
            gradDark.addColorStop(0, 'rgba(0,0,0,0.1)'); 
            gradDark.addColorStop(0.4, 'rgba(0,0,0,0.7)'); // Giữa màn hình bắt đầu tối đậm
            gradDark.addColorStop(1, 'rgba(0,0,0,0.9)'); // Che hẳn phần UI thừa bên phải
            ctx.fillStyle = gradDark;
            ctx.fillRect(0, 0, W, H);

            // 3. YÊU CẦU 3: HIỆU ỨNG CHIẾN TRƯỜNG (LỬA & ĐẠN BAY) 
            const drawAmbientWarzone = () => {
                ctx.save();
                // Tia lửa
                for (let i = 0; i < 40; i++) {
                    const x = Math.random() * W; const y = Math.random() * H;
                    const length = Math.random() * 30 + 10; const angle = Math.random() * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
                    const colors = ['#ffffff', '#ffeb3b', '#ff9800', '#ff5722'];
                    ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
                    ctx.lineWidth = Math.random() * 3 + 1;
                    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = Math.random() * 15 + 5;
                    ctx.globalAlpha = Math.random() * 0.7 + 0.3;
                    ctx.stroke();
                }
                // Vỏ đạn bay 3D
                for (let i = 0; i < 6; i++) {
                    const x = Math.random() * W; const y = Math.random() * (H * 0.9);
                    const scale = Math.random() * 1.2 + 0.4; const rot = Math.random() * Math.PI * 2;
                    ctx.save();
                    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
                    ctx.globalAlpha = Math.random() * 0.5 + 0.3;
                    ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
                    // Thân đạn
                    let brass = ctx.createLinearGradient(0, -6, 0, 6);
                    brass.addColorStop(0, '#a67c00'); brass.addColorStop(0.5, '#f9d423'); brass.addColorStop(1, '#a67c00');
                    ctx.fillStyle = brass; ctx.beginPath(); ctx.rect(-15, -6, 30, 12); ctx.fill();
                    // Mũi nhọn
                    let copper = ctx.createLinearGradient(15, -6, 15, 6);
                    copper.addColorStop(0, '#8b5a2b'); copper.addColorStop(0.5, '#cd853f'); copper.addColorStop(1, '#8b5a2b');
                    ctx.fillStyle = copper; ctx.beginPath();
                    ctx.moveTo(15, -6); ctx.lineTo(25, -2); ctx.lineTo(25, 2); ctx.lineTo(15, 6); ctx.closePath(); ctx.fill();
                    ctx.restore();
                }
                ctx.restore();
            };
            drawAmbientWarzone();

            // 4. CẮT & VẼ 2 THẺ NỔI BẬT [cite: 54-79]
            // Xén bỏ các menu thừa để thẻ gọn gàng
            const cr1 = { sx: imgPrime.width * 0.175, sy: imgPrime.height * 0.05, sw: imgPrime.width * 0.825, sh: imgPrime.height * 0.90 };
            const cr2 = { sx: imgWeapons.width * 0.18, sy: imgWeapons.height * 0.175, sw: imgWeapons.width * 0.81, sh: imgWeapons.height * 0.80 };
            
            const availH = H * 0.90 - (H * 0.03);
            const ratioPrime = cr1.sh / cr1.sw; const ratioWeapons = cr2.sh / cr2.sw;
            const dw = availH / (ratioPrime + ratioWeapons);
            const dh1 = dw * ratioPrime; const dh2 = dw * ratioWeapons;
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
                // Bóng 3D
                ctx.save(); createPath();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 35; ctx.shadowOffsetX = -10; ctx.shadowOffsetY = 15;
                ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
                // Ráp ảnh
                ctx.save(); createPath(); ctx.clip();
                ctx.drawImage(srcImg, cr.sx, cr.sy, cr.sw, cr.sh, rx, ry, rw, rh); ctx.restore();
                // Viền vàng rực
                ctx.save(); createPath(); ctx.lineWidth = 5;
                const goldGlow = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
                goldGlow.addColorStop(0, '#f9d423'); goldGlow.addColorStop(0.5, '#ffd700'); goldGlow.addColorStop(1, '#ff4e50');
                ctx.strokeStyle = goldGlow; ctx.stroke(); ctx.restore();
            };

            drawVipCard(imgPrime, cr1, dx, dy1, dw, dh1);
            drawVipCard(imgWeapons, cr2, dx, dy2, dw, dh2);

            // 5. YÊU CẦU 2: BĂNG RÔN ESPORTS 3D CHO CHỮ LEVEL - VIP 
            ctx.save();
            let fontSize = Math.floor(H * 0.075); // Cho chữ to hẳn lên
            ctx.font = `italic 900 ${fontSize}px "Arial Black", sans-serif`;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            const textX = W * 0.055; const textY = H * 0.90;
            const textWidth = ctx.measureText(vipSlogan).width;
            const paddingX = fontSize * 1.5; const paddingY = fontSize * 1.5;

            // Nền Băng Rôn Cắt Xiên
            const ribbonW = textWidth + paddingX; const ribbonH = fontSize + paddingY;
            const ribbonX = textX - paddingX / 2.5; const ribbonY = textY - ribbonH / 2;
            ctx.translate(ribbonX, ribbonY); ctx.transform(1, 0, -0.35, 1, 0, 0); // Kéo xiên 3D
            ctx.beginPath(); ctx.rect(0, 0, ribbonW, ribbonH);
            ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 25; ctx.shadowOffsetX = 15; ctx.shadowOffsetY = 15;
            ctx.fillStyle = 'rgba(10, 10, 10, 0.85)'; ctx.fill(); // Kính mờ đen
            
            // Viền Băng Rôn Đỏ Vàng
            ctx.shadowBlur = 0;
            const ribbonBorder = ctx.createLinearGradient(0, 0, ribbonW, ribbonH);
            ribbonBorder.addColorStop(0, '#f9d423'); ribbonBorder.addColorStop(1, '#ff4e50');
            ctx.lineWidth = Math.floor(H * 0.005); ctx.strokeStyle = ribbonBorder; ctx.stroke();
            ctx.restore();

            // Lõi Chữ Vàng 24K Trong Băng Rôn
            ctx.shadowColor = '#000'; ctx.shadowBlur = 15; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 5;
            const textGradient = ctx.createLinearGradient(0, textY - fontSize / 2, 0, textY + fontSize / 2);
            textGradient.addColorStop(0, '#f9d423'); 
            textGradient.addColorStop(0.5, '#ffffff'); // Sáng lóa ở giữa
            textGradient.addColorStop(1, '#ff4e50');
            
            ctx.miterLimit = 2; ctx.lineWidth = fontSize * 0.15; ctx.strokeStyle = '#000'; // Đổ viền đen dày
            ctx.strokeText(vipSlogan, textX, textY);
            ctx.shadowBlur = 0; ctx.fillStyle = textGradient;
            ctx.fillText(vipSlogan, textX, textY);
            ctx.restore();

            // ==========================================
            // XUẤT ẢNH
            // ==========================================
            if(progressFill) progressFill.style.width = '100%';
            if(loadingText) loadingText.textContent = "Hoàn tất đóng gói!";
            
            setTimeout(() => {
                loadingState.classList.add('hidden');
                resultImage.src = canvas.toDataURL('image/jpeg', 0.95);
                resultImage.classList.remove('hidden');
                document.getElementById('result-actions').classList.remove('hidden');
                generateBtn.disabled = false;
            }, 500);

        } catch (error) {
            alert("Lỗi tạo ảnh: " + error.message);
            loadingState.classList.add('hidden'); generateBtn.disabled = false;
        }
    };
});
