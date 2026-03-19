import speech_recognition as sr
import tkinter as tk
from tkinter import messagebox
import threading
import time

class SimpleSpeechCoach:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🎤 스피치코치")
        self.root.geometry("500x400")
        
        self.recognizer = sr.Recognizer()
        self.is_listening = False
        
        self.create_ui()
        
    def create_ui(self):
        # 타이틀
        tk.Label(self.root, text="🎤 피치코치", font=("맑은 고딕", 20, "bold")).pack(pady=20)
        
        # 상태
        self.status = tk.Label(self.root, text="준비됨", font=("맑은 고딕", 12))
        self.status.pack(pady=10)
        
        # 버튼
        self.btn = tk.Button(self.root, text="말하기 시작", command=self.toggle_listen,
                           bg="#3498db", fg="white", font=("맑은 고딕", 14, "bold"),
                           padx=30, pady=15)
        self.btn.pack(pady=20)
        
        # 결과
        self.result = tk.Text(self.root, height=10, width=50, font=("맑은 고딕", 11))
        self.result.pack(pady=10)
        
    def toggle_listen(self):
        if not self.is_listening:
            self.is_listening = True
            self.btn.config(text="중지", bg="#e74c3c")
            self.status.config(text="🔴 듣고 있습니다...", fg="red")
            threading.Thread(target=self.listen, daemon=True).start()
        else:
            self.is_listening = False
            self.btn.config(text="말하기 시작", bg="#3498db")
            self.status.config(text="⏹ 중지됨", fg="green")
    
    def listen(self):
        try:
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
                
                while self.is_listening:
                    try:
                        audio = self.recognizer.listen(source, timeout=5)
                        text = self.recognizer.recognize_google(audio, language='ko-KR')
                        self.root.after(0, lambda t=text: self.result.insert(tk.END, t + "\n"))
                    except:
                        pass
        except Exception as e:
            messagebox.showerror("오류", f"마이크 오류: {e}")
            self.is_listening = False
            self.btn.config(text="말하기 시작", bg="#3498db")
    
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = SimpleSpeechCoach()
    app.run()