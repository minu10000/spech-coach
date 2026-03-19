// ========================================
// 전역 변수
// ========================================
let recognition;
let isRecording = false;
let startTime;
let timerInterval;
let totalSilenceDuration = 0;
let lastSpeechTime = 0;
const silenceThreshold = 3000;

// ========================================
// DOM 요소
// ========================================
const timerDisplay = document.getElementById('timer');
const statusBadge = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptBox = document.getElementById('transcript');
const resultBox = document.getElementById('resultBox');

// ========================================
// 브라우저 지원 확인
// ========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert('❌ 이 브라우저는 음성 인식을 지원하지 않습니다.\n\n구글 크롬 (Chrome) 을 사용해주세요.');
    startBtn.disabled = true;
    updateStatus('warning', '지원되지 않는 브라우저');
} else {
    // 음성 인식 설정
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = true;
    recognition.continuous = true;

    // 녹음 시작
    recognition.onstart = function() {
        isRecording = true;
        startTime = Date.now();
        lastSpeechTime = startTime;
        totalSilenceDuration = 0;

        updateStatus('recording', '녹음 중...');
        startBtn.disabled = true;
        stopBtn.disabled = false;
        transcriptBox.innerHTML = '<p class="placeholder">말하고 있습니다...</p>';
        resultBox.style.display = 'none';

        timerInterval = setInterval(updateTimer, 100);
        checkSilence();
    };

    // 음성 결과
    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        transcriptBox.innerHTML = transcript ? `<p>${transcript}</p>` : '<p class="placeholder">말한 내용이 여기에 표시됩니다...</p>';
        lastSpeechTime = Date.now();
    };

    // 녹음 종료
    recognition.onend = function() {
        if (isRecording) {
            recognition.start();
        }
    };

    // 오류 처리
    recognition.onerror = function(event) {
        console.error('음성 인식 오류:', event.error);
        if (event.error === 'not-allowed') {
            updateStatus('warning', '마이크 권한을 허용해주세요');
        }
    };
}

// ========================================
// 함수들
// ========================================

function startRecording() {
    if (recognition) {
        try {
            recognition.start();
        } catch (e) {
            alert('녹음을 시작할 수 없습니다. 페이지를 새로고침해주세요.');
        }
    }
}

function stopRecording() {
    isRecording = false;
    if (recognition) {
        recognition.stop();
    }
    clearInterval(timerInterval);

    updateStatus('done', '분석 완료');
    startBtn.disabled = false;
    stopBtn.disabled = true;

    showResults();
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${m}:${s}`;
}

function checkSilence() {
    if (!isRecording) return;

    const now = Date.now();
    const timeSinceLastSpeech = now - lastSpeechTime;

    if (timeSinceLastSpeech > silenceThreshold) {
        totalSilenceDuration = timeSinceLastSpeech / 1000;
    }

    setTimeout(checkSilence, 500);
}

function updateStatus(type, text) {
    statusBadge.className = `status-badge ${type}`;
    statusBadge.querySelector('.status-text').innerText = text;
}

function showResults() {
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const speakingTime = Math.max(0, totalTime - totalSilenceDuration);
    const silenceRate = totalTime > 0 ? ((totalSilenceDuration / totalTime) * 100).toFixed(1) : 0;

    document.getElementById('totalTime').innerText = `${totalTime}초`;
    document.getElementById('speakingTime').innerText = `${speakingTime.toFixed(1)}초`;
    document.getElementById('silenceTime').innerText = `${totalSilenceDuration.toFixed(1)}초`;
    document.getElementById('silenceRate').innerText = `${silenceRate}%`;

    // 피드백
    let feedback = '';
    let feedbackClass = '';

    if (totalTime < 10) {
        feedback = '연습 시간이 너무 짧습니다. 1 분 이상 연습해주세요.';
        feedbackClass = 'warning';
    } else if (silenceRate > 40) {
        feedback = '침묵 시간이 많습니다. 연결어를 활용해보세요! (예: 그리고, 또한, 따라서)';
        feedbackClass = 'warning';
    } else if (silenceRate > 20) {
        feedback = '보통 수준입니다. 조금 더 자신감 있게 말해보세요.';
    } else {
        feedback = '훌륭합니다! 말하기 흐름이 매우 자연스럽습니다.';
    }

    const feedbackCard = document.getElementById('feedbackText');
    feedbackCard.querySelector('.feedback-content').innerText = feedback;
    feedbackCard.className = `feedback-card ${feedbackClass}`;

    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}