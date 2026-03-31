// --- 1. HÀM TẢI ẢNH (PHẢI ĐỂ NGOÀI CÙNG) ---
function downloadImg() {
    const img = document.getElementById('result-image');
    if (!img || !img.src || img.classList.contains('hidden')) {
        alert("Chưa có ảnh để tải sếp ơi!"); [cite: 129]
        return;
    }
    const link = document.createElement('a');
    link.href = img.src; 
    link.download = 'Sieu-Pham-FF-By-An.jpg'; [cite: 131]
    link.click();
}

// --- 2. LOGIC XỬ LÝ CHÍNH ---
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn'); [cite: 2]
    const loadingState = document.getElementById('loading-state'); [cite: 2]
    const resultImage = document.getElementById('result-image'); [cite: 2]
    const apiKeyInput = document.getElementById('api-key-input'); [cite: 2]
    const saveKeyBtn = document.getElementById('save-key-btn'); [cite: 2]
    const uploadSlots = document.querySelectorAll('.upload-slot'); [cite: 2]

    // Móc API Key từ bộ nhớ [cite: 3]
    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key'); [cite: 3]
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu'; [cite: 4]
    }

    saveKeyBtn.onclick = () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key); [cite: 5]
            saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
            alert("Đã lưu mã thành công!");
        }
    };

    const selectedFiles = [null, null, null, null]; [cite: 8]
    uploadSlots.forEach((slot, index) => {
        const input = slot.querySelector('input[type="file"]');
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedFiles[index] = file; [cite: 10]
                const r = new FileReader(); [cite: 11]
                r.onload = (ev) => {
                    slot.querySelector('.preview').src = ev.target.result; [cite: 11]
                    slot.querySelector('.preview').classList.remove('hidden'); [cite: 11]
                    slot.querySelector('.placeholder').classList.add('hidden'); [cite: 11]
                };
                r.readAsDataURL(file);
            }
        };
        slot.onclick = () => input.click(); [cite: 9, 10]
    });

    const fileToAI = (file) => {
        return new Promise((resolve) => {
            const r = new FileReader(); [cite: 18]
            r.readAsDataURL(file);
            r.onload = (e) => {
                const img = new Image(); [cite: 19]
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas'); [cite: 19]
                    canvas.width = 1600; canvas.height = (img.height / img.width) * 1600; [cite: 21]
                    canvas.getContext('2d').drawImage(img, 0, 0, 1600, canvas.height); [cite: 23]
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1] }); [cite: 24]
                };
            };
        });
    };

    generateBtn.onclick = async () => {
        const API_KEY = apiKeyInput.value.trim(); [cite: 26]
        if (!API_KEY) return alert("Sếp chưa dán Key ở mục 0!"); [cite: 26, 27]

        const validFiles = selectedFiles.filter(f => f !== null); [cite: 27]
        if (validFiles.length < 3) return alert("Cần đủ 3 ảnh mới không bị lỗi ô đen sếp ơi!"); [cite: 44]

        generateBtn.disabled = true; [cite: 28]
        loadingState.classList.remove('hidden'); [cite: 28]
        document.getElementById('result-section').classList.remove('hidden'); [cite: 28]
        let vipSlogan = "LEVEL ? - VIP ?"; [cite: 31]

        try {
            const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]); [cite: 32, 33]
            const prompt = "Soi ảnh 1 lấy số Level góc trái trên. Soi ảnh 2 lấy số nhỏ trong vương miện (BỎ QUA PRIME TO). Trả về mẫu: LEVEL [Số] - VIP [Số]."; [cite: 33]

            // --- NÂNG CẤP LÊN MODEL 1.5 PRO CAO CẤP + CỔNG V1 ỔN ĐỊNH ---
            const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
            }); [cite: 37]

            const data = await res.json(); [cite: 38]
            if (res.ok && data.candidates) {
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, ''); [cite: 39]
            } else {
                alert("Lỗi AI: " + (data.error ? data.error.message : "Google chặn rồi!")); [cite: 124]
            }

            // --- VẼ CANVAS --- [cite: 43]
            const imgs = await Promise.all(validFiles.map(f => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(f); }))); [cite: 41, 42]
            const canvas = document.createElement('canvas'); [cite: 43]
            const ctx = canvas.getContext('2d'); [cite: 44]
            canvas.width = imgs[0].width; canvas.height = imgs[0].height; [cite: 45, 48, 49]
            ctx.drawImage(imgs[0], 0, 0); [cite: 49]

            const drawCard = (img, dy) => {
                const dw = canvas.width * 0.45; const dh = (img.height / img.width) * dw; [cite: 60, 61]
                const dx = canvas.width - dw - (canvas.width * 0.03); [cite: 62]
                ctx.save(); ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 25); ctx.clip(); [cite: 65, 72]
                ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh); [cite: 72]
                ctx.restore();
                ctx.strokeStyle = '#f9d423'; ctx.lineWidth = 8; ctx.stroke(); [cite: 74, 78]
            };

            drawCard(imgs[1], canvas.height * 0.05); [cite: 78]
            drawCard(imgs[2], canvas.height * 0.52); [cite: 79]

            // Vẽ Chữ [cite: 80]
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, canvas.height * 0.85, canvas.width * 0.45, canvas.height * 0.12); [cite: 107]
            ctx.font = `italic bold ${canvas.height * 0.08}px Arial`; ctx.fillStyle = '#f9d423'; [cite: 81]
            ctx.fillText(vipSlogan, canvas.width * 0.05, canvas.height * 0.94); [cite: 113]

            resultImage.src = canvas.toDataURL('image/jpeg', 0.95); [cite: 117]
            resultImage.classList.remove('hidden'); [cite: 118]
            document.getElementById('result-actions').classList.remove('hidden'); [cite: 118]
            loadingState.classList.add('hidden'); [cite: 118]
            generateBtn.disabled = false; [cite: 119]

        } catch (err) {
            alert("Lỗi: " + err.message); [cite: 124]
            loadingState.classList.add('hidden'); generateBtn.disabled = false; [cite: 121, 125]
        }
    };
});
