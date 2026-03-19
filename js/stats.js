document.addEventListener('DOMContentLoaded', function() {
    loadStats();
});

function loadStats() {
    const records = JSON.parse(localStorage.getItem('speechRecords') || '[]');
    
    if (records.length === 0) {
        document.getElementById('totalPractices').textContent = '0회';
        document.getElementById('totalTime').textContent = '0분';
        document.getElementById('avgSilenceRate').textContent = '0%';
        document.getElementById('bestRecord').textContent = '-';
        
        document.getElementById('recordsList').innerHTML = `
            <div class="no-records">
                <div class="no-records-icon">📭</div>
                <p>아직 저장된 연습 기록이 없습니다</p>
                <button class="btn-primary" onclick="location.href='practice.html'" style="padding: 1rem 2.5rem; font-size: 1.1rem;">연습하러 가기</button>
            </div>
        `;
        return;
    }
    
    // 통계 계산
    document.getElementById('totalPractices').textContent = records.length + '회';
    
    const totalSeconds = records.reduce((sum, r) => sum + (r.totalTime || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    document.getElementById('totalTime').textContent = totalMinutes > 0 ? 
        `${totalMinutes}분 ${remainingSeconds}초` : `${totalSeconds}초`;
    
    const avgRate = records.reduce((sum, r) => sum + (r.silenceRate || 0), 0) / records.length;
    document.getElementById('avgSilenceRate').textContent = avgRate.toFixed(1) + '%';
    
    const best = records.reduce((best, r) => r.silenceRate < best.silenceRate ? r : best);
    document.getElementById('bestRecord').textContent = best.silenceRate.toFixed(1) + '%';
    
    displayRecords(records);
}

function displayRecords(records) {
    const list = document.getElementById('recordsList');
    const reversed = [...records].reverse();
    
    list.innerHTML = reversed.map((r, i) => {
        const idx = records.length - 1 - i;
        const rateClass = r.silenceRate > 40 ? 'warning' : (r.silenceRate > 20 ? '' : 'good');
        const rateText = r.silenceRate > 40 ? '⚠️ 개선 필요' : (r.silenceRate > 20 ? '😐 보통' : '✅ 훌륭');
        
        return `
            <div class="record-card">
                <div class="record-header">
                    <div class="record-date">📅 ${r.date || '날짜없음'}</div>
                    <div class="record-badges">
                        <span class="badge badge-time">⏱ ${r.totalTime || 0}초</span>
                        <span class="badge badge-rate ${rateClass}">${rateText}</span>
                    </div>
                </div>
                <div class="record-stats-grid">
                    <div class="record-stat">
                        <div class="record-stat-label">총 시간</div>
                        <div class="record-stat-value">${r.totalTime || 0}초</div>
                    </div>
                    <div class="record-stat">
                        <div class="record-stat-label">발화 시간</div>
                        <div class="record-stat-value">${(r.speakingTime || 0).toFixed(1)}초</div>
                    </div>
                    <div class="record-stat">
                        <div class="record-stat-label">침묵 비율</div>
                        <div class="record-stat-value">${(r.silenceRate || 0).toFixed(1)}%</div>
                    </div>
                </div>
                ${r.transcript ? `
                <div class="record-transcript">
                    <strong>📝 내용:</strong><br>
                    ${r.transcript}
                </div>
                ` : ''}
                <div class="record-actions">
                    <button class="btn-action btn-view" onclick="viewRecord(${idx})">자세히 보기</button>
                    <button class="btn-action btn-delete" onclick="deleteRecord(${idx})">삭제</button>
                </div>
            </div>
        `;
    }).join('');
}

function viewRecord(index) {
    const records = JSON.parse(localStorage.getItem('speechRecords') || '[]');
    const r = records[index];
    if (!r) return;
    
    const message = `
📅 날짜: ${r.date}

⏱ 총 시간: ${r.totalTime}초
💬 발화 시간: ${(r.speakingTime || 0).toFixed(1)}초
🤫 침묵 시간: ${(r.silenceTime || 0).toFixed(1)}초
📊 침묵 비율: ${(r.silenceRate || 0).toFixed(1)}%

📝 내용:
${r.transcript || '내용 없음'}
    `.trim();
    
    alert(message);
}

function deleteRecord(index) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    
    let records = JSON.parse(localStorage.getItem('speechRecords') || '[]');
    records.splice(index, 1);
    localStorage.setItem('speechRecords', JSON.stringify(records));
    loadStats();
}

function clearAllRecords() {
    const records = JSON.parse(localStorage.getItem('speechRecords') || '[]');
    if (records.length === 0) {
        alert('삭제할 기록이 없습니다.');
        return;
    }
    
    if (!confirm(`정말 모든 기록 (${records.length}개) 을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    localStorage.removeItem('speechRecords');
    loadStats();
    alert('모든 기록이 삭제되었습니다.');
}