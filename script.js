// HÀM TẢI ẢNH (Bảo đảm không nằm trong ngoặc nào khác)
function downloadImg() {
    const canvas = document.createElement('canvas'); // Dummy check
    const img = document.getElementById('result-image');
    let linkTai = '';

    if (img && img.src && !img.classList.contains('hidden') && img.src !== window.location.href) {
        linkTai = img.src;
    }

    if (!linkTai) {
        alert("Chưa có ảnh kết quả để tải sếp ơi! Sếp nhớ bấm 'Ghép ảnh' trước nhé.");
        return;
    }

    const link = document.createElement('a');
    link.href = linkTai;
    link.download = 'Sieu-Pham-FF-Cua-An.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const uploadSlots = document.querySelectorAll('.upload-slot');
    const generateBtn = document.getElementById('generate-btn');
    const resultSection = document.getElementById('result-section');
    const loadingState = document.getElementById('loading-state');
    const progressFill = document.querySelector('.progress-fill');
    const loadingText = document.querySelector('.loading-state p');
    const resultImage = document.getElementById('result-image');
    const resultActions = document.getElementById('result-actions');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');

    // Móc dữ liệu API Key đã lưu
    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
        saveKeyBtn.style.color = 'var(--primary-green)';
        saveKeyBtn.style.borderColor = 'var(--primary-green)';
    }

    // Sự kiện Lưu Key
    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
            saveKeyBtn.style.color = 'var(--primary-green)';
            saveKeyBtn.style.borderColor = 'var(--primary-green)';
            alert('Đã lưu mã Key thành công!');
        } else {
            alert('Vui lòng nhập Key trước khi lưu!');
        }
    });

    apiKeyInput.addEventListener('input', () => {
        saveKeyBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Lưu Mã';
        saveKeyBtn.style.color = '';
        saveKeyBtn.style.borderColor = '';
    });

    const selectedFiles = [null, null, null, null];

    uploadSlots.forEach((slot, index) => {
        const input = slot.querySelector('input[type="file"]');
        const preview = slot.querySelector('.preview');
        const placeholder = slot.querySelector('.placeholder');
        const removeBtn = slot.querySelector('.remove-btn');

        slot.addEventListener('click', (e) => {
            if (e.target !== removeBtn && e.target !== removeBtn.querySelector('i')) {
                input.click();
            }
        });

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                selectedFiles[index] = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    preview.src = ev.target.result;
                    preview.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                    removeBtn.classList.remove('hidden');
                    slot.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });

        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = '';
            selectedFiles[index] = null;
            preview.src = '';
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
            removeBtn.classList.add('hidden');
            slot.classList.remove('has-image');
        });
    });

    // Nén ảnh nâng cao để AI soi mượt (Nâng max lên 1600 để soi số VIP)
    const fileToBase64 = (file, maxWidth = 1600) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

                    resolve({
                        mimeType: 'image/jpeg',
                        data: dataUrl.split(',')[1]
                    });
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    };

    // === TÍNH NĂNG GHÉP ẢNH ===
    generateBtn.addEventListener('click', async () => {
        const API_KEY = apiKeyInput ? apiKeyInput.value.trim() : "";

        if (!API_KEY) {
            alert("LỖI: Vui lòng dán Gemini API Key vào mục '0. Cấu hình hệ thống'!");
            if (apiKeyInput) apiKeyInput.focus();
            return;
        }

        const validFiles = selectedFiles.filter(f => f !== null);

        if (validFiles.length < 3) {
            alert("Sếp cần up đủ 3 ảnh nha (Nền, Prime, Súng)!");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> ĐANG TRÍCH XUẤT...';
        resultSection.classList.remove('hidden');
        loadingState.classList.remove('hidden');
        resultImage.classList.add('hidden');
        resultActions.classList.add('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        progressFill.style.width = '20%';
        loadingText.textContent = "AI Vision đang soi Cấp độ và Tinh túy của bạn (Chờ 2-3s)...";

        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            // AI Đọc Level và Cấp (OCR)
            const base64Img1 = await fileToBase64(validFiles[0]);
            const base64Img2 = await fileToBase64(validFiles[1]);

            const prompt = "Nhiệm vụ: 1. Soi số 'Level' ở góc trái trên cùng ảnh 1. 2. Ở ảnh 2, BỎ QUA SỐ PRIME LỚN. Hãy tìm con số nhỏ nằm trong biểu tượng vương miện/huy hiệu VIP (con số nhỏ nhất, ví dụ VIP 3). Trả về kết quả duy nhất theo định dạng: LEVEL [Số] - VIP [Số]. Ví dụ: LEVEL 55 - VIP 4";
            
            const payload = {
                contents: [{ parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Img1.data } },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Img2.data } }
                ]}]
            };

            // DÙNG GEMINI 2.5 FLASH ĐỂ KHÔNG BỊ LỖI 404
            const geminiCall = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const geminiData = await geminiCall.json();
            
            if (geminiCall.ok && geminiData.candidates && geminiData.candidates[0].content) {
                vipSlogan = geminiData.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            } else if (!geminiCall.ok) {
                alert("AI báo lỗi sếp ơi: " + (geminiData.error ? geminiData.error.message : "Quá tải"));
            }

            // Parse File Image
            progressFill.style.width = '40%';
            loadingText.textContent = "Khởi động Máy Chập Layout Kính Mờ...";
            const imageObjects = await Promise.all(validFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error("Lỗi làm nét file " + file.name));
                    img.src = URL.createObjectURL(file);
                });
            }));

            // THUẬT TOÁN CANVAS CỦA SẾP
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const imgBg = imageObjects[0];
            const imgPrime = imageObjects[1];
            const imgWeapons = imageObjects[2];

            let H = imgBg.height;
            let W = imgBg.width;
            if (H > 1440) { W = (1440 / H) * W; H = 1440; }
            canvas.width = W; canvas.height = H;

            // 1. Dán Tấm nền
            ctx.drawImage(imgBg, 0, 0, imgBg.width, imgBg.height, 0, 0, W, H);

            // 2. Tráng kính mờ
            const gradDark = ctx.createLinearGradient(W * 0.4, 0, W, 0);
            gradDark.addColorStop(0, 'rgba(0,0,0,0)'); 
            gradDark.addColorStop(0.5, 'rgba(0,0,0,0.6)');
            gradDark.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = gradDark;
            ctx.fillRect(W * 0.4, 0, W * 0.6, H);

            // 3. Dao cắt thông minh
            const cr1 = { sx: imgPrime.width * 0.175, sy: imgPrime.height * 0.05, sw: imgPrime.width * 0.825, sh: imgPrime.height * 0.90 };
            const cr2 = { sx: imgWeapons.width * 0.18, sy: imgWeapons.height * 0.175, sw: imgWeapons.width * 0.81, sh: imgWeapons.height * 0.80 };

            // 4. Tính toán Căn Lề
            const availH = H * 0.90 - (H * 0.03);
            const ratioPrime = cr1.sh / cr1.sw;
            const ratioWeapons = cr2.sh / cr2.sw;
            const dw = availH / (ratioPrime + ratioWeapons);
            const dh1 = dw * ratioPrime; const dh2 = dw * ratioWeapons;
            const dx = W - dw - (W * 0.03);
            const dy1 = H * 0.05; const dy2 = dy1 + dh1 + (H * 0.03);

            // 5. Hàm Vẽ Thẻ (Giữ nguyên siêu phẩm của sếp)
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
                goldGlow.addColorStop(0, '#f9d423'); goldGlow.addColorStop(0.5, '#ffd700'); goldGlow.addColorStop(1, '#ff4e50');
                ctx.strokeStyle = goldGlow; ctx.stroke(); ctx.restore();
            };

            drawVipCard(imgPrime, cr1, dx, dy1, dw, dh1);
            drawVipCard(imgWeapons, cr2, dx, dy2, dw, dh2);

            // 6. KHẮC CHỮ BĂNG RÔN (Giữ nguyên của sếp)
            ctx.save();
            let fontSize = Math.floor(H * 0.065);
            ctx.font = `italic 900 ${fontSize}px "Arial Black", "Segoe UI Black", sans-serif`;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            const textX = W * 0.055; const textY = H * 0.92;
            const textWidth = ctx.measureText(vipSlogan).width;
            const paddingX = fontSize * 1.5; const paddingY = fontSize * 1.5;

            // Băng Rôn
            const ribbonW = textWidth + paddingX; const ribbonH = fontSize + paddingY;
            const ribbonX = textX - paddingX / 2.5; const ribbonY = textY - ribbonH / 2;
            ctx.translate(ribbonX, ribbonY); ctx.transform(1, 0, -0.35, 1, 0, 0);
            ctx.beginPath(); ctx.rect(0, 0, ribbonW, ribbonH);
            ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 12; ctx.shadowOffsetY = 15;
            ctx.fillStyle = 'rgba(10, 10, 10, 0.8)'; ctx.fill();
            ctx.shadowBlur = 0;
            const ribbonBorder = ctx.createLinearGradient(0, 0, ribbonW, ribbonH);
            ribbonBorder.addColorStop(0, '#f9d423'); ribbonBorder.addColorStop(1, '#ff4e50');
            ctx.lineWidth = Math.floor(H * 0.005); ctx.strokeStyle = ribbonBorder; ctx.stroke();
            ctx.restore();

            // Chữ
            ctx.shadowColor = '#000'; ctx.shadowBlur = 12; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 5;
            const textGradient = ctx.createLinearGradient(0, textY - fontSize / 2, 0, textY + fontSize / 2);
            textGradient.addColorStop(0, '#f9d423'); textGradient.addColorStop(0.5, '#ffffff'); textGradient.addColorStop(1, '#ff4e50');
            ctx.miterLimit = 2; ctx.lineWidth = fontSize * 0.1; ctx.strokeStyle = '#000';
            ctx.strokeText(vipSlogan, textX, textY);
            ctx.shadowBlur = 0; ctx.fillStyle = textGradient;
            ctx.fillText(vipSlogan, textX, textY);
            ctx.restore();

            // Hoàn tất
            progressFill.style.width = '100%';
            loadingText.textContent = "Hoàn tất đóng gói!";
            
            setTimeout(() => {
                loadingState.classList.add('hidden');
                resultImage.src = canvas.toDataURL('image/jpeg', 0.95);
                resultImage.classList.remove('hidden');
                resultActions.classList.remove('hidden');
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> GHÉP LẠI PHÁT NỮA';
            }, 500);

        } catch (error) {
            console.error(error);
            alert("Lỗi phần cứng: " + error.message);
            loadingState.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> THỬ LẠI';
        }
    });
});
