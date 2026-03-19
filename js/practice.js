function saveResult() {
    if (!currentResult) {
        alert('저장할 결과가 없습니다. 먼저 녹음을 완료해주세요.');
        return;
    }
    
    try {
        let records = [];
        const storedRecords = localStorage.getItem('speechRecords');
        if (storedRecords) {
            records = JSON.parse(storedRecords);
        }
        
        records.unshift(currentResult);
        localStorage.setItem('speechRecords', JSON.stringify(records));
        
        console.log('저장 완료:', currentResult);
        console.log('총 기록:', records.length);
        
        alert('✅ 결과가 저장되었습니다!');
        
        if (confirm('AI 피드백을 확인하시겠습니까?')) {
            window.location.href = 'feedback.html';
        }
        
    } catch (error) {
        console.error('저장 오류:', error);
        alert('❌ 저장 중 오류가 발생했습니다.\n\n오류: ' + error.message);
    }
}