// 전역 변수
let recognition;
let isRecording = false;
let startTime;
let timerInterval;
let totalSilenceDuration = 0;
let lastSpeechTime = 0;
const silenceThreshold = 3000;
let currentResult = null;

// DOM 요소
const timerDisplay = document.getElementById('timer');
const statusIndicator = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptContent = document.getElementById('transcript');
const resultBox = document.getElementById('resultBox');

// 음성 인식 설정
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = function() {
        isRecording = true;
        startTime = Date.now();
        lastSpeechTime = startTime;
        totalSilenceDuration = 0;

        statusIndicator.className = 'status-indicator recording';
        statusIndicator.querySelector('.status-text').textContent = '녹음 중...';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        transcriptContent.innerHTML = '<p class="placeholder">말하고 있습니다...</p>';
        resultBox.style.display = 'none';

        timerInterval = setInterval(updateTimer, 100);
        checkSilence();
    };

    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        transcriptContent.innerHTML = transcript ? `<p>${transcript}</p>` : '<p class="placeholder">말한 내용이 여기에 표시됩니다...</p>';
        lastSpeechTime = Date.now();
    };

    recognition.onend = function() {
        if (isRecording) {
            recognition.start();
        }
    };

    recognition.onerror = function(event) {
        console.error('음성 인식 오류:', event.error);
    };
} else {
    alert('이 브라우저는 음성 인식을 지원하지 않습니다. 구글 크롬을 사용해주세요.');
    startBtn.disabled = true;
}

function startRecording() {
    if (recognition) {
        try {
            recognition.start();
        } catch (e) {
            alert('마이크 권한이 필요합니다.');
        }
    }
}

function stopRecording() {
    isRecording = false;
    if (recognition) {
        recognition.stop();
    }
    clearInterval(timerInterval);

    statusIndicator.className = 'status-indicator';
    statusIndicator.querySelector('.status-text').textContent = '분석 완료';
    startBtn.disabled = false;
    stopBtn.disabled = true;

    showResults();
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
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

function showResults() {
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const speakingTime = Math.max(0, totalTime - totalSilenceDuration);
    const silenceRate = totalTime > 0 ? ((totalSilenceDuration / totalTime) * 100).toFixed(1) : 0;

    document.getElementById('totalTime').textContent = `${totalTime}초`;
    document.getElementById('speakingTime').textContent = `${speakingTime.toFixed(1)}초`;
    document.getElementById('silenceTime').textContent = `${totalSilenceDuration.toFixed(1)}초`;
    document.getElementById('silenceRate').textContent = `${silenceRate}%`;

    let feedback = '';
    if (totalTime < 10) {
        feedback = '연습 시간이 너무 짧습니다. 1분 이상 연습해주세요.';
    } else if (silenceRate > 40) {
        feedback = '침묵 시간이 많습니다. 연결어를 활용해보세요! (예: 그리고, 또한, 따라서)';
    } else if (silenceRate > 20) {
        feedback = '보통 수준입니다. 조금 더 자신감 있게 말해보세요.';
    } else {
        feedback = '훌륭합니다! 말하기 흐름이 매우 자연스럽습니다.';
    }

    document.getElementById('feedbackText').textContent = feedback;
    resultBox.style.display = 'block';

    // 현재 결과 저장
    currentResult = {
        date: new Date().toLocaleString('ko-KR'),
        totalTime: totalTime,
        speakingTime: speakingTime,
        silenceTime: totalSilenceDuration,
        silenceRate: parseFloat(silenceRate),
        transcript: transcriptContent.textContent
    };
}

function saveResult() {
    if (!currentResult) return;

    // 로컬 스토리지에 저장
    let records = JSON.parse(localStorage.getItem('speechRecords') || '[]');
    records.unshift(currentResult);
    localStorage.setItem('speechRecords', JSON.stringify(records));

    alert('결과가 저장되었습니다!');
    
    // 통계 페이지로 이동
    if (confirm('통계 페이지로 이동하시겠습니까?')) {
        window.location.href = 'stats.html';
    }
}