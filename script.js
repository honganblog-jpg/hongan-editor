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
    }

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
            saveKeyBtn.style.color = 'var(--primary-green)';
        } else {
            alert('Vui lòng nhập Key trước khi lưu!');
        }
    });

    const selectedFiles = [null, null, null, null];

    uploadSlots.forEach((slot, index) => {
        const input = slot.querySelector('input[type="file"]');
        const preview = slot.querySelector('.preview');
        const placeholder = slot.querySelector('.placeholder');
        const removeBtn = slot.querySelector('.remove-btn');

        slot.addEventListener('click', (e) => {
            if (e.target !== removeBtn && !removeBtn.contains(e.target)) input.click();
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

    // Hàm nén ảnh riêng cho AI (Giữ chất lượng cao hơn để soi chữ)
    const fileForAI = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Giữ ảnh to (1600px) để AI soi rõ số VIP nhỏ
                    const scale = 1600 / img.width;
                    canvas.width = 1600;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({
                        mimeType: 'image/jpeg',
                        data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
                    });
                };
            };
        });
    };

    generateBtn.addEventListener('click', async () => {
        const API_KEY = apiKeyInput.value.trim();
        if (!API_KEY) {
            alert("LỖI: Vui lòng dán Gemini API Key!");
            return;
        }

        const validFiles = selectedFiles.filter(f => f !== null);
        if (validFiles.length < 3) {
            alert("Sếp ơi, cần đủ 3 ảnh mới đẹp (Nền, Prime, Súng)!");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> ĐANG SOI ẢNH...';
        resultSection.classList.remove('hidden');
        loadingState.classList.remove('hidden');
        resultImage.classList.add('hidden');
        resultActions.classList.add('hidden');

        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            // Bước 1: AI soi số (Dùng model 1.5 Flash cho chuẩn)
            progressFill.style.width = '20%';
            loadingText.textContent = "AI đang soi 'mắt' vào Level và VIP của sếp...";

            const [aiImg1, aiImg2] = await Promise.all([
                fileForAI(validFiles[0]),
                fileForAI(validFiles[1])
            ]);

            const prompt = "Task: 1. Soi số Level ở góc trái trên ảnh 1. 2. Ở ảnh 2, BỎ QUA chữ PRIME TO. Hãy tìm số nhỏ nằm trong icon vương miện (thường là số 1, 2, 3...). Trả về định dạng duy nhất: LEVEL [Số] - VIP [Số]. Ví dụ: LEVEL 60 - VIP 3. Không viết gì thêm.";

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [
                        { text: prompt },
                        { inlineData: aiImg1 },
                        { inlineData: aiImg2 }
                    ]}]
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                // Làm sạch chữ từ AI
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            }

            // Bước 2: Vẽ Canvas (Phần này giữ logic dán đè của sếp nhưng tối ưu tọa độ)
            progressFill.style.width = '50%';
            loadingText.textContent = "Đang dập nổi khung vàng 24K...";

            const imgs = await Promise.all(validFiles.map(file => {
                return new Promise(res => {
                    const i = new Image();
                    i.onload = () => res(i);
                    i.src = URL.createObjectURL(file);
                });
            }));

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const bg = imgs[0];
            const W = (bg.height > 1440) ? (1440 / bg.height) * bg.width : bg.width;
            const H = (bg.height > 1440) ? 1440 : bg.height;
            canvas.width = W;
            canvas.height = H;

            // Vẽ nền
            ctx.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, W, H);
            
            // Lớp phủ tối bên phải
            const grad = ctx.createLinearGradient(W*0.4, 0, W, 0);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = grad;
            ctx.fillRect(W*0.4, 0, W*0.6, H);

            // Vẽ 2 khung (Prime và Súng) - Tọa độ sếp đã tính rất chuẩn
            const drawCard = (img, sy, dy) => {
                const dw = W * 0.45;
                const dh = (img.height * 0.8 / (img.width * 0.8)) * dw;
                const dx = W - dw - (W * 0.03);
                
                ctx.save();
                ctx.shadowBlur = 30; ctx.shadowColor = 'black';
                ctx.fillStyle = 'black';
                ctx.roundRect(dx, dy, dw, dh, 20); ctx.fill();
                ctx.clip();
                ctx.drawImage(img, img.width*0.18, img.height*sy, img.width*0.8, img.height*0.8, dx, dy, dw, dh);
                ctx.restore();
                
                // Viền vàng
                ctx.strokeStyle = '#f9d423'; ctx.lineWidth = 6;
                ctx.stroke();
            };

            drawCard(imgs[1], 0.05, H * 0.05); // Khung Prime
            drawCard(imgs[2], 0.17, H * 0.52); // Khung Súng

            // Vẽ Băng Rôn & Chữ LEVEL - VIP
            ctx.save();
            const fontSize = H * 0.07;
            ctx.font = `italic 900 ${fontSize}px Arial`;
            const tw = ctx.measureText(vipSlogan).width;
            
            // Vẽ nền đen nghiêng cho chữ
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.beginPath();
            ctx.moveTo(W*0.03, H*0.85);
            ctx.lineTo(W*0.03 + tw + 100, H*0.85);
            ctx.lineTo(W*0.03 + tw + 60, H*0.95);
            ctx.lineTo(W*0.03, H*0.95);
            ctx.fill();
            ctx.strokeStyle = '#f9d423'; ctx.lineWidth = 4; ctx.stroke();

            // Vẽ chữ vàng trắng
            const tGrad = ctx.createLinearGradient(0, H*0.85, 0, H*0.95);
            tGrad.addColorStop(0, '#f9d423'); tGrad.addColorStop(0.5, '#fff'); tGrad.addColorStop(1, '#ff4e50');
            ctx.fillStyle = tGrad;
            ctx.fillText(vipSlogan, W*0.06, H * 0.915);
            ctx.restore();

            // Hoàn tất
            resultImage.src = canvas.toDataURL('image/jpeg', 0.95);
            setTimeout(() => {
                loadingState.classList.add('hidden');
                resultImage.classList.remove('hidden');
                resultActions.classList.remove('hidden');
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> GHÉP LẠI PHÁT NỮA';
            }, 800);

        } catch (err) {
            alert("Lỗi rồi sếp ơi: " + err.message);
            generateBtn.disabled = false;
            loadingState.classList.add('hidden');
        }
    });
});

// Hàm tải ảnh (Sếp giữ nguyên cái này ở cuối file)
function downloadImg() {
    const img = document.getElementById('result-image');
    if (!img.src || img.classList.contains('hidden')) return alert("Chưa có ảnh sếp ơi!");
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'Sieu-Pham-FF-By-An.jpg';
    link.click();
}
