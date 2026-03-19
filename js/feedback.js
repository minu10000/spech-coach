// 마지막 연습 결과 로드
document.addEventListener('DOMContentLoaded', function() {
    loadFeedback();
});

function loadFeedback() {
    // 로컬 스토리지에서 마지막 결과 가져오기
    const records = JSON.parse(localStorage.getItem('speechRecords') || '[]');
    const lastRecord = records.length > 0 ? records[0] : null;
    
    if (!lastRecord) {
        alert('저장된 연습 기록이 없습니다. 먼저 연습을 진행해주세요.');
        location.href = 'practice.html';
        return;
    }
    
    // AI 피드백 생성
    const feedback = generateAIFeedback(lastRecord);
    
    // UI 업데이트
    displayFeedback(feedback);
}

function generateAIFeedback(record) {
    const { transcript, totalTime, speakingTime, silenceTime, silenceRate } = record;
    
    // 말하기 속도 (초당 글자수)
    const wordsPerMinute = Math.round((transcript.length / 3) / (totalTime / 60));
    
    // 중복 단어/표현 분석
    const fillerWords = countFillerWords(transcript);
    
    // 문장 길이 분석
    const avgSentenceLength = analyzeSentenceLength(transcript);
    
    // 종합 점수 계산 (100점 만점)
    let totalScore = 100;
    
    // 침묵 비율 감점 (20% 이하면 감점 없음)
    if (silenceRate > 40) totalScore -= 30;
    else if (silenceRate > 30) totalScore -= 20;
    else if (silenceRate > 20) totalScore -= 10;
    
    // 말하기 속도 감점 (적정: 150-200단어/분)
    if (wordsPerMinute < 100) totalScore -= 15;
    else if (wordsPerMinute > 250) totalScore -= 15;
    
    // 필러 워드 감점
    if (fillerWords.total > 10) totalScore -= 20;
    else if (fillerWords.total > 5) totalScore -= 10;
    
    totalScore = Math.max(0, totalScore);
    
    return {
        score: totalScore,
        pronunciation: analyzePronunciation(transcript),
        speed: analyzeSpeed(wordsPerMinute, totalTime),
        silence: analyzeSilence(silenceRate, silenceTime),
        habits: analyzeHabits(fillerWords, avgSentenceLength),
        actions: generateActions(totalScore, silenceRate, wordsPerMinute, fillerWords)
    };
}

function countFillerWords(text) {
    const fillers = {
        '그니까': 0,
        '그러니까': 0,
        '그래서': 0,
        '그리고': 0,
        '음': 0,
        '어': 0,
        '아': 0,
        '음..': 0,
        '저기': 0,
        '那个': 0
    };
    
    let total = 0;
    for (let filler in fillers) {
        const regex = new RegExp(filler, 'g');
        const matches = text.match(regex);
        if (matches) {
            fillers[filler] = matches.length;
            total += matches.length;
        }
    }
    
    return { total, fillers };
}

function analyzeSentenceLength(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return { avg: 0, tooLong: 0, tooShort: 0 };
    
    const lengths = sentences.map(s => s.trim().length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const tooLong = lengths.filter(l => l > 50).length;
    const tooShort = lengths.filter(l => l < 10).length;
    
    return { avg: Math.round(avg), tooLong, tooShort };
}

function analyzePronunciation(text) {
    const issues = [];
    const strengths = [];
    
    // 텍스트 길이로 기본 명확성 판단
    if (text.length > 100) {
        strengths.push('충분한 분량의 발표를 했습니다');
    }
    
    // 중복 문자 확인 (더듬더듬 말하기)
    const stutterPattern = /(.)\1{2,}/g;
    const stutters = text.match(stutterPattern);
    if (stutters && stutters.length > 0) {
        issues.push({
            title: '반복 발음',
            desc: `말씀 중 ${stutters.length}회 반복되는 발음이 감지되었습니다`,
            tip: '한 마디씩 또박또박 말하는 연습을 해보세요'
        });
    } else {
        strengths.push('또박또박 명확하게 발음했습니다');
    }
    
    return { issues, strengths };
}

function analyzeSpeed(wpm, totalTime) {
    const feedback = {
        wpm: wpm,
        status: '',
        desc: '',
        tip: ''
    };
    
    if (wpm < 100) {
        feedback.status = '느림';
        feedback.desc = `분당 ${wpm}단어로 다소 느린 속도입니다`;
        feedback.tip = '약간 더 빠른 속도로 말하는 연습을 해보세요 (목표: 150-200단어/분)';
    } else if (wpm > 250) {
        feedback.status = '빠름';
        feedback.desc = `분당 ${wpm}단어로 다소 빠른 속도입니다`;
        feedback.tip = '청중이 이해할 수 있도록 속도를 조절하세요 (목표: 150-200단어/분)';
    } else {
        feedback.status = '적절';
        feedback.desc = `분당 ${wpm}단어로 적절한 속도입니다`;
        feedback.tip = '현재 속도를 유지하세요!';
    }
    
    return feedback;
}

function analyzeSilence(rate, duration) {
    const feedback = {
        rate: rate,
        duration: duration,
        status: '',
        desc: '',
        tip: ''
    };
    
    if (rate > 40) {
        feedback.status = '많음';
        feedback.desc = `전체 시간의 ${rate.toFixed(1)}% (${duration.toFixed(1)}초) 를 침묵으로 보냈습니다`;
        feedback.tip = '연결어 ("또한", "그리고", "다음으로") 를 활용하여 흐름을 이어보세요';
    } else if (rate > 20) {
        feedback.status = '보통';
        feedback.desc = `전체 시간의 ${rate.toFixed(1)}% (${duration.toFixed(1)}초) 를 침묵으로 보냈습니다`;
        feedback.tip = '약간의 침묵은 좋지만, 더 자연스럽게 말해보세요';
    } else {
        feedback.status = '좋음';
        feedback.desc = `전체 시간의 ${rate.toFixed(1)}% (${duration.toFixed(1)}초) 만 침묵했습니다`;
        feedback.tip = '훌륭합니다! 자연스러운 흐름을 유지하고 있습니다';
    }
    
    return feedback;
}

function analyzeHabits(fillerWords, sentenceLength) {
    const issues = [];
    const strengths = [];
    
    // 필러 워드 분석
    if (fillerWords.total > 10) {
        issues.push({
            title: '불필요한 연결어',
            desc: `'그니까', '그래서' 등의 연결어를 ${fillerWords.total}회 사용했습니다`,
            tip: '의식적으로 연결어를 줄이고, 잠시 멈추는 것도 좋습니다'
        });
    } else if (fillerWords.total > 5) {
        issues.push({
            title: '연결어 사용',
            desc: `연결어를 ${fillerWords.total}회 사용했습니다`,
            tip: '조금 더 줄이면 더 전문적으로 들립니다'
        });
    } else {
        strengths.push('불필요한 연결어 사용이 적습니다');
    }
    
    // 문장 길이 분석
    if (sentenceLength.tooLong > 3) {
        issues.push({
            title: '긴 문장',
            desc: `평균 문장 길이: ${sentenceLength.avg}자 (너무 긴 문장 ${sentenceLength.tooLong}개)`,
            tip: '문장을 짧게 끊어 말하는 것이 이해하기 쉽습니다'
        });
    } else {
        strengths.push('적절한 길이의 문장을 사용했습니다');
    }
    
    return { issues, strengths };
}

function generateActions(score, silenceRate, wpm, fillerWords) {
    const actions = [];
    
    if (silenceRate > 30) {
        actions.push({
            icon: '🎯',
            text: '연결어 5개 준비하기 ("또한", "다음으로", "한편", "그 결과", "결론적으로")'
        });
    }
    
    if (wpm < 120) {
        actions.push({
            icon: '⚡',
            text: '타이머를 켜고 1분 동안 빠르게 읽는 연습 하기'
        });
    }
    
    if (wpm > 230) {
        actions.push({
            icon: '🐢',
            text: '천천히 또박또박 읽는 연습 하기 (한 문장마다 1초 멈추기)'
        });
    }
    
    if (fillerWords.total > 5) {
        actions.push({
            icon: '🚫',
            text: '"그니까", "그래서" 대신 2초간 멈추기 연습'
        });
    }
    
    if (score >= 80) {
        actions.push({
            icon: '🏆',
            text: '아이 콘택트와 제스처 추가하기'
        });
    }
    
    return actions;
}

function displayFeedback(feedback) {
    // 종합 점수
    document.getElementById('overallScore').textContent = feedback.score;
    
    let message = '';
    if (feedback.score >= 90) message = ' 완벽합니다! 전문 발표자 수준이에요!';
    else if (feedback.score >= 80) message = '👏 훌륭합니다! 조금만 더 연습하면 완벽해요!';
    else if (feedback.score >= 70) message = '😊 좋아요! 꾸준히 연습하고 있어요!';
    else if (feedback.score >= 60) message = '💪 괜찮아요! 개선할 부분이 보입니다!';
    else message = '📚 연습이 필요해요! 함께 개선해봐요!';
    
    document.getElementById('scoreMessage').textContent = message;
    
    // 발음 피드백
    const pronHTML = feedback.pronunciation.strengths.map(s => `
        <div class="feedback-item success">
            <div class="feedback-item-title">✅ ${s}</div>
        </div>
    `).join('') + feedback.pronunciation.issues.map(i => `
        <div class="feedback-item warning">
            <div class="feedback-item-title">⚠️ ${i.title}</div>
            <div class="feedback-item-desc">${i.desc}</div>
            <div class="feedback-item-tip">💡 ${i.tip}</div>
        </div>
    `).join('');
    document.getElementById('pronunciationFeedback').innerHTML = pronHTML;
    
    // 속도 피드백
    document.getElementById('speedFeedback').innerHTML = `
        <div class="feedback-item">
            <div class="feedback-item-title">📊 속도: ${feedback.speed.status}</div>
            <div class="feedback-item-desc">${feedback.speed.desc}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(feedback.speed.wpm / 3, 100)}%"></div>
            </div>
            <div class="feedback-item-tip">💡 ${feedback.speed.tip}</div>
        </div>
    `;
    
    // 침묵 피드백
    document.getElementById('silenceFeedback').innerHTML = `
        <div class="feedback-item ${feedback.silence.rate > 30 ? 'warning' : 'success'}">
            <div class="feedback-item-title">${feedback.silence.rate > 30 ? '⚠️' : '✅'} 침묵: ${feedback.silence.status}</div>
            <div class="feedback-item-desc">${feedback.silence.desc}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(feedback.silence.rate, 100)}%; background: ${feedback.silence.rate > 30 ? '#f59e0b' : '#10b981'}"></div>
            </div>
            <div class="feedback-item-tip">💡 ${feedback.silence.tip}</div>
        </div>
    `;
    
    // 습관 피드백
    const habitHTML = feedback.habits.strengths.map(s => `
        <div class="feedback-item success">
            <div class="feedback-item-title">✅ ${s}</div>
        </div>
    `).join('') + feedback.habits.issues.map(i => `
        <div class="feedback-item warning">
            <div class="feedback-item-title">⚠️ ${i.title}</div>
            <div class="feedback-item-desc">${i.desc}</div>
            <div class="feedback-item-tip">💡 ${i.tip}</div>
        </div>
    `).join('');
    document.getElementById('habitFeedback').innerHTML = habitHTML;
    
    // 액션 아이템
    const actionsHTML = feedback.actions.map(a => `
        <li class="action-item">
            <div class="action-icon">${a.icon}</div>
            <div class="action-text">${a.text}</div>
        </li>
    `).join('');
    document.getElementById('actionList').innerHTML = actionsHTML;
}