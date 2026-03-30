// Hệ thống sẽ truy xuất API Key thông qua input của người dùng trên giao diện.

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
    const aiPrompt = document.getElementById('ai-prompt');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Móc dữ liệu API Key đã lưu từ trước (Nếu có)
    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
        saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
        saveKeyBtn.style.color = 'var(--primary-green)';
        saveKeyBtn.style.borderColor = 'var(--primary-green)';
    }

    // Sự kiện Lưu Key (Bấm nút xác nhận)
    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            saveKeyBtn.innerHTML = '<i class="ph ph-check"></i> Đã Lưu';
            saveKeyBtn.style.color = 'var(--primary-green)';
            saveKeyBtn.style.borderColor = 'var(--primary-green)';
        } else {
            alert('Vui lòng nhập Key trước khi lưu!');
        }
    });

    apiKeyInput.addEventListener('input', () => {
        saveKeyBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Lưu Mã';
        saveKeyBtn.style.color = '';
        saveKeyBtn.style.borderColor = '';
    });

    // Store selected files in an array mapped to slots
    const selectedFiles = [null, null, null, null];

    // === File Upload Logic ===
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
                reader.onload = (e) => {
                    preview.src = e.target.result;
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

        // Drag and drop events...
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!slot.classList.contains('has-image')) slot.classList.add('dragover');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    input.files = e.dataTransfer.files;
                    input.dispatchEvent(new Event('change'));
                }
            }
        });
    });

    // Helper: Nén ảnh và chuyển đổi file thành Base64 để tránh lỗi Lag/Quá tải băng thông
    const fileToBase64 = (file, maxWidth = 800) => {
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

                    // Tính tỉ lệ thu nhỏ nếu ảnh lớn hơn maxWidth
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Nén ảnh lại còn 80% chất lượng định dạng JPEG
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    resolve({
                        mimeType: 'image/jpeg',
                        data: dataUrl.split(',')[1] // Lấy phần base64 sau dấu phẩy
                    });
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    };

    // === Tính năng Ghép Lõi Tốc độ ánh sáng (Canvas Local) ===
    generateBtn.addEventListener('click', async () => {
        const API_KEY = apiKeyInput ? apiKeyInput.value.trim() : "";

        if (!API_KEY) {
            alert("LỖI: Vui lòng dán Gemini API Key vào mục '0. Cấu hình hệ thống' để khởi chạy AI!");
            if (apiKeyInput) apiKeyInput.focus();
            return;
        }

        const validFiles = selectedFiles.filter(f => f !== null);

        if (validFiles.length === 0) {
            alert("Bạn cần thêm ít nhất 1 ảnh để thực hiện ghép ảnh nha!");
            return;
        }

        // Cập nhật giao diện Trạng thái
        const oldErr = document.getElementById('error-message');
        if (oldErr) oldErr.classList.add('hidden');

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> ĐANG TRÍCH XUẤT...';

        resultSection.classList.remove('hidden');
        loadingState.classList.remove('hidden');
        resultImage.classList.add('hidden');
        resultActions.classList.add('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        progressFill.style.width = '20%';
        loadingText.textContent = "AI Vision đang soi Cấp độ và Tinh túy của bạn (Chờ 2-3s)...";

        try {
            // Bước 1: AI Đọc Level và Cấp (OCR)
            let vipSlogan = "LEVEL ? - VIP ?"; // Nhãn dự phòng
            try {
                const base64Img1 = await fileToBase64(validFiles[0]);
                const base64Img2 = await fileToBase64(validFiles[1]);

                const parts = [
                    { text: "Nhiệm vụ: 1. Đọc số 'Level' (Avatar ở góc trái trên cùng ảnh 1). 2. Ở ảnh 2, BỎ QUA CHỮ PRIME TO. Hãy tìm dòng chữ nhỏ 'để về Prime [Số]' (nằm trong thanh màu vàng) và LẤY CÁI [Số] ĐÓ. 3. Trả về đúng 1 dòng: 'LEVEL [Level] - VIP [Số]'. TUYỆT ĐỐI KHÔNG DÙNG CHỮ PRIME. Ví dụ: 'LEVEL 60 - VIP 3'. Không giải thích gì thêm." },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Img1.data } },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Img2.data } }
                ];

                const payload = {
                    contents: [{ parts: parts }],
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                };

                const geminiCall = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (geminiCall.ok) {
                    const geminiData = await geminiCall.json();
                    if (geminiData.candidates && geminiData.candidates[0].content) {
                        vipSlogan = geminiData.candidates[0].content.parts[0].text.trim().toUpperCase().replace(/['"***\n]+/g, '');
                    }
                }
            } catch (err) {
                console.warn("AI soi text thất bại (có thể do mạng), dùng slogan mặc định:", err);
            }

            // Bước 2: Parse toàn bộ file thành Object Hình ảnh chuẩn HTML
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

            // Bước 3: THUẬT TOÁN AUTO CROP TRƯỢT NỔI (OVERLAY VIP)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (imageObjects.length < 3) {
                // Rơi về trạng thái cũ nếu ko đủ 3 ảnh (Báo lỗi nhẹ để người dùng chú ý)
                loadingText.textContent = "Chỉ thấy ít hơn 3 ảnh. Trả lại ảnh nền đầu tiên (Bạn cần ném đúng 3 ảnh nha!)...";
                canvas.width = imageObjects[0].width;
                canvas.height = imageObjects[0].height;
                ctx.drawImage(imageObjects[0], 0, 0);
            } else {
                // Phân cực: 0=Nền, 1=Cấp Prime, 2=Kho súng
                const imgBg = imageObjects[0];
                const imgPrime = imageObjects[1];
                const imgWeapons = imageObjects[2];

                // Resize khung Base Nền lại Max Height 1440 để Render ko bị văng RAM điện thoại
                let H = imgBg.height;
                let W = imgBg.width;
                if (H > 1440) {
                    W = (1440 / H) * W;
                    H = 1440;
                }

                canvas.width = W;
                canvas.height = H;

                // 1. Dán tấm Nền chiếm TẤT CẢ DIỆN TÍCH (Background To Nhất)
                ctx.drawImage(imgBg, 0, 0, imgBg.width, imgBg.height, 0, 0, W, H);

                // 2. Tráng Kính Mờ Đam Mỹ (Glassmorphism Dark) lên nửa phải -> Làm NỔI lớp cắt lên
                const gradDark = ctx.createLinearGradient(W * 0.4, 0, W, 0);
                gradDark.addColorStop(0, 'rgba(0,0,0,0)'); // Nửa trái 0% trong suốt
                gradDark.addColorStop(0.5, 'rgba(0,0,0,0.6)'); // Mờ dần khúc giữa
                gradDark.addColorStop(1, 'rgba(0,0,0,0.85)'); // Khá Đen phía Phải Cực
                ctx.fillStyle = gradDark;
                ctx.fillRect(W * 0.4, 0, W * 0.6, H);

                // --- 3. DAO CẮT THÔNG MINH (Auto Gọt Rìa Menu FreeFire/BloxFruits) ---
                // Prime 4: Xén bỏ menu dọc (~17.5%), top bar (~5%), Lấy lõi 82.5%W / 90%H
                const cr1 = {
                    sx: imgPrime.width * 0.175, sy: imgPrime.height * 0.05,
                    sw: imgPrime.width * 0.825, sh: imgPrime.height * 0.90
                };
                // Vũ Khí: Xén bỏ menu dọc, Title phía trên (~17% y). Lấy khúc dưới
                const cr2 = {
                    sx: imgWeapons.width * 0.18, sy: imgWeapons.height * 0.175,
                    sw: imgWeapons.width * 0.81, sh: imgWeapons.height * 0.80 // Bỏ lề dưới mũi tên
                };

                // --- 4. TÍNH TOÁN CĂN LỀ CỘT PHẢI (Khớp 100%) ---
                const availH = H * 0.90 - (H * 0.03); // Quỹ đất chiều cao
                const ratioPrime = cr1.sh / cr1.sw;
                const ratioWeapons = cr2.sh / cr2.sw;

                // Trọng số Bề Ngang chung để gộp 2 cái thành 1 cột liền mạch:
                const dw = availH / (ratioPrime + ratioWeapons);
                const dh1 = dw * ratioPrime;
                const dh2 = dw * ratioWeapons;

                // Căn phải cách 3% mép màn hình, lùi xuống 5%
                const dx = W - dw - (W * 0.03);
                const dy1 = H * 0.05;
                const dy2 = dy1 + dh1 + (H * 0.03); // Khe hở 3% màn hình

                // --- 5. HÀM DẬP NỔI THẺ VIP 3D (GOLD TRIM GLOW) ---
                const drawVipCard = (srcImg, cr, rx, ry, rw, rh) => {
                    const radius = 18; // Cong góc siêu mượt
                    const createPath = () => {
                        ctx.beginPath();
                        ctx.moveTo(rx + radius, ry);
                        ctx.lineTo(rx + rw - radius, ry);
                        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
                        ctx.lineTo(rx + rw, ry + rh - radius);
                        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
                        ctx.lineTo(rx + radius, ry + rh);
                        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
                        ctx.lineTo(rx, ry + radius);
                        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
                        ctx.closePath();
                    };

                    // Bóng Lưng Đen 3D thâm sâu, làm nó giống lơ lửng ngoài màn hình
                    ctx.save();
                    createPath();
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                    ctx.shadowBlur = 35;
                    ctx.shadowOffsetX = -10;
                    ctx.shadowOffsetY = 15;
                    ctx.fillStyle = '#000';
                    ctx.fill();
                    ctx.restore();

                    // Ráp Nét ảnh đã xén
                    ctx.save();
                    createPath();
                    ctx.clip(); // Khóa khung cắt gọt bo góc
                    ctx.drawImage(srcImg, cr.sx, cr.sy, cr.sw, cr.sh, rx, ry, rw, rh);
                    ctx.restore();

                    // Viền Bọc Vàng Hoàng Kim Đẳng Cấp (Luxury Glow)
                    ctx.save();
                    createPath();
                    ctx.lineWidth = 5;
                    const goldGlow = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
                    goldGlow.addColorStop(0, '#f9d423');  // Vàng tinh túy
                    goldGlow.addColorStop(0.5, '#ffd700'); // Vàng Mảnh Garena
                    goldGlow.addColorStop(1, '#ff4e50');  // Đỏ lửa của Rank
                    ctx.strokeStyle = goldGlow;
                    ctx.stroke();
                    ctx.restore();
                };

                // Triệu hồi hàm xẻ VIP
                drawVipCard(imgPrime, cr1, dx, dy1, dw, dh1);
                drawVipCard(imgWeapons, cr2, dx, dy2, dw, dh2);

                // --- 6. KHẮC CHỮ BĂNG RÔN ESPORTS VÀO GÓC TRÁI DƯỚI ---
                ctx.save();
                // Phóng to chữ theo yêu cầu (to hơn)
                let fontSize = Math.floor(H * 0.065);
                ctx.font = `italic 900 ${fontSize}px "Arial Black", "Segoe UI Black", sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle'; // Căn thẳng giữa y để dễ dựng hình Băng Rôn

                const textX = W * 0.055; // Lùi vào lề trái 5.5% (khu vực khoanh số 2)
                const textY = H * 0.92; // Lùi sát đất ở 92%

                const textWidth = ctx.measureText(vipSlogan).width;
                const paddingX = fontSize * 1.5;
                const paddingY = fontSize * 1.5;

                // === VẼ HIỆU ỨNG CHIẾN TRƯỜNG NHẸ (MƯA TIA LỬA & ĐẠN BAY 3D TOÀN MÀN HÌNH) ===
                const drawAmbientWarzone = () => {
                    ctx.save();

                    // 1. Vẽ tia lửa nóng nổ ra rải rác
                    for (let i = 0; i < 40; i++) {
                        const x = Math.random() * W;
                        const y = Math.random() * H;
                        const length = Math.random() * 30 + 10;
                        const angle = Math.random() * Math.PI * 2;

                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);

                        const colors = ['#ffffff', '#ffeb3b', '#ff9800', '#ff5722'];
                        ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
                        ctx.lineWidth = Math.random() * 3 + 1;

                        ctx.shadowColor = ctx.strokeStyle;
                        ctx.shadowBlur = Math.random() * 15 + 5;
                        ctx.globalAlpha = Math.random() * 0.7 + 0.3;
                        ctx.stroke();
                    }

                    // 2. Vẽ 6 vỏ đạn văng lơ lửng văng vẳng xa xa kiểu Bokeh Blur 
                    for (let i = 0; i < 6; i++) {
                        const x = Math.random() * W;
                        const y = Math.random() * (H * 0.9);
                        const scale = Math.random() * 1.2 + 0.4;
                        const rot = Math.random() * Math.PI * 2;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(rot);
                        ctx.scale(scale, scale);

                        ctx.globalAlpha = Math.random() * 0.5 + 0.2; // Độ mờ sương khói
                        ctx.shadowColor = '#000';
                        ctx.shadowBlur = 10;

                        // Thân đạn
                        let brass = ctx.createLinearGradient(0, -6, 0, 6);
                        brass.addColorStop(0, '#a67c00');
                        brass.addColorStop(0.5, '#f9d423');
                        brass.addColorStop(1, '#a67c00');
                        ctx.fillStyle = brass;
                        ctx.beginPath();
                        ctx.rect(-15, -6, 30, 12);
                        ctx.fill();

                        // Mũi nhọn
                        let copper = ctx.createLinearGradient(15, -6, 15, 6);
                        copper.addColorStop(0, '#8b5a2b');
                        copper.addColorStop(0.5, '#cd853f');
                        copper.addColorStop(1, '#8b5a2b');
                        ctx.fillStyle = copper;
                        ctx.beginPath();
                        ctx.moveTo(15, -6);
                        ctx.lineTo(25, -2);
                        ctx.lineTo(25, 2);
                        ctx.lineTo(15, 6);
                        ctx.closePath();
                        ctx.fill();

                        ctx.restore();
                    }
                    ctx.restore();
                };

                drawAmbientWarzone();

                // --- Vẽ Băng Rôn Thể thao điện tử (Esports Ribbon) ---
                ctx.save();
                const ribbonW = textWidth + paddingX;
                const ribbonH = fontSize + paddingY;
                const ribbonX = textX - paddingX / 2.5;
                const ribbonY = textY - ribbonH / 2;

                ctx.translate(ribbonX, ribbonY);
                ctx.transform(1, 0, -0.35, 1, 0, 0); // Kéo xiên Skew X

                ctx.beginPath();
                ctx.rect(0, 0, ribbonW, ribbonH);

                ctx.shadowColor = 'rgba(0,0,0,0.85)';
                ctx.shadowBlur = 18;
                ctx.shadowOffsetX = 12;
                ctx.shadowOffsetY = 15;

                ctx.fillStyle = 'rgba(10, 10, 10, 0.8)'; // Nền mờ kính 80%
                ctx.fill();

                ctx.shadowBlur = 0;
                const ribbonBorder = ctx.createLinearGradient(0, 0, ribbonW, ribbonH);
                ribbonBorder.addColorStop(0, '#f9d423');
                ribbonBorder.addColorStop(1, '#ff4e50');
                ctx.lineWidth = Math.floor(H * 0.005);
                ctx.strokeStyle = ribbonBorder;
                ctx.stroke();
                ctx.restore();

                // --- Vẽ Lõi Chữ Vàng 24K Trong Băng Rôn ---
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 4;
                ctx.shadowOffsetY = 5;

                const textGradient = ctx.createLinearGradient(0, textY - fontSize / 2, 0, textY + fontSize / 2);
                textGradient.addColorStop(0, '#f9d423');
                textGradient.addColorStop(0.5, '#ffffff'); // Tâm lõi trắng muốt
                textGradient.addColorStop(1, '#ff4e50');

                ctx.miterLimit = 2;
                ctx.lineWidth = fontSize * 0.1; // Cày nét đen viền
                ctx.strokeStyle = '#000';
                ctx.strokeText(vipSlogan, textX, textY);

                ctx.shadowBlur = 0;
                ctx.fillStyle = textGradient;
                ctx.fillText(vipSlogan, textX, textY); // Dập lõi Vàng Lấp Lánh
                ctx.restore();
            }

            progressFill.style.width = '90%';
            loadingText.textContent = "Áp dụng Neon Phân tách & Hoàn tất đóng gói!";

            // Bước 4: Chuyển dữ liệu ảnh về giao diện hiển thị
            // Format nén siêu việt chất lượng cao
            const finalImageBase64 = canvas.toDataURL('image/jpeg', 0.95);

            setTimeout(() => {
                loadingState.classList.add('hidden');

                resultImage.src = finalImageBase64;
                resultImage.classList.remove('hidden');
                resultActions.classList.remove('hidden');

                // Khôi phục nút
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> GHÉP ẢNH CANVAS NỘI BỘ';

                progressFill.style.width = '100%';
            }, 500); // 0.5s giả tạo cảm giác AI load để hiệu ứng mượt hơn :))

        } catch (error) {
            console.error("Lỗi tạo vòng lặp Canvas:", error);

            loadingState.classList.add('hidden');
            resultImage.classList.add('hidden');

            let errDiv = document.getElementById('error-message');
            if (!errDiv) {
                errDiv = document.createElement('div');
                errDiv.id = 'error-message';
                errDiv.classList.add('error-box');
                errDiv.style.color = '#ef4444';
                errDiv.style.background = 'rgba(239, 68, 68, 0.1)';
                errDiv.style.border = '1px solid #ef4444';
                errDiv.style.padding = '1rem';
                errDiv.style.borderRadius = '8px';
                errDiv.style.marginTop = '1rem';
                errDiv.style.whiteSpace = 'pre-wrap';
                document.querySelector('.result-container').appendChild(errDiv);
            }
            errDiv.textContent = `[Lỗi phần cứng]: ${error.message}`;
            errDiv.classList.remove('hidden');

            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="ph-fill ph-check-circle"></i> THỬ LẠI';
        }
    });
});

// HÀM TẢI ẢNH VẠN NĂNG - DÁN ĐÈ LẠI VÀO CUỐI FILE SCRIPT.JS
function downloadImg() {
    const canvas = document.getElementById('mergeCanvas');
    const img = document.getElementById('result-image');
    let linkTai = '';

    // 1. Kiểm tra xem có ảnh từ Canvas không
    if (canvas && canvas.width > 0 && !canvas.classList.contains('hidden')) {
        linkTai = canvas.toDataURL('image/png');
    } 
    // 2. Nếu không có Canvas, kiểm tra xem có ảnh từ AI (<img>) không
    else if (img && img.src && !img.src.includes('hidden') && img.src !== window.location.href) {
        linkTai = img.src;
    }

    // 3. Nếu cả hai đều không có thì mới báo lỗi
    if (!linkTai) {
        alert("Chưa có ảnh kết quả để tải sếp ơi! Sếp nhớ bấm 'Ghép ảnh' trước nhé.");
        return;
    }

    // 4. Tiến hành tải
    const link = document.createElement('a');
    link.href = linkTai;
    link.download = 'Sieu-Pham-FF-Cua-An.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}