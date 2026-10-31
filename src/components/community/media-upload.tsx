"use client";

import { useState, useRef } from "react";
import { t, type Lang } from "@/lib/i18n";
import { GifPicker } from "./gif-picker";
import { AudioRecorder } from "./audio-recorder";

interface MediaUploadProps {
  lang: Lang;
  onMediaUploaded: (url: string, type: "image" | "audio" | "video" | "gif") => void;
}

export function MediaUpload({ lang, onMediaUploaded }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: "image" | "audio" | "video") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onMediaUploaded(data.url, type);
      setShowMenu(false);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erro ao fazer upload. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, "image");
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, "video");
  };

  const handleGifSelected = (url: string) => {
    onMediaUploaded(url, "gif");
  };

  const handleAudioRecorded = async (audioBlob: Blob, audioUrl: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      // Usar o tipo MIME correto do blob
      formData.append("file", audioBlob, `audio.${audioBlob.type.split('/')[1]}`);
      formData.append("type", "audio");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      onMediaUploaded(data.url, "audio");
    } catch (error) {
      console.error("Audio upload error:", error);
      alert(t(lang, "audio_upload_error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={uploading}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
          title={t(lang, "chat_attach_media")}
        >
          {uploading ? "⏳" : "📎"}
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              📷 {t(lang, "chat_upload_image")}
            </button>
            <button
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "video/*";
                input.onchange = (e) => handleVideoSelect(e as any);
                input.click();
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              🎬 {t(lang, "chat_upload_video")}
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowGifPicker(true);
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              🎭 {t(lang, "chat_search_gif")}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>

      {/* AudioRecorder sempre visível como no WhatsApp */}
      <AudioRecorder
        lang={lang}
        onAudioRecorded={handleAudioRecorded}
      />

      {showGifPicker && (
        <GifPicker
          lang={lang}
          onGifSelected={handleGifSelected}
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </>
  );
}
