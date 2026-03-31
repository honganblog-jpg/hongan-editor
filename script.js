// --- 1. HÀM TẢI ẢNH (PHẢI ĐỂ NGOÀI CÙNG ĐỂ NÚT HTML GỌI ĐƯỢC) ---
function downloadImg() {
    const img = document.getElementById('result-image');
    if (!img || !img.src || img.classList.contains('hidden')) {
        alert("Chưa có ảnh kết quả để tải sếp ơi!");
        return;
    }
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'Sieu-Pham-FF-Cua-An.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 2. LOGIC XỬ LÝ CHÍNH ---
document.addEventListener('DOMContentLoaded', () => {
    const uploadSlots = document.querySelectorAll('.upload-slot');
    const generateBtn = document.getElementById('generate-btn');
    const loadingState = document.getElementById('loading-state');
    const resultImage = document.getElementById('result-image');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');

    // Móc API Key từ bộ nhớ
    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
    }

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
            alert("Đã lưu mã API thành công!");
        } else {
            alert("Vui lòng nhập mã trước khi lưu!");
        }
    });

    const selectedFiles = [null, null, null, null];

    uploadSlots.forEach((slot, index) => {
        const input = slot.querySelector('input[type="file"]');
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedFiles[index] = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    slot.querySelector('.preview').src = ev.target.result;
                    slot.querySelector('.preview').classList.remove('hidden');
                    slot.querySelector('.placeholder').classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
        slot.addEventListener('click', () => input.click());
    });

    // Nén ảnh chất lượng cao 1600px để AI soi VIP chuẩn
    const fileToAI = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1600;
                    canvas.height = (img.height / img.width) * 1600;
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1] });
                };
            };
        });
    };

    generateBtn.addEventListener('click', async () => {
        const API_KEY = apiKeyInput.value.trim();
        if (!API_KEY) return alert("Sếp chưa nhập Key ở mục 0!");

        const validFiles = selectedFiles.filter(f => f !== null);
        if (validFiles.length < 3) return alert("Cần đủ 3 ảnh (Nền, Prime, Súng)!");

        generateBtn.disabled = true;
        loadingState.classList.remove('hidden');
        document.getElementById('result-section').classList.remove('hidden');
        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            // Bước 1: AI soi Level và VIP (Dùng link v1 để tránh lỗi 404)
            const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
            const prompt = "Soi ảnh 1 lấy số Level góc trái trên. Soi ảnh 2 lấy số nhỏ trong vương miện (BỎ QUA PRIME TO). Trả về mẫu: LEVEL [Số] - VIP [Số].";

            // Sửa link API thành v1 để hết lỗi 404
            const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
            });

            const data = await res.json();
            
            if (res.ok && data.candidates) {
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            } else {
                alert("Lỗi AI (" + res.status + "): " + (data.error ? data.error.message : "Google chặn rồi!"));
            }

            // Bước 2: Vẽ Canvas (Fix lỗi ô đen & tọa độ)
            const imgs = await Promise.all(validFiles.map(f => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(f); })));
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const bg = imgs[0];
            canvas.width = bg.width; canvas.height = bg.height;

            ctx.drawImage(bg, 0, 0);

            const drawCard = (img, dy) => {
                const dw = canvas.width * 0.45;
                const dh = (img.height / img.width) * dw;
                const dx = canvas.width - dw - (canvas.width * 0.03);
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(dx, dy, dw, dh, 25);
                ctx.clip();
                ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
                ctx.restore();
                ctx.strokeStyle = '#f9d423'; ctx.lineWidth = 8; ctx.stroke();
            };

            drawCard(imgs[1], canvas.height * 0.05); // Ô Prime
            drawCard(imgs[2], canvas.height * 0.52); // Ô Súng

            // Vẽ Chữ LEVEL - VIP
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, canvas.height * 0.85, canvas.width * 0.45, canvas.height * 0.12);
            ctx.font = `italic bold ${canvas.height * 0.08}px Arial`;
            ctx.fillStyle = '#f9d423';
            ctx.fillText(vipSlogan, canvas.width * 0.05, canvas.height * 0.94);

            resultImage.src = canvas.toDataURL('image/jpeg', 0.95);
            resultImage.classList.remove('hidden');
            document.getElementById('result-actions').classList.remove('hidden');
            loadingState.classList.add('hidden');
            generateBtn.disabled = false;

        } catch (err) {
            alert("Lỗi: " + err.message);
            loadingState.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });
});
