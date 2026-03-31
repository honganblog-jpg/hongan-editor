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
                    canvas.width = 1600; canvas.height = (img.height / img.width) * 1600;
                    canvas.getContext('2d').drawImage(img, 0, 0, 1600, canvas.height);
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1] });
                };
            };
        });
    };

    generateBtn.onclick = async () => {
        const API_KEY = apiKeyInput.value.trim();
        if (!API_KEY) return alert("Sếp chưa nhập mã Key!");
        const validFiles = selectedFiles.filter(f => f !== null);
        if (validFiles.length < 3) return alert("Sếp up đủ 3 ảnh nhé!");

        generateBtn.disabled = true;
        document.getElementById('result-section').classList.remove('hidden');
        loadingState.classList.remove('hidden');
        resultImage.classList.add('hidden');
        document.getElementById('result-actions').classList.add('hidden');
        
        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            // AI ĐỌC SỐ
            const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
            const prompt = "Soi ảnh 1 lấy số Level góc trái trên. Soi ảnh 2 lấy số nhỏ trong vương miện (BỎ QUA PRIME TO). Trả về đúng mẫu: LEVEL [Số] - VIP [Số].";

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
            });

            const data = await res.json();
            if (res.ok && data.candidates) {
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            }

            // VẼ CANVAS
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

            // 1. Vẽ nền
            ctx.drawImage(imgBg, 0, 0, imgBg.width, imgBg.height, 0, 0, W, H);

            // 2. Phủ sương đen làm mờ nền
            const gradDark = ctx.createLinearGradient(W * 0.2, 0, W, 0);
            gradDark.addColorStop(0, 'rgba(0,0,0,0.1)'); 
            gradDark.addColorStop(0.5, 'rgba(0,0,0,0.6)');
            gradDark.addColorStop(1, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = gradDark;
            ctx.fillRect(0, 0, W, H);

            // 3. Vẽ hiệu ứng tia lửa
            ctx.save();
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * W; const y = Math.random() * H;
                const length = Math.random() * 25 + 10; const angle = Math.random() * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
                const colors = ['#ffffff', '#ffeb3b', '#ff9800'];
                ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.lineWidth = Math.random() * 3 + 1;
                ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
                ctx.globalAlpha = Math.random() * 0.6 + 0.2;
                ctx.stroke();
            }
            ctx.restore();

            // 4. Tính toán và vẽ 2 thẻ
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
                ctx.save(); createPath();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; ctx.shadowBlur = 35; ctx.shadowOffsetX = -10; ctx.shadowOffsetY = 15;
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

            // =========================================================
            // 5. VẼ BĂNG RÔN & CHỮ LEVEL (CHUẨN DEMO 24234.jpg)
            // =========================================================
            ctx.save();
            
            // Cài đặt Font chữ siêu to
            let fontSize = Math.floor(H * 0.075);
            ctx.font = `italic 900 ${fontSize}px "Arial Black", "Impact", sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Đo chiều rộng chữ để vẽ khung vừa vặn
            const textWidth = ctx.measureText(vipSlogan).width;
            
            // Kích thước khung (Padding)
            const paddingX = fontSize * 1.2;
            const paddingY = fontSize * 0.8;
            const bannerH = fontSize + paddingY * 2;
            const bannerW = textWidth + paddingX * 2;
            const slant = W * 0.06; // Độ chéo của cạnh phải
            
            // Vị trí khung (Góc dưới cùng bên trái)
            const startX = 0; 
            const startY = H - bannerH - (H * 0.02);

            // Vẽ Đường dẫn (Path) cho hình thang nghiêng
            ctx.beginPath();
            ctx.moveTo(startX, startY); // Góc trên trái
            ctx.lineTo(startX + bannerW + slant, startY); // Góc trên phải (nhô ra tạo độ nghiêng)
            ctx.lineTo(startX + bannerW, startY + bannerH); // Góc dưới phải (thụt vào)
            ctx.lineTo(startX, startY + bannerH); // Góc dưới trái
            ctx.closePath();

            // Đổ nền đen mờ cho khung
            ctx.fillStyle = 'rgba(15, 15, 15, 0.9)';
            ctx.fill();

            // Bo viền Gradient Đỏ - Vàng cho khung
            const borderGrad = ctx.createLinearGradient(startX, startY, startX + bannerW + slant, startY + bannerH);
            borderGrad.addColorStop(0, '#f9d423'); // Vàng
            borderGrad.addColorStop(1, '#ff4e50'); // Đỏ
            ctx.lineWidth = Math.floor(H * 0.008);
            ctx.strokeStyle = borderGrad;
            ctx.stroke();

            // Đổ bóng cho chữ bên trong
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;

            // Màu gradient cho chữ (Trắng ngà sang Vàng)
            const textGrad = ctx.createLinearGradient(0, startY, 0, startY + bannerH);
            textGrad.addColorStop(0, '#ffffff');
            textGrad.addColorStop(0.5, '#fff176'); // Vàng nhạt
            textGrad.addColorStop(1, '#ffb300'); // Vàng cam
            
            ctx.fillStyle = textGrad;
            
            // In chữ ra giữa khung
            ctx.fillText(vipSlogan, startX + paddingX, startY + bannerH / 2 + (fontSize * 0.05));
            
            ctx.restore();
            // =========================================================

            // Xuất ảnh
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
