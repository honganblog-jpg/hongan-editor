// --- 1. HÀM TẢI ẢNH ---
function downloadImg() {
    const img = document.getElementById('result-image');
    if (!img || !img.src || img.classList.contains('hidden')) return alert("Chưa có ảnh để tải sếp ơi!");
    const link = document.createElement('a'); link.href = img.src; link.download = 'Sieu-Pham-An.jpg'; link.click();
}

// --- 2. LOGIC CHÍNH BỌC CHỐNG LỖI ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        const generateBtn = document.getElementById('generate-btn');
        const loadingState = document.getElementById('loading-state');
        const resultImage = document.getElementById('result-image');
        const apiKeyInput = document.getElementById('api-key-input');
        const saveKeyBtn = document.getElementById('save-key-btn');
        const uploadSlots = document.querySelectorAll('.upload-slot');

        // BỌC CHỐNG LỖI TAB ẨN DANH CHẶN LOCALSTORAGE
        try {
            if (localStorage.getItem('gemini_api_key')) {
                apiKeyInput.value = localStorage.getItem('gemini_api_key');
                saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
            }
        } catch (e) { console.warn("Đang dùng ẩn danh, không lưu mã được."); }

        saveKeyBtn.onclick = () => {
            try {
                localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
                saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
                alert("Đã lưu mã API thành công!");
            } catch (e) { alert("Trình duyệt chặn lưu mã (Do dùng Ẩn danh), sếp cứ dán Key rồi bấm Ghép là được!"); }
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
            if (!API_KEY) return alert("Sếp chưa nhập Key ở mục 0!");
            const validFiles = selectedFiles.filter(f => f !== null);
            if (validFiles.length < 3) return alert("Cần đủ 3 ảnh mới không bị lỗi ô đen sếp ơi!");

            generateBtn.disabled = true;
            loadingState.classList.remove('hidden');
            document.getElementById('result-section').classList.remove('hidden');
            let vipSlogan = "LEVEL ? - VIP ?";

            try {
                const [b1, b2] = await Promise.all([fileToAI(validFiles[0]), fileToAI(validFiles[1])]);
                const prompt = "Soi ảnh 1 lấy số Level góc trái trên. Soi ảnh 2 lấy số nhỏ trong vương miện (BỎ QUA PRIME TO). Trả về: LEVEL [Số] - VIP [Số].";

                // CHỐT HẠ: DÙNG GEMINI 2.5 FLASH ĐỂ KHỚP VỚI TÀI KHOẢN CỦA SẾP
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: b1 }, { inlineData: b2 }] }] })
                });

                const data = await res.json();
                if (res.ok && data.candidates) {
                    vipSlogan = data.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/[*_#`\n\r]/g, '');
                } else {
                    alert("Lỗi AI (" + res.status + "): " + (data.error ? data.error.message : "Chặn cmnr"));
                }

                // VẼ CANVAS
                const imgs = await Promise.all(validFiles.map(f => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(f); })));
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = imgs[0].width; canvas.height = imgs[0].height;
                ctx.drawImage(imgs[0], 0, 0);

                const drawCard = (img, dy) => {
                    const dw = canvas.width * 0.45; const dh = (img.height / img.width) * dw;
                    const dx = canvas.width - dw - (canvas.width * 0.03);
                    ctx.save(); ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 25); ctx.clip();
                    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
                    ctx.restore();
                    ctx.strokeStyle = '#f9d423'; ctx.lineWidth = 8; ctx.stroke();
                };

                drawCard(imgs[1], canvas.height * 0.05);
                drawCard(imgs[2], canvas.height * 0.52);

                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, canvas.height * 0.85, canvas.width * 0.45, canvas.height * 0.12);
                ctx.font = `italic bold ${canvas.height * 0.08}px Arial`; ctx.fillStyle = '#f9d423';
                ctx.fillText(vipSlogan, canvas.width * 0.05, canvas.height * 0.94);

                document.getElementById('result-image').src = canvas.toDataURL('image/jpeg', 0.95);
                document.getElementById('result-image').classList.remove('hidden');
                document.getElementById('result-actions').classList.remove('hidden');
                loadingState.classList.add('hidden');
                generateBtn.disabled = false;

            } catch (err) {
                alert("Lỗi trong lúc vẽ: " + err.message);
                loadingState.classList.add('hidden'); generateBtn.disabled = false;
            }
        };
    } catch (fatal) {
        alert("Lỗi chết lâm sàng sếp ơi, ấn F12 lên xem lỗi gì: " + fatal.message);
    }
});
