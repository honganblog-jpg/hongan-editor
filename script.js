document.addEventListener('DOMContentLoaded', () => {
    // --- 1. KẾT NỐI GIAO DIỆN ---
    const uploadSlots = document.querySelectorAll('.upload-slot');
    const generateBtn = document.getElementById('generate-btn');
    const loadingState = document.getElementById('loading-state');
    const resultImage = document.getElementById('result-image');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');

    // Móc API Key đã lưu từ trước
    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
    }

    saveKeyBtn.addEventListener('click', () => {
        localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
        alert("Đã lưu mã thành công!");
    });

    const selectedFiles = [null, null, null, null];

    // --- 2. XỬ LÝ UP ẢNH ---
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

    // Hàm nén ảnh riêng để AI nhìn cho rõ số VIP
    const fileToAI = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1200; 
                    canvas.height = (img.height / img.width) * 1200;
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({ mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1] });
                };
            };
        });
    };

    // --- 3. NÚT GHÉP ẢNH CHÍNH ---
    generateBtn.addEventListener('click', async () => {
        const API_KEY = apiKeyInput.value.trim();
        if (!API_KEY) return alert("Sếp chưa nhập API Key ở mục 0 kìa!");

        const validFiles = selectedFiles.filter(f => f !== null);
        if (validFiles.length < 3) return alert("Phải đủ 3 ảnh (Nền, Prime, Súng) mới không bị lỗi ô đen sếp ơi!");

        generateBtn.disabled = true;
        loadingState.classList.remove('hidden');
        document.getElementById('result-section').classList.remove('hidden');

        let vipSlogan = "LEVEL ? - VIP ?";

        try {
            // SOI LEVEL VÀ VIP (Dùng 1.5 Flash cho ổn định)
            const [aiImg1, aiImg2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
            const prompt = "Soi số Level ở góc trái trên ảnh 1. Soi số nhỏ trong icon vương miện ở ảnh 2 (BỎ QUA PRIME TO). Trả về đúng mẫu: LEVEL [Số] - VIP [Số]. Ví dụ: LEVEL 55 - VIP 6.";

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: aiImg1 }, { inlineData: aiImg2 }] }] })
            });

            const data = await res.json();
            
            if (res.ok && data.candidates) {
                vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
            } else if (res.status === 429) {
                alert("Sếp bấm nhanh quá Google nó chặn (Lỗi 429) rồi! Đợi 1 phút hãy bấm lại.");
            }

            // --- 4. VẼ CANVAS (FIX LỖI Ô ĐEN) ---
            const imgs = await Promise.all(validFiles.map(f => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(f); })));
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const bg = imgs[0];
            canvas.width = bg.width; 
            canvas.height = bg.height;

            // Vẽ ảnh nền
            ctx.drawImage(bg, 0, 0);

            // Hàm vẽ khung Prime và Súng (Tự tính tọa độ chuẩn)
            const drawCard = (img, dy) => {
                const dw = canvas.width * 0.45; // Chiều rộng 45% ảnh nền
                const dh = (img.height / img.width) * dw; // Tỉ lệ chiều cao chuẩn
                const dx = canvas.width - dw - (canvas.width * 0.03); // Cách lề phải 3%
                
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(dx, dy, dw, dh, 20); // Bo góc 20px
                ctx.clip();
                ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
                ctx.restore();
                
                // Viền vàng sang chảnh
                ctx.strokeStyle = '#f9d423'; 
                ctx.lineWidth = 6; 
                ctx.stroke();
            };

            // Vẽ 2 ô bên phải (Fix tọa độ dy để không bị chồng hoặc mất ảnh)
            drawCard(imgs[1], canvas.height * 0.05); // Ô trên
            drawCard(imgs[2], canvas.height * 0.52); // Ô dưới

            // --- 5. VẼ CHỮ LEVEL - VIP ---
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, canvas.height * 0.85, canvas.width * 0.4, canvas.height * 0.1);
            
            ctx.font = `italic bold ${canvas.height * 0.07}px Arial`;
            ctx.fillStyle = '#f9d423';
            ctx.fillText(vipSlogan, canvas.width * 0.05, canvas.height * 0.92);

            // Hiển thị kết quả
            resultImage.src = canvas.toDataURL('image/jpeg', 0.9);
