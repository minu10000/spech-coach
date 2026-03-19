// 전역 변수
let recognition;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let startTime;
let timerInterval;
let totalSilenceDuration = 0;
let lastSpeechTime = 0;
let silenceCheckInterval;
const silenceThreshold = 3000;
let currentResult = null;
let transcriptText = '';
let audioBlob = null;

// DOM 요소
const timerDisplay = document.getElementById('timer');
const statusIndicator = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptContent = document.getElementById('transcript');
const resultBox = document.getElementById('resultBox');

// 마이크 권한 확인
async function checkMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ 마이크 접근 성공');
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('❌ 마이크 접근 실패:', error);
        if (error.name === 'NotAllowedError') {
            alert('❌ 마이크 권한이 필요합니다.\n\n브라우저 주소창 왼쪽 🔒 아이콘을 클릭하여 마이크 권한을 허용해주세요.');
        } else if (error.name === 'NotFoundError') {
            alert('❌ 마이크를 찾을 수 없습니다.\n\n마이크가 연결되어 있는지 확인해주세요.');
        } else {
            alert('❌ 마이크 오류: ' + error.message);
        }
        return false;
    }
}

// 브라우저 지원 확인
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎤 스치코치 연습 페이지 로드됨');
    
    // 마이크 권한 확인
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
        if (startBtn) startBtn.disabled = true;
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            statusIndicator.querySelector('.status-text').textContent = '마이크 권한 필요';
        }
    }
    
    // 음성 인식 설정
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = function() {
            console.log('🎤 음성 인식 시작');
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    transcriptText += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (transcriptContent) {
                const displayText = finalTranscript || interimTranscript || transcriptText;
                if (displayText.trim()) {
                    transcriptContent.innerHTML = `<p>${displayText}</p>`;
                } else {
                    transcriptContent.innerHTML = '<p class="placeholder">말한 내용이 여기에 표시됩니다...</p>';
                }
            }

            if (finalTranscript || interimTranscript) {
                lastSpeechTime = Date.now();
            }
        };

        recognition.onend = function() {
            console.log('⏹ 음성 인식 종료');
            if (isRecording) {
                try {
                    recognition.start();
                } catch (e) {
                    console.log('자동 재시작 실패:', e);
                }
            }
        };

        recognition.onerror = function(event) {
            console.error('❌ 음성 인식 오류:', event.error);
            
            if (event.error === 'not-allowed') {
                stopRecording();
                alert('❌ 마이크 권한이 차단되었습니다.\n\n주소창에서 권한을 허용해주세요.');
            }
        };
    } else {
        alert('❌ 이 브라우저는 음성 인식을 지원하지 않습니다.\n\n구글 크롬 (Chrome) 을 사용해주세요.');
        if (startBtn) startBtn.disabled = true;
    }
    
    // 초기 상태 설정
    if (timerDisplay) timerDisplay.textContent = '00:00';
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator';
        statusIndicator.querySelector('.status-text').textContent = '준비 완료';
    }
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
});

// 녹음 시작
async function startRecording() {
    // 마이크 권한 재확인
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) return;
    
    try {
        // 1. 음성 인식 시작
        if (recognition) {
            recognition.start();
        }
        
        // 2. 오디오 녹음 시작 (MediaRecorder)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log('🎵 오디오 녹음 완료:', audioBlob.size, 'bytes');
        };
        
        mediaRecorder.start();
        console.log('🎙️ 녹음 시작');
        
        // 상태 업데이트
        isRecording = true;
        startTime = Date.now();
        lastSpeechTime = startTime;
        totalSilenceDuration = 0;
        transcriptText = '';
        
        // UI 업데이트
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator recording';
            statusIndicator.querySelector('.status-text').textContent = '녹음 중...';
        }
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (transcriptContent) {
            transcriptContent.innerHTML = '<p class="placeholder">말하고 있습니다...</p>';
        }
        if (resultBox) resultBox.style.display = 'none';
        
        // 타이머 시작
        timerInterval = setInterval(updateTimer, 100);
        
        // 침묵 감지 시작
        startSilenceDetection();
        
    } catch (error) {
        console.error('❌ 녹음 시작 오류:', error);
        alert('❌ 녹음을 시작할 수 없습니다.\n\n' + error.message);
        stopRecording();
    }
}

// 녹음 종료
function stopRecording() {
    isRecording = false;
    
    // 1. 음성 인식 중지
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.error('음성 인식 중지 오류:', e);
        }
    }
    
    // 2. 오디오 녹음 중지
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        // 모든 오디오 트랙 중지
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    // 3. 타이머 중지
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 4. 침묵 감지 중지
    stopSilenceDetection();
    
    // UI 업데이트
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator';
        statusIndicator.querySelector('.status-text').textContent = '분석 완료';
    }
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
    // 결과 표시
    showResults();
}

// 타이머 업데이트
function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    
    if (timerDisplay) {
        timerDisplay.textContent = `${m}:${s}`;
    }
}

// 침묵 감지 시작
function startSilenceDetection() {
    silenceCheckInterval = setInterval(() => {
        if (!isRecording) return;
        
        const now = Date.now();
        const timeSinceLastSpeech = now - lastSpeechTime;
        
        if (timeSinceLastSpeech > silenceThreshold) {
            totalSilenceDuration = timeSinceLastSpeech / 1000;
        }
    }, 500);
}

// 침묵 감지 중지
function stopSilenceDetection() {
    if (silenceCheckInterval) {
        clearInterval(silenceCheckInterval);
        silenceCheckInterval = null;
    }
}

// 결과 표시
function showResults() {
    if (!startTime) return;
    
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const speakingTime = Math.max(0, totalTime - totalSilenceDuration);
    const silenceRate = totalTime > 0 ? ((totalSilenceDuration / totalTime) * 100) : 0;
    
    // 결과 저장
    currentResult = {
        date: new Date().toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        totalTime: totalTime,
        speakingTime: speakingTime,
        silenceTime: totalSilenceDuration,
        silenceRate: silenceRate,
        transcript: transcriptText.trim(),
        hasAudio: audioBlob !== null
    };
    
    // UI 업데이트
    if (document.getElementById('totalTime')) {
        document.getElementById('totalTime').textContent = `${totalTime}초`;
    }
    if (document.getElementById('speakingTime')) {
        document.getElementById('speakingTime').textContent = `${speakingTime.toFixed(1)}초`;
    }
    if (document.getElementById('silenceTime')) {
        document.getElementById('silenceTime').textContent = `${totalSilenceDuration.toFixed(1)}초`;
    }
    if (document.getElementById('silenceRate')) {
        document.getElementById('silenceRate').textContent = `${silenceRate.toFixed(1)}%`;
    }
    
    // 피드백 메시지
    let feedback = '';
    if (totalTime < 10) {
        feedback = '⚠️ 연습 시간이 너무 짧습니다. 1 분 이상 연습해주세요.';
    } else if (silenceRate > 40) {
        feedback = '⚠️ 침묵 시간이 많습니다.\n연결어를 활용해보세요! (예: 그리고, 또한, 따라서)';
    } else if (silenceRate > 20) {
        feedback = '😐 보통 수준입니다.\n조금 더 자신감 있게 말해보세요.';
    } else {
        feedback = '✅ 훌륭합니다!\n말하기 흐름이 매우 자연스럽습니다.';
    }
    
    if (document.getElementById('feedbackText')) {
        document.getElementById('feedbackText').textContent = feedback;
    }
    
    // 결과 박스 표시
    if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 결과 저장
function saveResult() {
    if (!currentResult) {
        alert('저장할 결과가 없습니다. 먼저 녹음을 완료해주세요.');
        return;
    }
    
    try {
        // 기존 기록 가져오기
        let records = [];
        const storedRecords = localStorage.getItem('speechRecords');
        if (storedRecords) {
            records = JSON.parse(storedRecords);
        }
        
        // 새로운 기록 추가
        records.unshift(currentResult);
        
        // 저장
        localStorage.setItem('speechRecords', JSON.stringify(records));
        
        console.log('✅ 저장 완료:', currentResult);
        console.log('📊 총 기록:', records.length);
        
        alert('✅ 결과가 저장되었습니다!');
        
        // AI 피드백 페이지로 이동
        if (confirm('AI 피드백을 확인하시겠습니까?')) {
            window.location.href = 'feedback.html';
        }
        
    } catch (error) {
        console.error('❌ 저장 오류:', error);
        alert('❌ 저장 중 오류가 발생했습니다.\n\n오류: ' + error.message);
    }
}