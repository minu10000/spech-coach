import tkinter as tk
from tkinter import scrolledtext, messagebox
import speech_recognition as sr
import threading
import time
from datetime import timedelta

class SpeechCoachApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🎤 스피치코치 - 데스크톱 버전")
        self.root.geometry("600x700")
        
        self.is_recording = False
        self.start_time = None
        self.silence_start = None
        self.total_silence = 0
        self.last_speech_time = 0
        
        # UI 생성
        self.create_widgets()
        
        # 음성 인식기 설정
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        
    def create_widgets(self):
        # 타이틀
        title = tk.Label(self.root, text="🎤 스피치코치", font=("맑은 고딕", 24, "bold"))
        title.pack(pady=20)
        
        # 타이머
        self.timer_label = tk.Label(self.root, text="00:00", font=("Consolas", 48, "bold"), fg="#333")
        self.timer_label.pack(pady=10)
        
        # 상태 표시
        self.status_label = tk.Label(self.root, text="준비 완료", font=("맑은 고딕", 14), fg="#666")
        self.status_label.pack(pady=10)
        
        # 버튼
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=20)
        
        self.start_btn = tk.Button(btn_frame, text="녹음 시작", command=self.toggle_recording, 
                                   bg="#3498db", fg="white", font=("맑은 고딕", 14, "bold"),
                                   padx=30, pady=15, relief="flat", cursor="hand2")
        self.start_btn.pack(side="left", padx=10)
        
        # 텍스트 영역
        text_frame = tk.LabelFrame(self.root, text="음성 변환 결과", font=("맑은 고딕", 12, "bold"))
        text_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        self.transcript = scrolledtext.ScrolledText(text_frame, height=10, font=("맑은 고딕", 12))
        self.transcript.pack(fill="both", expand=True, padx=10, pady=10)
        
        # 결과 영역
        self.result_frame = tk.LabelFrame(self.root, text="분석 결과", font=("맑은 고딕", 12, "bold"))
        self.result_frame.pack(fill="x", padx=20, pady=10)
        
        self.result_label = tk.Label(self.result_frame, text="", font=("맑은 고딕", 11), justify="left")
        self.result_label.pack(padx=10, pady=10)
        
    def toggle_recording(self):
        if not self.is_recording:
            self.start_recording()
        else:
            self.stop_recording()
            
    def start_recording(self):
        self.is_recording = True
        self.start_btn.config(text="녹음 종료", bg="#e74c3c")
        self.status_label.config(text="🔴 녹음 중...", fg="#e74c3c")
        self.transcript.delete(1.0, tk.END)
        self.result_frame.pack_forget()
        
        self.start_time = time.time()
        self.last_speech_time = self.start_time
        self.total_silence = 0
        
        # 별도 스레드로 녹음 시작
        thread = threading.Thread(target=self.record_audio, daemon=True)
        thread.start()
        
        # 타이머 업데이트
        self.update_timer()
        
    def stop_recording(self):
        self.is_recording = False
        self.start_btn.config(text="녹음 시작", bg="#3498db")
        self.status_label.config(text="⏹ 분석 완료", fg="#27ae60")
        self.show_results()
        
    def record_audio(self):
        try:
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                
                while self.is_recording:
                    try:
                        audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
                        text = self.recognizer.recognize_google(audio, language='ko-KR')
                        
                        # 텍스트 업데이트 (메인 스레드에서 실행)
                        self.root.after(0, lambda t=text: self.transcript.insert(tk.END, t + " "))
                        self.last_speech_time = time.time()
                        
                    except sr.WaitTimeoutError:
                        pass
                    except sr.UnknownValueError:
                        pass
                    except Exception as e:
                        print(f"오류: {e}")
                        
        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror("오류", f"마이크 오류: {e}"))
            
    def update_timer(self):
        if self.is_recording:
            elapsed = int(time.time() - self.start_time)
            
            # 침묵 시간 계산
            if time.time() - self.last_speech_time > 3:
                self.total_silence = time.time() - self.last_speech_time
            
            minutes = elapsed // 60
            seconds = elapsed % 60
            self.timer_label.config(text=f"{minutes:02d}:{seconds:02d}")
            
            self.root.after(1000, self.update_timer)
            
    def show_results(self):
        total_time = int(time.time() - self.start_time)
        speaking_time = max(0, total_time - self.total_silence)
        silence_rate = (self.total_silence / total_time * 100) if total_time > 0 else 0
        
        feedback = ""
        if total_time < 10:
            feedback = "⚠️ 연습 시간이 너무 짧습니다."
        elif silence_rate > 40:
            feedback = "⚠️ 침묵 시간이 많습니다. 연결어를 활용하세요!"
        elif silence_rate > 20:
            feedback = "😐 보통 수준입니다."
        else:
            feedback = "✅ 훌륭합니다!"
        
        result_text = f"""
총 시간: {total_time}초
발화 시간: {speaking_time:.1f}초
침묵 시간: {self.total_silence:.1f}초
침묵 비율: {silence_rate:.1f}%

{feedback}
        """
        
        self.result_label.config(text=result_text)
        self.result_frame.pack(fill="x", padx=20, pady=10)

# 앱 실행
if __name__ == "__main__":
    root = tk.Tk()
    app = SpeechCoachApp(root)
    root.mainloop()