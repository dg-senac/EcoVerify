"use client";

import { useState, useRef, useEffect } from "react";
import { t, type Lang } from "@/lib/i18n";
import { Mic, Play, X, Send } from "@/components/ui/icons";

interface AudioRecorderProps {
  lang: Lang;
  onAudioRecorded: (audioBlob: Blob, audioUrl: string) => void;
}

export function AudioRecorder({ lang, onAudioRecorded }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Tentar usar formatos mais compatíveis
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Configurar áudio para visualização
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        setShowPreview(true);
        
        // Parar visualização
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Iniciar visualização de ondas
      visualizeAudio();

    } catch (error) {
      console.error("Error starting recording:", error);
      alert(t(lang, "mic_error"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const visualizeAudio = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Gradiente verde para as ondas
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, "#10b981");
        gradient.addColorStop(1, "#14b8a6");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const handleSend = () => {
    if (audioBlob && audioUrl) {
      onAudioRecorded(audioBlob, audioUrl);
      resetRecorder();
    }
  };

  const handleCancel = () => {
    resetRecorder();
  };

  const resetRecorder = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setShowPreview(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Limpar URLs ao desmontar
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <>
      {!showPreview ? (
        <button
          type="button"
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={(e) => {
            e.preventDefault();
            startRecording();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopRecording();
          }}
          disabled={isRecording}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
          title={t(lang, "chat_upload_audio")}
        >
          <Mic className={`h-5 w-5 ${isRecording ? "text-red-500" : "text-slate-600"}`} />
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-2">
          <button
            type="button"
            onClick={() => {
              if (audioUrl) {
                const audio = new Audio(audioUrl);
                audio.play();
              }
            }}
            className="p-1 rounded-full hover:bg-slate-200"
            title={t(lang, "chat_listen")}
          >
            <Play className="h-4 w-4" />
          </button>
          
          <div className="flex-1">
            {audioUrl && (
              <audio
                src={audioUrl}
                className="w-full h-8"
                controls
              />
            )}
          </div>
          
          <button
            type="button"
            onClick={handleSend}
            className="p-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
            title={t(lang, "chat_send_audio")}
          >
            <Send className="h-4 w-4" />
          </button>
          
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 rounded-full hover:bg-slate-200"
            title={t(lang, "chat_cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isRecording && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full">
            <div className="text-center">
              <div className="mb-4">
                <canvas
                  ref={canvasRef}
                  width={200}
                  height={100}
                  className="rounded-lg"
                />
              </div>
              <p className="text-lg font-bold text-slate-900 mb-2">
                {formatTime(recordingTime)}
              </p>
              <p className="text-sm text-slate-500">
                {t(lang, "chat_recording")}
              </p>
              <button
                type="button"
                onMouseUp={stopRecording}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopRecording();
                }}
                className="mt-4 w-full py-3 bg-red-500 text-white rounded-xl font-semibold"
              >
                {t(lang, "chat_stop_recording")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
